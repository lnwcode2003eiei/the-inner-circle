import { test } from "node:test";
import assert from "node:assert/strict";
import {
  act,
  card,
  newRoom,
  participants,
  player,
  start,
  tick,
  view,
} from "./engine";
function fixture() {
  const p = player("One", 0);
  const r = newRoom("TEST1", p);
  r.players.push(player("Two", 1), player("Three", 2));
  start(r);
  return r;
}
function offer(r: ReturnType<typeof fixture>) {
  const ids = participants(r),
    share = Math.floor(r.deal!.value / ids.length);
  return Object.fromEntries(
    ids.map((id, i) => [
      id,
      share + (i === 0 ? r.deal!.value - share * ids.length : 0),
    ]),
  );
}
test("invalid and unauthorized offers fail; revisions reset approvals", () => {
  const r = fixture();
  assert.throws(() =>
    act(r, r.players[1].id, { type: "OFFER", amounts: offer(r) }),
  );
  assert.throws(() =>
    act(r, r.bossId, { type: "OFFER", amounts: { [r.bossId]: 999999999 } }),
  );
  act(r, r.bossId, { type: "OFFER", amounts: offer(r) });
  act(r, r.players[1].id, { type: "ACCEPT" });
  act(r, r.bossId, { type: "OFFER", amounts: offer(r) });
  assert.deepEqual(r.offer!.accepted, [r.bossId]);
  assert.throws(() => act(r, "outsider", { type: "ACCEPT" }));
});
test("unanimous agreement pays exactly once", () => {
  const r = fixture(),
    value = r.deal!.value;
  act(r, r.bossId, { type: "OFFER", amounts: offer(r) });
  for (const p of r.players.slice(1)) act(r, p.id, { type: "ACCEPT" });
  assert.equal(r.round, 2);
  assert.equal(
    r.players.reduce((s, p) => s + p.money, 0),
    value,
  );
  assert.throws(() => act(r, r.players[1].id, { type: "ACCEPT" }));
  assert.equal(
    r.players.reduce((s, p) => s + p.money, 0),
    value,
  );
});
test("counter chains resolve last-in first-out", () => {
  for (const counters of [1, 2]) {
    const r = fixture(),
      old = r.bossId,
      attacker = r.players[1];
    const c = card("TAKE CONTROL");
    attacker.cards.push(c);
    act(r, attacker.id, { type: "PLAY_CARD", cardId: c.id });
    for (let i = 0; i < counters; i++) {
      const p = r.players[i],
        counter = card("COUNTER");
      p.cards.push(counter);
      act(r, p.id, { type: "PLAY_CARD", cardId: counter.id });
    }
    tick(r, r.stackDeadline! + 1);
    assert.equal(r.bossId, counters === 1 ? old : attacker.id);
    assert.equal(r.stack.length, 0);
  }
});
test("private hand projection and timeout", () => {
  const r = fixture(),
    v = view(r, r.players[0].id);
  assert.equal(v.players[0].cards.length, 4);
  assert.equal(v.players[1].cards.length, 0);
  assert.equal(v.players[1].cardCount, 4);
  tick(r, r.turnStartedAt + r.turnDuration + 1);
  assert.equal(r.round, 2);
  assert.equal(r.bossId, r.players[1].id);
});
test("15 deals finish with conserved proceeds", () => {
  const r = fixture();
  let total = 0;
  while (r.status === "playing") {
    const value = r.deal!.value;
    const ids = participants(r),
      bossId = r.bossId;
    act(r, bossId, { type: "OFFER", amounts: offer(r) });
    for (const id of ids.filter((id) => id !== bossId))
      act(r, id, { type: "ACCEPT" });
    total += value;
  }
  assert.equal(r.status, "finished");
  assert.equal(
    r.players.reduce((s, p) => s + p.money, 0),
    total,
  );
});
