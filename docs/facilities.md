# 역별 편의시설 안내: 서버 구성과 확인 방법

## 현재 배포와 추가 구성

기존 Next.js는 `output: export`로 HTML/JS/CSS를 `out`에 생성한다. 사용자 요청을 받는 Next.js API Route는 이 배포에 사용할 수 없다. 이를 바꾸지 않고 루트의 `functions/api/facilities/restrooms.ts`라는 Cloudflare Pages Function을 추가한다.

`브라우저 → /api/facilities/restrooms → Supabase 공개 코드 검증 → 공식 HTTPS API` 순서다. 인증키를 브라우저로 전달하거나 `NEXT_PUBLIC_` 변수로 바꾸지 않는다. 브라우저는 DB의 노선·역 코드와 membership UUID만 전송한다.

- Pages Function과 로컬 미리보기는 `server/facilities.ts`의 같은 표준 Request/Response/fetch 로직을 사용한다. Node 전용 코드는 로컬 실행 스크립트에만 있다.
- `wrangler.jsonc`는 출력 디렉터리를 `out`으로 지정한다. 계정 ID·토큰·API 키가 없으며, 파일 추가만으로 배포되지 않는다.
- `public/_routes.json`은 빌드 시 `out`으로 복사되어 `/api/facilities/*`에만 Functions를 적용한다. 다른 정적 페이지에 불필요한 함수 호출을 추가하지 않는다.
- Git 연동 또는 Wrangler를 통한 Pages 배포가 필요하다. Cloudflare 대시보드에서 정적 파일만 직접 업로드하는 방식은 Functions를 포함하지 않는다. 현재 운영 배포 설정을 변경하거나 실제 배포하지 않았다.

공식 문서:
- https://developers.cloudflare.com/pages/functions/get-started/
- https://developers.cloudflare.com/pages/functions/bindings/
- https://developers.cloudflare.com/pages/functions/routing/
- https://nextjs.org/docs/app/guides/static-exports

## 키 설정

로컬에서는 기존 `.env.local`의 `SUBWAY_FACILITY_API_KEY`를 서버 프로세스가 읽는다. 값은 출력하거나 다른 파일에 복사하지 않는다. 기존 Supabase 환경변수도 수정하지 않는다.

향후 승인 후 Cloudflare Pages에서 설정할 항목:

1. Workers & Pages → SubwayEasy 프로젝트 → Settings → Variables and Secrets.
2. `SUBWAY_FACILITY_API_KEY`는 Encrypt를 선택하여 Secret으로 저장한다. Preview/Production 환경을 구분한다.
3. 기존 `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 Function 런타임에도 제공한다. 서울 프로젝트와 공개 키만 사용한다. service_role 키는 사용하지 않는다.
4. 운영 설정은 아직 변경하지 않았다. 로컬 설정만으로 운영 사이트에 키나 Function이 자동 설정되지 않는다.

Wrangler로 로컬 실행하려면 별도로 공식 Wrangler CLI를 설치하고 `.dev.vars`에 위 세 항목을 직접 설정한 후 `wrangler pages dev out`을 사용한다. `.dev.vars*`와 `.wrangler/`는 Git에서 제외했다. 채팅에 키를 입력하지 않는다. 이번 작업은 Wrangler 설치·로그인·원격 배포를 실행하지 않는다.

## 바로 사용할 로컬 미리보기

프로젝트 디렉터리 `work/vibe2026`에서:

```text
npm run build
npm run preview:facilities
```

`http://127.0.0.1:3002/facilities`에서 전체 정적 사이트와 실제 서버 조회를 함께 확인한다. 이 미리보기는 같은 Pages Function 핸들러를 Node에서 실행한다. Cloudflare 네이티브 런타임 자체를 시험한 것은 아니다.

기존 `next dev`의 3001번은 Next.js 개발 서버만 실행하므로 서버 함수 경로를 제공하지 않는다. 3001번에서 시설 조회를 누르면 연결 오류를 표시하며 예시 결과나 키를 반환하지 않는다. 미리보기에서 기존 하차 공유/게시글을 작성하면 실제 DB에 저장되므로 단순 화면 테스트 중에는 등록하지 않는다.

포트가 다르면 브라우저 익명 세션과 LocalStorage가 공유되지 않는다. 기존 3001번의 제보 삭제 권한이나 즐겨찾기가 3002번으로 자동 이전되지는 않는다. 기존 저장 내용은 수정하지 않는다.

## 제공 범위와 데이터

2호선 본선 43개·성수지선 4개·신정지선 4개, 총 51개 역을 조회한다. 공식 요청은 `GET https://apis.data.go.kr/B553766/facility/getFcRstrm`이며 `serviceKey`, `dataType=JSON`, `pageNo=1`, `numOfRows=100`, `lineNm=2호선`, 정확한 `stnCd`를 사용한다. 까치산 `0200`과 용두 `0250` 등 지선 코드를 숫자 정렬하거나 다른 노선 코드로 바꾸지 않는다.

2026-11-09 전체 검증에서는 역 필터를 생략하고 `lineNm=2호선`, `numOfRows=1000`으로 **API 1회**를 호출했다. HTTP 200 / API `00`, 전체 건수 57 = 수신 건수 57이었다. 공개 Supabase 조회 1회로 기존 51개 노선·역 연결도 대조했다.

| 구간 | 대상 역 | 실제 데이터 확인 | 이번 조회 결과 없음 |
| --- | ---: | ---: | --- |
| 본선 | 43 | 43 | 없음 |
| 성수지선 | 4 | 4 | 없음 |
| 신정지선 | 4 | 3 | 까치산(0200) |

코드·역명 충돌과 2호선 외 응답은 없었다. 까치산은 화장실이 없거나 영구 미지원이라고 단정하지 않는다. 화면에서 선택하면 다른 역처럼 정확한 코드로 새 조회하며, 정상 0건 또는 공식 `03 NODATA_ERROR`는 빈 상태, 인증·호출 한도·연결 오류는 실패 상태로 표시한다. 오류 시 과거 위치정보로 대체하지 않는다.

`lib/facilities-coverage.json`은 실제 응답에서 확인한 코드·역명·건수·기준일과 검증 시각만 기록한 검토 목록이다. 위치 원문이나 DB UUID·키가 없으며 API 응답 대체 용도로 사용하지 않는다. 기준일은 2021-05-27 또는 2024-07-01로 확인됐으며 실제 조회 시각과 구분한다.

공식 포털의 2026-11-09 안내: 무료, 이용허락범위 제한 없음, 개발계정 신청 가능 트래픽 10,000건. 오류 안내는 `22`를 일일 호출량 초과, `23`을 초당 제한으로 설명한다. 개별 계정의 승인 한도·잔여 호출량은 별도이며 이번에 대시보드에서 확인하지 않았다. 자동 재시도는 하지 않는다.

`scripts/check-facilities-coverage.ts`는 명시적으로 실행할 때만 동작하는 읽기 전용 검증 스크립트다. `../../outputs/facilities-line2-coverage.json` 기록이 있으면 외부 호출을 하지 않는다. 최초 요청 전에도 시작 기록을 남겨 실패 후 무심코 재실행하지 못하게 한다. 빌드·테스트·웹사이트에서는 실행하지 않는다.

위치정보는 코드에 저장한 과거 응답이 아닌 실제 API 응답에서 만든다. 인증키가 필요한 요청 URL·원본 오류는 화면이나 로그에 반환하지 않는다. 서버도 회원가입·SQL·DB 쓰기를 하지 않는다.

- 상세 위치 `dtlPstn`, 층 `stnFlr`, 지상/지하 `grndUdgdSe`, 근접 출입구 `vcntEntrcNo`를 별도 표시한다.
- 잠실의 상세 위치에 포함된 1·2번 출입구와 근접 출입구 필드 1번을 합치지 않는다.
- `crtrYmd`는 데이터 기준일, `fetchedAt`은 실제 API 조회 시각이다. 기준일이 오래되어도 최신인 것처럼 바꾸지 않는다. 현재 시설 운영 상태를 보장하지 않는다.
- 빈 성공 응답, 서버 오류, 지원하지 않는 역을 구분한다. 없는 필드에는 '정보 미제공'을 표시한다. 샘플/추정값으로 채우지 않는다.
- 정상 결과는 서버와 화면에서 최대 10분 재사용한다. 같은 역의 동시 요청을 합치고 오류는 서버에서 30초간 재사용한다. 자동 폴링·재시도·리디렉션은 없다. 서버 캐시는 프로세스/Worker 인스턴스 단위이며 전역 강제 호출 한도는 아니다.

## 확인 절차

1. 3002번 시설 안내에서 강남을 선택하고 역 코드0222, 상세 위치·B1·근접 출입구·기준일을 확인한다.
2. 잠실을 선택하고 역 코드0216, 상세 위치 원문과 별도 출입구 필드가 구분되는지 확인한다.
3. 강남으로 다시 바꾸면 최근 조회 결과를 재사용한다. 조회 시각을 새로 만들지 않는다.
4. 시청 등 본선과 용두 등 지선 역을 선택해 역 코드와 결과가 섞이지 않는지 확인한다. 까치산은 조회 결과 없음 안내를 확인한다. 51개 목록 밖의 코드·다른 노선은 서버에서 거부한다.
5. 빈 응답·오류·다른 역 코드 응답·키 노출 방지·동시 요청·캐시 만료는 격리된 테스트로 확인한다. 테스트 응답은 실제 서비스의 대체 데이터로 사용하지 않는다.


## 이번 변경 파일

- `app/facilities/page.tsx`: 실제 조회 화면, 지원 범위·오류·빈 상태·캐시와 원문 필드 표시.
- `lib/facilities.ts`: 공개 응답 타입과 검증된 지원 역 코드.
- `lib/facilities-coverage.json`: 51개 역별 실제 제공 여부의 검증 기록. 위치정보 대체 데이터 없음.
- `server/facilities.ts`: 서버 전용 DB 연결 검증·HTTPS 호출·비밀정보 제거·캐시.
- `functions/api/facilities/restrooms.ts`: Pages Function 진입점.
- `scripts/preview-facilities.ts`: 로컬 서버 미리보기. 키는 메모리에서만 읽음.
- `public/_routes.json`, `wrangler.jsonc`: 정적 출력과 Functions 라우팅 설정.
- `app/page.tsx`, `components/Navbar.tsx`: 홈과 메뉴에 시설 안내 링크 추가.
- `package.json`: 로컬 미리보기 실행 명령 추가. 의존성 설치/변경 없음.
- `.gitignore`, `.env.example`: 로컬 비밀파일 제외와 서버 변수 이름 안내. 실제 키 없음.
- `tests/facilities.test.ts`: 외부 API를 호출하지 않는 격리된 서버 검증.
- `scripts/check-facilities-coverage.ts`: 전체 제공 여부를 1회 요청으로 검증하고 중복 실행을 막는 수동 도구.
- `docs/facilities.md`: 이 안내.

## 검증 기록

### 2026-11-09: 2호선 전체 확대

- 타입 검사, 전체 테스트 63개, 정적 빌드 및 빌드의 lint/타입 검사 통과.
- Pages Function 중립 ESM 번들 검증 통과. Cloudflare 네이티브 실행/배포는 미실시.
- 실제 시설 API 총 3회: 전체 1회(50개 역/57건), 브라우저 용두 1회(4건), 까치산 1회(정상 빈 상태). 재선택은 캐시 재사용, 자동 재시도 없음.
- 화면 역 선택은 본선43/성수지선4/신정지선4로 중복 없이 51개. 용두0250의 위치·층·별도 출입구·각 기준일을 원문대로 표시. 까치산0200에서 용두 결과가 사라지고 빈 상태를 표시하며 다시 용두로 돌아오면 최초 조회 시각을 유지.
- 공개 출력54개 파일에서 실제 시설 키의 원문·디코딩·URL 인코딩 변형 미검출.
- 하차 공유·커뮤니티 페이지, 즐겨찾기 로직, 기존 역 메타데이터, 메뉴 파일의 작업 전후 해시 동일. 홈 시설 카드 설명 한 줄만 대상 범위에 맞게 수정.
- 검토표: `../../outputs/서울2호선_화장실_API_검토표.csv`. 검증 응답의 공개 필드만 담은 감사 기록은 `../../outputs/facilities-line2-coverage.json`이며 웹사이트는 해당 파일을 읽거나 대신 제공하지 않음.
- feature/real-data에서만 작업. DB 쓰기/SQL/커밋/푸시/운영 배포 없음.

### 최초 강남·잠실 구현 기록

- 타입 검사, 전체 테스트 58개, 정적 빌드의 타입/lint 검사 통과.
- 최종 Pages Function은 esbuild 중립 ESM 번들 검증 통과. Cloudflare 네이티브 실행/원격 배포는 하지 않음.
- 공개 출력54개 파일에서 실제 키 원문/URL 인코딩 형태가 없음을 확인.
- 3002번 실제 브라우저: 강남0222, 잠실0216 화장실 각각1건. B1과 2021-05-27 표시. 잠실 원문출입구1,2와 별도필드1을 구분 표시.
- 시청 선택 시 미지원 안내, 이전 역 결과 제거, 강남 재선택 시 조회시각을 유지한 캐시 재사용 확인.
- 실제 시설 API 조회는 브라우저의 첫 강남/잠실 선택에서만 수행. 테스트 응답을 실제 화면에 대체 표시하지 않음.
- 하차 공유/커뮤니티/즐겨찾기 로직/신분당선 메타데이터의 파일 해시 동일.
- DB/SQL/실제 사용자 콘텐츠/커밋/푸시/배포 변경 없음.
