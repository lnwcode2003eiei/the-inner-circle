import { useId } from "react";
import type { CardType } from "../../shared/types";
import { CARD_ART, CARD_NAMES } from "../../shared/constants";
import "./TradingCard.css";

const faces: Record<
  CardType,
  {
    color: string;
    emblem: string;
    category: string;
    duration: string;
    lines: string[];
  }
> = {
  "TAKE CONTROL": {
    color: "#872e35",
    emblem: "♛",
    category: "อิทธิพล / เปลี่ยนผู้นำ",
    duration: "ผลเฉพาะดิลนี้",
    lines: [
      "ขึ้นเป็นหัวหน้าดิลแทนผู้นำคนเดิม",
      "เลือกผู้ร่วมดิลและเสนอส่วนแบ่งใหม่",
      "การยอมรับข้อเสนอเดิมจะถูกล้าง",
      "เมื่อขึ้นดิลใหม่ กลับสู่ลำดับผู้เล่นปกติ",
    ],
  },
  "REPLACE INVESTOR": {
    color: "#684581",
    emblem: "⇄",
    category: "อิทธิพล / ย้ายเจ้าของ",
    duration: "ยึดถาวร • ยึดต่อได้",
    lines: [
      "เลือกคู่แข่งและนักลงทุนจริง 1 ตัว",
      "ย้ายนักลงทุนตัวนั้นมาเป็นของคุณ",
      "ไม่คืนเมื่อจบดิล และอาจถูกยึดต่อได้",
      "ผู้นำต้องเลือกผู้ร่วมดิลใหม่",
      "ไม่สามารถยึดนักลงทุนชั่วคราว ★",
    ],
  },
  BLOCK: {
    color: "#9a3e25",
    emblem: "⊘",
    category: "อิทธิพล / กีดกันคู่แข่ง",
    duration: "ผลเฉพาะดิลนี้",
    lines: [
      "เลือกคู่แข่ง 1 คนให้ออกจากดิลนี้",
      "เป้าหมายร่วมดิลและใช้การ์ดไม่ได้",
      "ถ้าบล็อกผู้นำ คุณเป็นผู้นำแทน",
      "เลือกผู้ร่วมดิลใหม่ ไม่มีการยึดนักลงทุน",
      "เมื่อจบดิล เป้าหมายกลับมาเล่นได้",
    ],
  },
  COUNTER: {
    color: "#24547c",
    emblem: "↶",
    category: "ตอบโต้ / ยกเลิกการ์ด",
    duration: "ใช้ในช่วงตอบโต้เท่านั้น",
    lines: [
      "ใช้ขณะมีการ์ดรอทำงานเท่านั้น",
      "ยกเลิกการ์ดล่าสุดในชุดตอบโต้",
      "ผู้อื่นสามารถโต้กลับการ์ดนี้ได้อีก",
      "ทุกครั้งที่โต้กลับ เริ่มนับใหม่ 5 วินาที",
      "เมื่อหมดเวลา จึงสรุปผลของการ์ด",
    ],
  },
  "WILD INVESTOR": {
    color: "#92702a",
    emblem: "★",
    category: "อิทธิพล / นักลงทุนชั่วคราว",
    duration: "ผลเฉพาะดิลนี้",
    lines: [
      "เลือกตัวอักษร A–F เพิ่มให้ตัวเอง 1 ตัว",
      "แสดงตัวอักษรพร้อม ★ ข้างนักลงทุนเดิม",
      "ใช้เติมช่องนักลงทุนที่ดิลต้องการได้",
      "เจ้าของตัวอักษรเดิมยังคงถือของตน",
      "ตัวอักษร ★ หายไปเมื่อจบดิลนี้",
    ],
  },
  "STEAL DEAL": {
    color: "#256257",
    emblem: "+",
    category: "อิทธิพล / เข้าร่วมเจรจา",
    duration: "ผลเฉพาะดิลนี้",
    lines: [
      "เพิ่มตัวเองเป็นผู้ร่วมดิลนี้ทันที",
      "แม้ไม่ได้รับเลือกเป็นนักลงทุน",
      "ผู้นำต้องเสนอส่วนแบ่งใหม่รวมคุณ",
      "คุณมีสิทธิ์ยอมรับหรือปฏิเสธข้อเสนอ",
      "การ์ดนี้ไม่ได้รับประกันว่าจะได้เงิน",
    ],
  },
};

export function TradingCard({ type }: { type: CardType }) {
  const id = useId().replaceAll(":", ""),
    face = faces[type];
  return (
    <svg
      className="trading-card"
      viewBox="0 0 300 450"
      role="img"
      aria-labelledby={id + "-title " + id + "-desc"}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id={id + "-title"}>{CARD_NAMES[type]}</title>
      <desc id={id + "-desc"}>
        {face.category}。{face.lines.join("。")}。ทุกการ์ดเปิดให้โต้กลับ 5
        วินาทีและล้างข้อเสนอเดิม
      </desc>
      <defs>
        <linearGradient id={id + "-foil"} x2="1" y2="1">
          <stop stopColor="#f6e7bd" />
          <stop offset=".24" stopColor="#987442" />
          <stop offset=".5" stopColor="#efdba2" />
          <stop offset=".76" stopColor="#896134" />
          <stop offset="1" stopColor="#efdca7" />
        </linearGradient>
        <linearGradient id={id + "-paper"} x2="0" y2="1">
          <stop stopColor="#fff9e9" />
          <stop offset="1" stopColor="#e8d7b6" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="298" height="448" rx="13" fill="#172033" />
      <rect
        x="6"
        y="6"
        width="288"
        height="438"
        rx="9"
        fill={"url(#" + id + "-foil)"}
      />
      <rect
        x="11"
        y="11"
        width="278"
        height="428"
        rx="5"
        fill={face.color}
        stroke="#35291c"
      />
      <path
        d="M15 50 L285 50 M15 294 L285 294 M15 421 L285 421"
        stroke="#d7b874"
        strokeWidth="2"
      />
      <rect
        x="18"
        y="18"
        width="264"
        height="35"
        fill={"url(#" + id + "-paper)"}
        stroke="#513c22"
        strokeWidth="2"
      />
      <text x="27" y="42" fill="#252536" fontSize="19" fontWeight="800">
        {CARD_NAMES[type]}
      </text>
      <circle cx="264" cy="35" r="12" fill={face.color} stroke="#b4904f" />
      <text x="264" y="40" textAnchor="middle" fill="#fff1c7" fontSize="17">
        {face.emblem}
      </text>
      <text x="22" y="67" fill="#fff0cb" fontSize="8.5" letterSpacing="1.5">
        THE INNER CIRCLE
      </text>
      <text x="278" y="67" textAnchor="end" fill="#fff0cb" fontSize="9">
        เปิดให้โต้กลับ 5 วินาที
      </text>
      <rect
        x="18"
        y="75"
        width="264"
        height="212"
        fill="#0e192a"
        stroke="#ddc28a"
        strokeWidth="3"
      />
      <image
        href={"/art/" + CARD_ART[type] + ".png"}
        x="21"
        y="78"
        width="258"
        height="206"
        preserveAspectRatio="xMidYMid slice"
      />
      <text x="22" y="298" fill="#fff1d0" fontSize="8">
        ชุดนักเจรจา · การ์ดพิเศษ
      </text>
      <text x="279" y="298" textAnchor="end" fill="#fff1d0" fontSize="8">
        IC–{String(Object.keys(faces).indexOf(type) + 1).padStart(3, "0")}
      </text>
      <rect
        x="18"
        y="305"
        width="264"
        height="114"
        fill={"url(#" + id + "-paper)"}
        stroke="#513c22"
        strokeWidth="2"
      />
      <text x="25" y="321" fill="#302b26" fontSize="11" fontWeight="800">
        【{face.category}】
      </text>
      <text fill="#302b26" fontSize="10.8">
        {face.lines.map((line, i) => (
          <tspan key={line} x="26" y={338 + i * 15}>
            {line}
          </tspan>
        ))}
      </text>
      <text x="22" y="433" fill="#fff0ce" fontSize="9">
        {face.duration}
      </text>
      <text x="279" y="433" textAnchor="end" fill="#fff0ce" fontSize="8">
        ล้างข้อเสนอเดิมเมื่อใช้
      </text>
    </svg>
  );
}
