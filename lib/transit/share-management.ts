import type { SeatShareRow } from "../supabase/database";
import { unexpiredShares } from "../supabase/seat-shares";

/** IDs come from my_content_ids(), not from user input. RLS still guards deletion. */
export function ownShareCards(rows: SeatShareRow[], ownIds: string[], lineId: string | undefined, now: number) {
  const ids = new Set(ownIds);
  return unexpiredShares(rows, now).filter(share => share.line_id === lineId && ids.has(share.id));
}
