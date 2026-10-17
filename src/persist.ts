// Postgres persistence for demo state (approvals, changes, overrides, audit, publishing).
// The transaction world itself is regenerated deterministically and is not stored.
// Without DATABASE_URL the service runs in memory.
import pg from "pg";
import { serializeState, setState } from "./state.js";

let pool: pg.Pool | null = null;
let last = "";

export async function loadState() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.log("Persistence: DATABASE_URL not set; state is kept in memory."); return; }
  pool = new pg.Pool({ connectionString: url, max: 2, ssl: /render\.com|sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined });
  await pool.query("CREATE TABLE IF NOT EXISTS kv (key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())");
  const r = await pool.query("SELECT value FROM kv WHERE key = 'state'");
  if (r.rows[0]) { setState(r.rows[0].value); console.log("Persistence: state restored from Postgres."); }
  last = serializeState();
  setInterval(() => void saveState(), 10_000).unref();
  for (const sig of ["SIGTERM", "SIGINT"] as const) process.once(sig, async () => { await saveState(); process.exit(0); });
}

export async function saveState() {
  if (!pool) return;
  const s = serializeState();
  if (s === last) return;
  try {
    await pool.query("INSERT INTO kv (key, value, updated_at) VALUES ('state', $1, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()", [s]);
    last = s;
  } catch (e: any) { console.error("Persistence: save failed:", e?.message ?? e); }
}
