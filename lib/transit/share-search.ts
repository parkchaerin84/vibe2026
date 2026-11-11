import type { SeatShareRow } from "../supabase/database";
import { unexpiredShares } from "../supabase/seat-shares";
import { stationsForRoute, type ShareReference, type ShareRoute } from "./share-routes";
import { SHARE_CAR_LIMITS } from "./car-policy";

export type ShareSearch = { direction: string; carNumber: number; exitStationId: string };

/** Filter individual reports by verified memberships, never station names or train identity. */
export function searchShareCards(
  rows: SeatShareRow[], reference: ShareReference | null, route: ShareRoute,
  search: ShareSearch | null, now: number,
): SeatShareRow[] {
  if (!reference || reference.lineKey !== route.lineKey) return [];
  const members = new Set(stationsForRoute(reference, route).map(s => s.membershipId));
  if (search && (!Number.isInteger(search.carNumber) || search.carNumber < 1 || search.carNumber > SHARE_CAR_LIMITS[reference.lineKey] ||
      !route.directions.some(d => d === search.direction) ||
      (search.exitStationId !== "" && !members.has(search.exitStationId)))) return [];

  return unexpiredShares(rows, now).filter(share => share.line_id === reference.lineId &&
    members.has(share.current_line_station_id) && members.has(share.exit_line_station_id) &&
    route.directions.some(d => d === share.direction_label) &&
    (!search || (share.direction_label === search.direction && share.car_number === search.carNumber &&
      (search.exitStationId === "" || share.exit_line_station_id === search.exitStationId))));
}
