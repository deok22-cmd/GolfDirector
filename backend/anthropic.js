/**
 * 골프총무 백엔드 - Claude Opus 4.8 호출 (멀티모달 → 표준 JSON)
 * 공식 Anthropic SDK 사용. API 키는 환경변수 ANTHROPIC_API_KEY 에서 읽는다.
 */
import Anthropic from "@anthropic-ai/sdk";
import { TRIP_JSON_SCHEMA, SYSTEM_PROMPT } from "./schema.js";

const client = new Anthropic(); // ANTHROPIC_API_KEY 자동 사용

/**
 * 익스텐션이 보낸 input 어댑터를 Claude content 블록으로 변환.
 * input.kind: "text" | "image" | "pdf"
 *  - text:  { kind, text }
 *  - image: { kind, mediaType, data(base64) }
 *  - pdf:   { kind, data(base64) }
 */
function toContentBlock(input) {
  switch (input?.kind) {
    case "text":
      return { type: "text", text: String(input.text ?? "") };
    case "image":
      return {
        type: "image",
        source: { type: "base64", media_type: input.mediaType, data: input.data },
      };
    case "pdf":
      return {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: input.data },
      };
    default:
      throw new Error(`지원하지 않는 입력 종류: ${input?.kind}`);
  }
}

/**
 * 여러 입력(텍스트/이미지/PDF)을 받아 단일 표준 trip JSON으로 정제.
 */
export async function parseToTrip(inputs) {
  const content = [
    {
      type: "text",
      text:
        "다음 자료에서 해외 골프 여행의 비용 정보를 추출해 표준 JSON으로 정제해줘. " +
        "자료는 텍스트·이미지·PDF가 섞여 있을 수 있고, 같은 여행에 대한 것이다.",
    },
    ...inputs.map(toContentBlock),
  ];

  const resp = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: TRIP_JSON_SCHEMA },
    },
    messages: [{ role: "user", content }],
  });

  // structured outputs: 최종 text 블록이 스키마에 맞는 JSON 문자열.
  const textBlock = resp.content.find((b) => b.type === "text");
  if (!textBlock) {
    throw new Error("모델이 JSON(text) 블록을 반환하지 않았습니다.");
  }
  return JSON.parse(textBlock.text);
}
