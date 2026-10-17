// Trading Grid Insights: observed transaction activity from the continuous world model (see world.ts).
export { Tx, STATUS_TEXT, transactions, txById, SEARCH_LIMIT_DAYS, STORES, STORE_LIST, incidentAt, worldStats, tick, onWorldDay, ackOf, docsByPo, docsByKey } from "./world.js";
import type { Tx } from "./world.js";

export function renderPayload(tx: Tx, variant: string) {
  const s = tx.sender.tradingAddress.split(":");
  const r = tx.receiver.tradingAddress.split(":");
  const d = tx.receivedAt.slice(2, 10).replace(/-/g, "");
  const c = tx.controlNumbers;
  if (variant === "TRANSLATED") {
    return JSON.stringify({ documentType: tx.documentType, ...tx.refs, sender: tx.sender.companyName, receiver: tx.receiver.companyName, lines: [{ line: 1, sku: "HRG-118204", qty: 24, uom: "EA", unitPrice: 12.4 }, { line: 2, sku: "HRG-118377", qty: 12, uom: "EA", unitPrice: 8.15 }] }, null, 2);
  }
  if (tx.standard === "EDIFACT") {
    return [`UNB+UNOA:2+${s[1]}:14+${r[1]}:14+${d}:0800+${c.unb0020}'`, `UNH+1+${tx.documentType}:D:96A:UN'`, `BGM+220+${tx.refs.poNumber ?? tx.refs.invoiceNumber ?? tx.refs.ackForControlNumber}+9'`, `NAD+DP+${tx.refs.shipToGLN ?? ""}::9'`, "UNT+4+1'", `UNZ+1+${c.unb0020}'`].join("\n");
  }
  const head = [`ISA*00*          *00*          *${s[0]}*${s[1].padEnd(15)}*${r[0]}*${r[1].padEnd(15)}*${d}*0800*U*00401*${c.isa13}*0*P*>~`, `GS*XX*${s[1]}*${r[1]}*20${d}*0800*${c.gs06}*X*004010~`];
  let body: string[] = [];
  const st = `ST*${tx.documentType}*0001~`;
  if (tx.documentType === "856") {
    const shipTo = tx.refs.storeNumber ? `N1*ST*Harborview DC ${tx.refs.storeNumber}*92*${tx.refs.storeNumber}~` : `N1*ST*Harborview*UL*${tx.refs.shipToGLN}~`;
    body = [st, `BSN*00*${tx.refs.shipmentId}*20${d}*1130~`, "HL*1**S~", "TD1*CTN25*12****G*240*LB~", "TD5**2*RDLN~", shipTo, "HL*2*1*O~", `PRF*${tx.refs.poNumber}~`, "HL*3*2*I~", "LIN**UP*012345678905~", "SN1**24*EA~", "CTT*3~", "SE*12*0001~"];
  } else if (tx.documentType === "810") {
    const price = tx.errors[0]?.code === "X12-SYN-104" ? "12,40" : "12.40";
    body = [st, `BIG*20${d}*${tx.refs.invoiceNumber}**${tx.refs.poNumber}~`, `N1*ST*Harborview*UL*${tx.refs.shipToGLN ?? ""}~`, `IT1*1*24*EA*${price}**UP*012345678905~`, "TDS*29760~", "CTT*1~", "SE*7*0001~"];
  } else if (tx.documentType === "850") {
    body = [st, `BEG*00*SA*${tx.refs.poNumber}**20${d}~`, `N1*ST*Harborview*UL*${tx.refs.shipToGLN ?? ""}~`, "PO1*1*24*EA*12.40**UP*012345678905~", "CTT*1~", "SE*6*0001~"];
  } else if (tx.documentType === "997") {
    const code = tx.ack?.code?.split("=")[1] ?? "A";
    body = [st, `AK1*XX*${tx.refs.ackForControlNumber}~`, ...(tx.ack?.detail ? tx.ack.detail.split(" / ").map((x) => `${x}~`) : []), `AK9*${code}*1*1*${code === "A" ? 1 : 0}~`, "SE*4*0001~"];
  } else if (tx.documentType === "940") {
    body = [st, `W05*N*${tx.refs.shippingOrder}*${tx.refs.poNumber}~`, `N1*ST*Harborview*UL*${tx.refs.shipToGLN ?? ""}~`, "LX*1~", "W01*24*EA**UP*012345678905~", "W76*24*EA~", "SE*7*0001~"];
  } else if (tx.documentType === "945") {
    const shipped = tx.refs.quantityShipped ?? 24;
    body = [st, `W06*N*${tx.refs.shippingOrder}*20${d}*${tx.refs.shipmentId}~`, "LX*1~", `W12*${shipped < (tx.refs.quantityOrdered ?? 24) ? "SH" : "CC"}*${tx.refs.quantityOrdered ?? 24}*${shipped}*${(tx.refs.quantityOrdered ?? 24) - shipped}*EA**UP*012345678905~`, `W03*${shipped}~`, "SE*6*0001~"];
  } else if (tx.documentType === "214") {
    body = [st, `B10*${tx.refs.shipmentId}*${tx.refs.shipmentId}*RDLN~`, "LX*1~", `AT7*${tx.refs.statusCode}*NS***20${d}*1000~`, "SE*5*0001~"];
  } else if (tx.documentType === "812") {
    body = [st, `BCD*20${d}*${tx.refs.adjustmentNumber}*D*${(tx.refs.amount ?? 0).toFixed(2)}*D******${tx.refs.invoiceNumber}~`, `CDD*06*D**${(tx.refs.amount ?? 0).toFixed(2)}~`, "SE*4*0001~"];
  } else if (tx.documentType === "820") {
    body = [st, `BPR*C*${(tx.refs.amount ?? 0).toFixed(2)}*C*ACH~`, `TRN*1*${tx.refs.traceNumber}~`, `RMR*IV*${tx.refs.invoiceNumber ?? "MULTIPLE"}**${(tx.refs.amount ?? 0).toFixed(2)}~`, "SE*5*0001~"];
  } else {
    body = [st, `BAK*00*AC*${tx.refs.poNumber}*20${d}~`, "SE*3*0001~"];
  }
  return [...head, ...body, `GE*1*${c.gs06}~`, `IEA*1*${c.isa13}~`].join("\n");
}
