// Agent publishing (Aviator Studio Deployments) and per-client agent blocks (Trading Grid Online Agent access).
import { AGENTS } from "./agents.js";
import { HOSTS, HostKey } from "./runtime.js";

export const CLIENT_KEYS = (Object.keys(HOSTS) as HostKey[]).filter((h) => h !== "tg-aviator");
// TG Aviator is embedded in Trading Grid Online. Every Aviator Studio agent is published to every client by default,
// so the MCP tool list always matches Studio; Unpublish in Deployments is the explicit exception.
const NOT_PUBLISHABLE = new Set(["tg-aviator"]);

export const published: Record<string, Set<HostKey>> = {};
export const blocked: Record<string, Set<string>> = {};

export function resetDeployments() {
  for (const a of AGENTS) {
    if (NOT_PUBLISHABLE.has(a.id)) continue;
    published[a.id] = new Set(CLIENT_KEYS);
  }
  for (const h of CLIENT_KEYS) blocked[h] = new Set();
}
resetDeployments();

export const publishable = () => AGENTS.filter((a) => !NOT_PUBLISHABLE.has(a.id));
export const toolNameFor = (agentId: string) => AGENTS.find((a) => a.id === agentId)!.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
export const agentForTool = (tool: string) => publishable().find((a) => toolNameFor(a.id) === tool);

/** Agents a client can call: published to it and not blocked by the customer administrator. */
export function agentsFor(host: HostKey) {
  return publishable().filter((a) => published[a.id]?.has(host) && !blocked[host]?.has(a.id));
}

export function deploymentState() {
  return publishable().map((a) => ({
    agentId: a.id, name: a.name, status: a.status, toolName: toolNameFor(a.id),
    clients: Object.fromEntries(CLIENT_KEYS.map((h) => [h, { published: published[a.id].has(h), blocked: blocked[h].has(a.id) }])),
  }));
}
