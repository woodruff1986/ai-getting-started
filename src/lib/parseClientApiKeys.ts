const MAX_LEN = 256;

export type SanitizedClientApiKeys = {
  openai?: string;
  anthropic?: string;
  google?: string;
};

function trimKey(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.slice(0, MAX_LEN);
}

/** Extrait les clés du champ FormData `apiKeys` (JSON). */
export function parseClientApiKeysField(
  raw: FormDataEntryValue | null,
): SanitizedClientApiKeys {
  if (raw == null || raw === "") return {};
  if (typeof raw !== "string") return {};
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (!o || typeof o !== "object") return {};
    return {
      openai: trimKey(o.openai),
      anthropic: trimKey(o.anthropic),
      google: trimKey(o.google),
    };
  } catch {
    return {};
  }
}
