import "../env";
import pg from "pg";
import type { GameRoom } from "../../../shared/types";
export const pool = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : null;
export async function init() {
  if (pool)
    await pool.query(
      `CREATE TABLE IF NOT EXISTS matches (id uuid PRIMARY KEY, code text NOT NULL, ended_at timestamptz DEFAULT now(), results jsonb NOT NULL);`,
    );
}
export async function save(r: GameRoom) {
  if (pool)
    await pool.query(
      "INSERT INTO matches(id,code,results) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
      [
        r.matchId,
        r.code,
        JSON.stringify(
          r.players
            .map((p) => ({ id: p.id, name: p.name, money: p.money }))
            .sort((a, b) => b.money - a.money),
        ),
      ],
    );
}
export async function history() {
  return pool
    ? (
        await pool.query(
          "SELECT * FROM matches ORDER BY ended_at DESC LIMIT 30",
        )
      ).rows
    : [];
}
export async function leaderboard() {
  return pool
    ? (
        await pool.query(
          `SELECT result->>'name' AS name, MAX((result->>'money')::bigint) AS money, COUNT(*) AS games FROM matches, jsonb_array_elements(results) result GROUP BY result->>'name' ORDER BY money DESC LIMIT 20`,
        )
      ).rows
    : [];
}
