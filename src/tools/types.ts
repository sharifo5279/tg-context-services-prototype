import type { Ctx } from "../runtime.js";

export type Kind = "read" | "prepare" | "write" | "job";

export type ToolDef = {
  name: string;
  domain: string;
  product: string;
  title: string;
  description: string;
  operation: string;
  kind: Kind;
  binding: string; // source API path(s)
  basis: string; // where the response shape comes from
  inputSchema: any;
  handler: (args: any, ctx: Ctx) => any;
};

export const CMS_BASIS = "CMS Swagger v2-v5 (field names from CMS_context.md)";
export const MODELED = "Modeled from incubation brief (field contract not supplied)";
export const NEW_CONTRACT = "New Context Services contract (proposed)";

export const s = {
  str: (description: string, extra: any = {}) => ({ type: "string", description, ...extra }),
  int: (description: string, extra: any = {}) => ({ type: "integer", description, ...extra }),
  bool: (description: string) => ({ type: "boolean", description }),
  arr: (items: any, description: string) => ({ type: "array", items, description }),
  obj: (properties: Record<string, any>, required: string[] = [], description?: string) => ({ type: "object", properties, required, additionalProperties: false, ...(description ? { description } : {}) }),
  any: (description: string) => ({ type: "object", description, additionalProperties: true }),
};

export const PAGE = {
  page_size: s.int("Results per page (default 25, max 100).", { minimum: 1, maximum: 100 }),
  cursor: s.str("Cursor from a previous page."),
};

export function paginate<T>(rows: T[], args: any, defaultSize = 25) {
  const size = Math.min(Math.max(Number(args.page_size) || defaultSize, 1), 100);
  const start = args.cursor ? Number(Buffer.from(String(args.cursor), "base64url").toString()) || 0 : 0;
  const page = rows.slice(start, start + size);
  const next = start + size < rows.length ? Buffer.from(String(start + size)).toString("base64url") : null;
  return { page, pagination: { total: rows.length, returned: page.length, offset: start, pageSize: size, nextCursor: next } };
}
