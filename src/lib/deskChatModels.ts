/**
 * Libellés alignés sur l’app Cursor : ce Desk route les modèles « activés »
 * vers l’API OpenAI. Les entrées désactivées servent de référence (autres moteurs).
 */

export type DeskChatModel = {
  id: string;
  /** Nom affiché comme dans Cursor */
  cursorLabel: string;
  subtitle?: string;
  /** Modèle réel côté OpenAI (chat completions) */
  apiModel: string;
  enabled: boolean;
  disabledReason?: string;
};

export const DEFAULT_DESK_CHAT_MODEL_ID = "composer-2";

export const DESK_CHAT_MODELS: DeskChatModel[] = [
  {
    id: "composer-2",
    cursorLabel: "Composer 2",
    subtitle: "Modèle par défaut du Desk — usage type Composer dans Cursor",
    apiModel: "gpt-4o",
    enabled: true,
  },
  {
    id: "fast",
    cursorLabel: "Fast",
    subtitle: "Réponses rapides, coût réduit",
    apiModel: "gpt-4o-mini",
    enabled: true,
  },
  {
    id: "gpt-4o",
    cursorLabel: "GPT-4o",
    apiModel: "gpt-4o",
    enabled: true,
  },
  {
    id: "gpt-4o-mini",
    cursorLabel: "GPT-4o mini",
    apiModel: "gpt-4o-mini",
    enabled: true,
  },
  {
    id: "gpt-4-turbo",
    cursorLabel: "GPT-4 Turbo",
    apiModel: "gpt-4-turbo",
    enabled: true,
  },
  {
    id: "gpt-3.5-turbo",
    cursorLabel: "GPT-3.5 Turbo",
    apiModel: "gpt-3.5-turbo",
    enabled: true,
  },
  {
    id: "claude-3.5-sonnet",
    cursorLabel: "Claude 3.5 Sonnet",
    apiModel: "",
    enabled: false,
    disabledReason: "Réservé à Cursor IDE ou à une clé Anthropic (non branchée ici).",
  },
  {
    id: "claude-3.5-haiku",
    cursorLabel: "Claude 3.5 Haiku",
    apiModel: "",
    enabled: false,
    disabledReason: "Réservé à Cursor IDE ou à une clé Anthropic (non branchée ici).",
  },
  {
    id: "claude-3-opus",
    cursorLabel: "Claude 3 Opus",
    apiModel: "",
    enabled: false,
    disabledReason: "Réservé à Cursor IDE ou à une clé Anthropic (non branchée ici).",
  },
  {
    id: "gemini-1.5-pro",
    cursorLabel: "Gemini 1.5 Pro",
    apiModel: "",
    enabled: false,
    disabledReason: "Réservé à Cursor IDE ou à l’API Google (non branchée ici).",
  },
  {
    id: "gemini-1.5-flash",
    cursorLabel: "Gemini 1.5 Flash",
    apiModel: "",
    enabled: false,
    disabledReason: "Réservé à Cursor IDE ou à l’API Google (non branchée ici).",
  },
  {
    id: "o1",
    cursorLabel: "o1",
    apiModel: "",
    enabled: false,
    disabledReason:
      "Famille o1 : format d’API différent (raisonnement) — utilise Cursor ou un flux dédié.",
  },
  {
    id: "o1-mini",
    cursorLabel: "o1-mini",
    apiModel: "",
    enabled: false,
    disabledReason:
      "Famille o1 : format d’API différent — utilise Cursor ou un flux dédié.",
  },
];

export function getEnabledDeskChatModels(): DeskChatModel[] {
  return DESK_CHAT_MODELS.filter((m) => m.enabled);
}

export function getReferenceDeskChatModels(): DeskChatModel[] {
  return DESK_CHAT_MODELS.filter((m) => !m.enabled);
}

export function resolveDeskChatModelForApi(
  modelId: string | null | undefined,
): { ok: true; apiModel: string; label: string } | { ok: false; error: string } {
  const id =
    typeof modelId === "string" && modelId.trim()
      ? modelId.trim()
      : DEFAULT_DESK_CHAT_MODEL_ID;

  const entry = DESK_CHAT_MODELS.find((m) => m.id === id);
  if (!entry) {
    return { ok: false, error: "Modèle inconnu." };
  }
  if (!entry.enabled || !entry.apiModel) {
    return {
      ok: false,
      error:
        "Ce modèle n’est pas disponible via l’API OpenAI du Desk — choisis un modèle activé ou utilise Cursor.",
    };
  }
  return { ok: true, apiModel: entry.apiModel, label: entry.cursorLabel };
}

export function getDeskChatModelLabel(id: string): string {
  return (
    DESK_CHAT_MODELS.find((m) => m.id === id)?.cursorLabel ??
    DESK_CHAT_MODELS.find((m) => m.id === DEFAULT_DESK_CHAT_MODEL_ID)!
      .cursorLabel
  );
}
