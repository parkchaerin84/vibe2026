import { loadEnvConfig } from "@next/env";
import { loadShinbundangStations } from "../lib/supabase/shinbundang";
import { safeErrorMessage } from "../lib/supabase/config";

async function main() {
loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 20_000);
try {
  // Public, session-free REST reads only. No signup, RPC, SQL, INSERT or UPDATE.
  const data = await loadShinbundangStations(controller.signal);
  if (!data?.stations.length) {
    console.log("공개 조회 성공 / 등록된 노선 또는 역 없음");
    process.exitCode = 1;
  } else {
    const pangyo = data.stations.find(station => station.sourceCode === "I11D1:D011");
    if (pangyo?.name !== "판교") throw new Error("Unexpected station data");
    console.log(`공개 DB 조회 성공 / 신분당선 ${data.stations.length}역 / 판교 D011 확인 / 인증·쓰기 없음`);
  }
} catch (error) {
  console.error(safeErrorMessage(error));
  process.exitCode = 1;
} finally { clearTimeout(timeout); }
}
void main();
