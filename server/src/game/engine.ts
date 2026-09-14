import { randomUUID } from "node:crypto";
import type {
  Action,
  ActionCard,
  GameRoom,
  Player,
  CardType,
} from "../../../shared/types";
import { CARD_INFO, DEALS, INVESTORS } from "../../../shared/constants";
export function card(type?: CardType): ActionCard {
  const keys = Object.keys(CARD_INFO) as CardType[];
  const t = type ?? keys[Math.floor(Math.random() * keys.length)];
  return {
    id: randomUUID(),
    type: t,
    description: CARD_INFO[t],
    priority: t === "COUNTER" ? 2 : 1,
  };
}
export function player(name: string, avatar: number, bot = false): Player {
  return {
    id: randomUUID(),
    name,
    avatar,
    money: 0,
    investors: [],
    cards: [],
    cardCount: 0,
    ready: bot,
    connected: true,
    bot,
  };
}
export function log(r: GameRoom, text: string) {
  r.log.push({ id: randomUUID(), text, time: Date.now() });
  r.log = r.log.slice(-80);
}
export function newRoom(code: string, p: Player): GameRoom {
  return {
    code,
    hostId: p.id,
    status: "lobby",
    players: [p],
    round: 0,
    currentPlayerIndex: 0,
    bossId: p.id,
    turnStartedAt: 0,
    turnDuration: 90000,
    stack: [],
    blocked: [],
    replacements: {},
    extras: [],
    chat: [],
    log: [],
    matchId: randomUUID(),
  };
}
export function participants(r: GameRoom) {
  return [
    ...new Set(
      [
        r.bossId,
        ...(r.deal?.requiredInvestors ?? []).map(
          (i) =>
            r.replacements[i] ??
            r.players.find((p) => p.investors.includes(i))?.id,
        ),
        ...r.extras,
      ].filter((id): id is string => !!id && !r.blocked.includes(id)),
    ),
  ];
}
export function next(r: GameRoom, success = false) {
  if (r.deal)
    log(
      r,
      success
        ? "Deal closed. The proceeds have been distributed."
        : "Deal passed. A new opportunity awaits.",
    );
  r.round++;
  r.offer = undefined;
  r.stack = [];
  r.stackDeadline = undefined;
  r.blocked = [];
  r.replacements = {};
  r.extras = [];
  if (r.round > 15) {
    r.status = "finished";
    log(r, "The session is complete. Final standings are ready.");
    return;
  }
  r.currentPlayerIndex = (r.round - 1) % r.players.length;
  r.bossId = r.players[r.currentPlayerIndex].id;
  r.deal = { ...DEALS[r.round - 1] };
  r.turnStartedAt = Date.now();
  if (r.round > 1)
    r.players.forEach((p) => {
      if (p.cards.length < 8) p.cards.push(card());
    });
  log(r, `${r.players[r.currentPlayerIndex].name} leads ${r.deal.name}.`);
}
export function start(r: GameRoom) {
  r.status = "playing";
  r.round = 0;
  r.matchId = randomUUID();
  r.players.forEach((p, i) => {
    p.money = 0;
    p.investors = INVESTORS.filter((_, n) => n % r.players.length === i);
    p.cards = [
      card("TAKE CONTROL"),
      card("BLOCK"),
      card("COUNTER"),
      card("WILD INVESTOR"),
    ];
  });
  next(r);
}
function settle(r: GameRoom) {
  if (
    r.offer &&
    !r.stack.length &&
    participants(r).every((id) => r.offer!.accepted.includes(id))
  ) {
    for (const p of r.players) p.money += r.offer.amounts[p.id] ?? 0;
    next(r, true);
  }
}
export function act(r: GameRoom, id: string, a: Action) {
  const p = r.players.find((x) => x.id === id);
  if (!p) throw new Error("You are not in this room.");
  if (a.type === "CHAT") {
    if (typeof a.text !== "string" || !a.text.trim() || a.text.length > 300)
      throw new Error("Messages must contain 1–300 characters.");
    r.chat.push({
      id: randomUUID(),
      playerId: id,
      name: p.name,
      text: a.text.trim(),
      time: Date.now(),
    });
    r.chat = r.chat.slice(-100);
    return;
  }
  if (a.type === "READY") {
    if (r.status !== "lobby") throw new Error("The game has already started.");
    p.ready = !p.ready;
    return;
  }
  if (a.type === "START") {
    if (
      id !== r.hostId ||
      r.status !== "lobby" ||
      r.players.length < 3 ||
      !r.players.every((x) => x.ready || x.id === id)
    )
      throw new Error("The host needs 3–6 ready players to begin.");
    start(r);
    return;
  }
  if (a.type === "AGAIN") {
    if (id !== r.hostId || r.status !== "finished")
      throw new Error("Only the host can reopen a finished table.");
    r.status = "lobby";
    r.players.forEach((x) => (x.ready = !!x.bot));
    return;
  }
  if (r.status !== "playing" || !r.deal) throw new Error("No active deal.");
  if (a.type === "PASS") {
    if (id !== r.bossId || r.stack.length)
      throw new Error("Only the leader may pass with an empty stack.");
    next(r);
    return;
  }
  if (a.type === "PLAY_CARD") {
    const c = p.cards.find((x) => x.id === a.cardId);
    if (!c || r.blocked.includes(id))
      throw new Error("This card is unavailable.");
    if (c.type === "COUNTER" && !r.stack.length)
      throw new Error("There is no card to counter.");
    if (c.type !== "COUNTER" && r.stack.length)
      throw new Error("Wait for the stack to resolve, or play a counter.");
    if (
      c.type === "BLOCK" &&
      (!r.players.some((x) => x.id === a.target) || a.target === id)
    )
      throw new Error("Choose another player.");
    if (
      ["REPLACE INVESTOR", "WILD INVESTOR"].includes(c.type) &&
      !r.deal.requiredInvestors.includes(a.investor ?? "")
    )
      throw new Error("Choose a required investor.");
    p.cards = p.cards.filter((x) => x.id !== c.id);
    r.stack.push({
      id: randomUUID(),
      playerId: id,
      card: c,
      target: a.target,
      investor: a.investor,
    });
    r.stackDeadline = Date.now() + 5000;
    r.offer = undefined;
    log(r, `${p.name} played ${c.type}.`);
    return;
  }
  if (r.stack.length) throw new Error("The card stack is resolving.");
  if (a.type === "OFFER") {
    if (id !== r.bossId || !a.amounts || typeof a.amounts !== "object")
      throw new Error("Only the leader can make an offer.");
    const ids = participants(r);
    const entries = Object.entries(a.amounts);
    if (
      entries.some(
        ([k, v]) => !ids.includes(k) || !Number.isSafeInteger(v) || v < 0,
      ) ||
      ids.some((k) => !Object.hasOwn(a.amounts, k)) ||
      entries.reduce((s, [, v]) => s + v, 0) !== r.deal.value
    )
      throw new Error(
        "Allocate the full deal value among the required participants.",
      );
    r.offer = { amounts: { ...a.amounts }, accepted: [id], rejected: [] };
    log(r, `${p.name} made a new offer.`);
    settle(r);
    return;
  }
  if (a.type === "ACCEPT" || a.type === "REJECT") {
    if (!r.offer || !participants(r).includes(id))
      throw new Error("No offer is available for you.");
    r.offer.accepted = r.offer.accepted.filter((x) => x !== id);
    r.offer.rejected = r.offer.rejected.filter((x) => x !== id);
    r.offer[a.type === "ACCEPT" ? "accepted" : "rejected"].push(id);
    log(
      r,
      `${p.name} ${a.type === "ACCEPT" ? "accepted" : "rejected"} the offer.`,
    );
    settle(r);
    return;
  }
  throw new Error("Unknown action.");
}
export function tick(r: GameRoom, now = Date.now()) {
  if (r.status !== "playing") return false;
  let changed = false;
  if (r.stack.length && now >= (r.stackDeadline ?? 0)) {
    const base = r.stack[0];
    if (r.stack.length % 2 === 1) {
      const id = base.playerId;
      switch (base.card.type) {
        case "TAKE CONTROL":
          r.bossId = id;
          break;
        case "BLOCK":
          r.blocked.push(base.target!);
          if (r.bossId === base.target) r.bossId = id;
          for (const i of r.deal!.requiredInvestors) {
            const owner =
              r.replacements[i] ??
              r.players.find((p) => p.investors.includes(i))?.id;
            if (owner === base.target) r.replacements[i] = id;
          }
          break;
        case "REPLACE INVESTOR":
        case "WILD INVESTOR":
          r.replacements[base.investor!] = id;
          break;
        case "STEAL DEAL":
          r.extras.push(id);
          break;
      }
      log(r, `${base.card.type} resolved.`);
    } else log(r, `${base.card.type} was countered.`);
    r.stack = [];
    r.stackDeadline = undefined;
    changed = true;
  }
  if (now >= r.turnStartedAt + r.turnDuration) {
    next(r);
    return true;
  }
  if (r.offer && !r.stack.length) {
    for (const p of r.players.filter((x) => x.bot)) {
      if (participants(r).includes(p.id) && !r.offer?.accepted.includes(p.id)) {
        act(r, p.id, { type: "ACCEPT" });
        changed = true;
        if (!r.offer) break;
      }
    }
  }
  const boss = r.players.find((p) => p.id === r.bossId);
  if (
    boss?.bot &&
    !r.offer &&
    !r.stack.length &&
    now - r.turnStartedAt > 3500
  ) {
    const ids = participants(r),
      value = r.deal!.value,
      share = Math.floor(value / ids.length);
    const amounts = Object.fromEntries(
      ids.map((id, i) => [
        id,
        share + (i === 0 ? value - share * ids.length : 0),
      ]),
    );
    act(r, boss.id, { type: "OFFER", amounts });
    changed = true;
  }
  return changed;
}
export function view(r: GameRoom, id: string): GameRoom {
  return {
    ...r,
    players: r.players.map((p) => ({
      ...p,
      cards: p.id === id ? p.cards : [],
      cardCount: p.cards.length,
    })),
  };
}
