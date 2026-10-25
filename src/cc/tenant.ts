// Command Center demo tenant: Northfield Stores (retailer) and Nuvori Beauty (CPG supplier).
// tenant.json is exported from the Command Center prototype (process-genome, tools/command-center/export-tenant.cjs)
// so Aviator answers from the same partners, findings and numbers the Command Center screens show.
// This tenant is isolated from the Harborview Retail Group world: its own grant, tools and agent runs.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const file = [path.join(here, "tenant.json"), path.join(here, "..", "..", "src", "cc", "tenant.json")].find((f) => { try { readFileSync(f); return true; } catch { return false; } });
export const TENANT: any = JSON.parse(readFileSync(file!, "utf8"));

export type Perspective = "retailer" | "supplier";

export const CC_CLIENTS: Record<Perspective, any> = {
  retailer: {
    key: "cc-retailer", perspective: "retailer", name: "OpenText Command Center (Aviator)", shortName: "Command Center",
    company: "Northfield Stores", organization: "ORG-NFS", companyId: "C30112", buid: "BU-NFS-US", grantId: "GRT-NFS-2026-031", solutions: ["SOL-NFS-RETAIL-01"],
    principal: "alex.morgan@northfieldstores.example", principalType: "DELEGATED_USER", clientApplication: "app-command-center-nfs",
    route: ["Command Center Aviator", "Trading Grid Agent Connectors (MCP)", "Trading Grid services"],
  },
  supplier: {
    key: "cc-supplier", perspective: "supplier", name: "OpenText Command Center (Aviator)", shortName: "Command Center",
    company: "Nuvori Beauty", organization: "ORG-NUV", companyId: "C30451", buid: "BU-NUV-US", grantId: "GRT-NUV-2026-018", solutions: ["SOL-NUV-CPG-01"],
    principal: "alex.morgan@nuvoribeauty.example", principalType: "DELEGATED_USER", clientApplication: "app-command-center-nuv",
    route: ["Command Center Aviator", "Trading Grid Agent Connectors (MCP)", "Trading Grid services"],
  },
};

export const CC_OPERATIONS = ["access.read", "community.read", "connectivity.read", "transaction.read", "ccim.read", "ccpm.read", "agent.invoke"];
export const POLICY_VERSION = "tgcs-policy-0.4";

/** Follow-up state reported by the calling Command Center session (owner, state, expect-by). Read-only overlay. */
export type FollowUp = { id: string; state?: string; owner?: string; waitingOn?: string; expectBy?: string; since?: string; activity?: string[] };

export type CcCtx = { perspective: Perspective; networkTime: string; followUps: Record<string, FollowUp>; sessionId: string };

export const tenantFor = (p: Perspective) => TENANT.perspectives[p];
