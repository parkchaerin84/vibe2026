import { SHARE_LINES } from "./share-routes";

// Presentation scope only. Preserve both lines' metadata, DB rows and reusable loaders.
export const ACTIVE_LINE_KEY = "line2" as const;
export const VISIBLE_LINES = SHARE_LINES.filter(line => line.key === ACTIVE_LINE_KEY);
