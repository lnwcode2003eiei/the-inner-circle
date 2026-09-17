import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  ArrowRight,
  AudioLines,
  VolumeX,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Crown,
  Diamond,
  DoorOpen,
  Globe2,
  GraduationCap,
  Handshake,
  HelpCircle,
  Layers3,
  LayoutDashboard,
  Link2,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { socket } from "./services/socket";
import type { Action, ActionCard, GameRoom, Reply } from "../shared/types";
import {
  CARD_INFO,
  CARD_NAMES,
  CARD_ART,
  INVESTORS,
  totalDealsFor,
} from "../shared/constants";
import "./index.css";
import "./thai-theme.css";
const money = (n: number) =>
  `฿${(n / 1000000).toLocaleString("th-TH", { maximumFractionDigits: 2 })} ล้าน`;
const portraits = [
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
];
const investorNames = [
  "อเล็กซานดรา • เงินทุน",
  "เบนเน็ตต์ • เทคโนโลยี",
  "เซลีน • อสังหาริมทรัพย์",
  "โดมินิก • อุตสาหกรรม",
  "เอเลนา • ธุรกิจร่วมทุน",
  "เฟลิกซ์ • การเงิน",
];
function App() {
  const [page, setPage] = useState("boardroom"),
    [modal, setModal] = useState(
      location.pathname.includes("/game/") &&
        !localStorage.getItem("gamePlayerToken")
        ? "join"
        : "",
    ),
    [name, setName] = useState(localStorage.getItem("ic-name") || ""),
    [code, setCode] = useState(location.pathname.split("/game/")[1] || ""),
    [room, setRoom] = useState<GameRoom>(),
    [myId, setMyId] = useState(""),
    [connected, setเชื่อมต่อแล้ว] = useState(false),
    [pending, setPending] = useState(false),
    [notice, setNotice] = useState(""),
    [muted, setMuted] = useState(localStorage.getItem("ic-muted") === "true"),
    [chatOpen, setChatOpen] = useState(false),
    [chat, setChat] = useState(""),
    [tab, setTab] = useState("chat"),
    [now, setNow] = useState(() => Date.now()),
    [amounts, setAmounts] = useState<Record<string, number>>({}),
    [selected, setSelected] = useState<ActionCard>(),
    [target, setTarget] = useState(""),
    [investor, setInvestor] = useState("A"),
    [records, setRecords] = useState<any[]>([]),
    [dataLoading, setDataLoading] = useState(false);
  const notify = (s: string) => setNotice(s);
  const roomSnapshot = useRef<GameRoom | undefined>(undefined);
  const previousSound = useRef({ round: 0, stack: 0, money: 0, status: "" });
  useEffect(() => {
    if (!modal) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input, select, [tabindex="0"]',
        ) ?? [],
      );
    (dialog?.querySelector<HTMLElement>("input") ?? focusable()[0])?.focus();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal("");
      if (e.key !== "Tab") return;
      const items = focusable(),
        first = items[0],
        last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", onKey);
      previousFocus?.focus();
    };
  }, [modal]);
  useEffect(() => {
    const onState = (r: GameRoom) => {
      const previous = roomSnapshot.current;
      if (
        previous &&
        (previous.round !== r.round ||
          previous.bossId !== r.bossId ||
          JSON.stringify(previous.assignments) !==
            JSON.stringify(r.assignments) ||
          r.stack.length > 0)
      )
        setModal((current) => (current === "offer" ? "" : current));
      roomSnapshot.current = r;
      setRoom(r);
    };
    const onConnect = () => {
      setเชื่อมต่อแล้ว(true);
      const token = localStorage.getItem("gamePlayerToken"),
        savedCode = localStorage.getItem("ic-room");
      if (token && savedCode)
        socket.emit("player:reconnect", { token, code: savedCode }, (r) => {
          if (r.error) {
            localStorage.removeItem("gamePlayerToken");
            localStorage.removeItem("ic-room");
            setRoom(undefined);
            notify(r.error);
          } else {
            setRoom(r.room);
            setMyId(r.playerId!);
            setModal("");
            setPage("boardroom");
          }
        });
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", () => setเชื่อมต่อแล้ว(false));
    socket.on("game:state", onState);
    socket.on("system:error", notify);
    socket.connect();
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(interval);
      socket.off("connect", onConnect);
      socket.off("game:state", onState);
      socket.off("disconnect");
      socket.off("system:error", notify);
    };
  }, []);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 4500);
      return () => clearTimeout(t);
    }
  }, [notice]);
  useEffect(() => {
    if (!room) return;
    const current = {
      round: room.round,
      stack: room.stack.length,
      money: room.players.find((p) => p.id === myId)?.money ?? 0,
      status: room.status,
    };
    const before = previousSound.current;
    previousSound.current = current;
    const cue =
      current.status === "finished" && before.status !== "finished"
        ? "victory"
        : current.money > before.money
          ? "money"
          : current.stack > before.stack
            ? "card"
            : current.round !== before.round
              ? "turn"
              : "";
    if (muted || !cue) return;
    const audio = new Audio(`/sounds/${cue}.wav`);
    audio.volume = 0.2;
    audio.play().catch(() => {});
  }, [room, muted, myId]);
  useEffect(() => {
    if (!["leaderboard", "history"].includes(page)) return;
    // Loading state mirrors an external HTTP request, not derived render data.
    // eslint-disable-next-line react/set-state-in-effect
    setDataLoading(true);
    const controller = new AbortController();
    fetch(
      `${import.meta.env.VITE_SERVER_URL || "http://localhost:3001"}/api/${page}`,
      { signal: controller.signal },
    )
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setRecords)
      .catch(() => {
        if (!controller.signal.aborted)
          notify("โหลดข้อมูลไม่ได้ กรุณาตรวจสอบการเชื่อมต่อเซิร์ฟเวอร์");
      })
      .finally(() => {
        if (!controller.signal.aborted) setDataLoading(false);
      });
    return () => controller.abort();
  }, [page]);
  const enter = (practice = false) => {
    if (!name.trim()) {
      notify("กรุณากรอกชื่อก่อนเข้าร่วมเกม");
      return;
    }
    if (!connected) {
      notify("กำลังเชื่อมต่อเซิร์ฟเวอร์เกม กรุณาลองอีกครั้งสักครู่");
      return;
    }
    setPending(true);
    localStorage.setItem("ic-name", name);
    const cb = (r: Reply) => {
      setPending(false);
      if (r.error) {
        notify(r.error);
        return;
      }
      setRoom(r.room);
      setMyId(r.playerId!);
      localStorage.setItem("gamePlayerToken", r.token!);
      localStorage.setItem("ic-room", r.room!.code);
      history.replaceState({}, "", `/game/${r.room!.code}`);
      window.scrollTo({ top: 0 });
      setModal("");
      setPage("boardroom");
    };
    if (modal === "join" && !practice)
      socket
        .timeout(10000)
        .emit("room:join", { name, code: code.toUpperCase() }, (err, r) =>
          err
            ? (setPending(false),
              notify("เซิร์ฟเวอร์ไม่ตอบสนอง กรุณาลองอีกครั้ง"))
            : cb(r),
        );
    else
      socket
        .timeout(10000)
        .emit("room:create", { name, practice }, (err, r) =>
          err
            ? (setPending(false),
              notify("เซิร์ฟเวอร์ไม่ตอบสนอง กรุณาลองอีกครั้ง"))
            : cb(r),
        );
  };
  const action = (a: Action) => {
    socket.timeout(8000).emit("player:action", a, (err, r) => {
      if (err) notify("การเชื่อมต่อขัดข้อง กรุณาลองอีกครั้ง");
      else if (r.error) notify(r.error);
      else if (a.type === "LEAVE") {
        setRoom(undefined);
        localStorage.removeItem("gamePlayerToken");
        localStorage.removeItem("ic-room");
        history.replaceState({}, "", "/");
        window.scrollTo({ top: 0 });
      } else if (a.type === "OFFER" || a.type === "PLAY_CARD") setModal("");
    });
  };
  const me = room?.players.find((p) => p.id === myId),
    boss = room?.players.find((p) => p.id === room.bossId),
    isBoss = myId === room?.bossId;
  const participants = room
    ? [
        ...new Set(
          [
            room.bossId,
            ...Object.values(room.assignments),
            ...room.extras,
          ].filter((id) => !!id && !room.blocked.includes(id)),
        ),
      ]
    : [];
  const eligibleFor = (pid: string, i: string) =>
    !!room &&
    !room.blocked.includes(pid) &&
    (room.players.find((p) => p.id === pid)?.investors.includes(i) ||
      (room.wildInvestors[pid] ?? []).includes(i));
  const selectionComplete =
    !!room?.deal &&
    room.deal.requiredInvestors.every((i) =>
      eligibleFor(room.assignments[i], i),
    );
  const allocated = participants.reduce(
    (sum, id) => sum + (amounts[id] ?? 0),
    0,
  );
  const remaining = (room?.deal?.value ?? 0) - allocated;
  const openOffer = () => {
    if (!selectionComplete) {
      notify("เลือกผู้ร่วมดีลให้ครบก่อน");
      return;
    }
    setAmounts(Object.fromEntries(participants.map((id) => [id, 0])));
    setModal("offer");
  };
  const adjustMoney = (id: string, direction: number) =>
    setAmounts((previous) => {
      const current = previous[id] ?? 0;
      const next =
        direction > 0
          ? current === 0
            ? 1000000
            : current + 500000
          : current <= 1000000
            ? 0
            : current - 500000;
      const others = participants
        .filter((p) => p !== id)
        .reduce((sum, p) => sum + (previous[p] ?? 0), 0);
      return next >= 0 && others + next <= (room?.deal?.value ?? 0)
        ? { ...previous, [id]: next }
        : previous;
    });
  const copy = () =>
    navigator.clipboard
      .writeText(`${location.origin}/game/${room?.code}`)
      .then(() => notify("คัดลอกลิงก์เชิญแล้ว ส่งให้เพื่อนได้เลย"))
      .catch(() => notify(`รหัสห้อง: ${room?.code}`));
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setPage("boardroom");
          }}
        >
          <div className="brand-symbol">
            <Diamond size={25} />
            <span />
          </div>
          <div>
            THE INNER<span>CIRCLE</span>
          </div>
        </a>
        <div className="club-tag">เมื่อความทะเยอทะยานพบโอกาส</div>
        <div className="nav-label">คลับส่วนตัวของคุณ</div>
        <nav>
          {[
            { id: "boardroom", icon: LayoutDashboard, label: "ห้องเจรจา" },
            { id: "leaderboard", icon: Trophy, label: "อันดับนักเจรจา" },
            { id: "history", icon: Clock3, label: "ประวัติการเล่น" },
          ].map((n) => (
            <button
              className={page === n.id ? "active" : ""}
              key={n.id}
              onClick={() => setPage(n.id)}
            >
              <n.icon size={18} />
              {n.label}
              {page === n.id && <span className="nav-dot" />}
            </button>
          ))}
          <div className="nav-divider" />
          <button
            className={page === "rules" ? "active" : ""}
            onClick={() => setPage("rules")}
          >
            <GraduationCap size={19} />
            วิธีเล่น
            <ArrowUpRight size={14} className="end" />
          </button>
          <button onClick={() => setModal("cards")}>
            <Layers3 size={18} />
            คลังการ์ด
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="club-card">
            <Diamond size={20} />
            <span>
              หนึ่งที่นั่งบนโต๊ะเจรจา
              <br />
              <strong>โอกาสสร้างความสำเร็จ</strong>
            </span>
            <div className="mini-line" />
          </div>
          <button className="help-link" onClick={() => setModal("help")}>
            <HelpCircle size={17} /> ความช่วยเหลือและกติกา{" "}
            <ArrowUpRight size={14} />
          </button>
          <div className="sidebar-foot">
            <span className="green-dot" /> พร้อมเปิดโต๊ะเจรจา <span>v1.0</span>
          </div>
        </div>
      </aside>
      <main>
        <header>
          <div className="breadcrumb">
            หน้าหลัก <ChevronRight size={14} />{" "}
            <strong>
              {page === "boardroom"
                ? "ห้องเจรจา"
                : page === "leaderboard"
                  ? "อันดับนักเจรจา"
                  : page === "history"
                    ? "ประวัติการเล่น"
                    : "วิธีเล่น"}
            </strong>
          </div>
          <div className="header-right">
            <span className="live-status">
              <span className={connected ? "green-dot" : "amber-dot"} />
              {connected ? "เชื่อมต่อแล้ว" : "กำลังเชื่อมต่อ"}
            </span>
            <button
              className="icon-button"
              aria-label={muted ? "เปิดเสียง" : "ปิดเสียง"}
              onClick={() => {
                setMuted(!muted);
                localStorage.setItem("ic-muted", String(!muted));
              }}
            >
              {muted ? <VolumeX size={18} /> : <AudioLines size={18} />}
            </button>
            <span className="header-divider" />
            <div className="profile-avatar">
              {(name || "G").slice(0, 1).toUpperCase()}
            </div>
            <div className="profile-name">
              {name || "ผู้เล่นทั่วไป"}
              <span>{room ? "อยู่ที่โต๊ะเจรจา" : "พร้อมเข้าสู่วงเจรจา"}</span>
            </div>
          </div>
        </header>
        <div className="page-content">
          {page === "boardroom" && !room && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span /> ศิลปะแห่งการเจรจา
                  </div>
                  <h1>ยินดีต้อนรับสู่ห้องเจรจา</h1>
                  <p>สร้างพันธมิตร ต่อรองส่วนแบ่ง แล้วก้าวขึ้นเป็นผู้ชนะ</p>
                </div>
                <span className="edition">
                  <Diamond size={14} /> ฉบับปฐมฤกษ์
                </span>
              </div>
              <section className="hero">
                <img
                  src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1800&q=85"
                  alt="ตึกระฟ้าสมัยใหม่ใจกลางย่านธุรกิจ"
                />
                <div className="hero-shade" />
                <div className="hero-grid" />
                <div className="hero-content">
                  <div className="hero-kicker">
                    <span /> ดีลใหญ่ วัดกันที่ชั้นเชิง
                  </div>
                  <h2>
                    โอกาสเป็นของ
                    <br />
                    <em>นักเจรจา</em>
                  </h2>
                  <p>
                    สิบสองที่นั่ง โอกาสไม่รู้จบ เกมแห่งธุรกิจ
                    <br className="desktop-break" /> พันธมิตร
                    และคำสัญญาที่อาจเปลี่ยนไป
                  </p>
                  <div className="hero-buttons">
                    <button
                      className="gold-button"
                      onClick={() => setModal("create")}
                    >
                      <Plus size={18} />
                      สร้างห้อง <ArrowRight size={17} />
                    </button>
                    <button
                      className="glass-button"
                      onClick={() => setModal("join")}
                    >
                      <Link2 size={17} />
                      เข้าร่วมห้อง
                    </button>
                  </div>
                  <div className="hero-meta">
                    <span>
                      <Users size={15} />
                      ผู้เล่น 3–12 คน
                    </span>
                    <i />
                    <span>
                      <Clock3 size={15} />
                      20–40 นาที
                    </span>
                    <i />
                    <span>
                      <Globe2 size={15} />
                      เล่นได้จากทุกที่
                    </span>
                  </div>
                </div>
                <div className="hero-seal">
                  <Diamond size={23} />
                  <span>
                    ทุกข้อตกลง
                    <br />
                    มีราคาของมัน
                  </span>
                </div>
                <div className="hero-bottom-label">
                  เมืองนี้รอคุณอยู่ เริ่มเกมของคุณได้เลย<span>01 / 03</span>
                </div>
              </section>
              <div className="feature-strip">
                <div>
                  <div className="feature-icon">
                    <Handshake />
                  </div>
                  <span>
                    <strong>ผู้เล่นจริง เจรจากันจริง</strong>
                    <small>ทุกพันธมิตรมีความหมาย ทุกข้อเสนอมีค่า</small>
                  </span>
                </div>
                <div>
                  <div className="feature-icon">
                    <ShieldCheck />
                  </div>
                  <span>
                    <strong>วัดกันที่ฝีมือ</strong>
                    <small>วางกลยุทธ์ให้ดี แล้วคว้าโอกาสของคุณ</small>
                  </span>
                </div>
                <div>
                  <div className="feature-icon">
                    <Sparkles />
                  </div>
                  <span>
                    <strong>ไม่มีดีลไหนเหมือนกัน</strong>
                    <small>การ์ดพลิกเกม เปลี่ยนความได้เปรียบได้เสมอ</small>
                  </span>
                </div>
              </div>
              <div className="section-title">
                <div>
                  <span className="eyebrow">ก้าวต่อไปของคุณ</span>
                  <h2>ชัยชนะมีได้มากกว่าหนึ่งทาง</h2>
                </div>
                <button
                  className="text-button"
                  onClick={() => setPage("rules")}
                >
                  เรียนรู้กติกา <ArrowUpRight size={16} />
                </button>
              </div>
              <div className="path-cards">
                <button
                  className="path-card"
                  onClick={() => setModal("practice")}
                >
                  <div className="path-top">
                    <span className="path-icon">
                      <GraduationCap size={24} />
                    </span>
                    <span className="small-tag">เพิ่งเริ่มเล่นใช่ไหม?</span>
                  </div>
                  <h3>ค้นหาชั้นเชิงของคุณ</h3>
                  <p>
                    ลองฝึกเจรจาในเกมจำลอง
                    <br />
                    ไม่ต้องกดดัน ลองได้ทุกกลยุทธ์
                  </p>
                  <div className="path-link">
                    เข้าสู่ห้องฝึกเล่น <ArrowRight size={17} />
                  </div>
                  <span className="path-number">01</span>
                </button>
                <button className="path-card" onClick={() => setModal("cards")}>
                  <div className="path-top">
                    <span className="path-icon">
                      <Layers3 size={23} />
                    </span>
                    <div className="mini-cards">
                      <span>♢</span>
                      <span>♧</span>
                      <span>♔</span>
                    </div>
                  </div>
                  <h3>มีไม้เด็ดไว้เสมอ</h3>
                  <p>
                    แย่งอำนาจ สกัดคู่แข่ง หรือพลิกสถานการณ์
                    <br />
                    รู้จักการ์ดพิเศษทั้ง 6 แบบ
                  </p>
                  <div className="path-link">
                    สำรวจคลังการ์ด <ArrowRight size={17} />
                  </div>
                  <span className="path-number">02</span>
                </button>
                <button
                  className="path-card"
                  onClick={() => setPage("leaderboard")}
                >
                  <div className="path-top">
                    <span className="path-icon">
                      <Trophy size={22} />
                    </span>
                    <span className="small-tag">ทำเนียบนักเจรจา</span>
                  </div>
                  <h3>สร้างชื่อในวงการ</h3>
                  <p>
                    ดีลที่ดีสร้างความมั่งคั่ง
                    <br />
                    นักเจรจาที่เก่งสร้างชื่อเสียง
                  </p>
                  <div className="path-link">
                    ดูอันดับนักเจรจา <ArrowRight size={17} />
                  </div>
                  <span className="path-number">03</span>
                </button>
              </div>
              <div className="quote">
                <span>“</span> บนโต๊ะนี้ คำพูดคือทุนของคุณ จงใช้ให้คุ้มค่า
                <span>”</span>
              </div>
            </>
          )}
          {page === "boardroom" && room && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span />{" "}
                    {room.players.some((p) => p.bot)
                      ? "ห้องฝึกเล่น"
                      : "ห้องส่วนตัว"}{" "}
                    · {room.code}
                  </div>
                  <h1>
                    {room.status === "lobby"
                      ? "รวมทีมให้พร้อม แล้วเริ่มเจรจา"
                      : room.status === "finished"
                        ? "โฉมหน้าผู้ชนะคนใหม่"
                        : "มาเจรจากันเถอะ"}
                  </h1>
                  <p>
                    {room.status === "lobby"
                      ? "ชวนเพื่อนมาเป็นพันธมิตร หรือคู่แข่งคนต่อไป"
                      : "โอกาสอยู่ตรงหน้า คุณต้องการส่วนแบ่งเท่าไร?"}
                  </p>
                </div>
                <button
                  className="outline-button"
                  onClick={() =>
                    room.players.some((p) => p.bot)
                      ? action({ type: "LEAVE" })
                      : copy()
                  }
                >
                  {room.players.some((p) => p.bot) ? (
                    <DoorOpen size={16} />
                  ) : (
                    <Copy size={16} />
                  )}{" "}
                  {room.players.some((p) => p.bot)
                    ? "ออกจากห้องฝึก"
                    : "ชวนเพื่อน"}
                </button>
              </div>
              {room.status === "lobby" ? (
                <div className="lobby-layout">
                  <section className="panel lobby-players">
                    <div className="panel-title">
                      <h2>ผู้เล่นในห้อง</h2>
                      <span>{room.players.length} / 12 คน</span>
                    </div>
                    {room.players.map((p) => (
                      <div className="lobby-player" key={p.id}>
                        <img src={portraits[p.avatar % 4]} alt="" />
                        <div>
                          <strong>
                            {p.name} {p.id === myId && <small>(คุณ)</small>}
                          </strong>
                          <span>
                            {p.id === room.hostId
                              ? "เจ้าของห้อง · ผู้เปิดโต๊ะเจรจา"
                              : p.connected
                                ? "อยู่ที่โต๊ะเจรจา"
                                : "กำลังเชื่อมต่อใหม่…"}
                          </span>
                        </div>
                        <span
                          className={p.ready ? "ready-pill" : "waiting-pill"}
                        >
                          {p.ready
                            ? "พร้อมแล้ว"
                            : p.id === room.hostId
                              ? "เจ้าของห้อง"
                              : "ยังไม่พร้อม"}
                        </span>
                      </div>
                    ))}
                    {Array.from(
                      { length: 12 - room.players.length },
                      (_, i) => (
                        <button key={i} className="empty-seat" onClick={copy}>
                          <Plus size={19} />
                          ยังมีที่ว่าง รอเพื่อนมาเข้าร่วม
                          <Link2 size={16} />
                        </button>
                      ),
                    )}
                  </section>
                  <section className="panel lobby-settings">
                    <Crown size={35} />
                    <h2>คำเชิญสำหรับคนพิเศษ</h2>
                    <p>
                      ส่งรหัสห้องให้เพื่อน 2–11 คน
                      ทุกคนต้องกดพร้อมก่อนเริ่มดีลแรก
                    </p>
                    <div className="room-code">{room.code}</div>
                    <p>
                      เกมนี้มี {totalDealsFor(room.players.length)} ดีล ·
                      สุ่มผู้เริ่มและนักลงทุนเมื่อเริ่มเกม
                    </p>
                    <button className="gold-button full" onClick={copy}>
                      <Copy size={16} />
                      คัดลอกลิงก์เชิญ
                    </button>
                    <button
                      className="outline-button full"
                      onClick={() => action({ type: "READY" })}
                    >
                      {me?.ready ? <Check size={16} /> : <Users size={16} />}{" "}
                      {me?.ready ? "พร้อมแล้ว — กดเพื่อยกเลิก" : "ฉันพร้อมแล้ว"}
                    </button>
                    {myId === room.hostId && (
                      <button
                        className="gold-button full"
                        disabled={
                          room.players.length < 3 ||
                          !room.players.every((p) => p.ready || p.id === myId)
                        }
                        onClick={() => action({ type: "START" })}
                      >
                        เริ่มเกม <ArrowRight size={16} />
                      </button>
                    )}
                    <button
                      className="text-button full"
                      onClick={() => action({ type: "LEAVE" })}
                    >
                      <DoorOpen size={16} />
                      ออกจากห้อง
                    </button>
                  </section>
                </div>
              ) : room.status === "finished" ? (
                <section className="panel results">
                  <Trophy size={48} />
                  <div className="eyebrow">อันดับเมื่อจบเกม</div>
                  <h2>
                    {
                      [...room.players].sort((a, b) => b.money - a.money)[0]
                        .name
                    }{" "}
                    ครองโต๊ะเจรจาในเกมนี้
                  </h2>
                  {[...room.players]
                    .sort((a, b) => b.money - a.money)
                    .map((p, i) => (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="rank-row"
                        key={p.id}
                      >
                        <span>0{i + 1}</span>
                        <img src={portraits[p.avatar % 4]} alt="" />
                        <strong>{p.name}</strong>
                        <b>{money(p.money)}</b>
                      </motion.div>
                    ))}
                  <div className="hero-buttons">
                    {myId === room.hostId && (
                      <button
                        className="gold-button"
                        onClick={() => action({ type: "AGAIN" })}
                      >
                        เล่นอีกครั้ง <ArrowRight size={16} />
                      </button>
                    )}
                    <button
                      className="outline-button"
                      onClick={() => action({ type: "LEAVE" })}
                    >
                      กลับหน้าหลัก
                    </button>
                  </div>
                </section>
              ) : (
                <>
                  <div className="game-top">
                    <span>
                      <Layers3 size={17} /> ดีล{" "}
                      <b>{String(room.round).padStart(2, "0")}</b> /{" "}
                      {room.totalDeals}
                    </span>
                    <span>
                      <Crown size={17} /> ผู้นำดีล <b>{boss?.name}</b>
                    </span>
                    <span
                      className={
                        now > room.turnStartedAt + room.turnDuration - 15000
                          ? "urgent"
                          : ""
                      }
                    >
                      <Clock3 size={17} />
                      <b>
                        {Math.max(
                          0,
                          Math.ceil(
                            (room.turnStartedAt + room.turnDuration - now) /
                              1000,
                          ),
                        )}
                        วิ
                      </b>{" "}
                      ก่อนปิดดีล
                    </span>
                  </div>
                  <div className="game-layout">
                    <div className="players-column">
                      <div className="eyebrow">นักเจรจา</div>
                      {room.players.map((p, turnIndex) => (
                        <motion.div
                          layout
                          className={`player-panel ${p.id === room.bossId ? "leader" : ""}`}
                          key={p.id}
                        >
                          <div className="player-top">
                            <img src={portraits[p.avatar % 4]} alt="" />
                            <div>
                              <strong>
                                <span className="turn-number">
                                  {turnIndex + 1}
                                </span>{" "}
                                {p.name}
                              </strong>
                              <small>
                                {p.id === myId
                                  ? "คุณ"
                                  : p.bot
                                    ? "คู่แข่งจำลอง"
                                    : p.connected
                                      ? "เชื่อมต่อแล้ว"
                                      : "กำลังเชื่อมต่อใหม่"}
                              </small>
                            </div>
                            {p.id === room.bossId && <Crown size={16} />}
                          </div>
                          <div className="player-money">
                            {money(p.money)}
                            <span>
                              <Layers3 size={12} />
                              {p.cardCount}
                            </span>
                          </div>
                          <div className="investor-row">
                            {p.investors.map((i, investorIndex) => (
                              <span
                                key={`${i}-${investorIndex}`}
                                className={`investor-chip investor-${i}`}
                                title={investorNames[i.charCodeAt(0) - 65]}
                              >
                                {i}
                              </span>
                            ))}
                            {(room.wildInvestors[p.id] ?? []).map((i) => (
                              <span
                                key={"wild-" + i}
                                className={`investor-chip investor-${i} wild-chip`}
                                title="ชั่วคราวจนจบดีล"
                              >
                                {i}★
                              </span>
                            ))}
                            <small>
                              {room.blocked.includes(p.id)
                                ? "ถูกบล็อก"
                                : room.offer?.accepted.includes(p.id)
                                  ? "✓ ยอมรับแล้ว"
                                  : room.offer?.rejected.includes(p.id)
                                    ? "ปฏิเสธแล้ว"
                                    : ""}
                            </small>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    <div className="deal-column">
                      <motion.section
                        key={room.round}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="deal-card"
                      >
                        <div className="deal-image">
                          <img
                            src={`/art/${room.deal?.artwork}.png`}
                            alt="สถาปัตยกรรมร่วมสมัยของโครงการ"
                          />
                          <span className="small-tag">{room.deal?.sector}</span>
                          <span className="deal-index">
                            Nº {String(room.round).padStart(2, "0")}
                          </span>
                        </div>
                        <div className="deal-body">
                          <span className="eyebrow">โอกาสที่ไม่ควรพลาด</span>
                          <h2>{room.deal?.name}</h2>
                          <div className="deal-value">
                            {money(room.deal?.value ?? 0)}
                            <span>มูลค่าดีล</span>
                          </div>
                          <div className="deal-requirements">
                            <span>นักลงทุนที่ต้องใช้</span>
                            <div>
                              {room.deal?.requiredInvestors.map((i) => (
                                <span
                                  title={investorNames[i.charCodeAt(0) - 65]}
                                  className={`investor-chip investor-${i}`}
                                  key={i}
                                >
                                  {i}
                                </span>
                              ))}
                            </div>
                            <small>{room.deal?.difficulty}</small>
                          </div>
                          <div className="investor-selection">
                            <h3>เลือกผู้ร่วมดีล</h3>
                            <p>
                              เลือกเจ้าของนักลงทุนแต่ละตัว
                              ผู้เล่นคนเดียวเติมได้หลายช่อง
                            </p>
                            {room.deal?.requiredInvestors.map((i) => (
                              <label key={i}>
                                <span className={`investor-chip investor-${i}`}>
                                  {i}
                                </span>
                                <select
                                  aria-label={"ผู้ร่วมดีลนักลงทุน " + i}
                                  disabled={!isBoss || room.stack.length > 0}
                                  value={room.assignments[i] ?? ""}
                                  onChange={(e) => {
                                    const assignments = { ...room.assignments };
                                    if (e.target.value)
                                      assignments[i] = e.target.value;
                                    else delete assignments[i];
                                    action({
                                      type: "SELECT_INVESTORS",
                                      assignments,
                                    });
                                  }}
                                >
                                  <option value="">เลือกผู้เล่น</option>
                                  {room.players
                                    .filter((p) => eligibleFor(p.id, i))
                                    .map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name}
                                        {p.investors.includes(i)
                                          ? ""
                                          : " · " + i + "★"}
                                      </option>
                                    ))}
                                </select>
                              </label>
                            ))}
                            <small>
                              {selectionComplete
                                ? "เลือกครบแล้ว พร้อมแบ่งเงิน"
                                : "ต้องเลือกให้ครบทุกตัวอักษร"}
                            </small>
                          </div>
                          {room.stack.length > 0 ? (
                            <div className="stack-banner">
                              <Swords size={18} />
                              {CARD_NAMES[room.stack.at(-1)!.card.type]} ·{" "}
                              {Math.max(
                                0,
                                Math.ceil(
                                  ((room.stackDeadline ?? 0) - now) / 1000,
                                ),
                              )}
                              วินาทีสำหรับโต้กลับ
                            </div>
                          ) : room.offer ? (
                            <div className="current-offer">
                              <div className="eyebrow">ข้อเสนอปัจจุบัน</div>
                              {Object.entries(room.offer.amounts).map(
                                ([id, v]) => (
                                  <div key={id}>
                                    <span>
                                      {
                                        room.players.find((p) => p.id === id)
                                          ?.name
                                      }
                                    </span>
                                    <b>{money(v)}</b>
                                    {room.offer?.accepted.includes(id) ? (
                                      <Check size={15} />
                                    ) : (
                                      <Clock3 size={15} />
                                    )}
                                  </div>
                                ),
                              )}
                              <div className="offer-actions">
                                {participants.includes(myId) && (
                                  <>
                                    <button
                                      className="gold-button"
                                      onClick={() => action({ type: "ACCEPT" })}
                                    >
                                      ยอมรับ <Check size={15} />
                                    </button>
                                    <button
                                      className="outline-button"
                                      onClick={() => action({ type: "REJECT" })}
                                    >
                                      ปฏิเสธ
                                    </button>
                                  </>
                                )}
                                {isBoss && (
                                  <button
                                    className="text-button"
                                    onClick={openOffer}
                                  >
                                    แก้ไขข้อเสนอ
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="deal-cta">
                              <p>
                                {isBoss
                                  ? "คุณเป็นผู้นำดีลนี้ เริ่มเสนอส่วนแบ่งได้เลย"
                                  : `${boss?.name} กำลังเตรียมข้อเสนอ ลองต่อรองผ่านแชตได้เลย`}
                              </p>
                              {isBoss && (
                                <button
                                  className="gold-button full"
                                  disabled={!selectionComplete}
                                  onClick={openOffer}
                                >
                                  <Handshake size={18} />
                                  เริ่มเจรจา <ArrowRight size={17} />
                                </button>
                              )}
                            </div>
                          )}
                          {isBoss && !room.stack.length && (
                            <button
                              className="text-button full pass-button"
                              onClick={() => action({ type: "PASS" })}
                            >
                              ผ่านดีลนี้ <ArrowRight size={14} />
                            </button>
                          )}
                        </div>
                      </motion.section>
                    </div>
                    <button
                      className="mobile-chat-toggle gold-button"
                      onClick={() => setChatOpen(!chatOpen)}
                    >
                      <MessageSquare size={18} />
                      {chatOpen ? "ปิดแชต" : "แชตในห้อง"}
                    </button>
                    <aside
                      className={`chat-panel panel ${chatOpen ? "drawer-open" : ""}`}
                    >
                      <div className="chat-tabs">
                        <button
                          className={tab === "chat" ? "selected" : ""}
                          onClick={() => setTab("chat")}
                        >
                          <MessageSquare size={15} />
                          แชตในห้อง
                        </button>
                        <button
                          className={tab === "log" ? "selected" : ""}
                          onClick={() => setTab("log")}
                        >
                          เหตุการณ์
                        </button>
                      </div>
                      <div className="messages">
                        {tab === "chat" ? (
                          room.chat.length ? (
                            room.chat.map((m) => (
                              <div
                                className={`message ${m.playerId === myId ? "mine" : ""}`}
                                key={m.id}
                              >
                                <span>
                                  {m.name}
                                  <small>
                                    {new Date(m.time).toLocaleTimeString(
                                      "th-TH",
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )}
                                  </small>
                                </span>
                                <p>{m.text}</p>
                              </div>
                            ))
                          ) : (
                            <div className="chat-empty">
                              <Handshake size={29} />
                              <h3>เริ่มบทสนทนาได้ที่นี่</h3>
                              <p>
                                คำพูดดี ๆ อาจเปลี่ยนทั้งเกม
                                <br />
                                บอกข้อเสนอของคุณให้ทุกคนรู้
                              </p>
                            </div>
                          )
                        ) : (
                          room.log.map((l) => (
                            <div className="log-entry" key={l.id}>
                              <span className="nav-dot" />
                              <p>{l.text}</p>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="quick-chat">
                        {["ตกลง!", "ขอเพิ่มอีกหน่อย!", "น้อยไป!"].map((t) => (
                          <button
                            key={t}
                            onClick={() => action({ type: "CHAT", text: t })}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <form
                        className="chat-input"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (chat.trim()) {
                            action({ type: "CHAT", text: chat });
                            setChat("");
                          }
                        }}
                      >
                        <input
                          aria-label="ข้อความแชต"
                          placeholder="พิมพ์ข้อเสนอของคุณ…"
                          maxLength={300}
                          value={chat}
                          onChange={(e) => setChat(e.target.value)}
                        />
                        <button aria-label="ส่งข้อความ">
                          <Send size={17} />
                        </button>
                      </form>
                      <div className="chat-note">
                        <ShieldCheck size={12} />
                        เฉพาะผู้เล่นในห้องนี้ที่เห็นข้อความ
                      </div>
                    </aside>
                  </div>
                  <section className="hand">
                    <div className="section-title">
                      <div>
                        <span className="eyebrow">แต้มต่อในมือคุณ</span>
                        <h2>การ์ดใบเดียว อาจเปลี่ยนทั้งเกม</h2>
                      </div>
                      <span className="hand-count">
                        {me?.cards.length} ใบในมือ
                      </span>
                    </div>
                    <div className="hand-cards">
                      {me?.cards.map((c) => (
                        <motion.button
                          whileHover={{ y: -7 }}
                          key={c.id}
                          className={`action-card card-${c.type.split(" ")[0].toLowerCase()}`}
                          onClick={() => {
                            setSelected(c);
                            setTarget(
                              room.players.find((p) => p.id !== myId)?.id || "",
                            );
                            setInvestor(
                              c.type === "REPLACE INVESTOR"
                                ? (room.players.find((p) => p.id !== myId)
                                    ?.investors[0] ?? "A")
                                : "A",
                            );
                            setModal("play");
                          }}
                        >
                          <div>
                            <Diamond size={19} />
                            <span>
                              {c.type === "COUNTER" ? "โต้กลับ" : "อิทธิพล"}
                            </span>
                          </div>
                          <img
                            className="card-art"
                            src={`/art/${CARD_ART[c.type]}.png`}
                            alt={CARD_NAMES[c.type]}
                          />
                          <h3>{CARD_NAMES[c.type]}</h3>
                          <p>{c.description}</p>
                          <span className="play-label">
                            ใช้การ์ดใบนี้ <ArrowUpRight size={13} />
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </>
          )}
          {page === "rules" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">รู้กติกา เพิ่มโอกาสชนะ</span>
                  <h1>เข้าใจกติกา แล้วคุมเกมให้ได้</h1>
                  <p>คู่มือสู่การเป็นนักเจรจาที่ทุกคนต้องฟัง</p>
                </div>
              </div>
              <div className="rules-grid">
                {[
                  [
                    "01",
                    "เข้าร่วมโต๊ะเจรจา",
                    "สร้างห้องสำหรับ 3–12 คน แชร์รหัสห้องแล้วกดพร้อม สุ่มลำดับและนักลงทุน A–F ให้ทุกคน คนเกิน 6 จะมีตัวอักษรซ้ำได้ แต่ละคนได้รับการ์ดพิเศษ 4 ใบ",
                  ],
                  [
                    "02",
                    "มองหาโอกาส",
                    "ผู้นำเปลี่ยนทุกดีล แต่ละโครงการต้องใช้นักลงทุนที่กำหนด ผู้นำเลือกเจ้าของนักลงทุนทีละช่อง ถ้ามีตัวซ้ำให้เลือกคนใดคนหนึ่ง แล้วร่วมกันเจรจาแบ่งผลประโยชน์",
                  ],
                  [
                    "03",
                    "เสนอส่วนแบ่ง",
                    "ผู้นำแบ่งเงินให้ครบมูลค่าดีล ทุกคนที่เกี่ยวข้องต้องยอมรับ หากแก้ข้อเสนอ การยอมรับเดิมจะถูกล้างทั้งหมด",
                  ],
                  [
                    "04",
                    "พลิกความได้เปรียบ",
                    "ใช้การ์ดเพื่อแย่งอำนาจหรือเปลี่ยนผู้ร่วมดีล ทุกคนมีเวลา 5 วินาทีในการโต้กลับ และสามารถโต้การ์ดโต้กลับซ้ำได้",
                  ],
                  [
                    "05",
                    "ปิดดีลให้ทันเวลา",
                    "แต่ละดีลมีเวลา 90 วินาที เมื่อทุกคนตกลง ระบบจ่ายเงินอัตโนมัติ หากหมดเวลาหรือผู้นำกดผ่าน จะไปยังดีลถัดไป",
                  ],
                  [
                    "06",
                    "สะสมความมั่งคั่ง",
                    "เล่นครบ 15 / 20 / 25 ดีล ตามจำนวนผู้เล่น ผู้มีเงินมากที่สุดชนะ เงินเท่ากันถือว่าเสมอ คู่แข่งจำลองในโหมดฝึกจะยอมรับข้อเสนอที่ถูกกติกาอัตโนมัติ",
                  ],
                ].map(([n, h, p]) => (
                  <section className="panel rule" key={n}>
                    <span>{n}</span>
                    <h2>{h}</h2>
                    <p>{p}</p>
                  </section>
                ))}
              </div>
              <button
                className="gold-button"
                onClick={() => {
                  setPage("boardroom");
                  if (!room) setModal("practice");
                }}
              >
                เริ่มเล่น <ArrowRight size={17} />
              </button>
            </>
          )}
          {["leaderboard", "history"].includes(page) && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">ทำเนียบนักเจรจา</span>
                  <h1>
                    {page === "leaderboard"
                      ? "ดีลสร้างเงิน ฝีมือสร้างชื่อ"
                      : "ทุกดีลมีเรื่องราว"}
                  </h1>
                  <p>
                    {page === "leaderboard"
                      ? "สถิติความมั่งคั่งสูงสุดจากเกมที่เล่นจบแล้ว"
                      : "ย้อนดูเกมที่ผ่านมา พร้อมผลการแข่งขันและเงินสะสม"}
                  </p>
                </div>
              </div>
              <section className="panel record-panel">
                {dataLoading ? (
                  <Loader2 className="spin" />
                ) : records.length ? (
                  records.map((r, i) => (
                    <div className="rank-row" key={r.id || i}>
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      <strong>{r.name || `ห้อง ${r.code}`}</strong>
                      <span>
                        {r.games
                          ? `${r.games} เกม`
                          : new Date(r.ended_at).toLocaleDateString("th-TH")}
                      </span>
                      <b>
                        {r.money
                          ? money(Number(r.money))
                          : `${r.results?.[0]?.name} · ${money(r.results?.[0]?.money || 0)}`}
                      </b>
                    </div>
                  ))
                ) : (
                  <div className="empty-records">
                    <Trophy size={44} />
                    <h2>เป็นคนแรกที่สร้างสถิติ</h2>
                    <p>
                      เกมที่เล่นจบจะแสดงที่นี่เมื่อเชื่อมต่อฐานข้อมูลแล้ว
                      <br />
                      เริ่มเล่นแล้วสร้างชื่อของคุณในวงเจรจา
                    </p>
                    <button
                      className="gold-button"
                      onClick={() => setPage("boardroom")}
                    >
                      กลับห้องเจรจา <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </section>
            </>
          )}
          <footer>
            <div>
              <Diamond size={13} /> THE INNER CIRCLE{" "}
              <span>ทุกคำพูดคือกลยุทธ์ ทุกข้อตกลงคือโอกาส</span>
            </div>
            <span>เพื่อนดี ดีลเด็ด เจรจากันให้สนุก</span>
          </footer>
        </div>
      </main>
      <AnimatePresence>
        {modal && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setModal("");
            }}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
              className={`modal ${modal === "cards" ? "wide" : ""}`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <button
                className="close-modal icon-button"
                aria-label="ปิดหน้าต่าง"
                onClick={() => setModal("")}
              >
                <X size={21} />
              </button>
              {["create", "join", "practice"].includes(modal) ? (
                <>
                  <div className="modal-emblem">
                    <Diamond size={30} />
                  </div>
                  <span className="eyebrow">คำเชิญสู่วงเจรจาของคุณ</span>
                  <h2 id="modal-title">
                    {modal === "join"
                      ? "ที่นั่งของคุณรออยู่"
                      : modal === "practice"
                        ? "ค้นหาชั้นเชิงของคุณ"
                        : "รวมเพื่อน เปิดโต๊ะ ลุยดีล"}
                  </h2>
                  <p>
                    {modal === "join"
                      ? "กรอกชื่อของคุณและรหัสห้องที่ได้รับจากเจ้าของห้อง"
                      : modal === "practice"
                        ? "ฝึกเล่นเกมเต็มกับคู่แข่งจำลอง 3 คน ซึ่งจะรับข้อเสนอที่ถูกกติกาและผลัดกันเป็นผู้นำ"
                        : "สร้างห้องส่วนตัว แล้วชวนเพื่อน 2–11 คนมาเล่นด้วยกัน"}
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      enter(modal === "practice");
                    }}
                  >
                    <label>
                      ชื่อผู้เล่น
                      <input
                        autoFocus
                        maxLength={20}
                        placeholder="อยากให้เพื่อนเรียกคุณว่าอะไร?"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </label>
                    {modal === "join" && (
                      <label>
                        รหัสห้อง
                        <input
                          maxLength={5}
                          minLength={5}
                          placeholder="เช่น A7K9Q"
                          value={code}
                          onChange={(e) =>
                            setCode(e.target.value.toUpperCase())
                          }
                          required
                        />
                      </label>
                    )}
                    <button className="gold-button full" disabled={pending}>
                      {pending ? (
                        <Loader2 className="spin" size={17} />
                      ) : (
                        <ArrowRight size={17} />
                      )}{" "}
                      {pending
                        ? "กำลังเตรียมห้อง…"
                        : modal === "join"
                          ? "เข้าร่วมห้อง"
                          : modal === "practice"
                            ? "เริ่มฝึกเล่น"
                            : "สร้างห้องส่วนตัว"}
                    </button>
                  </form>
                  <div className="modal-foot">
                    <ShieldCheck size={14} />
                    ไม่ต้องสมัครสมาชิก แค่พร้อมเจรจาก็เล่นได้
                  </div>
                </>
              ) : modal === "offer" ? (
                <>
                  <span className="eyebrow">หาข้อตกลงที่ลงตัว</span>
                  <h2 id="modal-title">เสนอส่วนแบ่งของคุณ</h2>
                  <p>
                    แบ่งเงิน {money(room!.deal!.value)}.
                    ผู้ร่วมดีลทุกคนต้องยอมรับข้อเสนอ
                  </p>
                  {participants.map((id) => (
                    <div className="allocation allocation-buttons" key={id}>
                      <span>
                        {room?.players.find((p) => p.id === id)?.name}
                      </span>
                      <div className="money-controls">
                        <button
                          aria-label={
                            "ลดส่วนแบ่ง " +
                            room?.players.find((p) => p.id === id)?.name
                          }
                          disabled={!(amounts[id] > 0)}
                          onClick={() => adjustMoney(id, -1)}
                        >
                          −
                        </button>
                        <output aria-live="polite">
                          {money(amounts[id] ?? 0)}
                        </output>
                        <button
                          aria-label={
                            "เพิ่มส่วนแบ่ง " +
                            room?.players.find((p) => p.id === id)?.name
                          }
                          disabled={
                            remaining <
                            ((amounts[id] ?? 0) === 0 ? 1000000 : 500000)
                          }
                          onClick={() => adjustMoney(id, 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        className="text-button remainder-button"
                        disabled={
                          remaining <= 0 ||
                          (amounts[id] ?? 0) + remaining < 1000000
                        }
                        onClick={() =>
                          setAmounts({
                            ...amounts,
                            [id]: (amounts[id] ?? 0) + remaining,
                          })
                        }
                      >
                        ให้เงินที่เหลือ
                      </button>
                    </div>
                  ))}
                  <div className="remaining-money">
                    คงเหลือ <strong>{money(remaining)}</strong>
                  </div>
                  <button
                    className="outline-button full"
                    onClick={() =>
                      setAmounts(
                        Object.fromEntries(participants.map((id) => [id, 0])),
                      )
                    }
                  >
                    ล้างส่วนแบ่ง
                  </button>
                  <div className="allocation-total">
                    แบ่งแล้ว{" "}
                    <strong>
                      {money(allocated)} / {money(room!.deal!.value)}
                    </strong>
                  </div>
                  <button
                    className="gold-button full"
                    disabled={
                      Object.values(amounts).reduce((a, b) => a + b, 0) !==
                      room!.deal!.value
                    }
                    onClick={() =>
                      action({
                        type: "OFFER",
                        amounts: Object.fromEntries(
                          participants.map((id) => [id, amounts[id] ?? 0]),
                        ),
                      })
                    }
                  >
                    ส่งข้อเสนอ <Send size={17} />
                  </button>
                </>
              ) : modal === "play" ? (
                <>
                  <span className="eyebrow">เปลี่ยนทิศทางการเจรจา</span>
                  <h2 id="modal-title">
                    {selected ? CARD_NAMES[selected.type] : ""}
                  </h2>
                  <p>
                    {selected?.description} การใช้การ์ดนี้จะล้างข้อเสนอปัจจุบัน
                    และเปิดให้โต้กลับได้ 5 วินาที
                  </p>
                  {["BLOCK", "REPLACE INVESTOR"].includes(
                    selected?.type ?? "",
                  ) && (
                    <label>
                      เลือกคู่แข่ง
                      <select
                        value={target}
                        onChange={(e) => {
                          setTarget(e.target.value);
                          setInvestor(
                            room?.players.find((p) => p.id === e.target.value)
                              ?.investors[0] ?? "A",
                          );
                        }}
                      >
                        {room?.players
                          .filter((p) => p.id !== myId)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                  {["WILD INVESTOR", "REPLACE INVESTOR"].includes(
                    selected?.type || "",
                  ) && (
                    <label>
                      เลือกนักลงทุนที่จะเป็นตัวแทน
                      <select
                        value={investor}
                        onChange={(e) => setInvestor(e.target.value)}
                      >
                        {(selected?.type === "REPLACE INVESTOR"
                          ? [
                              ...new Set(
                                room?.players.find((p) => p.id === target)
                                  ?.investors ?? [],
                              ),
                            ]
                          : INVESTORS
                        ).map((i) => (
                          <option key={i}>{i}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <button
                    className="gold-button full"
                    onClick={() =>
                      action({
                        type: "PLAY_CARD",
                        cardId: selected!.id,
                        target,
                        investor,
                      })
                    }
                  >
                    ใช้การ์ด <Swords size={18} />
                  </button>
                </>
              ) : modal === "cards" ? (
                <>
                  <span className="eyebrow">6 วิธีพลิกสถานการณ์</span>
                  <h2 id="modal-title">อำนาจต่อรองในมือคุณ</h2>
                  <p>
                    ใช้การ์ดระหว่างดีลที่กำลังเล่น
                    การโต้กลับที่ถูกจังหวะอาจเปลี่ยนทุกอย่าง
                  </p>
                  <div className="collection-grid">
                    {Object.entries(CARD_INFO).map(([t, d]) => (
                      <div className="action-card" key={t}>
                        <Diamond size={23} />
                        <img
                          className="card-art"
                          src={`/art/${CARD_ART[t as keyof typeof CARD_ART]}.png`}
                          alt={CARD_NAMES[t as keyof typeof CARD_NAMES]}
                        />
                        <h3>{CARD_NAMES[t as keyof typeof CARD_NAMES]}</h3>
                        <p>{d}</p>
                        <small>
                          {t === "BLOCK"
                            ? "คู่แข่งถูกกันออกจากดีล ผู้นำต้องเลือกผู้ร่วมดีลใหม่"
                            : t === "COUNTER"
                              ? "การ์ดโต้กลับมีผลย้อนลำดับ จากใบล่าสุดไปใบแรก"
                              : t === "REPLACE INVESTOR"
                                ? "ยึดนักลงทุนจริงจากคู่แข่ง ไม่คืนเมื่อจบดีล และถูกยึดต่อได้"
                                : "มีผลเฉพาะดีลที่กำลังเล่น"}
                        </small>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <span className="eyebrow">ตัวช่วยบนโต๊ะเจรจา</span>
                  <h2 id="modal-title">กลับเข้าวงเจรจาได้เสมอ</h2>
                  <p>
                    แชร์รหัสห้องเพื่อชวนเพื่อน หากหลุดจากเกม
                    ให้เปิดหน้านี้ด้วยเบราว์เซอร์เดิม
                    ระบบจะคืนที่นั่งและการ์ดในมือให้คุณ
                  </p>
                  <p>
                    ห้องที่กำลังเล่นจะหมดอายุเมื่อเซิร์ฟเวอร์รีสตาร์ต
                    ส่วนผลเกมที่จบแล้วจะบันทึกไว้เมื่อเชื่อมต่อ PostgreSQL
                  </p>
                  <button
                    className="gold-button full"
                    onClick={() => {
                      setModal("");
                      setPage("rules");
                    }}
                  >
                    อ่านกติกาเกม <ArrowRight size={16} />
                  </button>
                </>
              )}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {notice && (
          <motion.div
            role="status"
            className="toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <Diamond size={17} />
            {notice}
            <button
              aria-label="ปิดข้อความแจ้งเตือน"
              onClick={() => setNotice("")}
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
export default App;
