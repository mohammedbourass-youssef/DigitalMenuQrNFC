import type { NFCTag } from "@/types";

const nfcTags: NFCTag[] = [
  { id: "n1", code: "SNX-101", menuItemId: "m1", status: "active", location: "Table 01", lastScannedAt: "2026-09-12T12:15:00Z" },
  { id: "n2", code: "SNX-102", menuItemId: "m3", status: "active", location: "Table 02", lastScannedAt: "2026-09-12T12:20:00Z" },
  { id: "n3", code: "SNX-103", menuItemId: "m4", status: "inactive", location: "Pickup Counter", lastScannedAt: "2026-09-11T18:00:00Z" },
  { id: "n4", code: "SNX-104", menuItemId: "m6", status: "active", location: "Window Seat", lastScannedAt: "2026-09-12T11:40:00Z" },
];

export const getNFCTags = (): Promise<NFCTag[]> => Promise.resolve(nfcTags);
