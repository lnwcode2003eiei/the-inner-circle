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
  ["โรงแรมเมอริเดียน", "hotel"],
  ["นอร์ทสตาร์ เวนเจอร์ส", "technology"],
  ["ศูนย์การค้าแกรนด์ อาร์เคด", "retail"],
  ["ท่าอากาศยานฮอไรซอน", "airport"],
  ["แอตลาส กรุ๊ป", "corporate"],
  ["รีสอร์ตริมทะเล", "hotel"],
  ["ศูนย์ข้อมูลออโรรา", "technology"],
  ["ตลาดไลฟ์สไตล์เซ็นทรัล", "retail"],
  ["ศูนย์ขนส่งสกายลิงก์", "airport"],
  ["อาคารสำนักงานเดอะคราวน์", "corporate"],
  ["วิลล่าบนภูเขา", "hotel"],
  ["ห้องวิจัยควอนตัม", "technology"],
  ["คอมมูนิตี้มอลล์ริเวอร์ไซด์", "retail"],
  ["สนามบินโอเชียน", "airport"],
  ["นิคมธุรกิจเอเวอร์กรีน", "corporate"],
  ["โรงแรมสกายพาเลซ", "hotel"],
  ["เครือข่ายพลังงานอัจฉริยะ", "technology"],
  ["ศูนย์การค้านานาชาติ", "retail"],
  ["สนามบินมหานคร", "airport"],
  ["กลุ่มทุนโกลเดนบริดจ์", "corporate"],
  ["เมืองพักผ่อนพาราไดซ์", "hotel"],
  ["มหานครนวัตกรรม", "technology"],
  ["ย่านการค้าเวิลด์สแควร์", "retail"],
  ["ศูนย์โลจิสติกส์ข้ามทวีป", "airport"],
  ["เครือบริษัทอินฟินิตี้", "corporate"],
  ["รีสอร์ตเกาะมุก", "hotel"],
  ["ศูนย์หุ่นยนต์อุตสาหกรรม", "technology"],
  ["ศูนย์แสดงสินค้านานาชาติ", "retail"],
  ["โครงการสนามบินนานาชาติ", "airport"],
  ["มหานครธุรกิจใหม่", "corporate"],
];
export const DEALS: Deal[] = projects.map(([name, artwork], i) => {
  const size = i < 10 ? 2 + (i % 3) : i < 20 ? 3 + (i % 3) : 4 + (i % 3);
  return {
    id: i + 1,
    name,
    artwork,
    sector: [
      "โรงแรมและบริการ",
      "เทคโนโลยี",
      "การค้า",
      "โครงสร้างพื้นฐาน",
      "การลงทุนเอกชน",
    ][i % 5],
    value: (5 + size * 2 + Math.floor(i / 5) * 2) * 1000000,
    requiredInvestors: Array.from(
      { length: size },
      (_, n) => INVESTORS[(i + n) % 6],
    ),
    difficulty: size <= 3 ? "เริ่มต้น" : size <= 4 ? "เชิงกลยุทธ์" : "ระดับสูง",
  };
});
