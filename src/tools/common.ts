import { companies, companyById } from "../data/cms.js";
import { companyInScope, scopeFilter } from "../runtime.js";
import { contains, eq } from "../util.js";

export type Resolved =
  | { kind: "ok"; company: any }
  | { kind: "ambiguous"; candidates: any[] }
  | { kind: "not_found"; input: string }
  | { kind: "denied"; reason: string };

/** Resolve a company by ID or name. Scope is applied before discovery. */
export function resolveCompany(input: string): Resolved {
  if (!input) return { kind: "not_found", input };
  const byId = companyById(input.trim().toUpperCase());
  if (byId) {
    const sc = companyInScope(byId.companyId);
    return sc.ok ? { kind: "ok", company: byId } : { kind: "denied", reason: sc.reason! };
  }
  const visible = companies.filter((c) => scopeFilter(c.companyId));
  const exact = visible.filter((c) => eq(c.companyName, input));
  if (exact.length === 1) return { kind: "ok", company: exact[0] };
  const words = input.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !["inc", "llc", "the", "company", "co"].includes(w));
  const matches = visible.filter((c) => words.length && words.every((w) => contains(c.companyName, w)));
  if (matches.length === 1) return { kind: "ok", company: matches[0] };
  if (matches.length > 1) return { kind: "ambiguous", candidates: matches.map((c) => ({ companyId: c.companyId, companyName: c.companyName, city: c.companyAddress.city, state: c.companyAddress.state })) };
  return { kind: "not_found", input };
}

export const brief = (c: any) => ({ companyId: c.companyId, companyName: c.companyName });

/** Parse ISO timestamps or relative values such as "7d", "24h". */
export function parseTime(v: any): number | null {
  if (v == null || v === "") return null;
  const m = String(v).match(/^(\d+(?:\.\d+)?)\s*([hd])$/i);
  if (m) return Date.now() - Number(m[1]) * (m[2].toLowerCase() === "d" ? 86400_000 : 3600_000);
  const t = Date.parse(String(v));
  return Number.isNaN(t) ? null : t;
}
