import metadata from "./share-stations.json";
import type { ShinbundangData, VerifiedStation } from "../supabase/shinbundang";

// Reviewed topology, not sample station records. Names/UUIDs shown in the UI come from Supabase.
// Source URLs and review date live in share-stations.json. Never infer order by sorting codes:
// Yongdu=0250 and Kkachisan=0200. This is infrastructure connectivity, not a live train itinerary.
export type ShareLineKey = "shinbundang" | "line2";
export type ShareReference = ShinbundangData & { lineKey: ShareLineKey };
export type ShareRouteId = "shinbundang-main" | "line2-main" | "line2-seongsu" | "line2-sinjeong";
export type ShareRoute = {
  id: ShareRouteId; lineKey: ShareLineKey; name: string; circular: boolean;
  sourceCodes: readonly string[]; directions: readonly [string, string];
};
export const SHARE_LINES = [
  { key: "shinbundang", name: "신분당선", dataset: "kric_urban_rail_station", code: "I11D1", stations: metadata.shinbundang },
  { key: "line2", name: "2호선", dataset: "seoul_metro_oa15442", code: "02호선", stations: metadata.line2 },
] as const;

export const SHARE_ROUTES: readonly ShareRoute[] = [
  { id: "shinbundang-main", lineKey: "shinbundang", name: "신사 ↔ 광교", circular: false,
    sourceCodes: metadata.shinbundang.map(s => s.sourceCode), directions: ["광교 방면", "신사 방면"] },
  { id: "line2-main", lineKey: "line2", name: "본선 (순환선)", circular: true,
    sourceCodes: metadata.line2.filter(s => s.branch === "main").map(s => s.sourceCode), directions: ["내선순환", "외선순환"] },
  { id: "line2-seongsu", lineKey: "line2", name: "성수지선 (성수 ↔ 신설동)", circular: false,
    sourceCodes: ["02호선:0211", ...metadata.line2.filter(s => s.branch === "seongsu").map(s => s.sourceCode)], directions: ["신설동 방면", "성수 방면"] },
  { id: "line2-sinjeong", lineKey: "line2", name: "신정지선 (신도림 ↔ 까치산)", circular: false,
    sourceCodes: ["02호선:0234", ...metadata.line2.filter(s => s.branch === "sinjeong").map(s => s.sourceCode)], directions: ["까치산 방면", "신도림 방면"] },
];

export function routesForLine(lineKey: ShareLineKey) {
  return SHARE_ROUTES.filter(route => route.lineKey === lineKey);
}

export function stationsForRoute(reference: ShareReference, route: ShareRoute): VerifiedStation[] {
  if (reference.lineKey !== route.lineKey) return [];
  const byCode = new Map(reference.stations.map(s => [s.sourceCode, s]));
  return route.sourceCodes.flatMap(code => byCode.has(code) ? [byCode.get(code)!] : []);
}

/** Walk at most one lap, excluding the current station. Branches stop at their terminal. */
export function reachableStations(reference: ShareReference, route: ShareRoute, currentId: string, direction: string): VerifiedStation[] {
  const stations = stationsForRoute(reference, route);
  const current = stations.findIndex(s => s.membershipId === currentId);
  const sign = direction === route.directions[0] ? 1 : direction === route.directions[1] ? -1 : 0;
  if (current < 0 || !sign || stations.length !== route.sourceCodes.length) return [];
  const result: VerifiedStation[] = [];
  for (let step = 1; step < stations.length; step++) {
    const index = current + sign * step;
    if (!route.circular && (index < 0 || index >= stations.length)) break;
    result.push(stations[(index + stations.length) % stations.length]);
  }
  return result;
}

export function routeForDirection(reference: ShareReference, direction: string) {
  return routesForLine(reference.lineKey).find(route => route.directions.some(d => d === direction));
}
