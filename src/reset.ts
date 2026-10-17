// Restores seeded state: used by Reset demo and by the scenario runner.
import { changeRequests, provisionings, deliverySchedules, xrefEntities } from "./data/other.js";
import { plans, clientStatus } from "./runtime.js";
import { audit } from "./tools/index.js";
import { tickets } from "./tools/aviator.js";
import { queries, exports } from "./tools/tgdp.js";
import { resetApps } from "./tools/apps.js";
import { resetDeployments } from "./deployments.js";

const SNAP = { cr: JSON.stringify(changeRequests), pv: JSON.stringify(provisionings), ds: JSON.stringify(deliverySchedules), xref: JSON.stringify(xrefEntities) };

/** Restores data and governance state. Conversations and the gateway counter are reset by the caller. */
export function resetData() {
  plans.clear(); audit.length = 0; tickets.length = 0; queries.clear(); exports.clear();
  resetDeployments(); resetApps();
  for (const k of Object.keys(clientStatus)) delete (clientStatus as any)[k];
  changeRequests.splice(0, changeRequests.length, ...JSON.parse(SNAP.cr));
  provisionings.splice(0, provisionings.length, ...JSON.parse(SNAP.pv));
  deliverySchedules.splice(0, deliverySchedules.length, ...JSON.parse(SNAP.ds));
  const x = JSON.parse(SNAP.xref); for (const k of Object.keys(xrefEntities)) delete (xrefEntities as any)[k]; for (const k of Object.keys(x)) (xrefEntities as any)[k] = x[k];
}
