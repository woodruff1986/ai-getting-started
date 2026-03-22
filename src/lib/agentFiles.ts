import type { ChatCompletionContentPart } from "openai/resources/chat/completions";

const MAX_TEXT_CHARS = 120_000;
const VISION_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const TEXT_LIKE_EXT =
  /\.(txt|md|mdx|json|csv|ts|tsx|js|jsx|mjs|cjs|css|scss|html|htm|xml|svg|yaml|yml|toml|ini|env|sh|bash|zsh|py|rb|go|rs|java|kt|swift|c|h|cpp|hpp|cs|php|sql|r|lua|pl|dockerfile|gitignore|log)$/i;

function guessMimeFromName(name: string): string | undefined {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".txt") || lower.endsWith(".md")) return "text/plain";
  return undefined;
}

async function extractPdfText(buffer: Buffer, name: string): Promise<string> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    const raw = (data.text || "").trim();
    if (!raw) {
      return `[PDF "${name}" : aucun texte extractible.]`;
    }
    if (raw.length > MAX_TEXT_CHARS) {
      return `${raw.slice(0, MAX_TEXT_CHARS)}\n\n[... PDF tronqué : ${raw.length} caractères au total.]`;
    }
    return raw;
  } catch {
    return `[PDF "${name}" : impossible d'extraire le texte sur ce serveur.]`;
  }
}

export async function fileToContentParts(
  file: File,
): Promise<ChatCompletionContentPart[]> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name || "fichier-sans-nom";
  let mime = file.type || guessMimeFromName(name) || "application/octet-stream";

  if (VISION_TYPES.has(mime)) {
    const b64 = buffer.toString("base64");
    return [
      {
        type: "text",
        text: `Image jointe : « ${name} » (${mime}, ${buffer.length} octets)`,
      },
      {
        type: "image_url",
        image_url: {
          url: `data:${mime};base64,${b64}`,
        },
      },
    ];
  }

  if (mime === "application/pdf" || name.toLowerCase().endsWith(".pdf")) {
    const text = await extractPdfText(buffer, name);
    return [
      {
        type: "text",
        text: `### Fichier PDF « ${name} »\n\n${text}`,
      },
    ];
  }

  const looksTextLike =
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/javascript" ||
    mime === "application/xml" ||
    TEXT_LIKE_EXT.test(name);

  if (looksTextLike) {
    let text: string;
    try {
      text = buffer.toString("utf8");
    } catch {
      text = buffer.toString("latin1");
    }
    if (!text.trim()) {
      return [
        {
          type: "text",
          text: `### « ${name} » (${mime})\n\n[Fichier vide ou non lisible en texte.]`,
        },
      ];
    }
    const truncated =
      text.length > MAX_TEXT_CHARS
        ? `${text.slice(0, MAX_TEXT_CHARS)}\n\n[...tronqué : ${text.length} caractères au total.]`
        : text;
    return [
      {
        type: "text",
        text: `### Fichier « ${name} » (${mime})\n\n${truncated}`,
      },
    ];
  }

  return [
    {
      type: "text",
      text: `### « ${name} » (${mime}, ${buffer.length} octets)\n\nFichier binaire : le contenu brut n'est pas envoyé au modèle. Décris ce que tu veux en faire, ou exporte une version texte / image si besoin.`,
    },
  ];
}
