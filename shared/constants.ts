import type { CardType, Deal } from "./types";
export const CARD_INFO: Record<CardType, string> = {
  "TAKE CONTROL": "ขึ้นเป็นผู้นำดีล แล้วกำหนดข้อเสนอใหม่",
  "REPLACE INVESTOR": "ยึดนักลงทุนจริงจากคู่แข่งมาเป็นของคุณ ยึดต่อได้",
  BLOCK: "กันคู่แข่งออกจากการเจรจาครั้งนี้",
  COUNTER: "ยกเลิกผลของการ์ดใบล่าสุดที่รอทำงาน",
  "WILD INVESTOR": "เพิ่มนักลงทุน A–F ชั่วคราวหนึ่งตัวจนจบดีล",
  "STEAL DEAL": "เพิ่มตัวเองเป็นผู้ร่วมเจรจาแบ่งเงิน",
};
export const INVESTORS = ["A", "B", "C", "D", "E", "F"];
export const CARD_NAMES: Record<CardType, string> = {
  "TAKE CONTROL": "ยึดอำนาจ",
  "REPLACE INVESTOR": "เปลี่ยนนักลงทุน",
  BLOCK: "สกัดคู่แข่ง",
  COUNTER: "โต้กลับ",
  "WILD INVESTOR": "นักลงทุนอิสระ",
  "STEAL DEAL": "แทรกดีล",
};

export const MAX_PLAYERS = 12;
export const totalDealsFor = (count: number) =>
  count <= 6 ? 15 : count <= 9 ? 20 : 25;
export const CARD_ART: Record<CardType, string> = {
  "TAKE CONTROL": "control",
  "REPLACE INVESTOR": "replace",
  BLOCK: "block",
  COUNTER: "counter",
  "WILD INVESTOR": "wild",
  "STEAL DEAL": "steal",
};
const projects = [
  ["โรงเตี๊ยมกวางทอง", "hotel"],
  ["โรงตีเหล็กริมกำแพง", "technology"],
  ["ตลาดจัตุรัสเมือง", "retail"],
  ["ท่าเรือสะพานหิน", "airport"],
  ["สมาคมพ่อค้าหลวง", "corporate"],
  ["โรงเตี๊ยมริมธาร", "hotel"],
  ["โรงช่างตรามงกุฎ", "technology"],
  ["ตลาดผ้าขนสัตว์", "retail"],
  ["ท่าเรือแม่น้ำเหนือ", "airport"],
  ["หอประชุมกิลด์ช่าง", "corporate"],
  ["โรงเตี๊ยมเนินหมอก", "hotel"],
  ["โรงหล่อระฆัง", "technology"],
  ["ตลาดเครื่องเทศ", "retail"],
  ["ท่าเรืออ่าวพ่อค้า", "airport"],
  ["สมาคมพ่อค้าผ้า", "corporate"],
  ["โรงเตี๊ยมประตูเมือง", "hotel"],
  ["โรงช่างเกราะ", "technology"],
  ["ตลาดข้างวิหาร", "retail"],
  ["ท่าเรือกำแพงตะวันออก", "airport"],
  ["หอสมาคมขนสัตว์", "corporate"],
  ["โรงเตี๊ยมม้าขาว", "hotel"],
  ["โรงช่างทำเครื่องมือ", "technology"],
  ["ตลาดเทศกาลฤดูใบไม้ร่วง", "retail"],
  ["ท่าเรือขนส่งธัญพืช", "airport"],
  ["สมาคมพ่อค้าแม่น้ำ", "corporate"],
  ["โรงเตี๊ยมสะพานเก่า", "hotel"],
  ["โรงช่างตีดาบ", "technology"],
  ["ตลาดค้าธัญพืช", "retail"],
  ["ท่าเรือกองเรือหลวง", "airport"],
  ["หอสมาคมมหาพ่อค้า", "corporate"],
];
export const DEALS: Deal[] = projects.map(([name, artwork], i) => {
  const size = i < 10 ? 2 + (i % 3) : i < 20 ? 3 + (i % 3) : 4 + (i % 3);
  return {
    id: i + 1,
    name,
    artwork,
    sector: [
      "โรงเตี๊ยมและที่พัก",
      "งานช่างและโรงตีเหล็ก",
      "การค้า",
      "ท่าเรือและการขนส่ง",
      "สมาคมพ่อค้า",
    ][i % 5],
    value: (5 + size * 2 + Math.floor(i / 5) * 2) * 1000000,
    requiredInvestors: Array.from(
      { length: size },
      (_, n) => INVESTORS[(i + n) % 6],
    ),
    difficulty: size <= 3 ? "เริ่มต้น" : size <= 4 ? "เชิงกลยุทธ์" : "ระดับสูง",
  };
});
