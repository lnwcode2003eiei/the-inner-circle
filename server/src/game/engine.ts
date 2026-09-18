import { describeCard } from "../../../shared/card-events";
import { randomUUID, randomInt } from "node:crypto";
import type {
  Action,
  ActionCard,
  GameRoom,
  Player,
  CardType,
} from "../../../shared/types";
import {
  CARD_INFO,
  DEALS,
  INVESTORS,
  MAX_PLAYERS,
  totalDealsFor,
} from "../../../shared/constants";
export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function card(type?: CardType): ActionCard {
  const types = Object.keys(CARD_INFO) as CardType[];
  const t = type ?? types[randomInt(types.length)];
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
    turnStartedAt: Date.now(),
    turnDuration: 120000,
    stack: [],
    blocked: [],
    assignments: {},
    wildInvestors: {},
    deck: [],
    totalDeals: 15,
    extras: [],
    chat: [],
    log: [],
    matchId: randomUUID(),
  };
}
export function eligible(r: GameRoom, id: string, investor: string) {
  const p = r.players.find((p) => p.id === id);
  return (
    !!p &&
    !r.blocked.includes(id) &&
    (p.investors.includes(investor) ||
      (r.wildInvestors[id] ?? []).includes(investor))
  );
}
export function completeSelection(r: GameRoom) {
  return (
    !!r.deal &&
    r.deal.requiredInvestors.every((i) => eligible(r, r.assignments[i], i))
  );
}
export function participants(r: GameRoom) {
  return [
    ...new Set(
      [r.bossId, ...Object.values(r.assignments), ...r.extras].filter(
        (id) => !!id && !r.blocked.includes(id),
      ),
    ),
  ];
}
function invalidate(r: GameRoom, clearSelection = false) {
  r.offer = undefined;
  if (clearSelection) r.assignments = {};
  else
    for (const [i, id] of Object.entries(r.assignments))
      if (!eligible(r, id, i)) delete r.assignments[i];
}
export function next(r: GameRoom, success = false) {
  if (r.deal)
    log(
      r,
      success
        ? "ปิดดีลสำเร็จ แบ่งเงินให้ผู้ร่วมดีลแล้ว"
        : "ผ่านดีลนี้ พบโอกาสใหม่ในดีลถัดไป",
    );
  r.round++;
  r.offer = undefined;
  r.stack = [];
  r.stackDeadline = undefined;
  r.blocked = [];
  r.assignments = {};
  r.wildInvestors = {};
  r.extras = [];
  if (r.round > r.totalDeals) {
    r.status = "finished";
    log(r, "จบเกมแล้ว มาดูอันดับนักเจรจากัน");
    return;
  }
  r.currentPlayerIndex = (r.round - 1) % r.players.length;
  r.bossId = r.players[r.currentPlayerIndex].id;
  r.deal = { ...r.deck[r.round - 1] };
  r.turnStartedAt = Date.now();
  if (r.round > 1)
    r.players.forEach((p) => {
      if (p.cards.length < 8) p.cards.push(card());
    });
  log(r, `${r.players[r.currentPlayerIndex].name} นำการเจรจา ${r.deal.name}`);
}
export function start(r: GameRoom) {
  if (r.players.length < 3 || r.players.length > MAX_PLAYERS)
    throw Error("ต้องมีผู้เล่น 3–12 คน");
  r.status = "playing";
  r.round = 0;
  r.deal = undefined;
  r.matchId = randomUUID();
  r.totalDeals = totalDealsFor(r.players.length);
  r.players = shuffle(r.players);
  const letters = shuffle(INVESTORS);
  const tokens = shuffle(
    r.players.length <= 6
      ? letters
      : [...letters, ...shuffle(INVESTORS).slice(0, r.players.length - 6)],
  );
  r.players.forEach((p) => {
    p.money = 0;
    p.investors = [];
    p.cards = [
      card("TAKE CONTROL"),
      card("REPLACE INVESTOR"),
      card("COUNTER"),
      card("WILD INVESTOR"),
    ];
  });
  tokens.forEach((i, n) => r.players[n % r.players.length].investors.push(i));
  const pool =
    r.players.length <= 6
      ? DEALS.slice(0, 20)
      : r.players.length <= 9
        ? DEALS.slice(5)
        : DEALS;
  r.deck = shuffle(pool).slice(0, r.totalDeals);
  log(r, "สุ่มนักลงทุนและลำดับผู้เล่นใหม่แล้ว");
  next(r);
}
function settle(r: GameRoom) {
  if (
    r.offer &&
    !r.stack.length &&
    completeSelection(r) &&
    participants(r).every((id) => r.offer!.accepted.includes(id))
  ) {
    for (const p of r.players) p.money += r.offer.amounts[p.id] ?? 0;
    next(r, true);
  }
}
export function act(r: GameRoom, id: string, a: Action) {
  const p = r.players.find((x) => x.id === id);
  if (!p) throw Error("คุณไม่ได้อยู่ในห้องนี้");
  if (a.type === "CHAT") {
    if (typeof a.text !== "string" || !a.text.trim() || a.text.length > 300)
      throw Error("ข้อความต้องมีความยาว 1–300 ตัวอักษร");
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
    if (r.status !== "lobby") throw Error("เกมเริ่มไปแล้ว");
    p.ready = !p.ready;
    return;
  }
  if (a.type === "START") {
    if (
      id !== r.hostId ||
      r.status !== "lobby" ||
      !r.players.every((x) => x.ready || x.id === id)
    )
      throw Error("เจ้าของห้องเริ่มได้เมื่อทุกคนพร้อม");
    start(r);
    return;
  }
  if (a.type === "AGAIN") {
    if (id !== r.hostId || r.status !== "finished")
      throw Error("เฉพาะเจ้าของห้องเท่านั้นที่เริ่มใหม่ได้");
    r.status = "lobby";
    r.players.forEach((x) => (x.ready = !!x.bot));
    return;
  }
  if (r.status !== "playing" || !r.deal) throw Error("ยังไม่มีดีลที่กำลังเล่น");
  if (a.type === "PASS") {
    if (id !== r.bossId || r.stack.length)
      throw Error("เฉพาะผู้นำกดผ่านได้เมื่อไม่มีการ์ดรอทำงาน");
    next(r);
    return;
  }
  if (a.type === "PLAY_CARD") {
    const c = p.cards.find((x) => x.id === a.cardId);
    if (!c || r.blocked.includes(id)) throw Error("ไม่สามารถใช้การ์ดใบนี้ได้");
    if (c.type === "COUNTER" && !r.stack.length)
      throw Error("ยังไม่มีการ์ดให้โต้กลับ");
    if (c.type !== "COUNTER" && r.stack.length)
      throw Error("รอการ์ดทำงาน หรือใช้การ์ดโต้กลับ");
    const target = r.players.find((x) => x.id === a.target);
    if (
      c.type === "BLOCK" &&
      (!target || target.id === id || r.blocked.includes(target.id))
    )
      throw Error("กรุณาเลือกคู่แข่งที่ยังไม่ถูกบล็อก");
    if (
      c.type === "REPLACE INVESTOR" &&
      (!target ||
        target.id === id ||
        !target.investors.includes(a.investor ?? ""))
    )
      throw Error("เลือกนักลงทุนจริงของคู่แข่ง ไม่สามารถยึดตัวชั่วคราวได้");
    if (
      c.type === "WILD INVESTOR" &&
      (!INVESTORS.includes(a.investor ?? "") ||
        (r.wildInvestors[id] ?? []).includes(a.investor!))
    )
      throw Error("เลือก A–F ที่ยังไม่ได้เพิ่มชั่วคราว");
    p.cards = p.cards.filter((x) => x.id !== c.id);
    r.stack.push({
      id: randomUUID(),
      playerId: id,
      card: c,
      target:
        c.type === "COUNTER"
          ? r.stack.at(-1)!.playerId
          : c.type === "TAKE CONTROL"
            ? r.bossId
            : a.target,
      investor: a.investor,
    });
    r.stackDeadline = Date.now() + 5000;
    invalidate(r);
    log(r, describeCard(r, r.stack.at(-1)!) + " · รอผล โต้กลับได้ 5 วินาที");
    return;
  }
  if (r.stack.length) throw Error("กำลังประมวลผลการ์ด");
  if (a.type === "SELECT_INVESTORS") {
    if (id !== r.bossId) throw Error("เฉพาะผู้นำเลือกผู้ร่วมดีลได้");
    if (
      !a.assignments ||
      typeof a.assignments !== "object" ||
      Array.isArray(a.assignments)
    )
      throw Error("รายชื่อผู้ร่วมดีลไม่ถูกต้อง");
    const entries = Object.entries(a.assignments);
    if (
      entries.some(
        ([i, pid]) =>
          !r.deal!.requiredInvestors.includes(i) ||
          typeof pid !== "string" ||
          !eligible(r, pid, i),
      )
    )
      throw Error("เลือกผู้เล่นที่มีนักลงทุนตรงกับดีลและไม่ถูกบล็อก");
    r.assignments = { ...a.assignments };
    invalidate(r);
    log(r, `${p.name} เปลี่ยนผู้ร่วมดีล ต้องเสนอส่วนแบ่งใหม่`);
    return;
  }
  if (a.type === "OFFER") {
    if (id !== r.bossId) throw Error("เฉพาะผู้นำเสนอส่วนแบ่งได้");
    if (!completeSelection(r))
      throw Error("เลือกนักลงทุนให้ครบทุกช่องก่อนแบ่งเงิน");
    if (!a.amounts || typeof a.amounts !== "object" || Array.isArray(a.amounts))
      throw Error("ข้อเสนอไม่ถูกต้อง");
    const ids = participants(r),
      entries = Object.entries(a.amounts);
    if (
      entries.length !== ids.length ||
      entries.some(
        ([k, v]) => !ids.includes(k) || !Number.isSafeInteger(v) || v < 0,
      ) ||
      ids.some((k) => !Object.hasOwn(a.amounts, k)) ||
      entries.reduce((s, [, v]) => s + v, 0) !== r.deal.value
    )
      throw Error("กรุณาแบ่งเงินครบมูลค่าดีลให้ผู้ร่วมดีลทุกคน");
    r.offer = { amounts: { ...a.amounts }, accepted: [id], rejected: [] };
    log(r, `${p.name} เสนอส่วนแบ่งใหม่`);
    settle(r);
    return;
  }
  if (a.type === "ACCEPT" || a.type === "REJECT") {
    if (!r.offer || !participants(r).includes(id) || !completeSelection(r))
      throw Error("ยังไม่มีข้อเสนอสำหรับคุณ");
    r.offer.accepted = r.offer.accepted.filter((x) => x !== id);
    r.offer.rejected = r.offer.rejected.filter((x) => x !== id);
    r.offer[a.type === "ACCEPT" ? "accepted" : "rejected"].push(id);
    log(r, `${p.name} ${a.type === "ACCEPT" ? "ยอมรับ" : "ปฏิเสธ"}ข้อเสนอ`);
    settle(r);
    return;
  }
  throw Error("ไม่รู้จักคำสั่งนี้");
}
export function tick(r: GameRoom, now = Date.now()) {
  if (r.status !== "playing") return false;
  let changed = false;
  if (now >= r.turnStartedAt + r.turnDuration) {
    next(r);
    return true;
  }
  if (r.stack.length && now >= (r.stackDeadline ?? 0)) {
    const base = r.stack[0];
    if (r.stack.length % 2 === 1) {
      const id = base.playerId;
      switch (base.card.type) {
        case "TAKE CONTROL":
          r.bossId = id;
          invalidate(r, true);
          break;
        case "BLOCK":
          r.blocked.push(base.target!);
          if (r.bossId === base.target) r.bossId = id;
          invalidate(r, true);
          break;
        case "REPLACE INVESTOR": {
          const from = r.players.find((p) => p.id === base.target),
            to = r.players.find((p) => p.id === id);
          const index = from?.investors.indexOf(base.investor!) ?? -1;
          if (from && to && index >= 0) {
            from.investors.splice(index, 1);
            to.investors.push(base.investor!);
            log(
              r,
              `${to.name} ยึด ${base.investor} จาก ${from.name} จนกว่าจะถูกยึดต่อ`,
            );
          }
          invalidate(r, true);
          break;
        }
        case "WILD INVESTOR":
          r.wildInvestors[id] = [
            ...(r.wildInvestors[id] ?? []),
            base.investor!,
          ];
          invalidate(r);
          break;
        case "STEAL DEAL":
          if (!r.extras.includes(id)) r.extras.push(id);
          invalidate(r);
          break;
      }
      log(r, describeCard(r, base) + " · มีผลแล้ว");
    } else
      log(
        r,
        describeCard(r, base) +
          " · ถูกโต้กลับโดย " +
          r.players.find((p) => p.id === r.stack.at(-1)!.playerId)?.name,
      );
    r.stack = [];
    r.stackDeadline = undefined;
    changed = true;
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
    if (!completeSelection(r)) {
      const assignments: Record<string, string> = {};
      for (const i of r.deal!.requiredInvestors) {
        const candidates = r.players.filter((p) => eligible(r, p.id, i));
        if (!candidates.length) return changed;
        assignments[i] = candidates[randomInt(candidates.length)].id;
      }
      act(r, boss.id, { type: "SELECT_INVESTORS", assignments });
    }
    const ids = participants(r),
      value = r.deal!.value,
      share = Math.floor(value / ids.length / 500000) * 500000;
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
    deck: [],
    players: r.players.map((p) => ({
      ...p,
      cards: p.id === id ? p.cards : [],
      cardCount: p.cards.length,
    })),
  };
}
