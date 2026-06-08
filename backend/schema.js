/**
 * 골프총무 백엔드 - AI 파서 스키마 & 시스템 프롬프트
 *
 * TRIP_JSON_SCHEMA: Claude의 structured outputs(output_config.format)에 넘기는 JSON Schema.
 * 모델이 반드시 이 형태로만 반환하도록 강제한다. (trip_id/created_at은 서버가 부여하므로 제외)
 *
 * structured outputs 제약: 재귀 불가, 숫자 min/max·문자열 길이 제약 불가,
 * 모든 object에 additionalProperties:false 필요. nullable은 type 배열로 표현.
 */

export const TRIP_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", description: "여행 제목(예: 2026 태국 파타야 멤버십 골프)" },
    country: { type: "string", description: "한글 국가명(예: 태국, 일본, 베트남)" },
    local_currency: {
      type: "string",
      description: "현지 주 통화 ISO 4217 코드(THB, JPY, VND, PHP, TWD, MYR, CNY, IDR 등)",
    },
    status: {
      type: "string",
      enum: ["PLANNING", "COMPLETED"],
      description: "PLANNING=계획/견적, COMPLETED=다녀온 여행",
    },
    total_days: { type: ["integer", "null"] },
    party_size: { type: ["integer", "null"] },
    current_fx_rate: {
      type: ["number", "null"],
      description: "현지통화 1단위당 원화. 자료에 없으면 null",
    },
    summary: {
      type: "object",
      additionalProperties: false,
      properties: {
        prepaid_krw_per_person: { type: ["number", "null"] },
        local_estimated_krw_per_person: { type: ["number", "null"] },
        final_total_krw_per_person: { type: ["number", "null"] },
      },
      required: [
        "prepaid_krw_per_person",
        "local_estimated_krw_per_person",
        "final_total_krw_per_person",
      ],
    },
    itinerary: {
      type: "array",
      description: "일차별 일정. 일정 정보가 없으면 day=1에 전체 비용을 모은다.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          day: { type: "integer" },
          description: { type: ["string", "null"] },
          expenses: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                item: { type: "string", description: "비용 항목명(그린피, 캐디팁, 카트비, 패키지기본가 등)" },
                amount: { type: ["number", "null"], description: "금액. 언급 없으면 null(추측 금지)" },
                currency: { type: "string", description: "ISO 4217 코드" },
                pay_type: {
                  type: "string",
                  enum: ["PREPAID", "LOCAL"],
                  description: "PREPAID=사전결제/패키지, LOCAL=현지결제",
                },
              },
              required: ["item", "amount", "currency", "pay_type"],
            },
          },
        },
        required: ["day", "description", "expenses"],
      },
    },
  },
  required: [
    "title",
    "country",
    "local_currency",
    "status",
    "total_days",
    "party_size",
    "current_fx_rate",
    "summary",
    "itinerary",
  ],
};

export const SYSTEM_PROMPT = `당신은 해외 골프 여행 총무 비서 '골프총무'의 AI 파서입니다.
입력으로 들어온 텍스트/이미지/PDF(여행사 상품 페이지, 공식 견적서, 카탈로그 사진, 카카오톡 캡처 등)에서
해외 골프 여행의 비용 정보를 추출하여, 지정된 JSON 스키마에 맞는 JSON만 반환합니다.

[추출 규칙]
- pay_type: '패키지기본가/사전결제/선결제/항공+숙박 포함가' 등 출발 전 결제 항목은 "PREPAID",
  현지에서 지불하는 항목(그린피, 카트비, 캐디피, 캐디팁, 미팅샌딩비, 현지 식비 등)은 "LOCAL".
- 금액이 명시되지 않았거나 불확실하면 amount를 null로 둔다. 절대 임의로 추측하지 않는다.
  단, 항목명만 언급되고 금액이 빠진 경우에도 expenses 배열에 포함시키고 amount:null 로 둔다(누락 경고용).
- currency는 ISO 4217 코드: KRW, USD, THB(태국), JPY(일본), VND(베트남), PHP(필리핀),
  TWD(대만), MYR(말레이시아), CNY(중국), IDR(인도네시아) 등.
- country는 한글 국가명(예: 태국, 일본). local_currency는 그 나라의 주 통화 코드.
- status는 기본 "PLANNING"(아직 다녀오지 않은 계획/견적). 명백한 과거 지출 기록이면 "COMPLETED".
- itinerary는 일차(day)별로 정리하고 일정 설명을 description에 넣는다.
  일자 구분 정보가 없으면 day=1 하나에 전체 비용을 모은다.
- current_fx_rate(현지통화 1단위당 원화)와 summary의 1인당 원화 금액은 자료에 있으면 채우고, 없으면 null.
- 자료에서 확인되지 않는 값은 만들어내지 말고 null 또는 빈 배열을 사용한다.
- 반드시 스키마에 부합하는 JSON만 출력한다(설명 문장 금지).`;
