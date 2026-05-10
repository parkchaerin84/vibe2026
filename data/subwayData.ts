export type Condition = "quiet" | "seats" | "transfer" | "pregnant";

export interface Recommendation {
  car: number;
  reason: string;
  tips: string[];
  congestionLevel: 1 | 2 | 3 | 4 | 5;
}

export interface CarStatus {
  car: number;
  status: "normal" | "standing" | "quiet" | "priority";
  label: string;
}

export interface Station {
  id: string;
  name: string;
  recommendations: Record<Condition, Recommendation>;
  carStatuses: CarStatus[];
}

export interface SubwayLine {
  id: string;
  number: string;
  name: string;
  color: string;
  textColor: string;
  totalCars: number;
  stations: Station[];
}

export const CONDITIONS: Record<Condition, { label: string; icon: string; description: string }> = {
  quiet: { label: "조용한 칸", icon: "🤫", description: "소음이 적고 조용한 환경" },
  seats: { label: "자리 많은 칸", icon: "💺", description: "빈 좌석이 많은 칸" },
  transfer: { label: "환승 편한 칸", icon: "🔄", description: "환승 계단·에스컬레이터와 가장 가까운 칸" },
  pregnant: { label: "임산부석 가까운 칸", icon: "🤰", description: "임산부 배려석(분홍 좌석)이 있는 칸" },
};

export const CONGESTION_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "여유", color: "text-green-600" },
  2: { label: "보통", color: "text-lime-600" },
  3: { label: "혼잡", color: "text-yellow-600" },
  4: { label: "매우 혼잡", color: "text-orange-600" },
  5: { label: "극도 혼잡", color: "text-red-600" },
};

const makeStatuses = (total: number): CarStatus[] =>
  Array.from({ length: total }, (_, i) => ({
    car: i + 1,
    status: "normal",
    label: "일반",
  }));

export const SUBWAY_LINES: SubwayLine[] = [
  {
    id: "1",
    number: "1",
    name: "1호선",
    color: "#0052A4",
    textColor: "#ffffff",
    totalCars: 10,
    stations: [
      {
        id: "1-seoul",
        name: "서울역",
        carStatuses: makeStatuses(10),
        recommendations: {
          quiet: { car: 1, reason: "1번 칸은 종착 방향 끝으로 유동 인구가 적어 조용합니다.", tips: ["피크 시간대엔 2번 칸도 괜찮아요."], congestionLevel: 2 },
          seats: { car: 10, reason: "10번 칸은 승객이 분산되어 빈 좌석이 가장 많습니다.", tips: ["출퇴근 시간대에는 9번 칸도 시도해보세요."], congestionLevel: 2 },
          transfer: { car: 5, reason: "5번 칸이 1·4호선 환승 계단과 가장 가깝습니다.", tips: ["공항철도 환승은 1번 칸 쪽으로 이동하세요."], congestionLevel: 3 },
          pregnant: { car: 1, reason: "1번 칸 끝에 임산부 배려석이 있습니다.", tips: ["혼잡 시간에는 역무원에게 문의해 보세요."], congestionLevel: 2 },
        },
      },
      {
        id: "1-jongak",
        name: "종각",
        carStatuses: makeStatuses(10),
        recommendations: {
          quiet: { car: 2, reason: "종각역은 중간 칸이 혼잡해 2번 칸이 상대적으로 조용합니다.", tips: ["점심 시간대는 더 한산해요."], congestionLevel: 3 },
          seats: { car: 9, reason: "9번 칸은 출입구에서 멀어 빈 자리가 자주 생깁니다.", tips: ["오전 9시 이후엔 여유가 생겨요."], congestionLevel: 2 },
          transfer: { car: 4, reason: "4번 칸 하차 후 5호선 광화문역 방향으로 도보 이동이 편합니다.", tips: ["지하 연결통로를 이용하세요."], congestionLevel: 3 },
          pregnant: { car: 10, reason: "10번 칸 끝자리에 임산부 배려석이 있습니다.", tips: ["역무원실 근처라 안전해요."], congestionLevel: 2 },
        },
      },
      {
        id: "1-dongdaemun",
        name: "동대문",
        carStatuses: makeStatuses(10),
        recommendations: {
          quiet: { car: 3, reason: "3번 칸은 동대문 시장 이용객이 적어 비교적 조용합니다.", tips: [], congestionLevel: 2 },
          seats: { car: 8, reason: "8번 칸은 상대적으로 탑승객이 적어 빈 좌석이 있습니다.", tips: ["주말엔 전 칸이 혼잡할 수 있어요."], congestionLevel: 3 },
          transfer: { car: 6, reason: "6번 칸이 2·4·5호선 동대문역사문화공원역 환승 통로와 연결됩니다.", tips: ["환승 시간이 촉박하면 뛰어야 할 수 있어요."], congestionLevel: 4 },
          pregnant: { car: 1, reason: "1번 칸 임산부석이 이 역에서는 가장 이용하기 좋습니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "1-cheongnyangni",
        name: "청량리",
        carStatuses: makeStatuses(10),
        recommendations: {
          quiet: { car: 1, reason: "청량리 종착·출발점으로 1번 칸이 비어있는 경우가 많습니다.", tips: ["GTX 환승 시간 여유를 두세요."], congestionLevel: 1 },
          seats: { car: 1, reason: "종착역 특성상 1번 칸부터 비어있습니다.", tips: [], congestionLevel: 1 },
          transfer: { car: 7, reason: "경의중앙선·GTX·수도권전철 연결은 7번 칸 하차가 편합니다.", tips: ["GTX-B는 별도 개찰구를 이용하세요."], congestionLevel: 2 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석이 여유 있습니다.", tips: [], congestionLevel: 1 },
        },
      },
      {
        id: "1-suwon",
        name: "수원",
        carStatuses: makeStatuses(10),
        recommendations: {
          quiet: { car: 2, reason: "2번 칸은 수원역 출구에서 멀어 조용합니다.", tips: [], congestionLevel: 2 },
          seats: { car: 10, reason: "10번 칸은 출입구에서 가장 멀어 빈 좌석이 많습니다.", tips: ["서울 방향 출근 시 탑승 때는 반대 방향도 확인하세요."], congestionLevel: 2 },
          transfer: { car: 5, reason: "5번 칸이 KTX 환승 통로 방향과 가장 가깝습니다.", tips: ["KTX 환승은 넉넉한 시간을 확보하세요."], congestionLevel: 3 },
          pregnant: { car: 10, reason: "10번 칸 임산부석 근처에 에스컬레이터가 있어 편리합니다.", tips: [], congestionLevel: 2 },
        },
      },
    ],
  },
  {
    id: "2",
    number: "2",
    name: "2호선",
    color: "#00A84D",
    textColor: "#ffffff",
    totalCars: 10,
    stations: [
      {
        id: "2-gangnam",
        name: "강남",
        carStatuses: makeStatuses(10),
        recommendations: {
          quiet: { car: 2, reason: "2번 칸은 출구에서 멀어 유동 인구가 적습니다.", tips: ["출퇴근 시간에도 상대적으로 한산해요."], congestionLevel: 3 },
          seats: { car: 1, reason: "강남역에서 1번 칸은 비교적 탑승객이 적습니다.", tips: ["오전 10시 이후엔 대부분 자리 있어요."], congestionLevel: 2 },
          transfer: { car: 5, reason: "5번 칸이 신분당선 환승 게이트와 직결됩니다.", tips: ["신분당선은 별도 요금이 있어요."], congestionLevel: 5 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석이 강남역에서 이용하기 좋습니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "2-hongdae",
        name: "홍대입구",
        carStatuses: makeStatuses(10),
        recommendations: {
          quiet: { car: 9, reason: "9번 칸은 홍대 주요 출구에서 멀어 한산합니다.", tips: ["주말 심야엔 전체적으로 혼잡해요."], congestionLevel: 3 },
          seats: { car: 10, reason: "10번 칸은 대부분 환승객이 타지 않아 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 3, reason: "3번 칸에서 내리면 공항철도 환승 통로가 바로 연결됩니다.", tips: ["인천공항행 탑승 시 여유 시간 확보 필수!"], congestionLevel: 4 },
          pregnant: { car: 10, reason: "10번 칸 임산부 배려석 근처에 엘리베이터가 있습니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "2-hapjeong",
        name: "합정",
        carStatuses: makeStatuses(10),
        recommendations: {
          quiet: { car: 1, reason: "1번 칸은 합정역 주요 출구에서 멀어 조용합니다.", tips: [], congestionLevel: 2 },
          seats: { car: 2, reason: "2번 칸은 합정역에서 탑승객이 집중되지 않는 구역입니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 6, reason: "6번 칸이 6호선 환승 통로와 가장 가깝습니다.", tips: ["6호선 마포 방면은 반대 방향 확인 필수."], congestionLevel: 3 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석이 엘리베이터와 가깝습니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "2-konkuk",
        name: "건대입구",
        carStatuses: makeStatuses(10),
        recommendations: {
          quiet: { car: 10, reason: "10번 칸은 건대 상권 출구에서 가장 멀어 조용합니다.", tips: [], congestionLevel: 2 },
          seats: { car: 9, reason: "9번 칸은 유동 인구가 적어 좌석 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 4, reason: "4번 칸이 7호선 환승 통로 입구와 가장 가깝습니다.", tips: [], congestionLevel: 4 },
          pregnant: { car: 10, reason: "10번 칸 임산부 배려석이 있으며 엘리베이터와 가깝습니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "2-sindorim",
        name: "신도림",
        carStatuses: makeStatuses(10),
        recommendations: {
          quiet: { car: 1, reason: "신도림 혼잡구간에서도 1번 칸은 비교적 한산합니다.", tips: ["극도 혼잡 시간 회피가 가장 좋아요."], congestionLevel: 4 },
          seats: { car: 10, reason: "10번 칸은 역사 구조상 조금 덜 붐빕니다.", tips: [], congestionLevel: 3 },
          transfer: { car: 7, reason: "7번 칸에서 내리면 1호선 환승 통로가 바로 연결됩니다.", tips: ["출퇴근 시 환승 인파가 매우 많아요."], congestionLevel: 5 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석이 신도림역 역무원실 근처에 있습니다.", tips: [], congestionLevel: 3 },
        },
      },
    ],
  },
  {
    id: "3",
    number: "3",
    name: "3호선",
    color: "#EF7C1C",
    textColor: "#ffffff",
    totalCars: 8,
    stations: [
      {
        id: "3-gyodae",
        name: "교대",
        carStatuses: makeStatuses(8),
        recommendations: {
          quiet: { car: 1, reason: "1번 칸은 주요 출구에서 멀어 법원·검찰청 방면 혼잡을 피할 수 있습니다.", tips: [], congestionLevel: 2 },
          seats: { car: 8, reason: "8번 칸은 교대역에서 탑승객이 가장 적습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 5, reason: "5번 칸이 2호선 환승 통로와 연결됩니다.", tips: ["강남 방향 환승 시 편리해요."], congestionLevel: 3 },
          pregnant: { car: 8, reason: "8번 칸 임산부 배려석이 엘리베이터와 인접합니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "3-gosuk",
        name: "고속터미널",
        carStatuses: makeStatuses(8),
        recommendations: {
          quiet: { car: 2, reason: "2번 칸은 터미널 방향 출구에서 멀어 비교적 조용합니다.", tips: [], congestionLevel: 3 },
          seats: { car: 1, reason: "1번 칸은 여행객이 집중되지 않아 좌석 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 6, reason: "6번 칸이 9호선 환승 통로와 바로 연결됩니다.", tips: ["9호선 환승은 매우 혼잡해요."], congestionLevel: 4 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석이 이 역에서 이용하기 편합니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "3-yaksu",
        name: "약수",
        carStatuses: makeStatuses(8),
        recommendations: {
          quiet: { car: 8, reason: "8번 칸은 출입구에서 멀어 조용합니다.", tips: [], congestionLevel: 1 },
          seats: { car: 7, reason: "7번 칸은 약수역 탑승객이 적은 구역입니다.", tips: [], congestionLevel: 1 },
          transfer: { car: 4, reason: "4번 칸이 6호선 환승 통로 입구와 가깝습니다.", tips: [], congestionLevel: 2 },
          pregnant: { car: 8, reason: "8번 칸 임산부 배려석 근처에 역무원실이 있습니다.", tips: [], congestionLevel: 1 },
        },
      },
      {
        id: "3-chungmuro",
        name: "충무로",
        carStatuses: makeStatuses(8),
        recommendations: {
          quiet: { car: 3, reason: "3번 칸은 충무로 주요 출구에서 멀어 한산합니다.", tips: [], congestionLevel: 2 },
          seats: { car: 2, reason: "2번 칸은 탑승 집중 구역을 피한 위치입니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 5, reason: "5번 칸이 4호선 동대문역사문화공원 방면 환승과 연결됩니다.", tips: [], congestionLevel: 3 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석 이용이 이 역에서 편리합니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "3-jongno3",
        name: "종로3가",
        carStatuses: makeStatuses(8),
        recommendations: {
          quiet: { car: 1, reason: "1번 칸은 인사동·탑골공원 방향 출구에서 멀어 조용합니다.", tips: [], congestionLevel: 2 },
          seats: { car: 8, reason: "8번 칸은 종로3가에서 비교적 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 4, reason: "4번 칸이 1·5호선 환승 통로와 가장 가깝습니다.", tips: ["1호선 방향과 5호선 방향 출구가 달라요."], congestionLevel: 3 },
          pregnant: { car: 8, reason: "8번 칸 임산부 배려석이 엘리베이터와 인접합니다.", tips: [], congestionLevel: 2 },
        },
      },
    ],
  },
  {
    id: "4",
    number: "4",
    name: "4호선",
    color: "#00A5DE",
    textColor: "#ffffff",
    totalCars: 8,
    stations: [
      {
        id: "4-myeongdong",
        name: "명동",
        carStatuses: makeStatuses(8),
        recommendations: {
          quiet: { car: 8, reason: "8번 칸은 명동 관광객 집중 출구에서 가장 멀어 조용합니다.", tips: [], congestionLevel: 4 },
          seats: { car: 1, reason: "1번 칸은 명동역에서 관광객이 집중되지 않아 자리 여유가 있습니다.", tips: [], congestionLevel: 3 },
          transfer: { car: 3, reason: "3번 칸이 2호선 을지로입구역 방면 지하 연결 통로와 가깝습니다.", tips: [], congestionLevel: 4 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석이 명동역 역무원실과 가깝습니다.", tips: [], congestionLevel: 3 },
        },
      },
      {
        id: "4-ddp",
        name: "동대문역사문화공원",
        carStatuses: makeStatuses(8),
        recommendations: {
          quiet: { car: 1, reason: "1번 칸은 DDP 출구에서 멀어 비교적 조용합니다.", tips: [], congestionLevel: 3 },
          seats: { car: 8, reason: "8번 칸은 이 역에서 탑승객이 집중되지 않습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 5, reason: "5번 칸이 2·5호선 환승 통로와 가장 가깝습니다.", tips: ["2·5호선 모두 이 역에서 환승 가능해요."], congestionLevel: 4 },
          pregnant: { car: 8, reason: "8번 칸 임산부 배려석이 엘리베이터와 가깝습니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "4-hyehwa",
        name: "혜화",
        carStatuses: makeStatuses(8),
        recommendations: {
          quiet: { car: 2, reason: "2번 칸은 대학로 방면 출구에서 멀어 조용합니다.", tips: [], congestionLevel: 2 },
          seats: { car: 1, reason: "혜화역에서 1번 칸은 비교적 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 4, reason: "혜화역은 환승 없으나 4번 칸이 주요 출구와 가장 가깝습니다.", tips: [], congestionLevel: 2 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석이 혜화역 역무원실 근처입니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "4-sadang",
        name: "사당",
        carStatuses: makeStatuses(8),
        recommendations: {
          quiet: { car: 8, reason: "8번 칸은 사당역 주요 출구에서 멀어 한산합니다.", tips: [], congestionLevel: 3 },
          seats: { car: 1, reason: "1번 칸은 탑승 집중 구역과 거리가 있어 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 5, reason: "5번 칸이 2호선 환승 통로와 바로 연결됩니다.", tips: ["2호선 사당역과 4호선 사당역은 연결되어 있어요."], congestionLevel: 4 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석이 엘리베이터와 가깝습니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "4-sungshin",
        name: "성신여대입구",
        carStatuses: makeStatuses(8),
        recommendations: {
          quiet: { car: 7, reason: "7번 칸은 성신여대 방면 출구에서 멀어 비교적 조용합니다.", tips: [], congestionLevel: 2 },
          seats: { car: 8, reason: "8번 칸은 이 역에서 탑승 집중도가 낮습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 3, reason: "3번 칸이 우이신설선 환승 통로와 가장 가깝습니다.", tips: [], congestionLevel: 3 },
          pregnant: { car: 8, reason: "8번 칸 임산부 배려석이 엘리베이터와 가깝습니다.", tips: [], congestionLevel: 2 },
        },
      },
    ],
  },
  {
    id: "5",
    number: "5",
    name: "5호선",
    color: "#996CAC",
    textColor: "#ffffff",
    totalCars: 8,
    stations: [
      {
        id: "5-yeouido",
        name: "여의도",
        carStatuses: makeStatuses(8),
        recommendations: {
          quiet: { car: 1, reason: "1번 칸은 증권가 방면 출구에서 멀어 조용합니다.", tips: [], congestionLevel: 3 },
          seats: { car: 8, reason: "8번 칸은 여의도역에서 비교적 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 5, reason: "5번 칸이 9호선 환승 통로와 가장 가깝습니다.", tips: ["9호선 급행 연결 시 유리해요."], congestionLevel: 4 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석이 역무원실 근처입니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "5-gwanghwamun",
        name: "광화문",
        carStatuses: makeStatuses(8),
        recommendations: {
          quiet: { car: 8, reason: "8번 칸은 광화문 광장 출구에서 멀어 한산합니다.", tips: [], congestionLevel: 3 },
          seats: { car: 1, reason: "1번 칸은 출퇴근 인파가 집중되지 않아 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 4, reason: "4번 칸이 세종문화회관 방면 주요 출구와 가깝습니다.", tips: [], congestionLevel: 3 },
          pregnant: { car: 8, reason: "8번 칸 임산부 배려석이 엘리베이터와 가깝습니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "5-wangsimni",
        name: "왕십리",
        carStatuses: [
          { car: 1, status: "normal", label: "일반" },
          { car: 2, status: "normal", label: "일반" },
          { car: 3, status: "standing", label: "입석 전용" },
          { car: 4, status: "standing", label: "입석 전용" },
          { car: 5, status: "standing", label: "입석 전용" },
          { car: 6, status: "normal", label: "일반" },
          { car: 7, status: "normal", label: "일반" },
          { car: 8, status: "normal", label: "일반" },
        ],
        recommendations: {
          quiet: { car: 1, reason: "1번 칸은 환승 인파가 집중되지 않아 조용합니다.", tips: [], congestionLevel: 4 },
          seats: { car: 8, reason: "8번 칸은 왕십리역에서 비교적 자리 여유가 있습니다.", tips: [], congestionLevel: 3 },
          transfer: { car: 5, reason: "5번 칸이 2호선·경의중앙선·수인분당선 환승 통로와 가장 가깝습니다.", tips: ["왕십리는 4개 노선 환승역이에요!"], congestionLevel: 5 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석이 역무원실 근처입니다.", tips: [], congestionLevel: 3 },
        },
      },
      {
        id: "5-mapo",
        name: "마포",
        carStatuses: makeStatuses(8),
        recommendations: {
          quiet: { car: 2, reason: "2번 칸은 마포 출구에서 멀어 비교적 조용합니다.", tips: [], congestionLevel: 2 },
          seats: { car: 1, reason: "1번 칸은 마포역에서 탑승 집중도가 낮습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 5, reason: "5번 칸이 주요 버스 환승 출구와 가장 가깝습니다.", tips: [], congestionLevel: 2 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석이 역무원 호출 버튼과 가깝습니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "5-gongdeok",
        name: "공덕",
        carStatuses: makeStatuses(8),
        recommendations: {
          quiet: { car: 8, reason: "8번 칸은 공덕역 혼잡 출구에서 멀어 조용합니다.", tips: [], congestionLevel: 3 },
          seats: { car: 1, reason: "1번 칸은 공덕역에서 비교적 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 4, reason: "4번 칸이 6호선·공항철도·경의중앙선 환승 통로와 가장 가깝습니다.", tips: ["공항철도 방향은 별도 개찰구를 이용하세요."], congestionLevel: 4 },
          pregnant: { car: 8, reason: "8번 칸 임산부 배려석이 엘리베이터와 가깝습니다.", tips: [], congestionLevel: 2 },
        },
      },
    ],
  },
  {
    id: "6",
    number: "6",
    name: "6호선",
    color: "#CD7C2F",
    textColor: "#ffffff",
    totalCars: 8,
    stations: [
      {
        id: "6-itaewon",
        name: "이태원",
        carStatuses: makeStatuses(8),
        recommendations: {
          quiet: { car: 1, reason: "1번 칸은 이태원 번화가 출구에서 멀어 조용합니다.", tips: ["주말 심야엔 전체적으로 혼잡해요."], congestionLevel: 3 },
          seats: { car: 8, reason: "8번 칸은 이태원역에서 탑승객이 집중되지 않습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 4, reason: "4번 칸이 주요 버스·택시 환승 출구와 가깝습니다.", tips: [], congestionLevel: 3 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석이 역무원실과 가깝습니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "6-hangangjin",
        name: "한강진",
        carStatuses: makeStatuses(8),
        recommendations: {
          quiet: { car: 8, reason: "8번 칸은 한강진역 주요 출구에서 멀어 한산합니다.", tips: [], congestionLevel: 1 },
          seats: { car: 7, reason: "7번 칸은 한강진역에서 빈 좌석이 자주 생깁니다.", tips: [], congestionLevel: 1 },
          transfer: { car: 3, reason: "3번 칸이 버스 환승 출구와 가장 가깝습니다.", tips: [], congestionLevel: 1 },
          pregnant: { car: 8, reason: "8번 칸 임산부 배려석이 엘리베이터와 가깝습니다.", tips: [], congestionLevel: 1 },
        },
      },
      {
        id: "6-samgakji",
        name: "삼각지",
        carStatuses: makeStatuses(8),
        recommendations: {
          quiet: { car: 2, reason: "2번 칸은 삼각지역 출구에서 멀어 비교적 조용합니다.", tips: [], congestionLevel: 2 },
          seats: { car: 1, reason: "1번 칸은 삼각지역에서 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 5, reason: "5번 칸이 4호선 환승 통로와 연결됩니다.", tips: [], congestionLevel: 3 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석 이용이 편합니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "6-gongdeok",
        name: "공덕",
        carStatuses: makeStatuses(8),
        recommendations: {
          quiet: { car: 1, reason: "1번 칸은 혼잡 출구에서 멀어 조용합니다.", tips: [], congestionLevel: 3 },
          seats: { car: 8, reason: "8번 칸은 공덕역 6호선 구간에서 비교적 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 6, reason: "6번 칸이 5호선·공항철도 환승 통로와 가장 가깝습니다.", tips: [], congestionLevel: 4 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석이 역무원실 근처입니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "6-sangwolgok",
        name: "상월곡",
        carStatuses: makeStatuses(8),
        recommendations: {
          quiet: { car: 7, reason: "7번 칸은 상월곡역 출구에서 멀어 조용합니다.", tips: [], congestionLevel: 1 },
          seats: { car: 8, reason: "8번 칸은 탑승객이 적어 빈 자리가 많습니다.", tips: [], congestionLevel: 1 },
          transfer: { car: 4, reason: "4번 칸이 주요 버스 환승 출구와 가깝습니다.", tips: [], congestionLevel: 1 },
          pregnant: { car: 8, reason: "8번 칸 임산부 배려석이 엘리베이터와 가깝습니다.", tips: [], congestionLevel: 1 },
        },
      },
    ],
  },
  {
    id: "7",
    number: "7",
    name: "7호선",
    color: "#747F00",
    textColor: "#ffffff",
    totalCars: 8,
    stations: [
      {
        id: "7-gangnamgu",
        name: "강남구청",
        carStatuses: makeStatuses(8),
        recommendations: {
          quiet: { car: 1, reason: "1번 칸은 강남구청 방면 출구에서 멀어 조용합니다.", tips: [], congestionLevel: 2 },
          seats: { car: 8, reason: "8번 칸은 강남구청역에서 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 4, reason: "4번 칸이 수인분당선 환승 통로와 가장 가깝습니다.", tips: [], congestionLevel: 3 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석이 역무원실과 가깝습니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "7-konkuk",
        name: "건대입구",
        carStatuses: makeStatuses(8),
        recommendations: {
          quiet: { car: 8, reason: "8번 칸은 건대 번화가 출구에서 가장 멀어 조용합니다.", tips: [], congestionLevel: 3 },
          seats: { car: 1, reason: "1번 칸은 건대입구역 7호선에서 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 5, reason: "5번 칸이 2호선 환승 통로와 바로 연결됩니다.", tips: [], congestionLevel: 4 },
          pregnant: { car: 8, reason: "8번 칸 임산부 배려석이 엘리베이터와 가깝습니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "7-nowon",
        name: "노원",
        carStatuses: makeStatuses(8),
        recommendations: {
          quiet: { car: 2, reason: "2번 칸은 노원역 혼잡 출구에서 멀어 조용합니다.", tips: [], congestionLevel: 3 },
          seats: { car: 1, reason: "1번 칸은 탑승 집중 구역에서 벗어나 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 6, reason: "6번 칸이 4호선 환승 통로와 가장 가깝습니다.", tips: ["노원은 4·7호선 환승역이에요."], congestionLevel: 4 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석이 역무원실 근처입니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "7-dobongsan",
        name: "도봉산",
        carStatuses: makeStatuses(8),
        recommendations: {
          quiet: { car: 8, reason: "8번 칸은 등산객 집중 출구에서 멀어 조용합니다.", tips: ["주말엔 등산객으로 매우 혼잡해요."], congestionLevel: 3 },
          seats: { car: 1, reason: "1번 칸은 도봉산역에서 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 4, reason: "4번 칸이 주요 버스 환승 출구와 가깝습니다.", tips: [], congestionLevel: 2 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석 이용이 편합니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "7-gasandigital",
        name: "가산디지털단지",
        carStatuses: makeStatuses(8),
        recommendations: {
          quiet: { car: 1, reason: "1번 칸은 디지털단지 방면 출구에서 멀어 비교적 조용합니다.", tips: [], congestionLevel: 4 },
          seats: { car: 8, reason: "8번 칸은 이 역에서 탑승집중도가 낮습니다.", tips: [], congestionLevel: 3 },
          transfer: { car: 4, reason: "4번 칸이 1호선 환승 통로와 가장 가깝습니다.", tips: [], congestionLevel: 4 },
          pregnant: { car: 8, reason: "8번 칸 임산부 배려석이 엘리베이터와 가깝습니다.", tips: [], congestionLevel: 3 },
        },
      },
    ],
  },
  {
    id: "8",
    number: "8",
    name: "8호선",
    color: "#E6186C",
    textColor: "#ffffff",
    totalCars: 6,
    stations: [
      {
        id: "8-jamsil",
        name: "잠실",
        carStatuses: makeStatuses(6),
        recommendations: {
          quiet: { car: 1, reason: "1번 칸은 잠실 롯데 방면 출구에서 멀어 조용합니다.", tips: [], congestionLevel: 4 },
          seats: { car: 6, reason: "6번 칸은 잠실역 8호선 구간에서 자리 여유가 있습니다.", tips: [], congestionLevel: 3 },
          transfer: { car: 3, reason: "3번 칸이 2호선 환승 통로와 가장 가깝습니다.", tips: ["2호선 잠실역은 초대형 환승역이에요."], congestionLevel: 5 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석이 역무원실 근처입니다.", tips: [], congestionLevel: 3 },
        },
      },
      {
        id: "8-cheonho",
        name: "천호",
        carStatuses: makeStatuses(6),
        recommendations: {
          quiet: { car: 6, reason: "6번 칸은 천호역 주요 출구에서 멀어 한산합니다.", tips: [], congestionLevel: 3 },
          seats: { car: 1, reason: "1번 칸은 천호역에서 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 4, reason: "4번 칸이 5호선 환승 통로와 바로 연결됩니다.", tips: [], congestionLevel: 3 },
          pregnant: { car: 6, reason: "6번 칸 임산부 배려석이 엘리베이터와 가깝습니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "8-amsa",
        name: "암사",
        carStatuses: makeStatuses(6),
        recommendations: {
          quiet: { car: 5, reason: "5번 칸은 암사역 출구에서 멀어 조용합니다.", tips: [], congestionLevel: 1 },
          seats: { car: 6, reason: "6번 칸은 암사역에서 빈 좌석이 많습니다.", tips: [], congestionLevel: 1 },
          transfer: { car: 3, reason: "3번 칸이 버스 환승 출구와 가장 가깝습니다.", tips: [], congestionLevel: 1 },
          pregnant: { car: 6, reason: "6번 칸 임산부 배려석이 엘리베이터와 가깝습니다.", tips: [], congestionLevel: 1 },
        },
      },
      {
        id: "8-gangdonggu",
        name: "강동구청",
        carStatuses: makeStatuses(6),
        recommendations: {
          quiet: { car: 1, reason: "1번 칸은 강동구청 방면 출구에서 멀어 조용합니다.", tips: [], congestionLevel: 2 },
          seats: { car: 6, reason: "6번 칸은 이 역에서 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 3, reason: "3번 칸이 버스 및 환승 출구와 가장 가깝습니다.", tips: [], congestionLevel: 2 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석이 역무원실과 가깝습니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "8-mongchon",
        name: "몽촌토성",
        carStatuses: makeStatuses(6),
        recommendations: {
          quiet: { car: 6, reason: "6번 칸은 몽촌토성역 출구에서 멀어 조용합니다.", tips: ["올림픽공원 행사 있을 땐 매우 혼잡해요."], congestionLevel: 2 },
          seats: { car: 1, reason: "1번 칸은 평일 낮 탑승객이 적어 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 4, reason: "4번 칸이 올림픽공원 방면 주요 출구와 가깝습니다.", tips: [], congestionLevel: 2 },
          pregnant: { car: 6, reason: "6번 칸 임산부 배려석이 엘리베이터와 가깝습니다.", tips: [], congestionLevel: 2 },
        },
      },
    ],
  },
  {
    id: "9",
    number: "9",
    name: "9호선",
    color: "#BDB092",
    textColor: "#ffffff",
    totalCars: 6,
    stations: [
      {
        id: "9-gimpo",
        name: "김포공항",
        carStatuses: makeStatuses(6),
        recommendations: {
          quiet: { car: 6, reason: "6번 칸은 공항 출구에서 멀어 조용합니다.", tips: ["캐리어가 있다면 출입구 근처 칸을 추천해요."], congestionLevel: 3 },
          seats: { car: 1, reason: "1번 칸은 김포공항역에서 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 5, reason: "5번 칸이 공항철도·5호선 환승 통로와 가장 가깝습니다.", tips: ["공항철도 인천공항행 환승 시 이용하세요."], congestionLevel: 3 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석이 역무원실 근처입니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "9-gayang",
        name: "가양",
        carStatuses: makeStatuses(6),
        recommendations: {
          quiet: { car: 1, reason: "1번 칸은 가양역 주요 출구에서 멀어 조용합니다.", tips: [], congestionLevel: 2 },
          seats: { car: 6, reason: "6번 칸은 가양역에서 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 3, reason: "3번 칸이 버스 환승 출구와 가장 가깝습니다.", tips: [], congestionLevel: 2 },
          pregnant: { car: 6, reason: "6번 칸 임산부 배려석이 엘리베이터와 가깝습니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "9-yeouido",
        name: "여의도",
        carStatuses: makeStatuses(6),
        recommendations: {
          quiet: { car: 6, reason: "6번 칸은 여의도 금융가 방면 출구에서 멀어 조용합니다.", tips: [], congestionLevel: 4 },
          seats: { car: 1, reason: "1번 칸은 9호선 여의도역에서 비교적 자리 여유가 있습니다.", tips: [], congestionLevel: 3 },
          transfer: { car: 3, reason: "3번 칸이 5호선 환승 통로와 가장 가깝습니다.", tips: ["9호선 급행이 정차하는 역이에요."], congestionLevel: 5 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석이 역무원실 근처입니다.", tips: [], congestionLevel: 3 },
        },
      },
      {
        id: "9-noryangjin",
        name: "노량진",
        carStatuses: makeStatuses(6),
        recommendations: {
          quiet: { car: 6, reason: "6번 칸은 노량진 학원가 방면 출구에서 멀어 조용합니다.", tips: [], congestionLevel: 3 },
          seats: { car: 1, reason: "1번 칸은 노량진역에서 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 4, reason: "4번 칸이 1호선 환승 통로와 가장 가깝습니다.", tips: [], congestionLevel: 3 },
          pregnant: { car: 6, reason: "6번 칸 임산부 배려석이 엘리베이터와 가깝습니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "9-gosuk",
        name: "고속터미널",
        carStatuses: makeStatuses(6),
        recommendations: {
          quiet: { car: 1, reason: "1번 칸은 터미널 방면 출구에서 멀어 조용합니다.", tips: [], congestionLevel: 3 },
          seats: { car: 6, reason: "6번 칸은 고속터미널역 9호선 구간에서 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 3, reason: "3번 칸이 3·7호선 환승 통로와 가장 가깝습니다.", tips: ["3개 노선 환승역으로 매우 혼잡할 수 있어요."], congestionLevel: 5 },
          pregnant: { car: 6, reason: "6번 칸 임산부 배려석이 엘리베이터와 가깝습니다.", tips: [], congestionLevel: 2 },
        },
      },
    ],
  },
  {
    id: "gtxa",
    number: "GTX-A",
    name: "GTX-A",
    color: "#E05A00",
    textColor: "#ffffff",
    totalCars: 10,
    stations: [
      {
        id: "gtxa-unjeongjungang",
        name: "운정중앙",
        carStatuses: makeStatuses(10),
        recommendations: {
          quiet: { car: 1, reason: "1번 칸은 운정중앙 종착 방향 끝으로 탑승객이 적어 조용합니다.", tips: [], congestionLevel: 1 },
          seats: { car: 10, reason: "10번 칸은 운정중앙 출발역 특성상 빈 좌석이 많습니다.", tips: [], congestionLevel: 1 },
          transfer: { car: 5, reason: "5번 칸이 메인 출구와 버스 환승 구역과 가장 가깝습니다.", tips: ["GTX 특성상 심층 역사라 에스컬레이터 이동 시간이 깁니다."], congestionLevel: 2 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석이 역무원실과 가깝습니다.", tips: [], congestionLevel: 1 },
        },
      },
      {
        id: "gtxa-kintex",
        name: "킨텍스",
        carStatuses: makeStatuses(10),
        recommendations: {
          quiet: { car: 2, reason: "2번 칸은 전시장 방면 출구에서 멀어 비교적 조용합니다.", tips: ["전시 행사 기간엔 전 칸이 혼잡할 수 있어요."], congestionLevel: 2 },
          seats: { car: 9, reason: "9번 칸은 킨텍스역에서 탑승 집중도가 낮아 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 6, reason: "6번 칸이 킨텍스 전시장 방면 출구와 가장 가깝습니다.", tips: [], congestionLevel: 3 },
          pregnant: { car: 10, reason: "10번 칸 임산부 배려석이 엘리베이터와 가깝습니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "gtxa-seoul",
        name: "서울역",
        carStatuses: makeStatuses(10),
        recommendations: {
          quiet: { car: 1, reason: "1번 칸은 GTX 서울역에서 일반 출구와 멀어 조용합니다.", tips: [], congestionLevel: 3 },
          seats: { car: 10, reason: "10번 칸은 서울역 GTX 구간에서 비교적 자리 여유가 있습니다.", tips: [], congestionLevel: 3 },
          transfer: { car: 5, reason: "5번 칸이 1·4호선 및 공항철도 환승 통로와 가장 가깝습니다.", tips: ["GTX 서울역은 심층 구조라 환승 시간이 5분 이상 소요될 수 있습니다."], congestionLevel: 4 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석이 역무원실 근처에 있습니다.", tips: [], congestionLevel: 3 },
        },
      },
      {
        id: "gtxa-suseo",
        name: "수서",
        carStatuses: makeStatuses(10),
        recommendations: {
          quiet: { car: 8, reason: "8번 칸은 수서역 주요 출구에서 멀어 한산합니다.", tips: [], congestionLevel: 2 },
          seats: { car: 9, reason: "9번 칸은 수서역에서 탑승객이 집중되지 않아 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 4, reason: "4번 칸이 SRT·3호선·수인분당선 환승 통로와 가장 가깝습니다.", tips: ["SRT 환승은 별도 개찰구를 이용하세요."], congestionLevel: 3 },
          pregnant: { car: 8, reason: "8번 칸 임산부 배려석이 엘리베이터와 가깝습니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "gtxa-dongtan",
        name: "동탄",
        carStatuses: makeStatuses(10),
        recommendations: {
          quiet: { car: 10, reason: "10번 칸은 동탄역 종착 방향 끝으로 유동 인구가 적습니다.", tips: [], congestionLevel: 1 },
          seats: { car: 1, reason: "1번 칸은 동탄 종착역 특성상 빈 좌석이 많습니다.", tips: [], congestionLevel: 1 },
          transfer: { car: 5, reason: "5번 칸이 버스 환승 센터 방면 출구와 가장 가깝습니다.", tips: ["동탄 GTX역은 심층 구조라 지상까지 이동 시간이 소요됩니다."], congestionLevel: 2 },
          pregnant: { car: 10, reason: "10번 칸 임산부 배려석이 엘리베이터와 가깝습니다.", tips: [], congestionLevel: 1 },
        },
      },
    ],
  },
  {
    id: "suinbundang",
    number: "수인분당",
    name: "수인분당선",
    color: "#F5A200",
    textColor: "#ffffff",
    totalCars: 10,
    stations: [
      {
        id: "suinbundang-wangsimni",
        name: "왕십리",
        carStatuses: makeStatuses(10),
        recommendations: {
          quiet: { car: 1, reason: "1번 칸은 왕십리 혼잡 구간에서도 비교적 조용합니다.", tips: [], congestionLevel: 4 },
          seats: { car: 10, reason: "10번 칸은 왕십리역 수인분당선에서 자리 여유가 있습니다.", tips: [], congestionLevel: 3 },
          transfer: { car: 5, reason: "5번 칸이 2호선·5호선·경의중앙선 환승 통로와 가장 가깝습니다.", tips: ["왕십리는 4개 노선이 교차하는 환승역이에요."], congestionLevel: 5 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석이 역무원실 근처입니다.", tips: [], congestionLevel: 3 },
        },
      },
      {
        id: "suinbundang-seolleung",
        name: "선릉",
        carStatuses: makeStatuses(10),
        recommendations: {
          quiet: { car: 2, reason: "2번 칸은 선릉역 주요 출구에서 멀어 비교적 조용합니다.", tips: [], congestionLevel: 3 },
          seats: { car: 9, reason: "9번 칸은 선릉역에서 탑승객이 집중되지 않아 자리 여유가 있습니다.", tips: [], congestionLevel: 3 },
          transfer: { car: 6, reason: "6번 칸이 2호선 환승 통로와 가장 가깝습니다.", tips: [], congestionLevel: 4 },
          pregnant: { car: 9, reason: "9번 칸 임산부 배려석이 엘리베이터와 가깝습니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "suinbundang-suseo",
        name: "수서",
        carStatuses: makeStatuses(10),
        recommendations: {
          quiet: { car: 10, reason: "10번 칸은 수서역 주요 출구에서 멀어 한산합니다.", tips: [], congestionLevel: 2 },
          seats: { car: 1, reason: "1번 칸은 수서역에서 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 5, reason: "5번 칸이 GTX-A·SRT·3호선 환승 통로와 가장 가깝습니다.", tips: ["SRT 환승은 별도 개찰구를 이용하세요."], congestionLevel: 3 },
          pregnant: { car: 10, reason: "10번 칸 임산부 배려석이 엘리베이터와 가깝습니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "suinbundang-jeongja",
        name: "정자",
        carStatuses: makeStatuses(10),
        recommendations: {
          quiet: { car: 3, reason: "3번 칸은 정자역 카페거리 방면 출구에서 멀어 조용합니다.", tips: [], congestionLevel: 2 },
          seats: { car: 8, reason: "8번 칸은 정자역에서 비교적 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 5, reason: "5번 칸이 신분당선 환승 통로와 가장 가깝습니다.", tips: ["신분당선은 별도 요금이 적용됩니다."], congestionLevel: 3 },
          pregnant: { car: 3, reason: "3번 칸 임산부 배려석이 역무원실 근처입니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "suinbundang-suwon",
        name: "수원",
        carStatuses: makeStatuses(10),
        recommendations: {
          quiet: { car: 2, reason: "2번 칸은 수원역 주요 출구에서 멀어 조용합니다.", tips: [], congestionLevel: 2 },
          seats: { car: 10, reason: "10번 칸은 수원역 수인분당선에서 빈 좌석이 많습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 5, reason: "5번 칸이 1호선·KTX 환승 통로 방향과 가장 가깝습니다.", tips: [], congestionLevel: 3 },
          pregnant: { car: 10, reason: "10번 칸 임산부 배려석이 엘리베이터와 가깝습니다.", tips: [], congestionLevel: 2 },
        },
      },
    ],
  },
  {
    id: "sinbundang",
    number: "신분당",
    name: "신분당선",
    color: "#D4003B",
    textColor: "#ffffff",
    totalCars: 6,
    stations: [
      {
        id: "sinbundang-gangnam",
        name: "강남",
        carStatuses: makeStatuses(6),
        recommendations: {
          quiet: { car: 6, reason: "6번 칸은 강남역 신분당선 출구에서 멀어 비교적 조용합니다.", tips: [], congestionLevel: 4 },
          seats: { car: 1, reason: "1번 칸은 강남역 신분당선에서 자리 여유가 있습니다.", tips: [], congestionLevel: 3 },
          transfer: { car: 3, reason: "3번 칸이 2호선 환승 통로와 가장 가깝습니다.", tips: ["신분당선 강남역은 2호선과 별도 개찰구를 사용합니다."], congestionLevel: 5 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석이 역무원실 근처입니다.", tips: [], congestionLevel: 3 },
        },
      },
      {
        id: "sinbundang-yangjae",
        name: "양재",
        carStatuses: makeStatuses(6),
        recommendations: {
          quiet: { car: 1, reason: "1번 칸은 양재역 주요 출구에서 멀어 조용합니다.", tips: [], congestionLevel: 3 },
          seats: { car: 6, reason: "6번 칸은 양재역에서 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 4, reason: "4번 칸이 3호선 환승 통로와 가장 가깝습니다.", tips: [], congestionLevel: 3 },
          pregnant: { car: 6, reason: "6번 칸 임산부 배려석이 엘리베이터와 가깝습니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "sinbundang-pangyo",
        name: "판교",
        carStatuses: makeStatuses(6),
        recommendations: {
          quiet: { car: 6, reason: "6번 칸은 판교역 테크노밸리 방면 출구에서 멀어 조용합니다.", tips: [], congestionLevel: 3 },
          seats: { car: 1, reason: "1번 칸은 판교역에서 탑승객이 집중되지 않아 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 3, reason: "3번 칸이 경강선 환승 통로와 가장 가깝습니다.", tips: ["경강선 판교역으로 환승 시 개찰구를 다시 통과해야 합니다."], congestionLevel: 3 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석이 역무원실 근처입니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "sinbundang-jeongja",
        name: "정자",
        carStatuses: makeStatuses(6),
        recommendations: {
          quiet: { car: 5, reason: "5번 칸은 정자역 신분당선 출구에서 멀어 조용합니다.", tips: [], congestionLevel: 2 },
          seats: { car: 6, reason: "6번 칸은 정자역 신분당선에서 자리 여유가 있습니다.", tips: [], congestionLevel: 2 },
          transfer: { car: 3, reason: "3번 칸이 수인분당선 환승 통로와 가장 가깝습니다.", tips: ["수인분당선은 별도 요금이 적용됩니다."], congestionLevel: 3 },
          pregnant: { car: 6, reason: "6번 칸 임산부 배려석이 엘리베이터와 가깝습니다.", tips: [], congestionLevel: 2 },
        },
      },
      {
        id: "sinbundang-gwanggyo",
        name: "광교",
        carStatuses: makeStatuses(6),
        recommendations: {
          quiet: { car: 1, reason: "1번 칸은 광교 종착역으로 유동 인구가 적어 조용합니다.", tips: [], congestionLevel: 1 },
          seats: { car: 6, reason: "6번 칸은 광교 종착역 특성상 빈 좌석이 많습니다.", tips: [], congestionLevel: 1 },
          transfer: { car: 3, reason: "3번 칸이 버스 환승 센터 방면 출구와 가장 가깝습니다.", tips: [], congestionLevel: 2 },
          pregnant: { car: 1, reason: "1번 칸 임산부 배려석이 역무원실 근처입니다.", tips: [], congestionLevel: 1 },
        },
      },
    ],
  },
];

export function getRecommendedCar(
  station: Station,
  conditions: Condition[]
): { car: number; matchedConditions: Condition[]; reasons: string[] } {
  if (conditions.length === 0) {
    return { car: 1, matchedConditions: [], reasons: [] };
  }
  if (conditions.length === 1) {
    const rec = station.recommendations[conditions[0]];
    return { car: rec.car, matchedConditions: conditions, reasons: [rec.reason] };
  }

  // Vote for each car across all selected conditions
  const votes: Record<number, number> = {};
  for (const cond of conditions) {
    const car = station.recommendations[cond].car;
    votes[car] = (votes[car] || 0) + 1;
  }
  const bestCar = Number(Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0]);
  const matchedConditions = conditions.filter(
    (c) => station.recommendations[c].car === bestCar
  );
  const reasons = matchedConditions.map((c) => station.recommendations[c].reason);
  return { car: bestCar, matchedConditions, reasons };
}
