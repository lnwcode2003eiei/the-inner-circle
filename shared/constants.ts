import type { CardType, Deal } from "./types";
export const CARD_INFO: Record<CardType, string> = {
  "TAKE CONTROL": "ขึ้นเป็นผู้นำดีล แล้วกำหนดข้อเสนอใหม่",
  "REPLACE INVESTOR": "เป็นตัวแทนนักลงทุนที่ดีลนี้ต้องใช้",
  BLOCK: "กันคู่แข่งออกจากการเจรจาครั้งนี้",
  COUNTER: "ยกเลิกผลของการ์ดใบล่าสุดที่รอทำงาน",
  "WILD INVESTOR": "แทนนักลงทุนที่ต้องใช้ได้หนึ่งประเภทในดีลนี้",
  "STEAL DEAL": "เพิ่มตัวเองเป็นผู้ร่วมเจรจาแบ่งเงิน",
};
export const INVESTORS = ["A", "B", "C", "D", "E", "F"];
export const DEALS: Deal[] = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  name: [
    "โรงแรมเมอริเดียน",
    "นอร์ทสตาร์ เวนเจอร์ส",
    "ศูนย์การค้าแกรนด์ อาร์เคด",
    "ท่าอากาศยานฮอไรซอน",
    "แอตลาส กรุ๊ป",
  ][i % 5],
  sector: [
    "โรงแรมและบริการ",
    "เทคโนโลยี",
    "อสังหาริมทรัพย์",
    "โครงสร้างพื้นฐาน",
    "การลงทุนเอกชน",
  ][i % 5],
  value: [12, 5, 8, 18, 25][i % 5] * 1000000,
  requiredInvestors: [
    ["A", "B", "C"],
    ["A", "B"],
    ["A", "C", "D"],
    ["B", "C", "D", "E"],
    ["A", "B", "C", "D", "E"],
  ][i % 5],
  difficulty: ["ท้าทาย", "เริ่มต้น", "เชิงกลยุทธ์", "ซับซ้อน", "ระดับสูง"][
    i % 5
  ],
}));

export const CARD_NAMES: Record<CardType, string> = {
  "TAKE CONTROL": "ยึดอำนาจ",
  "REPLACE INVESTOR": "เปลี่ยนนักลงทุน",
  BLOCK: "สกัดคู่แข่ง",
  COUNTER: "โต้กลับ",
  "WILD INVESTOR": "นักลงทุนอิสระ",
  "STEAL DEAL": "แทรกดีล",
};
