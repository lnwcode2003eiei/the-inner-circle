import type { CardType, Deal } from "./types";
export const CARD_INFO: Record<CardType, string> = {
  "TAKE CONTROL": "Take the lead. Make the next offer.",
  "REPLACE INVESTOR": "Represent a required investor for this deal.",
  BLOCK: "Exclude a rival from this negotiation.",
  COUNTER: "Cancel the last card on the stack.",
  "WILD INVESTOR": "Supply any required investor this round.",
  "STEAL DEAL": "Claim a seat at the negotiating table.",
};
export const INVESTORS = ["A", "B", "C", "D", "E", "F"];
export const DEALS: Deal[] = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  name: [
    "The Meridian Hotel",
    "Northstar Ventures",
    "The Grand Arcade",
    "Horizon Terminal",
    "Atlas Collective",
  ][i % 5],
  sector: [
    "HOSPITALITY",
    "TECHNOLOGY",
    "REAL ESTATE",
    "INFRASTRUCTURE",
    "PRIVATE EQUITY",
  ][i % 5],
  value: [12, 5, 8, 18, 25][i % 5] * 1000000,
  requiredInvestors: [
    ["A", "B", "C"],
    ["A", "B"],
    ["A", "C", "D"],
    ["B", "C", "D", "E"],
    ["A", "B", "C", "D", "E"],
  ][i % 5],
  difficulty: ["Ambitious", "Accessible", "Strategic", "Complex", "Elite"][
    i % 5
  ],
}));
