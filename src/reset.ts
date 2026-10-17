// Seeded baseline: captured at startup before any persisted state is loaded. Used by Reset demo and the scenario runner.
import { serializeState, setState } from "./state.js";

const SEED = serializeState();
export function resetData() { setState(SEED); }
