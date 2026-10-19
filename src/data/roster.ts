// Trading community roster and traffic profiles for the continuous world model.
// Lifecycle days are relative to ANCHOR (2026-10-17 UTC). Negative = before, positive = after.

export const ANCHOR = Date.UTC(2026, 9, 17);
export const DAY = 86400_000;
export const anchorDay = (offset: number) => Math.floor(ANCHOR / DAY) + offset;

export type Protocol = "AS2" | "SFTP" | "VAN_INTERCONNECT" | "WEB_EDI";
export type Flow = "X12_SUPPLIER" | "EDIFACT_SUPPLIER" | "WEB_EDI" | "3PL";

export type Profile = {
  id: string;
  prefix: string;
  flow: Flow;
  protocol: Protocol;
  /** Orders (or shipping orders) per weekday at seasonal factor 1. */
  orders: number;
  /** Share of POs answered with an 855. 0 = not enrolled. */
  poAck: number;
  /** Optional 855 share per week since go-live (overrides poAck), for partners new to EDI. */
  poAckWeeks?: number[];
  /** Optional 855 response time range in hours. */
  ackLagH?: [number, number];
  /** Ship-to sent as store number (N103=92) and resolved through STORE_TO_GLN. */
  storeNumbers?: boolean;
  /** Share of invoices sent before the ASN. */
  invoiceFirst?: number;
  asnMissing?: number;
  /** Inbound map used for 856 and 810. */
  map856?: string;
  map810?: string;
  map855?: string;
  goLive: number;
  quietFrom?: number;
};

/** New partners added to the community beyond the original fixture set. */
export type NewPartner = { id: string; name: string; city: string; state: string; industry: string; qualifier: string; address: string; contact: [string, string, string, string] };

export const NEW_PARTNERS: NewPartner[] = [
  { id: "C20015", name: "Bayside Snacks Co", city: "Tampa", state: "FL", industry: "Consumer packaged goods", qualifier: "ZZ", address: "BAYSIDESNACKS", contact: ["Nina", "Patel", "edi@baysidesnacks.com", "+1 813 555 0121"] },
  { id: "C20016", name: "Granite Peak Outdoor", city: "Boulder", state: "CO", industry: "Sporting goods", qualifier: "ZZ", address: "GRANITEPEAK", contact: ["Cole", "Bennett", "b2b@granitepeakoutdoor.com", "+1 303 555 0188"] },
  { id: "C20017", name: "Lumen Lighting Supply", city: "Cleveland", state: "OH", industry: "Home improvement", qualifier: "ZZ", address: "LUMENLIGHTING", contact: ["Iris", "Novak", "edi@lumenlightingsupply.com", "+1 216 555 0170"] },
  { id: "C20018", name: "Orchard Lane Juices", city: "Yakima", state: "WA", industry: "Beverages", qualifier: "12", address: "5095550133", contact: ["Hank", "Doyle", "orders@orchardlanejuices.com", "+1 509 555 0133"] },
  { id: "C20019", name: "Riverstone Pet Products", city: "Omaha", state: "NE", industry: "Pet supplies", qualifier: "ZZ", address: "RIVERSTONEPET", contact: ["Mei", "Lin", "edi@riverstonepet.com", "+1 402 555 0119"] },
  { id: "C20020", name: "Cascadia Paper Goods", city: "Tacoma", state: "WA", industry: "Paper products", qualifier: "ZZ", address: "CASCADIAPAPER", contact: ["Erik", "Lund", "edi@cascadiapapergoods.com", "+1 253 555 0161"] },
  { id: "C20021", name: "Silverline Kitchenware", city: "Chicago", state: "IL", industry: "Housewares", qualifier: "ZZ", address: "SILVERLINEKW", contact: ["Rosa", "Diaz", "ecommerce@silverlinekitchen.com", "+1 312 555 0102"] },
  { id: "C20022", name: "Harbor and Pine Textiles", city: "Greensboro", state: "NC", industry: "Textiles", qualifier: "ZZ", address: "HARBORPINETX", contact: ["Will", "Archer", "edi@harborpinetextiles.com", "+1 336 555 0144"] },
  { id: "C20023", name: "Kestrel Electronics", city: "San Jose", state: "CA", industry: "Consumer electronics", qualifier: "01", address: "118220457", contact: ["Arun", "Mehta", "b2b@kestrelelectronics.com", "+1 408 555 0177"] },
  { id: "C20024", name: "Meadowbrook Dairy", city: "Madison", state: "WI", industry: "Dairy", qualifier: "ZZ", address: "MEADOWBROOKDY", contact: ["Karen", "Olsen", "edi@meadowbrookdairy.com", "+1 608 555 0125"] },
  { id: "C20025", name: "Sunfield Produce Partners", city: "Salinas", state: "CA", industry: "Fresh produce", qualifier: "ZZ", address: "SUNFIELDPRDC", contact: ["Diego", "Ruiz", "edi@sunfieldproduce.com", "+1 831 555 0150"] },
  { id: "C20026", name: "Ironwood Tools Inc", city: "Milwaukee", state: "WI", industry: "Hardware", qualifier: "ZZ", address: "IRONWOODTOOLS", contact: ["Pete", "Kowalski", "edi@ironwoodtools.com", "+1 414 555 0138"] },
  { id: "C20027", name: "Blue Heron Baby", city: "Raleigh", state: "NC", industry: "Baby products", qualifier: "ZZ", address: "BLUEHERONBABY", contact: ["Tess", "Walker", "ops@blueheronbaby.com", "+1 919 555 0166"] },
  { id: "C20028", name: "Copperleaf Candle Co", city: "Asheville", state: "NC", industry: "Home fragrance", qualifier: "ZZ", address: "COPPERLEAFWEB", contact: ["June", "Harper", "orders@copperleafcandle.com", "+1 828 555 0109"] },
  { id: "C20029", name: "Northstar Apparel Group", city: "New York", state: "NY", industry: "Apparel", qualifier: "ZZ", address: "NORTHSTARAPRL", contact: ["Dev", "Shah", "edi@northstarapparel.com", "+1 212 555 0193"] },
  { id: "C20030", name: "Tidewater Seafood Co", city: "Norfolk", state: "VA", industry: "Seafood", qualifier: "ZZ", address: "TIDEWATERSEA", contact: ["Bill", "Grady", "orders@tidewaterseafood.com", "+1 757 555 0129"] },
  { id: "C20031", name: "Prairie Grain Foods", city: "Wichita", state: "KS", industry: "Consumer packaged goods", qualifier: "ZZ", address: "PRAIRIEGRAIN", contact: ["Lena", "Fischer", "edi@prairiegrainfoods.com", "+1 316 555 0114"] },
  { id: "C20032", name: "Cedar Valley Furniture", city: "High Point", state: "NC", industry: "Furniture", qualifier: "ZZ", address: "CEDARVALLEYF", contact: ["Grant", "Ellis", "it@cedarvalleyfurniture.com", "+1 336 555 0182"] },
  { id: "C20033", name: "Vantage Health Supply", city: "Nashville", state: "TN", industry: "Health and beauty", qualifier: "ZZ", address: "VANTAGEHLTH", contact: ["Ana", "Costa", "edi@vantagehealthsupply.com", "+1 615 555 0157"] },
  { id: "C20034", name: "Rocky Coast Beverages", city: "Portland", state: "ME", industry: "Beverages", qualifier: "12", address: "2075550146", contact: ["Sam", "Fortin", "edi@rockycoastbev.com", "+1 207 555 0146"] },
];

/** Traffic profiles for every trading partner that exchanges documents. */
export const PROFILES: Profile[] = [
  { id: "C20001", prefix: "NF", flow: "X12_SUPPLIER", protocol: "AS2", orders: 18, poAck: 0.95, map810: "M-1002", goLive: -1880 },
  { id: "C20002", prefix: "NFR", flow: "X12_SUPPLIER", protocol: "SFTP", orders: 6, poAck: 0, goLive: -690 },
  { id: "C20003", prefix: "CST", flow: "X12_SUPPLIER", protocol: "VAN_INTERCONNECT", orders: 14, poAck: 0.9, map856: "M-1005", goLive: -1590 },
  { id: "C20004", prefix: "BW", flow: "X12_SUPPLIER", protocol: "AS2", orders: 13, poAck: 0.92, storeNumbers: true, map856: "M-1001", goLive: -1290 },
  { id: "C20005", prefix: "PGH", flow: "X12_SUPPLIER", protocol: "AS2", orders: 3, poAck: 0.7, poAckWeeks: [0.95, 0.55, 0.9, 0.35, 0.85, 0.5, 0.95, 0.3, 0.8, 0.45], ackLagH: [8, 96], map810: "M-1006", goLive: -65 },
  { id: "C20006", prefix: "HOL", flow: "EDIFACT_SUPPLIER", protocol: "AS2", orders: 4, poAck: 0, goLive: -1090 },
  { id: "C20007", prefix: "SMB", flow: "X12_SUPPLIER", protocol: "SFTP", orders: 11, poAck: 0.85, map855: "M-1008", goLive: -1240 },
  { id: "C20008", prefix: "ATL", flow: "X12_SUPPLIER", protocol: "AS2", orders: 9, poAck: 0.9, goLive: -1440 },
  { id: "C20009", prefix: "MPC", flow: "X12_SUPPLIER", protocol: "AS2", orders: 10, poAck: 0.88, invoiceFirst: 0.06, asnMissing: 0.03, goLive: -970 },
  { id: "C20013", prefix: "CRL", flow: "3PL", protocol: "AS2", orders: 30, poAck: 0, goLive: -410 },
  { id: "C20014", prefix: "MRC", flow: "WEB_EDI", protocol: "WEB_EDI", orders: 1.5, poAck: 0, storeNumbers: true, invoiceFirst: 0.2, goLive: -150 },
  { id: "C20015", prefix: "BYS", flow: "X12_SUPPLIER", protocol: "AS2", orders: 12, poAck: 0.9, goLive: -1100 },
  { id: "C20016", prefix: "GPO", flow: "X12_SUPPLIER", protocol: "VAN_INTERCONNECT", orders: 9, poAck: 0.8, goLive: -800 },
  { id: "C20017", prefix: "LUM", flow: "X12_SUPPLIER", protocol: "AS2", orders: 7, poAck: 0.85, storeNumbers: true, map856: "M-1013", goLive: -620 },
  { id: "C20018", prefix: "OLJ", flow: "X12_SUPPLIER", protocol: "SFTP", orders: 8, poAck: 0, goLive: -950 },
  { id: "C20019", prefix: "RSP", flow: "X12_SUPPLIER", protocol: "AS2", orders: 10, poAck: 0.93, goLive: -1200 },
  { id: "C20020", prefix: "CPG", flow: "X12_SUPPLIER", protocol: "SFTP", orders: 5, poAck: 0.7, goLive: -700, quietFrom: 18 },
  { id: "C20021", prefix: "SLK", flow: "X12_SUPPLIER", protocol: "AS2", orders: 8, poAck: 0.9, storeNumbers: true, map856: "M-1013", invoiceFirst: 0.04, goLive: -880 },
  { id: "C20022", prefix: "HPT", flow: "X12_SUPPLIER", protocol: "VAN_INTERCONNECT", orders: 6, poAck: 0.75, goLive: -1300 },
  { id: "C20023", prefix: "KES", flow: "X12_SUPPLIER", protocol: "AS2", orders: 9, poAck: 0.95, goLive: -540 },
  { id: "C20024", prefix: "MBD", flow: "X12_SUPPLIER", protocol: "AS2", orders: 14, poAck: 0.6, goLive: -1500 },
  { id: "C20025", prefix: "SFP", flow: "X12_SUPPLIER", protocol: "SFTP", orders: 10, poAck: 0, invoiceFirst: 0.05, goLive: -1000 },
  { id: "C20026", prefix: "IWT", flow: "X12_SUPPLIER", protocol: "AS2", orders: 6, poAck: 0.9, goLive: -760 },
  { id: "C20027", prefix: "BHB", flow: "X12_SUPPLIER", protocol: "AS2", orders: 5, poAck: 0.9, goLive: -60 },
  { id: "C20028", prefix: "CLC", flow: "WEB_EDI", protocol: "WEB_EDI", orders: 1.5, poAck: 0, invoiceFirst: 0.15, goLive: -25 },
  { id: "C20029", prefix: "NSA", flow: "X12_SUPPLIER", protocol: "AS2", orders: 11, poAck: 0.92, goLive: -1350 },
  { id: "C20030", prefix: "TWS", flow: "X12_SUPPLIER", protocol: "SFTP", orders: 4, poAck: 0, goLive: -900, quietFrom: -40 },
  { id: "C20031", prefix: "PGF", flow: "X12_SUPPLIER", protocol: "AS2", orders: 9, poAck: 0.88, goLive: -1150 },
  { id: "C20032", prefix: "CVF", flow: "X12_SUPPLIER", protocol: "AS2", orders: 3, poAck: 0.9, goLive: 12 },
  { id: "C20033", prefix: "VHS", flow: "X12_SUPPLIER", protocol: "AS2", orders: 6, poAck: 0.85, goLive: -90 },
  { id: "C20034", prefix: "RCB", flow: "X12_SUPPLIER", protocol: "SFTP", orders: 5, poAck: 0.8, goLive: 24 },
];

export const profileById = (id: string) => PROFILES.find((p) => p.id === id);
