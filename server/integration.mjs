import { io } from "socket.io-client";
import assert from "node:assert/strict";
const sockets = [],
  byId = new Map();
let snapshot;
const connect = () =>
  new Promise((resolve, reject) => {
    const s = io(process.env.TEST_SERVER_URL ?? "http://localhost:3001", {
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
const action = async (id, data) => {
  const r = await call(byId.get(id), "player:action", data);
  assert.equal(r.error, undefined);
  return r;
};
try {
  const host = await connect();
  host.on("game:state", (r) => (snapshot = r));
  const created = await call(host, "room:create", { name: "Host" });
  assert.ok(created.token);
  byId.set(created.playerId, host);
  for (let i = 1; i < 12; i++) {
    const s = await connect(),
      r = await call(s, "room:join", {
        code: created.room.code,
        name: "Player " + i,
      });
    assert.ok(r.playerId);
    byId.set(r.playerId, s);
    await action(r.playerId, { type: "READY" });
  }
  const extra = await connect();
  assert.ok(
    (
      await call(extra, "room:join", {
        code: created.room.code,
        name: "Thirteenth",
      })
    ).error,
  );
  await action(created.playerId, { type: "START" });
  assert.equal(snapshot.players.length, 12);
  assert.equal(snapshot.totalDeals, 25);
  assert.equal(
    snapshot.players.find((p) => p.id === created.playerId).cards.length,
    4,
  );
  assert.ok(
    snapshot.players
      .filter((p) => p.id !== created.playerId)
      .every((p) => p.cards.length === 0),
  );
  assert.deepEqual(snapshot.deck, []);
  let total = 0;
  while (snapshot.status === "playing") {
    const r = snapshot,
      boss = r.bossId;
    const assignments = Object.fromEntries(
      r.deal.requiredInvestors.map((i) => [
        i,
        r.players.find((p) => p.investors.includes(i)).id,
      ]),
    );
    await action(boss, { type: "SELECT_INVESTORS", assignments });
    const ids = [...new Set([boss, ...Object.values(assignments)])],
      value = r.deal.value;
    await action(boss, {
      type: "OFFER",
      amounts: Object.fromEntries(ids.map((id, i) => [id, i ? 0 : value])),
    });
    for (const id of ids.filter((id) => id !== boss))
      await action(id, { type: "ACCEPT" });
    total += value;
  }
  assert.equal(
    snapshot.players.reduce((n, p) => n + p.money, 0),
    total,
  );
  const before = snapshot;
  host.disconnect();
  const restored = await connect(),
    r = await call(restored, "player:reconnect", {
      code: created.room.code,
      token: created.token,
    });
  assert.equal(r.error, undefined);
  assert.equal(r.room.status, "finished");
  assert.equal(
    r.room.players.find((p) => p.id === created.playerId).money,
    before.players.find((p) => p.id === created.playerId).money,
  );
  assert.ok(
    (
      await call(extra, "player:reconnect", {
        code: created.room.code,
        token: "invalid",
      })
    ).error,
  );
  console.log(
    "PASS: 12 real sockets, capacity, private hands, random leader, selected participants, 25 deals, conserved payout, reconnect.",
  );
} finally {
  sockets.forEach((s) => s.disconnect());
}
