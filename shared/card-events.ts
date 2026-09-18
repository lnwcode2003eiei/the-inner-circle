import type { GameRoom } from "./types";
import { CARD_NAMES } from "./constants";
export function describeCard(
  room: Pick<GameRoom, "players" | "stack">,
  entry: GameRoom["stack"][number],
) {
  const name = (id?: string) =>
    room.players.find((p) => p.id === id)?.name ?? "ผู้เล่น";
  const prefix = `${name(entry.playerId)} ใช้ “${CARD_NAMES[entry.card.type]}”`;
  switch (entry.card.type) {
    case "BLOCK":
      return prefix + " ใส่ " + name(entry.target);
    case "REPLACE INVESTOR":
      return prefix + " ยึด " + entry.investor + " จาก " + name(entry.target);
    case "WILD INVESTOR":
      return prefix + " เพิ่ม " + entry.investor + "★ ให้ตัวเอง";
    case "COUNTER": {
      const index = room.stack.findIndex((s) => s.id === entry.id);
      const previous = room.stack[index - 1];
      return (
        prefix +
        " ต่อการ์ด" +
        (previous ? " “" + CARD_NAMES[previous.card.type] + "”" : "") +
        " ของ " +
        name(entry.target ?? previous?.playerId)
      );
    }
    case "TAKE CONTROL":
      return prefix + " รับตำแหน่งผู้นำจาก " + name(entry.target);
    case "STEAL DEAL":
      return prefix + " เพิ่มตัวเองเป็นผู้ร่วมดิล";
  }
}
