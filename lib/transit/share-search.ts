import type { SeatShareRow } from "../supabase/database";
import { unexpiredShares } from "../supabase/seat-shares";
import { routesForLine, stationsForRoute, type ShareReference, type ShareRoute } from "./share-routes";
import { SHARE_CAR_LIMITS } from "./car-policy";

export type ShareSearch = { direction: string; carNumber?: number; exitStationId: string };

/** Filter individual reports by verified memberships, never station names or train identity. */
export function searchShareCards(
  rows: SeatShareRow[], reference: ShareReference | null, route: ShareRoute | null,
  search: ShareSearch | null, now: number,
): SeatShareRow[] {
  if (!reference || (route && reference.lineKey !== route.lineKey)) return [];
  const routes = (route ? [route] : routesForLine(reference.lineKey)).map(item => ({
    route: item, members: new Set(stationsForRoute(reference, item).map(s => s.membershipId)),
  }));
  if (search && ((search.carNumber !== undefined && (!Number.isInteger(search.carNumber) || search.carNumber < 1 || search.carNumber > SHARE_CAR_LIMITS[reference.lineKey])) ||
      (search.direction !== "" && !routes.some(({ route }) => route.directions.some(d => d === search.direction))) ||
      (search.exitStationId !== "" && !routes.some(({ members }) => members.has(search.exitStationId))))) return [];

  return unexpiredShares(rows, now).filter(share => share.line_id === reference.lineId &&
    routes.some(({ route, members }) => members.has(share.current_line_station_id) && members.has(share.exit_line_station_id) &&
      route.directions.some(d => d === share.direction_label)) &&
    (!search || ((!search.direction || share.direction_label === search.direction) &&
      (search.carNumber === undefined || share.car_number === search.carNumber) &&
      (!search.exitStationId || share.exit_line_station_id === search.exitStationId))))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}
