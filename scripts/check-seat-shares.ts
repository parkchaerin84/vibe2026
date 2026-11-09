import { loadEnvConfig } from "@next/env";
import { loadShinbundangStations } from "../lib/supabase/shinbundang";
import { loadSeatShares } from "../lib/supabase/seat-shares";
import { safeErrorMessage } from "../lib/supabase/config";

async function main() {
  loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
  try {
    const reference = await loadShinbundangStations();
    if (!reference || reference.stations.length !== 16) throw new Error("Missing reference data");
    const rows = await loadSeatShares(reference.lineId);
    const members = new Set(reference.stations.map(s => s.membershipId));
    if (rows.some(row => !members.has(row.current_line_station_id) || !members.has(row.exit_line_station_id))) throw new Error("Unknown membership");
    console.log(`공개 조회 성공 / 신분당선 ${reference.stations.length}역 / 하차 정보 ${rows.length}건 / 인증 생성·DB 쓰기 없음`);
  } catch (error) { console.error(safeErrorMessage(error)); process.exitCode = 1; }
}
void main();
