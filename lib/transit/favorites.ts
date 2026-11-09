export const FAVORITES_STORAGE_KEY = "subwayeasy_favorites";
export type Favorite = { id: string; lineName: string; lineColor: string; stationName: string; destinationName: string };

export function isFavorite(value: unknown): value is Favorite {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return ["id", "lineName", "lineColor", "stationName", "destinationName"].every(k => typeof row[k] === "string");
}

/** Preserve unrecognized entries and extra fields too. Corrupt storage must never be overwritten. */
export function parseFavorites(raw: string | null): unknown[] {
  if (raw === null) return [];
  const rows: unknown = JSON.parse(raw);
  if (!Array.isArray(rows)) throw new Error("Invalid favorite storage");
  return rows;
}

export function availableFavorite(value: unknown, names: ReadonlySet<string>): value is Favorite {
  return isFavorite(value) && value.lineName === "2호선" && names.has(value.stationName) && names.has(value.destinationName);
}

/** Merge against latest storage, not an old React snapshot; only touch an available Line 2 entry. */
export function changeFavorites(raw: string | null, names: ReadonlySet<string>, action: { add: Favorite } | { remove: string }): unknown[] {
  const rows = parseFavorites(raw);
  if ("remove" in action) return rows.filter(row => !(availableFavorite(row, names) && row.id === action.remove));
  if (!availableFavorite(action.add, names)) throw new Error("Unsupported favorite");
  if (rows.some(row => availableFavorite(row, names) && row.stationName === action.add.stationName && row.destinationName === action.add.destinationName)) return rows;
  return [...rows, action.add];
}
