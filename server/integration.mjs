import { io } from "socket.io-client";
import assert from "node:assert/strict";
const sockets = [];
const connect = () =>
  new Promise((resolve, reject) => {
    const s = io("http://localhost:3001", {
      transports: ["websocket"],
      forceNew: true,
    });
    sockets.push(s);
    s.on("connect", () => resolve(s));
    s.on("connect_error", reject);
  });
const call = (s, event, data) =>
  new Promise((resolve, reject) =>
    s
      .timeout(3000)
      .emit(event, data, (err, r) => (err ? reject(err) : resolve(r))),
  );
try {
  const a = await connect(),
    b = await connect(),
    c = await connect();
  const created = await call(a, "room:create", { name: "Test Host" });
  assert.ok(created.token);
  const code = created.room.code;
  const joinedB = await call(b, "room:join", { code, name: "Test Second" }),
    joinedC = await call(c, "room:join", { code, name: "Test Third" });
  assert.ok(joinedB.playerId && joinedC.playerId);
  assert.ok((await call(b, "player:action", { type: "START" })).error);
  await call(b, "player:action", { type: "READY" });
  await call(c, "player:action", { type: "READY" });
  let snapshot;
  a.on("game:state", (r) => (snapshot = r));
  assert.equal(
    (await call(a, "player:action", { type: "START" })).error,
    undefined,
  );
  assert.equal(snapshot.status, "playing");
  assert.equal(snapshot.players[1].cards.length, 0);
  assert.equal(snapshot.players[0].cards.length, 4);
  const ids = snapshot.players.map((p) => p.id);
  const amounts = Object.fromEntries(ids.map((id) => [id, 4000000]));
  assert.ok((await call(b, "player:action", { type: "OFFER", amounts })).error);
  await call(a, "player:action", { type: "OFFER", amounts });
  await call(b, "player:action", { type: "ACCEPT" });
  await call(c, "player:action", { type: "ACCEPT" });
  assert.equal(snapshot.round, 2);
  assert.equal(
    snapshot.players.reduce((s, p) => s + p.money, 0),
    12000000,
  );
  await call(b, "player:action", {
    type: "CHAT",
    text: "A real multiplayer deal.",
  });
  assert.equal(snapshot.chat.at(-1).text, "A real multiplayer deal.");
  const before = snapshot;
  a.disconnect();
  const restoredSocket = await connect();
  const restore = await call(restoredSocket, "player:reconnect", {
    code,
    token: created.token,
  });
  assert.equal(restore.room.round, before.round);
  assert.equal(restore.room.players[0].money, 4000000);
  assert.equal(restore.room.players[0].cards.length, 5);
  const stranger = await connect();
  assert.ok(
    (await call(stranger, "player:reconnect", { code, token: "invalid" }))
      .error,
  );
  console.log(
    "PASS: three real sockets, lobby, permissions, private hands, offers, payout, chat, reconnect and invalid token.",
  );
} finally {
  sockets.forEach((s) => s.disconnect());
}
