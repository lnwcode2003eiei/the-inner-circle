export type CardType =
  | "TAKE CONTROL"
  | "REPLACE INVESTOR"
  | "BLOCK"
  | "COUNTER"
  | "WILD INVESTOR"
  | "STEAL DEAL";
export interface ActionCard {
  id: string;
  type: CardType;
  description: string;
  priority: number;
}
export interface Player {
  id: string;
  name: string;
  avatar: number;
  money: number;
  investors: string[];
  cards: ActionCard[];
  cardCount: number;
  ready: boolean;
  connected: boolean;
  bot?: boolean;
}
export interface Deal {
  id: number;
  name: string;
  sector: string;
  value: number;
  requiredInvestors: string[];
  difficulty: string;
}
export interface Offer {
  amounts: Record<string, number>;
  accepted: string[];
  rejected: string[];
}
export interface StackEntry {
  id: string;
  playerId: string;
  card: ActionCard;
  target?: string;
  investor?: string;
}
export interface GameRoom {
  code: string;
  hostId: string;
  status: "lobby" | "playing" | "finished";
  players: Player[];
  round: number;
  currentPlayerIndex: number;
  bossId: string;
  turnStartedAt: number;
  turnDuration: number;
  deal?: Deal;
  offer?: Offer;
  stack: StackEntry[];
  stackDeadline?: number;
  blocked: string[];
  replacements: Record<string, string>;
  extras: string[];
  chat: {
    id: string;
    playerId: string;
    name: string;
    text: string;
    time: number;
  }[];
  log: { id: string; text: string; time: number }[];
  matchId: string;
}
export type Action =
  | { type: "READY" }
  | { type: "START" }
  | { type: "LEAVE" }
  | { type: "OFFER"; amounts: Record<string, number> }
  | { type: "ACCEPT" }
  | { type: "REJECT" }
  | { type: "PASS" }
  | { type: "PLAY_CARD"; cardId: string; target?: string; investor?: string }
  | { type: "CHAT"; text: string }
  | { type: "AGAIN" };
export interface Reply {
  error?: string;
  token?: string;
  playerId?: string;
  room?: GameRoom;
}
export interface ClientToServerEvents {
  "room:create": (
    data: { name: string; practice?: boolean },
    cb: (r: Reply) => void,
  ) => void;
  "room:join": (
    data: { name: string; code: string },
    cb: (r: Reply) => void,
  ) => void;
  "player:reconnect": (
    data: { token: string; code: string },
    cb: (r: Reply) => void,
  ) => void;
  "player:action": (action: Action, cb: (r: Reply) => void) => void;
  "game:sync": () => void;
}
export interface ServerToClientEvents {
  "game:state": (room: GameRoom) => void;
  "system:error": (message: string) => void;
}
