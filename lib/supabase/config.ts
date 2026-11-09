export class ConnectionError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "ConnectionError";
  }
}

export function readPublicConfig() {
  // Static references are required for Next.js to inline public build-time variables.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) {
    throw new ConnectionError("configuration", "Supabase 공개 연결 설정이 필요합니다.");
  }
  let parsed: URL;
  try { parsed = new URL(url); } catch {
    throw new ConnectionError("configuration", "Supabase 프로젝트 URL 형식을 확인하세요.");
  }
  if (parsed.protocol !== "https:" || !/^[a-z0-9]+\.supabase\.co$/.test(parsed.hostname) ||
      parsed.username || parsed.password || parsed.search || parsed.hash ||
      !["", "/", "/rest/v1", "/rest/v1/"].includes(parsed.pathname)) {
    throw new ConnectionError("configuration", "Supabase 프로젝트 URL 형식을 확인하세요.");
  }
  if (parsed.hostname === "goadyivlpedkphlqsvbl.supabase.co") {
    throw new ConnectionError("configuration", "이전 Tokyo 프로젝트는 사용할 수 없습니다.");
  }
  if (!/^sb_publishable_\S+$/.test(key)) {
    throw new ConnectionError("configuration", "Publishable 공개 키만 사용하세요. Secret 키는 사용할 수 없습니다.");
  }
  // Dashboard may provide a REST URL. The SDK needs its project origin, not /rest/v1.
  return { url: parsed.origin, key };
}

export function safeErrorMessage(error: unknown): string {
  return error instanceof ConnectionError
    ? error.message
    : "연결을 완료하지 못했습니다. 네트워크와 프로젝트 설정을 확인해 주세요.";
}
