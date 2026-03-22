import type { ChatCompletionContentPart } from "openai/resources/chat/completions";

/** Pour Anthropic / Gemini : aplatit le message utilisateur en texte. */
export function flattenUserContentParts(
  parts: ChatCompletionContentPart[],
): { text: string; hadNonText: boolean } {
  const lines: string[] = [];
  let hadNonText = false;
  for (const p of parts) {
    if (p.type === "text") {
      lines.push(p.text);
    } else {
      hadNonText = true;
      lines.push("[Bloc non texte — non pris en charge pour ce fournisseur]");
    }
  }
  return { text: lines.join("\n\n").trim(), hadNonText };
}
