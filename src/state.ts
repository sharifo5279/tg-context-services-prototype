// Mutable demo state: everything users and agents can change. Serialized for persistence and for
// isolating test runs; the startup snapshot is the seeded baseline used by Reset demo.
import { UPC_INCIDENT } from "./data/world.js";
import { changeRequests, provisionings, deliverySchedules, xrefEntities, CERT_CR, FIXTURE_CRS, applyHoldFixes } from "./data/other.js";
import { SEED_PROVISIONINGS } from "./data/other.js";
import { plans, clientStatus } from "./runtime.js";
import { audit } from "./tools/index.js";
import { tickets } from "./tools/aviator.js";
import { queries, exports } from "./tools/tgdp.js";
import { alertRules, ccpmRules, findingState, txOverrides, applyTxOverrides, clearTxOverrides } from "./tools/apps.js";
import { published, blocked, resetDeployments, CLIENT_KEYS } from "./deployments.js";

const setArr = (a: any[], v: any[]) => a.splice(0, a.length, ...(v ?? []));
const setObj = (o: Record<string, any>, v: Record<string, any>) => { for (const k of Object.keys(o)) delete o[k]; Object.assign(o, v ?? {}); };

export function getState() {
  return {
    changeRequests, provisionings, deliverySchedules, xrefEntities, tickets, alertRules, ccpmRules, findingState, txOverrides, clientStatus,
    plans: [...plans.values()],
    audit: audit.slice(0, 500),
    knownHosts: CLIENT_KEYS,
    published: Object.fromEntries(Object.entries(published).map(([k, v]) => [k, [...v]])),
    blocked: Object.fromEntries(Object.entries(blocked).map(([k, v]) => [k, [...v]])),
  };
}
export type State = ReturnType<typeof getState>;

/** Replaces the mutable state with a serialized copy. */
export function setState(raw: any) {
  // Saved state from before the partner rename carries the old name; map it to Cedar Valley Furniture.
  const txt = (typeof raw === "string" ? raw : JSON.stringify(raw)).replace(/Alder and Ash Furniture/g, "Cedar Valley Furniture").replace(/Alder and Ash/g, "Cedar Valley").replace(/alder_ash/g, "cedar_valley").replace(/alderandash\.com/g, "cedarvalleyfurniture.com").replace(/ALDERASHFURN/g, "CEDARVALLEYF").replace(/AAF_856/g, "CVF_856").replace(/TRK-AAF/g, "TRK-CVF").replace(/MB-AAF/g, "MB-CVF");
  const v = JSON.parse(txt);
  setArr(changeRequests, v.changeRequests); { const i = changeRequests.findIndex((c) => c.statusId === CERT_CR.statusId); if (i >= 0) changeRequests.splice(i, 1); changeRequests.unshift(JSON.parse(JSON.stringify(CERT_CR))); } applyHoldFixes(changeRequests); for (const f of FIXTURE_CRS) if (!changeRequests.some((c) => c.statusId === f.statusId)) changeRequests.push(JSON.parse(JSON.stringify(f))); for (const k of ["ST-10466"]) { const i = changeRequests.findIndex((c) => c.statusId === k); if (i >= 0) changeRequests.splice(i, 1); } setArr(provisionings, v.provisionings); for (const p of SEED_PROVISIONINGS) if (!provisionings.some((x) => x.trackingId === p.trackingId)) provisionings.push({ ...p }); setArr(deliverySchedules, v.deliverySchedules);
  setObj(xrefEntities, v.xrefEntities); delete xrefEntities.ITEM_UPC_TO_SKU?.entries?.[UPC_INCIDENT.upc]; UPC_INCIDENT.fixedAt = null; setArr(tickets, v.tickets); setArr(alertRules, v.alertRules); setArr(ccpmRules, v.ccpmRules);
  setObj(findingState, v.findingState); setObj(clientStatus, v.clientStatus);
  plans.clear(); for (const p of v.plans ?? []) plans.set(p.planId, p);
  setArr(audit, v.audit);
  clearTxOverrides(); applyTxOverrides(v.txOverrides ?? {});
  resetDeployments();
  const known = new Set<string>(v.knownHosts ?? ["aviator-studio", "copilot-studio", "gemini-enterprise", "sap-joule", "claude-connector", "claude-ui"]);
  const added = CLIENT_KEYS.filter((h) => !known.has(h));
  for (const [k, list] of Object.entries(v.published ?? {})) if (published[k]) published[k] = new Set([...(list as any), ...added]);
  for (const [k, list] of Object.entries(v.blocked ?? {})) blocked[k] = new Set(list as any);
  queries.clear(); exports.clear();
}

export const serializeState = () => JSON.stringify(getState());
