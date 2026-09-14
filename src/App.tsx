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
import { CARD_INFO } from "../shared/constants";
import "./index.css";
const money = (n: number) =>
  `฿${(n / 1000000).toLocaleString("en", { maximumFractionDigits: 2 })}M`;
const portraits = [
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
];
const investorNames = [
  "Alexandra • Capital",
  "Bennett • Technology",
  "Celine • Property",
  "Dominic • Industry",
  "Elena • Ventures",
  "Felix • Finance",
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
    [connected, setConnected] = useState(false),
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
    const onState = (r: GameRoom) => setRoom(r);
    const onConnect = () => {
      setConnected(true);
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
    socket.on("disconnect", () => setConnected(false));
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
          notify("Could not load records. Please check the server connection.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setDataLoading(false);
      });
    return () => controller.abort();
  }, [page]);
  const enter = (practice = false) => {
    if (!name.trim()) {
      notify("Please enter your name to take a seat.");
      return;
    }
    if (!connected) {
      notify("Connecting to the game server. Please try again in a moment.");
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
              notify("The server did not respond. Please retry."))
            : cb(r),
        );
    else
      socket
        .timeout(10000)
        .emit("room:create", { name, practice }, (err, r) =>
          err
            ? (setPending(false),
              notify("The server did not respond. Please retry."))
            : cb(r),
        );
  };
  const action = (a: Action) => {
    socket.timeout(8000).emit("player:action", a, (err, r) => {
      if (err) notify("Connection interrupted. Please retry.");
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
            ...(room.deal?.requiredInvestors ?? []).map(
              (i) =>
                room.replacements[i] ??
                room.players.find((p) => p.investors.includes(i))?.id,
            ),
            ...room.extras,
          ].filter((id): id is string => !!id && !room.blocked.includes(id)),
        ),
      ]
    : [];
  const openOffer = () => {
    if (!room?.deal) return;
    const share = Math.floor(room.deal.value / participants.length);
    setAmounts(
      Object.fromEntries(
        participants.map((id, i) => [
          id,
          share +
            (i === 0 ? room.deal!.value - share * participants.length : 0),
        ]),
      ),
    );
    setModal("offer");
  };
  const copy = () =>
    navigator.clipboard
      .writeText(`${location.origin}/game/${room?.code}`)
      .then(() => notify("Invite link copied. Your table is waiting."))
      .catch(() => notify(`Room code: ${room?.code}`));
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
        <div className="club-tag">WHERE AMBITION MEETS OPPORTUNITY</div>
        <div className="nav-label">YOUR PRIVATE CLUB</div>
        <nav>
          {[
            { id: "boardroom", icon: LayoutDashboard, label: "The Boardroom" },
            { id: "leaderboard", icon: Trophy, label: "Leaderboard" },
            { id: "history", icon: Clock3, label: "Match History" },
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
            How to Play
            <ArrowUpRight size={14} className="end" />
          </button>
          <button onClick={() => setModal("cards")}>
            <Layers3 size={18} />
            The Card Collection
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="club-card">
            <Diamond size={20} />
            <span>
              A seat at the table.
              <br />
              <strong>A chance at everything.</strong>
            </span>
            <div className="mini-line" />
          </div>
          <button className="help-link" onClick={() => setModal("help")}>
            <HelpCircle size={17} /> Help & game rules{" "}
            <ArrowUpRight size={14} />
          </button>
          <div className="sidebar-foot">
            <span className="green-dot" /> ALL SYSTEMS IN PLAY <span>v1.0</span>
          </div>
        </div>
      </aside>
      <main>
        <header>
          <div className="breadcrumb">
            The Club <ChevronRight size={14} />{" "}
            <strong>
              {page === "boardroom"
                ? "The Boardroom"
                : page === "leaderboard"
                  ? "Leaderboard"
                  : page === "history"
                    ? "Match History"
                    : "How to Play"}
            </strong>
          </div>
          <div className="header-right">
            <span className="live-status">
              <span className={connected ? "green-dot" : "amber-dot"} />
              {connected ? "Connected" : "Connecting"}
            </span>
            <button
              className="icon-button"
              aria-label={muted ? "Unmute sounds" : "Mute sounds"}
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
              {name || "Guest player"}
              <span>{room ? "At the table" : "Make your entrance"}</span>
            </div>
          </div>
        </header>
        <div className="page-content">
          {page === "boardroom" && !room && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span /> THE ART OF THE DEAL
                  </div>
                  <h1>Welcome to the boardroom.</h1>
                  <p>Build alliances. Negotiate your share. Own the room.</p>
                </div>
                <span className="edition">
                  <Diamond size={14} /> THE FIRST EDITION
                </span>
              </div>
              <section className="hero">
                <img
                  src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1800&q=85"
                  alt="Dramatic modern skyscrapers rising into the sky"
                />
                <div className="hero-shade" />
                <div className="hero-grid" />
                <div className="hero-content">
                  <div className="hero-kicker">
                    <span /> BIG DEALS. BIGGER PERSONALITIES.
                  </div>
                  <h2>
                    Fortune favors
                    <br />
                    the <em>persuasive.</em>
                  </h2>
                  <p>
                    Six seats. Endless possibilities. The ultimate game
                    <br className="desktop-break" /> of business, alliances, and
                    beautifully broken promises.
                  </p>
                  <div className="hero-buttons">
                    <button
                      className="gold-button"
                      onClick={() => setModal("create")}
                    >
                      <Plus size={18} />
                      Create a room <ArrowRight size={17} />
                    </button>
                    <button
                      className="glass-button"
                      onClick={() => setModal("join")}
                    >
                      <Link2 size={17} />
                      Join a room
                    </button>
                  </div>
                  <div className="hero-meta">
                    <span>
                      <Users size={15} />
                      3–6 players
                    </span>
                    <i />
                    <span>
                      <Clock3 size={15} />
                      20–40 minutes
                    </span>
                    <i />
                    <span>
                      <Globe2 size={15} />
                      Play from anywhere
                    </span>
                  </div>
                </div>
                <div className="hero-seal">
                  <Diamond size={23} />
                  <span>
                    EVERY DEAL
                    <br />
                    HAS A PRICE.
                  </span>
                </div>
                <div className="hero-bottom-label">
                  THE CITY IS YOURS. MAKE YOUR MOVE.<span>01 / 03</span>
                </div>
              </section>
              <div className="feature-strip">
                <div>
                  <div className="feature-icon">
                    <Handshake />
                  </div>
                  <span>
                    <strong>Real people. Real negotiation.</strong>
                    <small>
                      Every alliance is a choice. Every offer matters.
                    </small>
                  </span>
                </div>
                <div>
                  <div className="feature-icon">
                    <ShieldCheck />
                  </div>
                  <span>
                    <strong>A level playing field.</strong>
                    <small>Your strategy wins. Never your connection.</small>
                  </span>
                </div>
                <div>
                  <div className="feature-icon">
                    <Sparkles />
                  </div>
                  <span>
                    <strong>No two deals alike.</strong>
                    <small>Power cards keep the balance in motion.</small>
                  </span>
                </div>
              </div>
              <div className="section-title">
                <div>
                  <span className="eyebrow">YOUR NEXT MOVE</span>
                  <h2>There’s more than one way to win.</h2>
                </div>
                <button
                  className="text-button"
                  onClick={() => setPage("rules")}
                >
                  Learn the rules <ArrowUpRight size={16} />
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
                    <span className="small-tag">NEW TO THE TABLE?</span>
                  </div>
                  <h3>Find your edge.</h3>
                  <p>
                    Learn the ropes in a practice game.
                    <br />
                    No pressure. Just possibilities.
                  </p>
                  <div className="path-link">
                    Enter the practice room <ArrowRight size={17} />
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
                  <h3>Always have a play.</h3>
                  <p>
                    Take control, call a bluff, or turn the tables.
                    <br />
                    Get to know your six power cards.
                  </p>
                  <div className="path-link">
                    Explore the card collection <ArrowRight size={17} />
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
                    <span className="small-tag">THE HALL OF INFLUENCE</span>
                  </div>
                  <h3>Make a name for yourself.</h3>
                  <p>
                    Great deals make fortunes.
                    <br />
                    Great players make a reputation.
                  </p>
                  <div className="path-link">
                    Meet the top dealmakers <ArrowRight size={17} />
                  </div>
                  <span className="path-number">03</span>
                </button>
              </div>
              <div className="quote">
                <span>“</span> In this room, your word is your currency. Spend
                it wisely.<span>”</span>
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
                      ? "PRACTICE TABLE"
                      : "PRIVATE TABLE"}{" "}
                    · {room.code}
                  </div>
                  <h1>
                    {room.status === "lobby"
                      ? "Your circle is coming together."
                      : room.status === "finished"
                        ? "Fortune has a new name."
                        : "Let’s make a deal."}
                  </h1>
                  <p>
                    {room.status === "lobby"
                      ? "Invite your allies. Or your future rivals."
                      : "The opportunity is on the table. What’s your price?"}
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
                    ? "Exit practice"
                    : "Invite friends"}
                </button>
              </div>
              {room.status === "lobby" ? (
                <div className="lobby-layout">
                  <section className="panel lobby-players">
                    <div className="panel-title">
                      <h2>The guest list</h2>
                      <span>{room.players.length} / 6 players</span>
                    </div>
                    {room.players.map((p) => (
                      <div className="lobby-player" key={p.id}>
                        <img src={portraits[p.avatar % 4]} alt="" />
                        <div>
                          <strong>
                            {p.name} {p.id === myId && <small>(you)</small>}
                          </strong>
                          <span>
                            {p.id === room.hostId
                              ? "Host · Your table, your rules"
                              : p.connected
                                ? "At the table"
                                : "Reconnecting…"}
                          </span>
                        </div>
                        <span
                          className={p.ready ? "ready-pill" : "waiting-pill"}
                        >
                          {p.ready
                            ? "Ready"
                            : p.id === room.hostId
                              ? "Host"
                              : "Not ready"}
                        </span>
                      </div>
                    ))}
                    {Array.from({ length: 6 - room.players.length }, (_, i) => (
                      <button key={i} className="empty-seat" onClick={copy}>
                        <Plus size={19} />
                        An open seat. An untold story.
                        <Link2 size={16} />
                      </button>
                    ))}
                  </section>
                  <section className="panel lobby-settings">
                    <Crown size={35} />
                    <h2>A private invitation.</h2>
                    <p>
                      Send your room code to 2–5 friends. Everyone must be ready
                      before the first deal.
                    </p>
                    <div className="room-code">{room.code}</div>
                    <button className="gold-button full" onClick={copy}>
                      <Copy size={16} />
                      Copy invite link
                    </button>
                    <button
                      className="outline-button full"
                      onClick={() => action({ type: "READY" })}
                    >
                      {me?.ready ? <Check size={16} /> : <Users size={16} />}{" "}
                      {me?.ready ? "Ready — click to unready" : "I’m ready"}
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
                        Start the game <ArrowRight size={16} />
                      </button>
                    )}
                    <button
                      className="text-button full"
                      onClick={() => action({ type: "LEAVE" })}
                    >
                      <DoorOpen size={16} />
                      Leave room
                    </button>
                  </section>
                </div>
              ) : room.status === "finished" ? (
                <section className="panel results">
                  <Trophy size={48} />
                  <div className="eyebrow">THE FINAL STANDINGS</div>
                  <h2>
                    {
                      [...room.players].sort((a, b) => b.money - a.money)[0]
                        .name
                    }{" "}
                    owns the room.
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
                        Play again <ArrowRight size={16} />
                      </button>
                    )}
                    <button
                      className="outline-button"
                      onClick={() => action({ type: "LEAVE" })}
                    >
                      Back to the club
                    </button>
                  </div>
                </section>
              ) : (
                <>
                  <div className="game-top">
                    <span>
                      <Layers3 size={17} /> DEAL{" "}
                      <b>{String(room.round).padStart(2, "0")}</b> / 15
                    </span>
                    <span>
                      <Crown size={17} /> LED BY <b>{boss?.name}</b>
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
                        s
                      </b>{" "}
                      TO CLOSE
                    </span>
                  </div>
                  <div className="game-layout">
                    <div className="players-column">
                      <div className="eyebrow">THE DEALMAKERS</div>
                      {room.players.map((p) => (
                        <motion.div
                          layout
                          className={`player-panel ${p.id === room.bossId ? "leader" : ""}`}
                          key={p.id}
                        >
                          <div className="player-top">
                            <img src={portraits[p.avatar % 4]} alt="" />
                            <div>
                              <strong>{p.name}</strong>
                              <small>
                                {p.id === myId
                                  ? "You"
                                  : p.bot
                                    ? "Practice partner"
                                    : p.connected
                                      ? "Connected"
                                      : "Reconnecting"}
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
                            {p.investors.map((i) => (
                              <span
                                key={i}
                                className="investor-chip"
                                title={investorNames[i.charCodeAt(0) - 65]}
                              >
                                {i}
                              </span>
                            ))}
                            <small>
                              {room.blocked.includes(p.id)
                                ? "Blocked"
                                : room.offer?.accepted.includes(p.id)
                                  ? "✓ Accepted"
                                  : room.offer?.rejected.includes(p.id)
                                    ? "Rejected"
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
                            src="https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1000&q=85"
                            alt="Sculptural contemporary architecture"
                          />
                          <span className="small-tag">{room.deal?.sector}</span>
                          <span className="deal-index">
                            Nº {String(room.round).padStart(2, "0")}
                          </span>
                        </div>
                        <div className="deal-body">
                          <span className="eyebrow">
                            AN OPPORTUNITY WORTH TAKING
                          </span>
                          <h2>{room.deal?.name}</h2>
                          <div className="deal-value">
                            {money(room.deal?.value ?? 0)}
                            <span>DEAL VALUE</span>
                          </div>
                          <div className="deal-requirements">
                            <span>REQUIRED INVESTORS</span>
                            <div>
                              {room.deal?.requiredInvestors.map((i) => (
                                <span
                                  title={investorNames[i.charCodeAt(0) - 65]}
                                  className="investor-chip"
                                  key={i}
                                >
                                  {i}
                                </span>
                              ))}
                            </div>
                            <small>{room.deal?.difficulty} opportunity</small>
                          </div>
                          {room.stack.length > 0 ? (
                            <div className="stack-banner">
                              <Swords size={18} />
                              {room.stack.at(-1)?.card.type} ·{" "}
                              {Math.max(
                                0,
                                Math.ceil(
                                  ((room.stackDeadline ?? 0) - now) / 1000,
                                ),
                              )}
                              s to counter
                            </div>
                          ) : room.offer ? (
                            <div className="current-offer">
                              <div className="eyebrow">THE CURRENT OFFER</div>
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
                                      Accept <Check size={15} />
                                    </button>
                                    <button
                                      className="outline-button"
                                      onClick={() => action({ type: "REJECT" })}
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                                {isBoss && (
                                  <button
                                    className="text-button"
                                    onClick={openOffer}
                                  >
                                    Revise
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="deal-cta">
                              <p>
                                {isBoss
                                  ? "You lead this deal. Make them an offer."
                                  : `${boss?.name} is preparing an offer. Make your case in chat.`}
                              </p>
                              {isBoss && (
                                <button
                                  className="gold-button full"
                                  onClick={openOffer}
                                >
                                  <Handshake size={18} />
                                  Open negotiation <ArrowRight size={17} />
                                </button>
                              )}
                            </div>
                          )}
                          {isBoss && !room.stack.length && (
                            <button
                              className="text-button full pass-button"
                              onClick={() => action({ type: "PASS" })}
                            >
                              Pass on this deal <ArrowRight size={14} />
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
                      {chatOpen ? "Close table talk" : "Table talk"}
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
                          Table talk
                        </button>
                        <button
                          className={tab === "log" ? "selected" : ""}
                          onClick={() => setTab("log")}
                        >
                          Activity
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
                                    {new Date(m.time).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </small>
                                </span>
                                <p>{m.text}</p>
                              </div>
                            ))
                          ) : (
                            <div className="chat-empty">
                              <Handshake size={29} />
                              <h3>The conversation starts here.</h3>
                              <p>
                                A little persuasion goes a long way.
                                <br />
                                Tell the table what you have in mind.
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
                        {["Deal!", "A little more?", "Not enough."].map((t) => (
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
                          aria-label="Chat message"
                          placeholder="Make your case…"
                          maxLength={300}
                          value={chat}
                          onChange={(e) => setChat(e.target.value)}
                        />
                        <button aria-label="Send message">
                          <Send size={17} />
                        </button>
                      </form>
                      <div className="chat-note">
                        <ShieldCheck size={12} />
                        Only your table can see this chat
                      </div>
                    </aside>
                  </div>
                  <section className="hand">
                    <div className="section-title">
                      <div>
                        <span className="eyebrow">
                          YOUR COMPETITIVE ADVANTAGE
                        </span>
                        <h2>A little influence goes a long way.</h2>
                      </div>
                      <span className="hand-count">
                        {me?.cards.length} CARDS IN HAND
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
                            setInvestor(room.deal!.requiredInvestors[0]);
                            setModal("play");
                          }}
                        >
                          <div>
                            <Diamond size={19} />
                            <span>
                              {c.type === "COUNTER" ? "REACTION" : "INFLUENCE"}
                            </span>
                          </div>
                          <h3>{c.type}</h3>
                          <p>{c.description}</p>
                          <span className="play-label">
                            PLAY YOUR HAND <ArrowUpRight size={13} />
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
                  <span className="eyebrow">
                    A LITTLE KNOWLEDGE. A LOT OF INFLUENCE.
                  </span>
                  <h1>Know the game. Own the room.</h1>
                  <p>
                    Your guide to becoming the most persuasive person at the
                    table.
                  </p>
                </div>
              </div>
              <div className="rules-grid">
                {[
                  [
                    "01",
                    "Take your seat",
                    "Create a private room for 3–6 players, share the room code, and ready up. Each player gets investors and four action cards.",
                  ],
                  [
                    "02",
                    "Find the opportunity",
                    "The leader changes with every deal. Each project needs specific investors. Their owners, plus the leader, negotiate the proceeds.",
                  ],
                  [
                    "03",
                    "Name your price",
                    "The leader allocates the entire deal value. Every participant must accept. A revised offer resets all previous approvals.",
                  ],
                  [
                    "04",
                    "Change the balance",
                    "Play influence cards to take control or change participants. Everyone has five seconds to counter. A counter can itself be countered.",
                  ],
                  [
                    "05",
                    "Close before the clock",
                    "You have 90 seconds per deal. Unanimous agreement pays everyone automatically. A timeout or a pass moves to the next deal.",
                  ],
                  [
                    "06",
                    "Make your fortune",
                    "After 15 deals, the player with the most money wins. Ties share the same fortune. Practice partners accept valid offers automatically.",
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
                Take a seat <ArrowRight size={17} />
              </button>
            </>
          )}
          {["leaderboard", "history"].includes(page) && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">THE HALL OF INFLUENCE</span>
                  <h1>
                    {page === "leaderboard"
                      ? "Great deals. Lasting reputations."
                      : "Every deal tells a story."}
                  </h1>
                  <p>
                    {page === "leaderboard"
                      ? "The highest fortunes from completed games."
                      : "A record of the circles, the deals, and the fortunes made."}
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
                      <strong>{r.name || `Table ${r.code}`}</strong>
                      <span>
                        {r.games
                          ? `${r.games} games`
                          : new Date(r.ended_at).toLocaleDateString()}
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
                    <h2>The first chapter is yours to write.</h2>
                    <p>
                      Completed games appear here when the match database is
                      connected.
                      <br />
                      Take a seat and start building your reputation.
                    </p>
                    <button
                      className="gold-button"
                      onClick={() => setPage("boardroom")}
                    >
                      Back to the boardroom <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </section>
            </>
          )}
          <footer>
            <div>
              <Diamond size={13} /> THE INNER CIRCLE{" "}
              <span>Negotiation is an art. This is your canvas.</span>
            </div>
            <span>Made for good company & better deals.</span>
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
                aria-label="Close dialog"
                onClick={() => setModal("")}
              >
                <X size={21} />
              </button>
              {["create", "join", "practice"].includes(modal) ? (
                <>
                  <div className="modal-emblem">
                    <Diamond size={30} />
                  </div>
                  <span className="eyebrow">
                    YOUR INVITATION TO THE INNER CIRCLE
                  </span>
                  <h2 id="modal-title">
                    {modal === "join"
                      ? "Your seat is waiting."
                      : modal === "practice"
                        ? "Find your edge."
                        : "Good company. Great deals."}
                  </h2>
                  <p>
                    {modal === "join"
                      ? "Enter your name and the room code your host shared."
                      : modal === "practice"
                        ? "Practice a full game with three automated partners. They accept valid offers and take turns leading."
                        : "Create a private table and invite 2–5 friends to play."}
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      enter(modal === "practice");
                    }}
                  >
                    <label>
                      Your name
                      <input
                        autoFocus
                        maxLength={20}
                        placeholder="What should the table call you?"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </label>
                    {modal === "join" && (
                      <label>
                        Room code
                        <input
                          maxLength={5}
                          minLength={5}
                          placeholder="E.g. A7K9Q"
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
                        ? "Preparing your table…"
                        : modal === "join"
                          ? "Join the table"
                          : modal === "practice"
                            ? "Start practice"
                            : "Create private room"}
                    </button>
                  </form>
                  <div className="modal-foot">
                    <ShieldCheck size={14} />
                    No account needed. Just a little ambition.
                  </div>
                </>
              ) : modal === "offer" ? (
                <>
                  <span className="eyebrow">THE ART OF COMPROMISE</span>
                  <h2 id="modal-title">Make them an offer.</h2>
                  <p>
                    Allocate {money(room!.deal!.value)}. Every required
                    participant must accept.
                  </p>
                  {participants.map((id) => (
                    <label className="allocation" key={id}>
                      <span>
                        {room?.players.find((p) => p.id === id)?.name}
                      </span>
                      <div>
                        <input
                          aria-label={`Offer for ${room?.players.find((p) => p.id === id)?.name}`}
                          type="number"
                          min="0"
                          step="1"
                          value={amounts[id] ?? 0}
                          onChange={(e) =>
                            setAmounts({
                              ...amounts,
                              [id]: Number(e.target.value),
                            })
                          }
                        />
                        <span>THB</span>
                      </div>
                    </label>
                  ))}
                  <div className="allocation-total">
                    Allocated{" "}
                    <strong>
                      {money(Object.values(amounts).reduce((a, b) => a + b, 0))}{" "}
                      / {money(room!.deal!.value)}
                    </strong>
                  </div>
                  <button
                    className="gold-button full"
                    disabled={
                      Object.values(amounts).reduce((a, b) => a + b, 0) !==
                      room!.deal!.value
                    }
                    onClick={() => action({ type: "OFFER", amounts })}
                  >
                    Send offer <Send size={17} />
                  </button>
                </>
              ) : modal === "play" ? (
                <>
                  <span className="eyebrow">CHANGE THE CONVERSATION</span>
                  <h2 id="modal-title">{selected?.type}</h2>
                  <p>
                    {selected?.description} Playing this card clears the current
                    offer and opens a five-second counter window.
                  </p>
                  {selected?.type === "BLOCK" && (
                    <label>
                      Choose a rival
                      <select
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
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
                      Investor to represent
                      <select
                        value={investor}
                        onChange={(e) => setInvestor(e.target.value)}
                      >
                        {room?.deal?.requiredInvestors.map((i) => (
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
                    Play card <Swords size={18} />
                  </button>
                </>
              ) : modal === "cards" ? (
                <>
                  <span className="eyebrow">SIX WAYS TO SHIFT THE BALANCE</span>
                  <h2 id="modal-title">Influence, in your hands.</h2>
                  <p>
                    Play a card during any active deal. A well-timed counter
                    changes everything.
                  </p>
                  <div className="collection-grid">
                    {Object.entries(CARD_INFO).map(([t, d]) => (
                      <div className="action-card" key={t}>
                        <Diamond size={23} />
                        <h3>{t}</h3>
                        <p>{d}</p>
                        <small>
                          {t === "BLOCK"
                            ? "A blocked rival’s required investors are represented by you."
                            : t === "COUNTER"
                              ? "Counters resolve last-in, first-out."
                              : t === "REPLACE INVESTOR"
                                ? "Choose one required investor; expires next deal."
                                : "The effect lasts for the current deal."}
                        </small>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <span className="eyebrow">A LITTLE HELP AT THE TABLE</span>
                  <h2 id="modal-title">Stay in the circle.</h2>
                  <p>
                    Share your room code to invite friends. If you disconnect,
                    reopen this page in the same browser to recover your seat
                    and private cards.
                  </p>
                  <p>
                    Rooms are held in server memory. A server restart ends
                    active rooms. Completed matches are saved when PostgreSQL is
                    configured.
                  </p>
                  <button
                    className="gold-button full"
                    onClick={() => {
                      setModal("");
                      setPage("rules");
                    }}
                  >
                    Read the game rules <ArrowRight size={16} />
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
              aria-label="Dismiss notification"
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
