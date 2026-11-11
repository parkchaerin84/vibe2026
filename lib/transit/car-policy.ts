import type { ShareLineKey } from "./share-routes";

/** Share-input limits, not real-time train formation information. */
export const SHARE_CAR_LIMITS: Readonly<Record<ShareLineKey, number>> = {
  line2: 10,
  // Preserve the hidden legacy line's existing validation range.
  // This is NOT a claim that Shinbundang trains have 20 cars.
  shinbundang: 20,
};

export function shareCarNumbers(lineKey: ShareLineKey): number[] {
  return Array.from({ length: SHARE_CAR_LIMITS[lineKey] }, (_, i) => i + 1);
}
