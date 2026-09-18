import { test } from "node:test";
import assert from "node:assert/strict";
import {
  act,
  card,
  newRoom,
  player,
  start,
  tick,
  view,
  eligible,
  participants,
} from "./engine";
function fixture(n = 6) {
  const r = newRoom("TEST", player("Host", 0));
  for (let i = 1; i < n; i++) r.players.push(player("P" + i, i));
  start(r);
  return r;
}
function select(r: ReturnType<typeof fixture>) {
  act(r, r.bossId, {
    type: "SELECT_INVESTORS",
    assignments: Object.fromEntries(
      r.deal!.requiredInvestors.map((i) => [
        i,
        r.players.find((p) => eligible(r, p.id, i))!.id,
      ]),
    ),
  });
}
function play(
  r: ReturnType<typeof fixture>,
  id: string,
  type: Parameters<typeof card>[0],
  target?: string,
  investor?: string,
) {
  const c = card(type);
  r.players.find((p) => p.id === id)!.cards.push(c);
  act(r, id, { type: "PLAY_CARD", cardId: c.id, target, investor });
}
test("balanced A–F and unique deck for 3–12 players", () => {
  for (let n = 3; n <= 12; n++) {
    const r = fixture(n),
      letters = r.players.flatMap((p) => p.investors);
    assert.equal(new Set(letters).size, 6);
    assert.ok(
      Math.max(...r.players.map((p) => p.investors.length)) -
        Math.min(...r.players.map((p) => p.investors.length)) <=
        1,
    );
    assert.ok(letters.every((i) => letters.filter((x) => x === i).length <= 2));
    assert.equal(r.totalDeals, n <= 6 ? 15 : n <= 9 ? 20 : 25);
    assert.equal(new Set(r.deck.map((d) => d.id)).size, r.totalDeals);
    assert.equal(r.bossId, r.players[0].id);
    assert.deepEqual(view(r, r.bossId).deck, []);
    assert.equal(view(r, r.bossId).players[1].cards.length, 0);
  }
});
test("explicit duplicate owner selection and permission checks", () => {
  const r = fixture(12);
  assert.throws(() =>
    act(r, r.bossId, { type: "OFFER", amounts: { [r.bossId]: r.deal!.value } }),
  );
  select(r);
  const letter = r.deal!.requiredInvestors[0],
    owners = r.players.filter((p) => p.investors.includes(letter));
  assert.equal(owners.length, 2);
  act(r, r.bossId, {
    type: "SELECT_INVESTORS",
    assignments: { ...r.assignments, [letter]: owners[1].id },
  });
  assert.equal(r.assignments[letter], owners[1].id);
  assert.throws(() =>
    act(r, r.players[1].id, { type: "SELECT_INVESTORS", assignments: {} }),
  );
  assert.throws(() =>
    act(r, r.bossId, {
      type: "SELECT_INVESTORS",
      assignments: { Z: r.bossId },
    }),
  );
});
test("wild expires but stolen real investor persists", () => {
  const r = fixture(),
    a = r.players[0],
    b = r.players[1],
    letter = b.investors[0];
  play(r, a.id, "WILD INVESTOR", undefined, letter);
  tick(r, r.stackDeadline! + 1);
  assert.ok(r.wildInvestors[a.id].includes(letter));
  assert.throws(() => play(r, b.id, "REPLACE INVESTOR", a.id, letter));
  play(r, a.id, "REPLACE INVESTOR", b.id, letter);
  tick(r, r.stackDeadline! + 1);
  assert.ok(a.investors.includes(letter));
  assert.ok(!b.investors.includes(letter));
  assert.deepEqual(r.assignments, {});
  tick(r, r.turnStartedAt + r.turnDuration + 1);
  assert.deepEqual(r.wildInvestors, {});
  assert.ok(a.investors.includes(letter));
  assert.ok(!b.investors.includes(letter));
});
test("counter parity protects or transfers ownership", () => {
  for (const n of [1, 2]) {
    const r = fixture(),
      a = r.players[0],
      b = r.players[1],
      letter = b.investors[0];
    play(r, a.id, "REPLACE INVESTOR", b.id, letter);
    for (let i = 0; i < n; i++) play(r, r.players[i].id, "COUNTER");
    tick(r, r.stackDeadline! + 1);
    assert.equal(a.investors.includes(letter), n === 2);
    assert.equal(b.investors.includes(letter), n === 1);
  }
});
test("selection clears offer and block excludes investor until next deal", () => {
  const r = fixture();
  select(r);
  act(r, r.bossId, {
    type: "OFFER",
    amounts: Object.fromEntries(
      participants(r).map((id, i) => [id, i ? 0 : r.deal!.value]),
    ),
  });
  assert.ok(r.offer);
  select(r);
  assert.equal(r.offer, undefined);
  const target = r.players[1];
  play(r, r.bossId, "BLOCK", target.id);
  tick(r, r.stackDeadline! + 1);
  assert.ok(!eligible(r, target.id, target.investors[0]));
  assert.deepEqual(r.assignments, {});
  tick(r, r.turnStartedAt + r.turnDuration + 1);
  assert.ok(eligible(r, target.id, target.investors[0]));
});
test("full games pay exactly once with conserved money", () => {
  for (const n of [3, 6, 9, 12]) {
    const r = fixture(n);
    let total = 0;
    while (r.status === "playing") {
      select(r);
      const ids = participants(r),
        value = r.deal!.value,
        boss = r.bossId;
      assert.throws(() =>
        act(r, boss, { type: "OFFER", amounts: { [boss]: -1 } }),
      );
      act(r, boss, {
        type: "OFFER",
        amounts: Object.fromEntries(ids.map((id, i) => [id, i ? 0 : value])),
      });
      for (const id of ids.filter((id) => id !== boss))
        act(r, id, { type: "ACCEPT" });
      total += value;
      assert.throws(() => act(r, boss, { type: "ACCEPT" }));
    }
    assert.equal(
      r.players.reduce((s, p) => s + p.money, 0),
      total,
    );
    assert.equal(r.round, r.totalDeals + 1);
  }
});

test("card events name actor and actual counter target through resolution", () => {
  const r = fixture(),
    a = r.players[0],
    b = r.players[1],
    c = r.players[2];
  play(r, a.id, "BLOCK", b.id);
  assert.ok(r.log.at(-1)!.text.includes(a.name + " ใช้"));
  assert.ok(r.log.at(-1)!.text.includes("ใส่ " + b.name));
  // A client-supplied counter target must never override the previous card owner.
  play(r, b.id, "COUNTER", c.id);
  assert.equal(r.stack.at(-1)!.target, a.id);
  assert.ok(r.log.at(-1)!.text.includes("ของ " + a.name));
  play(r, c.id, "COUNTER", a.id);
  assert.equal(r.stack.at(-1)!.target, b.id);
  assert.ok(r.log.at(-1)!.text.includes("ของ " + b.name));
  tick(r, r.stackDeadline! + 1);
  assert.ok(r.log.at(-1)!.text.includes(a.name + " ใช้"));
  assert.ok(r.log.at(-1)!.text.includes("ใส่ " + b.name));
  assert.ok(r.log.at(-1)!.text.includes("มีผลแล้ว"));
});
