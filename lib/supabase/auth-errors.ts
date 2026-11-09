import { ConnectionError } from "./config";

type AuthErrorInfo = { code?: string; status?: number; message?: string };
export type AuthStage = "session" | "verify_user" | "anonymous_signup";

// Only known provider messages are displayed. Never echo arbitrary response bodies,
// request headers, access/refresh tokens, URLs, keys, or user metadata.
const providerMessages = new Set([
  "Anonymous sign-ins are disabled",
  "Signup is disabled",
  "Signups not allowed for this instance",
  "captcha protection: request disallowed (missing captcha token)",
  "captcha protection: request disallowed (invalid captcha token)",
]);

export function authFailure(error: AuthErrorInfo, stage: AuthStage): ConnectionError {
  const code = typeof error.code === "string" && /^[a-z_]{1,80}$/.test(error.code) &&
    !/^sb_(secret|publishable)_/.test(error.code) ? error.code : "unknown";
  const status = Number.isInteger(error.status) && error.status! >= 100 && error.status! <= 599 ? error.status : null;
  let explanation: string;
  let appCode: string;
  if (stage !== "anonymous_signup") {
    appCode = "session";
    explanation = "기존 작성자 세션을 확인하지 못했습니다. 브라우저 데이터를 지우지 말고 연결을 확인하세요. 새 작성자 ID는 자동 생성하지 않습니다.";
  } else if (code === "anonymous_provider_disabled") {
    appCode = "anonymous_disabled";
    explanation = "현재 연결된 Supabase 프로젝트의 Auth 서버가 익명 가입을 비활성 상태로 응답했습니다. 대시보드에서 활성화했다면 저장 결과와 설정 반영 여부를 확인하세요.";
  } else if (code === "captcha_failed") {
    appCode = "captcha";
    explanation = "CAPTCHA 검증에 실패했습니다. 봇 방지 확인과 Supabase의 Turnstile 설정을 확인하세요.";
  } else if (code === "signup_disabled") {
    appCode = "signup_disabled";
    explanation = "Supabase에서 신규 사용자 가입이 차단되어 있습니다. 가입 허용 설정을 확인하세요.";
  } else if (status === 429) {
    appCode = "rate_limit";
    explanation = "인증 요청 제한에 도달했습니다. 잠시 후 다시 시도하세요.";
  } else if (status === 401 || status === 403) {
    appCode = "auth";
    explanation = "인증 요청이 거절됐습니다. 연결된 프로젝트의 공개용 키와 인증 설정을 확인하세요.";
  } else {
    appCode = "auth";
    explanation = status ? "익명 인증 요청이 실패했습니다. 아래 오류 코드와 인증 설정을 확인하세요." : "인증 서버 응답을 받지 못했습니다. 네트워크 상태를 확인하세요.";
  }
  const details = [`단계: ${stage}`, `HTTP: ${status ?? "응답 없음"}`, `오류 코드: ${code}`];
  if (error.message && providerMessages.has(error.message)) details.push(`서버 메시지: ${error.message}`);
  return new ConnectionError(appCode, `${explanation} (${details.join(" / ")})`);
}
