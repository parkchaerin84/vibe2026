"use client";

import { useCallback, useEffect, useState } from "react";
import Turnstile from "@/components/Turnstile";
import PageHeader from "@/components/ui/PageHeader";
import { ensureAnonymousAuthor } from "@/lib/supabase/anonymous";
import { safeErrorMessage } from "@/lib/supabase/config";
import { loadShinbundangStations, type ShinbundangData } from "@/lib/supabase/shinbundang";

type ReadState = { status: "loading" } | { status: "error"; message: string } |
  { status: "loaded"; data: ShinbundangData | null };

// Isolated development check: no navigation/home changes, no MOCK imports or fallbacks.
export default function ConnectionCheck() {
  const [read, setRead] = useState<ReadState>({ status: "loading" });
  const [refresh, setRefresh] = useState(0);
  const [writing, setWriting] = useState(false);
  const [authorReady, setAuthorReady] = useState(false);
  const [authorMessage, setAuthorMessage] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const captchaError = useCallback(() => setAuthorMessage("봇 방지 확인을 불러오지 못했습니다. 연결과 Turnstile 설정을 확인하세요."), []);

  useEffect(() => {
    const controller = new AbortController();
    loadShinbundangStations(controller.signal).then(data => {
      if (!controller.signal.aborted) setRead({ status: "loaded", data });
    }).catch(error => {
      if (!controller.signal.aborted) setRead({ status: "error", message: safeErrorMessage(error) });
    });
    return () => controller.abort();
  }, [refresh]);

  async function prepareWriting() {
    setWriting(true);
    setAuthorMessage("");
    try {
      await ensureAnonymousAuthor({ captchaToken: token ?? undefined });
      setAuthorReady(true);
      setAuthorMessage("익명 작성자 세션이 준비되었습니다. 이 확인 화면에서는 글이나 하차 정보를 저장하지 않습니다.");
    } catch (error) { setAuthorMessage(safeErrorMessage(error)); }
    finally { setWriting(false); setToken(null); setAttempt(value => value + 1); }
  }

  return <div className="space-y-6">
    <PageHeader title="실제 데이터 연결 확인" description="Supabase에 저장된 신분당선 자료를 조회하는 별도 확인 페이지입니다." icon="train" />
    <section className="ui-card" aria-labelledby="station-title">
      <div className="flex items-center justify-between gap-4 mb-3">
        <h2 id="station-title" className="font-bold text-gray-800">신분당선 역 정보</h2>
        <button className="px-3 py-2 rounded-lg text-sm bg-blue-50 text-blue-700 disabled:opacity-50"
          disabled={read.status === "loading"} onClick={() => { setRead({ status: "loading" }); setRefresh(value => value + 1); }}>다시 조회</button>
      </div>
      <div aria-live="polite">
        {read.status === "loading" && <p className="text-gray-500">실제 데이터를 불러오는 중입니다.</p>}
        {read.status === "error" && <p role="alert" className="text-red-700">{read.message}</p>}
        {read.status === "loaded" && !read.data?.stations.length && <p className="text-gray-500">등록된 노선 또는 역 정보가 없습니다. 예시 데이터로 대체하지 않습니다.</p>}
        {read.status === "loaded" && !!read.data?.stations.length && <>
          <p className="text-sm text-gray-600 mb-3">실제 DB 조회: {read.data.lineName} · {read.data.stations.length}개 역</p>
          <div className="overflow-x-auto"><table className="w-full text-sm text-left">
            <thead><tr className="border-b text-gray-500"><th className="py-2">원본 역명</th><th className="py-2">원본 코드 조합</th></tr></thead>
            <tbody>{read.data.stations.map(station => <tr key={station.membershipId} className="border-b border-gray-100">
              <td className="py-2 font-medium text-gray-800">{station.name}</td><td className="py-2 text-gray-500">{station.sourceCode}</td>
            </tr>)}</tbody>
          </table></div>
          <p className="text-xs text-gray-500 mt-3">코드순 표시이며 운행 방향이나 열차 정차 순서를 의미하지 않습니다. 실시간 혼잡도·좌석 정보가 아닙니다.</p>
        </>}
      </div>
    </section>
    <section className="ui-card space-y-3">
      <h2 className="font-bold text-gray-800">로그인 없이 작성 준비</h2>
      <p className="text-sm text-gray-600">조회만 할 때는 인증하지 않습니다. 아래 버튼을 누르면 작성자 구분에 사용할 익명 세션을 준비합니다. 이 확인 화면에서는 글을 저장하지 않습니다.</p>
      {siteKey && !authorReady && <Turnstile siteKey={siteKey} attempt={attempt} onToken={setToken} onError={captchaError} />}
      <button onClick={prepareWriting} disabled={writing || authorReady || (!!siteKey && !token)}
        className="ui-primary">
        {writing ? "작성 준비 중…" : authorReady ? "작성 준비 완료" : "작성 시작"}
      </button>
      <p aria-live="polite" className="text-sm text-gray-700">{authorMessage}</p>
      <p className="text-xs text-gray-500">브라우저 데이터를 지우면 본인 글을 관리할 권한을 잃을 수 있습니다. 하차 공유와 커뮤니티 페이지는 실제 DB에 연결되어 있습니다.</p>
    </section>
  </div>;
}
