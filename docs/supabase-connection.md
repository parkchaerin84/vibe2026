# Supabase 연결 안내

하차 공유 `/share-seat`는 실제 DB 조회·등록·본인 삭제를 사용한다. 해당 페이지의 MOCK 제보와 칸별 합산은 제거했다. 커뮤니티 `/community`도 실제 게시글·댓글 CRUD를 사용하며 MOCK 게시글·직원 모드·가상 기관 답변을 제거했다. 홈/즐겨찾기는 유지한다. 연결 확인 전용 페이지는 `/connection-check`이다.

## 설정
서울 `subwayeasy-kr`만 사용한다. `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 입력한다. 파일을 공유하거나 Git에 넣지 않는다. SDK는 publishable 키만 허용하고, 이전에 확인한 Tokyo URL은 거부한다. URL만으로 실제 리전을 판별할 수는 없으므로 대시보드 프로젝트 선택도 확인한다.

`.env.example`은 빈 예시다. 공개 환경변수는 브라우저 번들에 들어가므로 secret/service_role/DB 비밀번호를 절대 입력하지 않는다. `NEXT_PUBLIC_` 값은 빌드 시 반영된다. 현재 output: export를 유지하고 모든 DB 조회/작성자 세션 처리는 브라우저에서 수행한다. Cloudflare Preview에서 확인할 때만 해당 공개 설정을 Preview 빌드 환경에 넣고 새로 빌드한다. 운영 배포는 이번 범위가 아니다.

## 인증

환경변수 URL에 `/rest/v1/`이 붙어 있으면 SDK에 전달할 때 같은 프로젝트의 기본 주소로 정규화한다. 다른 임의 경로는 거부하며 `.env.local` 자체를 수정하지 않는다.
Supabase Authentication에서 Anonymous Sign-Ins를 활성화한다. 읽기는 무세션 공개 클라이언트로 수행하며 익명 사용자를 생성하지 않는다. 작성 의도가 생긴 이벤트에서만 `ensureAnonymousAuthor()`를 호출한다. 같은 탭의 중복 요청은 하나로 합치며, 기존 세션이 있으면 서버에서 사용자 확인 후 재사용한다. 기존 세션 검증 실패 시 새 UID를 자동 발급하지 않는다. 실제 쓰기를 연결할 때는 그 뒤 `getAuthorClient()`로 INSERT하고 소유권은 RLS에 맡긴다. 하차 공유와 커뮤니티는 인증 준비 후 실제 INSERT를 수행한다.

익명 세션은 브라우저 저장소에 유지한다. 실명 인증이 아니며 브라우저 저장소 삭제/기기 변경 시 작성자 권한이 복구되지 않을 수 있다. 보안 근거는 UI 버튼이 아니라 SQL v2의 RLS다.

## Turnstile
공개 전에 Supabase Auth의 CAPTCHA 보호를 활성화하고 Turnstile secret을 그 대시보드 설정에만 입력한다. 브라우저용 site key는 선택 환경변수 `NEXT_PUBLIC_TURNSTILE_SITE_KEY`에 넣는다. localhost와 사용하는 Preview 호스트를 Turnstile 허용 호스트로 설정한다. 개발 호스트에 대한 테스트 정책은 Cloudflare 공식 안내에 따른다.

site key가 설정되면 확인 페이지가 위젯을 표시하고 받은 토큰을 signInAnonymously에 전달한다. 토큰은 시도 후/만료/위젯 오류 시 버린다. site key가 없을 때도 SDK 호출은 가능하지만 Auth에 CAPTCHA가 켜져 있으면 인증이 거절된다. 우회·보호 해제·자동 재시도는 하지 않는다. 공개 site key와 Auth 설정의 짝이 맞는지 확인한다. 단순 위젯만으로 직접 API 악용을 막을 수 없으므로 Auth 자체 보호와 DB 작성 제한을 함께 유지한다.

## 로컬 확인
1. npm install 또는 npm ci
2. npm run dev
3. localhost:3000/connection-check 접근: 로그인 없이 판교 포함 16개 역이 보이는지 확인
4. 새 시크릿 브라우저에서 조회만 해도 Auth 사용자가 생성되지 않는지 확인
5. 작성 시작 클릭: 익명 인증과 준비 메시지 확인. CAPTCHA 활성화 시 위젯 확인 필요
6. 새로고침 후 다시 작성 시작: 기존 UID가 재사용되는지 본인 개발 환경에서만 확인. 토큰/UID/키를 로그나 채팅에 붙이지 않기
7. 네트워크 차단/잘못된 권한은 오류, 빈 DB 결과는 빈 상태로 구분되는지 확인

`loadShinbundangStations`는 승인한 원본 코드 D004~D019 16개와 소속/역 코드 일치를 검사한다. 데이터가 일부만 있으면 오류로 표시하고 가짜 역을 보충하지 않는다. 정렬은 원본 코드순이며 실제 운행 방향은 추론하지 않는다. 이름은 DB에서 읽은 원문 그대로 표시한다.

타입 검사: npm run typecheck
단위 검사: npm test
빌드: npm run build
실제 공개 조회(읽기 전용): npm run check:supabase
이 검사는 Auth 가입/SQL/콘텐츠 쓰기를 하지 않으며 키나 URL을 출력하지 않는다. 실제 Anonymous Auth 성공은 사용자가 브라우저에서 위젯과 함께 별도 확인해야 한다.

## 실제 하차 공유 검증

- `/share-seat`에서 DB의 16개 역만 선택한다. 역 이름과 membership ID를 사용하며 owner_id는 읽지 않는다. 방향은 승객이 선택하는 신사/광교 방면이다. 칸 번호는 본인이 탑승한 칸을 직접 입력한다.
- INSERT는 허용된 5개 컬럼만 전송한다. 작성자와 등록·만료 시간은 기존 DB 트리거가 결정한다. 수정은 제공하지 않는다.
- 본인 삭제 버튼은 `my_content_ids()` 결과로 표시하며 실제 삭제 허용 여부는 RLS가 결정한다. 삭제 결과가 0행이면 성공으로 표시하지 않는다.
- 조회는 인증 없이 실행한다. 30초 갱신과 탭 복귀 시 갱신을 수행한다. RLS가 서버에서 만료된 행을 숨기며 이미 표시된 행도 만료 시 화면에서 숨긴다. PC 시간을 정확히 설정한다. 실제 행의 물리 삭제 예약 작업은 이번 범위가 아니다.
- 빈 목록과 API 오류를 구분한다. 쓰기는 자동 재시도하지 않는다. 통신 오류로 저장 여부가 불확실하면 재등록 전에 새로고침한다.
- 일반 브라우저 A에서 실제 정보를 등록하고 새로고침 후 유지되는지 확인한다. 별도 시크릿 브라우저 B에서 같은 목록을 조회하고 A의 삭제 버튼이 없는지 확인한다. A에서 삭제하고 B의 새로고침으로 제거되는지 확인한다. 두 일반 탭은 같은 작성자일 수 있으므로 서로 다른 사용자의 테스트로 취급하지 않는다.
- 30분 만료는 남아 있는 실제 제보로 확인한다. DB 시간을 수정하거나 시험용 가짜 제보를 공개 목록에 넣지 않는다.
- `node node_modules/tsx/dist/cli.mjs scripts/check-seat-shares.ts`는 공개 조회만 수행하고 키나 제보 내용을 출력하지 않는다. 자동 HTTP 테스트의 TEST_ONLY 데이터는 격리된 응답이며 실제 DB에 저장하지 않는다.
