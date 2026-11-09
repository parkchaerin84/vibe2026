import type { SupabaseClient } from "@supabase/supabase-js";
import { SHARE_LINES, type ShareLineKey, type ShareReference } from "../transit/share-routes";
import { getPublicClient } from "./client";
import { ConnectionError } from "./config";
import type { Database } from "./database";

/** Public reads only. Missing/mismatched reference data blocks writes, with no sample fallback. */
export async function loadShareReference(lineKey: ShareLineKey, signal?: AbortSignal,
  client: SupabaseClient<Database> = getPublicClient()): Promise<ShareReference> {
  const definition = SHARE_LINES.find(line => line.key === lineKey);
  if (!definition) throw new ConnectionError("validation", "지원하지 않는 노선입니다.");
  try {
    const lineQuery = client.from("lines").select("id,name")
      .eq("source_dataset", definition.dataset).eq("source_code", definition.code);
    const line = await (signal ? lineQuery.abortSignal(signal) : lineQuery).maybeSingle();
    if (line.error) throw new ConnectionError("read", "노선 정보를 불러오지 못했습니다. 연결과 공개 조회 권한을 확인하세요.");
    if (!line.data) throw new ConnectionError("incomplete", "선택한 노선이 DB에 등록되어 있지 않습니다.");
    const lineRow = line.data;
    const query = client.from("line_stations")
      .select("id,line_id,station_id,source_dataset,source_code,branch_code,stations!inner(id,name,source_code,source,source_dataset)")
      .eq("line_id", line.data.id).eq("source_dataset", definition.dataset);
    const result = await (signal ? query.abortSignal(signal) : query);
    if (result.error) throw new ConnectionError("read", "역 정보를 불러오지 못했습니다. 연결과 공개 조회 권한을 확인하세요.");
    const rows = result.data ?? [];
    const expected = new Map(definition.stations.map(station => [station.sourceCode, station]));
    if (line.data.name !== definition.name || rows.length !== expected.size ||
        new Set(rows.map(r => r.station_id)).size !== expected.size ||
        new Set(rows.map(r => r.source_code)).size !== expected.size || rows.some(r => {
          const approved = expected.get(r.source_code);
          return !approved || !r.stations || r.line_id !== lineRow.id || r.branch_code !== approved.branch ||
            r.station_id !== r.stations.id || r.stations.name !== approved.name ||
            r.source_dataset !== definition.dataset || r.stations.source_dataset !== definition.dataset ||
            r.stations.source_code !== r.source_code;
        })) throw new ConnectionError("incomplete", "DB의 역 이름·코드·노선·구간이 검증 자료와 일치하지 않아 등록을 중단했습니다.");
    const byCode = new Map(rows.map(row => [row.source_code, row]));
    return { lineKey, lineId: line.data.id, lineName: line.data.name,
      stations: definition.stations.map(approved => {
        const row = byCode.get(approved.sourceCode)!;
        return { membershipId: row.id, stationId: row.station_id, name: row.stations.name,
          sourceCode: row.source_code, source: row.stations.source };
      }) };
  } catch (error) {
    if (signal?.aborted || error instanceof ConnectionError) throw error;
    throw new ConnectionError("network", "노선·역 정보를 불러오지 못했습니다. 네트워크 상태를 확인해 주세요.");
  }
}
