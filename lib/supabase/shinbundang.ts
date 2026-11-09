import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicClient } from "./client";
import { ConnectionError } from "./config";
import type { Database } from "./database";

export type VerifiedStation = { membershipId: string; stationId: string; name: string; sourceCode: string; source: string };
export type ShinbundangData = { lineId: string; lineName: string; stations: VerifiedStation[] };
export const SHINBUNDANG_DATASET = "kric_urban_rail_station";

/** Read only. Empty DB and network/permission errors have different outcomes. */
export async function loadShinbundangStations(
  signal?: AbortSignal,
  client: SupabaseClient<Database> = getPublicClient(),
): Promise<ShinbundangData | null> {
  try {
    const lineQuery = client.from("lines").select("id,name")
      .eq("source_dataset", SHINBUNDANG_DATASET).eq("source_code", "I11D1");
    const lineResult = await (signal ? lineQuery.abortSignal(signal) : lineQuery).maybeSingle();
    if (lineResult.error) throw new ConnectionError("read", "노선 정보를 불러오지 못했습니다. 연결과 공개 조회 권한을 확인하세요.");
    if (!lineResult.data) return null;
    const query = client.from("line_stations")
      .select("id,line_id,station_id,source_code,stations!inner(id,name,source_code,source,source_dataset)")
      .eq("line_id", lineResult.data.id).eq("source_dataset", SHINBUNDANG_DATASET)
      .order("source_code");
    const result = await (signal ? query.abortSignal(signal) : query);
    if (result.error) throw new ConnectionError("read", "역 정보를 불러오지 못했습니다. 연결과 공개 조회 권한을 확인하세요.");
    if (!result.data?.length) return { lineId: lineResult.data.id, lineName: lineResult.data.name, stations: [] };
    const records = result.data;
    const expected = new Set(Array.from({ length: 16 }, (_, i) => `I11D1:D${String(i + 4).padStart(3, "0")}`));
    if (records.length !== 16 || new Set(records.map(r => r.station_id)).size !== 16 ||
        records.some(r => !r.stations || !expected.delete(r.source_code) ||
          r.stations.source_code !== r.source_code || r.stations.source_dataset !== SHINBUNDANG_DATASET) || expected.size) {
      throw new ConnectionError("incomplete", "승인한 16개 역의 코드 또는 연결이 일치하지 않습니다. DB 적재 결과를 확인하세요.");
    }
    return {
      lineId: lineResult.data.id, lineName: lineResult.data.name,
      stations: records.map(r => ({ membershipId: r.id, stationId: r.station_id, name: r.stations.name, sourceCode: r.source_code, source: r.stations.source })),
    };
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof ConnectionError) throw error;
    throw new ConnectionError("network", "역 정보를 불러오지 못했습니다. 네트워크 상태를 확인해 주세요.");
  }
}
