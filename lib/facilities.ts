// Public types/constants only. Never import server/facilities.ts into a client component.
import coverage from "./facilities-coverage.json";
export const FACILITY_SOURCE = "https://www.data.go.kr/data/15143841/openapi.do";
// Audit metadata only: no facility locations or fallback responses are bundled here.
// An empty audit is NOT proof that a station has no restroom. All known codes can be freshly queried.
export const RESTROOM_STATIONS: Readonly<Record<string, string>> = Object.fromEntries(coverage.stations.map(s => [s.code, s.name]));
export const SUPPORTED_RESTROOMS: Readonly<Record<string, string>> = Object.fromEntries(coverage.stations.filter(s => s.status === "verified").map(s => [s.code, s.name]));
export const RESTROOM_COVERAGE = {
  checkedAt: coverage.checkedAt, total: coverage.stations.length,
  verified: coverage.stations.filter(s => s.status === "verified").length,
  empty: coverage.stations.filter(s => s.status === "empty").map(s => s.name),
} as const;
export type Restroom = {
  facilityName: string | null; facilityNumber: string | null;
  detailLocation: string | null; floor: string | null; groundType: string | null;
  nearbyEntrances: string | null; gateSide: string | null; restroomType: string | null;
  wheelchairAccess: string | null; referenceDate: string | null;
};
export type FacilityData = {
  status: "ok" | "empty"; lineCode: "02호선"; stationCode: string; stationName: string;
  membershipId: string; source: string; fetchedAt: string; restrooms: Restroom[];
};
export type FacilityError = { status: "error"; code: string; message: string };
export type FacilityResponse = FacilityData | FacilityError;
