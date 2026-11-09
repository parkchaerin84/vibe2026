import { loadEnvConfig } from "@next/env";
import { getPublicClient } from "../lib/supabase/client";
import { COMMENT_COLUMNS, loadPosts } from "../lib/supabase/community";
import { safeErrorMessage } from "../lib/supabase/config";
import { loadShinbundangStations } from "../lib/supabase/shinbundang";

async function main() {
  loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
  try {
    const reference = await loadShinbundangStations();
    if (!reference || reference.stations.length !== 16) throw new Error("Missing reference data");
    const posts = await loadPosts();
    const { error } = await getPublicClient().from("comments").select(COMMENT_COLUMNS).limit(1).retry(false);
    if (error) throw new Error("Comment public read failed");
    console.log(`실제 공개 조회 성공 / 신분당선 ${reference.stations.length}역 / 게시글 첫 페이지 ${posts.rows.length}건 / 댓글 공개 조회 성공 / 인증·쓰기·SQL 없음`);
  } catch (error) { console.error(safeErrorMessage(error)); process.exitCode = 1; }
}
void main();
