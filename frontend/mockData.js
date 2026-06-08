/**
 * 골프총무 (Golf Director) - Mock Data
 * 사양서 5장 "데이터베이스 스키마 및 JSON 규격" 기반 더미 데이터
 *
 * Trip 엔티티 스키마:
 * {
 *   trip_id, title, country(한글 국가명), local_currency, status, total_days,
 *   party_size, current_fx_rate(현지통화 1단위당 원화), created_at,
 *   summary: { prepaid_krw_per_person, local_estimated_krw_per_person, final_total_krw_per_person },
 *   itinerary: [ { day, description, expenses: [ { item, amount, currency, pay_type } ] } ]
 * }
 *
 * pay_type: "PREPAID"(사전결제) | "LOCAL"(현지결제)
 * currency: "KRW" | "USD" | "THB" | "JPY" | "VND" | "PHP"
 * amount: number | null  (null = 사양서상 '누락 위험' 항목)
 */

// 통화 → 원화 환율 (1 외화 단위당 원화). 실시간 환율 보정 엔진의 기준값.
const FX_RATES = {
  KRW: 1,
  USD: 1385,
  THB: 37.5,
  JPY: 9.1,
  VND: 0.056,
  PHP: 24.5,
  TWD: 43,
  MYR: 300,
  CNY: 190,
  IDR: 0.085,
};

// 통화 기호
const CURRENCY_SYMBOL = {
  KRW: "₩",
  USD: "$",
  THB: "฿",
  JPY: "¥",
  VND: "₫",
  PHP: "₱",
  TWD: "NT$",
  MYR: "RM",
  CNY: "元",
  IDR: "Rp",
};

// 국가 카탈로그 — 탭에 항상 노출되는 주요 골프 여행국 + 기본 현지통화.
// 데이터(MOCK_TRIPS)에만 있는 국가는 app.js 에서 이 목록 뒤에 자동 합산됩니다.
const COUNTRY_CATALOG = [
  { name: "태국", currency: "THB" },
  { name: "일본", currency: "JPY" },
  { name: "베트남", currency: "VND" },
  { name: "필리핀", currency: "PHP" },
  { name: "중국", currency: "CNY" },
  { name: "대만", currency: "TWD" },
  { name: "말레이시아", currency: "MYR" },
  { name: "인도네시아", currency: "IDR" },
];

// 비용 매트릭스 X축(컬럼) 정의 — 사양서 기능2 매트릭스 X축 항목
const COST_COLUMNS = [
  "사전결제액",
  "그린피",
  "카트비",
  "캐디피",
  "캐디팁",
  "미팅샌딩비",
  "식비",
  "기타",
];

const MOCK_TRIPS = [
  {
    trip_id: "trip-th-001",
    title: "2026 태국 파타야 멤버십 골프",
    country: "태국",
    local_currency: "THB",
    status: "PLANNING",
    total_days: 5,
    party_size: 4,
    current_fx_rate: 37.5,
    created_at: "2026-06-08",
    summary: {
      prepaid_krw_per_person: 1200000,
      local_estimated_krw_per_person: 450000,
      final_total_krw_per_person: 1650000,
    },
    itinerary: [
      {
        day: 1,
        description: "방콕 공항 도착 및 파타야 이동",
        expenses: [
          { item: "미팅샌딩비", amount: 50, currency: "USD", pay_type: "LOCAL" },
          { item: "석식(현지식)", amount: 500, currency: "THB", pay_type: "LOCAL" },
        ],
      },
      {
        day: 2,
        description: "시암CC 18홀 라운딩",
        expenses: [
          { item: "패키지기본가", amount: 1200000, currency: "KRW", pay_type: "PREPAID" },
          { item: "카트+캐디피", amount: 1250, currency: "THB", pay_type: "LOCAL" },
          { item: "캐디팁", amount: 300, currency: "THB", pay_type: "LOCAL" },
          { item: "중식", amount: 400, currency: "THB", pay_type: "LOCAL" },
        ],
      },
      {
        day: 3,
        description: "파타나CC 18홀 라운딩",
        expenses: [
          { item: "그린피", amount: 2000, currency: "THB", pay_type: "LOCAL" },
          { item: "카트비", amount: 800, currency: "THB", pay_type: "LOCAL" },
          { item: "캐디피", amount: 500, currency: "THB", pay_type: "LOCAL" },
          { item: "캐디팁", amount: 300, currency: "THB", pay_type: "LOCAL" },
        ],
      },
      {
        day: 4,
        description: "레이크우드CC 18홀 + 시내 관광",
        expenses: [
          { item: "그린피", amount: 2000, currency: "THB", pay_type: "LOCAL" },
          { item: "캐디팁", amount: 300, currency: "THB", pay_type: "LOCAL" },
          { item: "석식(해산물)", amount: 600, currency: "THB", pay_type: "LOCAL" },
        ],
      },
      {
        day: 5,
        description: "자유시간 후 출국",
        expenses: [
          { item: "미팅샌딩비", amount: 50, currency: "USD", pay_type: "LOCAL" },
          // amount: null → 견적서에서 캐디팁이 누락된 케이스 (대시보드 누락 경고 대상)
          { item: "캐디팁", amount: null, currency: "THB", pay_type: "LOCAL" },
        ],
      },
    ],
  },
  {
    trip_id: "trip-jp-001",
    title: "2026 여름 부부동반 일본 북해도 골프",
    country: "일본",
    local_currency: "JPY",
    status: "PLANNING",
    total_days: 4,
    party_size: 4,
    current_fx_rate: 9.1,
    created_at: "2026-05-20",
    summary: {
      prepaid_krw_per_person: 980000,
      local_estimated_krw_per_person: 320000,
      final_total_krw_per_person: 1300000,
    },
    itinerary: [
      {
        day: 1,
        description: "신치토세 공항 ➡️ 니돔CC (18H)",
        expenses: [
          { item: "패키지기본가", amount: 980000, currency: "KRW", pay_type: "PREPAID" },
          { item: "캐디팁", amount: 3000, currency: "JPY", pay_type: "LOCAL" },
          { item: "석식", amount: 4000, currency: "JPY", pay_type: "LOCAL" },
        ],
      },
      {
        day: 2,
        description: "루스츠CC (36H)",
        expenses: [
          { item: "카트비", amount: 3000, currency: "JPY", pay_type: "LOCAL" },
          { item: "캐디피", amount: 3000, currency: "JPY", pay_type: "LOCAL" },
          { item: "중식", amount: 2000, currency: "JPY", pay_type: "LOCAL" },
        ],
      },
      {
        day: 3,
        description: "콧타로CC (18H) + 온천",
        expenses: [
          { item: "그린피", amount: 12000, currency: "JPY", pay_type: "LOCAL" },
          { item: "캐디팁", amount: 3000, currency: "JPY", pay_type: "LOCAL" },
          { item: "온천/기타", amount: 1500, currency: "JPY", pay_type: "LOCAL" },
        ],
      },
      {
        day: 4,
        description: "삿포로 시내관광 후 귀국",
        expenses: [
          { item: "미팅샌딩비", amount: 2000, currency: "JPY", pay_type: "LOCAL" },
          { item: "중식", amount: 2500, currency: "JPY", pay_type: "LOCAL" },
        ],
      },
    ],
  },
  {
    trip_id: "trip-vn-001",
    title: "2025 베트남 다낭 골프 원정",
    country: "베트남",
    local_currency: "VND",
    status: "COMPLETED",
    total_days: 4,
    party_size: 4,
    current_fx_rate: 0.056,
    created_at: "2025-11-02",
    summary: {
      prepaid_krw_per_person: 850000,
      local_estimated_krw_per_person: 410000,
      final_total_krw_per_person: 1260000,
    },
    itinerary: [
      {
        day: 1,
        description: "다낭 공항 도착 및 호텔 체크인",
        expenses: [
          { item: "패키지기본가", amount: 850000, currency: "KRW", pay_type: "PREPAID" },
          { item: "미팅샌딩비", amount: 600000, currency: "VND", pay_type: "LOCAL" },
          { item: "석식", amount: 1200000, currency: "VND", pay_type: "LOCAL" },
        ],
      },
      {
        day: 2,
        description: "바나힐 골프클럽 (18H)",
        expenses: [
          { item: "그린피", amount: 2500000, currency: "VND", pay_type: "LOCAL" },
          { item: "카트비", amount: 800000, currency: "VND", pay_type: "LOCAL" },
          { item: "캐디피", amount: 600000, currency: "VND", pay_type: "LOCAL" },
          { item: "캐디팁", amount: 500000, currency: "VND", pay_type: "LOCAL" },
        ],
      },
      {
        day: 3,
        description: "몽고메리링크스 (18H)",
        expenses: [
          { item: "그린피", amount: 2300000, currency: "VND", pay_type: "LOCAL" },
          { item: "캐디팁", amount: 500000, currency: "VND", pay_type: "LOCAL" },
          { item: "중식", amount: 700000, currency: "VND", pay_type: "LOCAL" },
        ],
      },
      {
        day: 4,
        description: "호이안 관광 후 귀국",
        expenses: [
          { item: "기타(기념품)", amount: 1000000, currency: "VND", pay_type: "LOCAL" },
          { item: "미팅샌딩비", amount: 600000, currency: "VND", pay_type: "LOCAL" },
        ],
      },
    ],
  },
  {
    trip_id: "trip-ph-001",
    title: "2025 필리핀 클락 골프",
    country: "필리핀",
    local_currency: "PHP",
    status: "COMPLETED",
    total_days: 4,
    party_size: 4,
    current_fx_rate: 24.5,
    created_at: "2025-03-15",
    summary: {
      prepaid_krw_per_person: 720000,
      local_estimated_krw_per_person: 380000,
      final_total_krw_per_person: 1100000,
    },
    itinerary: [
      {
        day: 1,
        description: "클락 공항 도착 및 이동",
        expenses: [
          { item: "패키지기본가", amount: 720000, currency: "KRW", pay_type: "PREPAID" },
          { item: "미팅샌딩비", amount: 500, currency: "PHP", pay_type: "LOCAL" },
          { item: "석식", amount: 1200, currency: "PHP", pay_type: "LOCAL" },
        ],
      },
      {
        day: 2,
        description: "미모사 골프클럽 (18H)",
        expenses: [
          { item: "그린피", amount: 3500, currency: "PHP", pay_type: "LOCAL" },
          { item: "카트비", amount: 1000, currency: "PHP", pay_type: "LOCAL" },
          { item: "캐디피", amount: 600, currency: "PHP", pay_type: "LOCAL" },
          { item: "캐디팁", amount: 500, currency: "PHP", pay_type: "LOCAL" },
        ],
      },
      {
        day: 3,
        description: "선밸리CC (18H)",
        expenses: [
          { item: "그린피", amount: 3200, currency: "PHP", pay_type: "LOCAL" },
          { item: "캐디팁", amount: 500, currency: "PHP", pay_type: "LOCAL" },
          { item: "중식", amount: 800, currency: "PHP", pay_type: "LOCAL" },
        ],
      },
      {
        day: 4,
        description: "마사지 후 귀국",
        expenses: [
          { item: "기타(마사지)", amount: 1500, currency: "PHP", pay_type: "LOCAL" },
          { item: "미팅샌딩비", amount: 500, currency: "PHP", pay_type: "LOCAL" },
        ],
      },
    ],
  },
];

// 전역 노출 (번들러 없이 <script>로 사용)
window.GolfDirectorData = {
  FX_RATES,
  CURRENCY_SYMBOL,
  COST_COLUMNS,
  COUNTRY_CATALOG,
  MOCK_TRIPS,
};
