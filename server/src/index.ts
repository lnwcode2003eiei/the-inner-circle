import "./env";
import express from "express";
import cors from "cors";
import http from "node:http";
import { randomBytes } from "node:crypto";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  GameRoom,
  Reply,
  Action,
} from "../../shared/types";
import { act, newRoom, player, start, tick, view, log } from "./game/engine";
import { init, save, history, leaderboard } from "./database/store";
const origins = [
  "http://localhost:5173",
  ...(process.env.CLIENT_URL ?? "").split(",").filter(Boolean),
];
const app = express();
app.use(cors({ origin: origins, credentials: true }));
app.get("/health", (_, res) => res.json({ status: "ok" }));
app.get("/api/history", async (_, res) => {
  try {
    res.json(await history());
  } catch {
    res.status(503).json({ error: "ฐานข้อมูลไม่พร้อมใช้งาน" });
  }
});
app.get("/api/leaderboard", async (_, res) => {
  try {
    res.json(await leaderboard());
  } catch {
    res.status(503).json({ error: "ฐานข้อมูลไม่พร้อมใช้งาน" });
  }
});
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: { origin: origins, methods: ["GET", "POST"], credentials: true },
  maxHttpBufferSize: 16384,
});
const rooms = new Map<string, GameRoom>();
const sessions = new Map<string, { code: string; id: string }>();
const saved = new Set<string>();
function broadcast(r: GameRoom) {
  for (const s of io.sockets.sockets.values())
    if (s.data.code === r.code) s.emit("game:state", view(r, s.data.id));
  if (r.status === "finished" && !saved.has(r.matchId)) {
    saved.add(r.matchId);
    save(r).catch((e) => {
      saved.delete(r.matchId);
      console.error("Match persistence failed", e.message);
    });
  }
}
io.on("connection", (socket) => {
  let stamps: number[] = [];
  let chats: number[] = [];
  const limited = (chat = false) => {
    const now = Date.now();
    stamps = stamps.filter((t) => now - t < 5000);
    if (stamps.length >= 30)
      throw new Error("ส่งคำสั่งเร็วเกินไป กรุณารอสักครู่");
    stamps.push(now);
    if (chat) {
      chats = chats.filter((t) => now - t < 5000);
      if (chats.length >= 5)
        throw new Error("กรุณารอสักครู่ก่อนส่งข้อความถัดไป");
      chats.push(now);
    }
  };
  const guard = (cb: ((r: Reply) => void) | undefined, fn: () => Reply) => {
    try {
      limited();
      const result = fn();
      if (typeof cb === "function") cb(result);
    } catch (e) {
      if (typeof cb === "function")
        cb({ error: e instanceof Error ? e.message : "คำขอไม่ถูกต้อง" });
    }
  };
  const attach = (r: GameRoom, id: string) => {
    socket.data.code = r.code;
    socket.data.id = id;
    socket.join(r.code);
  };
  const nameOf = (name: unknown) => {
    if (typeof name !== "string" || !name.trim() || name.trim().length > 20)
      throw new Error("กรุณากรอกชื่อที่ยาว 1–20 ตัวอักษร");
    return name.trim();
  };
  socket.on("room:create", (data, cb) =>
    guard(cb, () => {
      if (socket.data.id) throw new Error("กรุณาออกจากห้องเดิมก่อน");
      if (rooms.size >= 500)
        throw new Error("ห้องเต็มทั้งหมด กรุณาลองใหม่ภายหลัง");
      const p = player(nameOf(data?.name), 0);
      let code = "";
      do {
        code = randomBytes(4).toString("hex").slice(0, 5).toUpperCase();
      } while (rooms.has(code));
      const r = newRoom(code, p);
      rooms.set(code, r);
      const token = randomBytes(32).toString("hex");
      sessions.set(token, { code, id: p.id });
      attach(r, p.id);
      if (data.practice) {
        r.players.push(
          player("อเล็กซ์ มอร์แกน", 1, true),
          player("โซเฟีย เฉิน", 2, true),
          player("มาร์คัส รีด", 3, true),
        );
        start(r);
      }
      broadcast(r);
      return { token, playerId: p.id, room: view(r, p.id) };
    }),
  );
  socket.on("room:join", (data, cb) =>
    guard(cb, () => {
      if (socket.data.id) throw new Error("กรุณาออกจากห้องเดิมก่อน");
      const r = rooms.get(String(data?.code).toUpperCase());
      if (!r || r.status !== "lobby" || r.players.length >= 12)
        throw new Error("ไม่พบห้อง ห้องเต็ม หรือเกมเริ่มแล้ว");
      const p = player(nameOf(data.name), r.players.length);
      r.players.push(p);
      const token = randomBytes(32).toString("hex");
      sessions.set(token, { code: r.code, id: p.id });
      attach(r, p.id);
      log(r, `${p.name} เข้าร่วมห้องแล้ว`);
      broadcast(r);
      return { token, playerId: p.id, room: view(r, p.id) };
    }),
  );
  socket.on("player:reconnect", (data, cb) =>
    guard(cb, () => {
      const session = sessions.get(data?.token);
      const r = rooms.get(String(data?.code));
      if (!session || session.code !== r?.code)
        throw new Error("ห้องเดิมหมดอายุแล้ว กรุณาสร้างหรือเข้าร่วมห้องใหม่");
      const p = r.players.find((p) => p.id === session.id);
      if (!p) throw new Error("ผู้เล่นไม่ได้อยู่ในห้องนี้แล้ว");
      for (const s of io.sockets.sockets.values())
        if (s.id !== socket.id && s.data.id === p.id) {
          s.data.id = undefined;
          s.data.code = undefined;
          s.disconnect(true);
        }
      p.connected = true;
      attach(r, p.id);
      broadcast(r);
      return { playerId: p.id, room: view(r, p.id) };
    }),
  );
  socket.on("player:action", (a, cb) =>
    guard(cb, () => {
      const r = rooms.get(socket.data.code);
      if (!r || !socket.data.id) throw new Error("กรุณาเข้าร่วมห้องก่อน");
      if (!a || typeof a.type !== "string") throw new Error("คำสั่งไม่ถูกต้อง");
      // Process expired turns and response windows before accepting new actions.
      if (tick(r)) broadcast(r);
      if (a.type === "CHAT") limited(true);
      if (a.type === "LEAVE") {
        if (r.status === "playing" && !r.players.some((p) => p.bot))
          throw new Error(
            "ที่นั่งของคุณถูกเก็บไว้ กลับมาเชื่อมต่อใหม่ได้ภายหลัง",
          );
        r.players = r.players.filter((p) => p.id !== socket.data.id);
        for (const [token, s] of sessions)
          if (s.id === socket.data.id) sessions.delete(token);
        socket.leave(r.code);
        socket.data.code = undefined;
        socket.data.id = undefined;
        if (r.hostId && !r.players.some((p) => p.id === r.hostId))
          r.hostId = r.players[0]?.id;
        if (!r.players.some((p) => !p.bot)) rooms.delete(r.code);
      } else act(r, socket.data.id, a as Action);
      broadcast(r);
      return {};
    }),
  );
  socket.on("game:sync", () => {
    try {
      limited();
      const r = rooms.get(socket.data.code);
      if (r) socket.emit("game:state", view(r, socket.data.id));
    } catch {}
  });
  socket.on("disconnect", () => {
    const r = rooms.get(socket.data.code);
    const p = r?.players.find((p) => p.id === socket.data.id);
    if (r && p) {
      p.connected = false;
      broadcast(r);
    }
  });
});
setInterval(() => {
  for (const r of rooms.values()) {
    if (tick(r)) broadcast(r);
    if (r.status === "finished" && !saved.has(r.matchId)) broadcast(r);
    if (
      !r.players.some((p) => p.connected && !p.bot) &&
      Date.now() - Math.max(r.turnStartedAt, ...r.log.map((l) => l.time), 0) >
        3600000
    ) {
      rooms.delete(r.code);
      for (const [token, s] of sessions)
        if (s.code === r.code) sessions.delete(token);
    }
  }
}, 500).unref();
init()
  .then(() =>
    server.listen(
      Number(process.env.PORT || process.env.SERVER_PORT || 3001),
      "0.0.0.0",
      () => console.log("Inner Circle server ready"),
    ),
  )
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
