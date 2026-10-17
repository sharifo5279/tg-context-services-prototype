// Shared helpers: clock, deterministic random, ids.

export const NOW = Date.now();
const HOUR = 3600_000;
const DAY = 24 * HOUR;

export const hAgo = (h: number) => new Date(NOW - h * HOUR).toISOString();
export const dAgo = (d: number) => new Date(NOW - d * DAY).toISOString();
export const ms = { HOUR, DAY };

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let seq = 0;
export function nextId(prefix: string, width = 6) {
  seq += 1;
  return `${prefix}${String(100000 + seq).slice(-width)}`;
}

export function pad(n: number, w: number) {
  return String(n).padStart(w, "0");
}

export function isoWeekStart(iso: string) {
  const d = new Date(iso);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export function eq(a: any, b: any) {
  return String(a ?? "").toLowerCase() === String(b ?? "").toLowerCase();
}

export function contains(a: any, b: any) {
  return String(a ?? "").toLowerCase().includes(String(b ?? "").toLowerCase());
}
