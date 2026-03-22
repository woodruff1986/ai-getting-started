import type { DeskApiKeyField } from "./deskApiKeysStorage";
import type { SanitizedClientApiKeys } from "./parseClientApiKeys";

export type DeskModelProvider = "openai" | "anthropic" | "google" | "none";

export type DeskChatModel = {
  id: string;
  cursorLabel: string;
  subtitle?: string;
  provider: DeskModelProvider;
  /** Identifiant moteur côté fournisseur */
  apiModel: string;
  /** Champ clé à renseigner dans le Desk (affichage / UX) */
  keyField?: DeskApiKeyField;
  /** Modèles « référence seulement » (provider none) */
  referenceNote?: string;
};

export const DEFAULT_DESK_CHAT_MODEL_ID = "composer-2";

export const DESK_CHAT_MODELS: DeskChatModel[] = [
  {
    id: "composer-2",
    cursorLabel: "Composer 2",
    subtitle: "Défaut — OpenAI gpt-4o",
    provider: "openai",
    apiModel: "gpt-4o",
  },
  {
    id: "fast",
    cursorLabel: "Fast",
    subtitle: "OpenAI gpt-4o-mini",
    provider: "openai",
    apiModel: "gpt-4o-mini",
  },
  {
    id: "gpt-4o",
    cursorLabel: "GPT-4o",
    provider: "openai",
    apiModel: "gpt-4o",
  },
  {
    id: "gpt-4o-mini",
    cursorLabel: "GPT-4o mini",
    provider: "openai",
    apiModel: "gpt-4o-mini",
  },
  {
    id: "gpt-4-turbo",
    cursorLabel: "GPT-4 Turbo",
    provider: "openai",
    apiModel: "gpt-4-turbo",
  },
  {
    id: "gpt-3.5-turbo",
    cursorLabel: "GPT-3.5 Turbo",
    provider: "openai",
    apiModel: "gpt-3.5-turbo",
  },
  {
    id: "claude-3.5-sonnet",
    cursorLabel: "Claude 3.5 Sonnet",
    subtitle: "Clé Anthropic (navigateur ou serveur)",
    provider: "anthropic",
    apiModel: "claude-3-5-sonnet-20241022",
    keyField: "anthropic",
  },
  {
    id: "claude-3.5-haiku",
    cursorLabel: "Claude 3.5 Haiku",
    provider: "anthropic",
    apiModel: "claude-3-5-haiku-20241022",
    keyField: "anthropic",
  },
  {
    id: "claude-3-opus",
    cursorLabel: "Claude 3 Opus",
    provider: "anthropic",
    apiModel: "claude-3-opus-20240229",
    keyField: "anthropic",
  },
  {
    id: "gemini-1.5-pro",
    cursorLabel: "Gemini 1.5 Pro",
    subtitle: "Clé Google AI (navigateur ou serveur)",
    provider: "google",
    apiModel: "gemini-1.5-pro",
    keyField: "google",
  },
  {
    id: "gemini-1.5-flash",
    cursorLabel: "Gemini 1.5 Flash",
    provider: "google",
    apiModel: "gemini-1.5-flash",
    keyField: "google",
  },
  {
    id: "o1",
    cursorLabel: "o1",
    provider: "none",
    apiModel: "",
    referenceNote:
      "Famille o1 : format d’API dédié — utilise Cursor ou un flux spécifique.",
  },
  {
    id: "o1-mini",
    cursorLabel: "o1-mini",
    provider: "none",
    apiModel: "",
    referenceNote:
      "Famille o1-mini : idem, non routé dans ce Desk.",
  },
];

export function getSelectableDeskChatModels(): DeskChatModel[] {
  return DESK_CHAT_MODELS.filter((m) => m.provider !== "none");
}

export function getReferenceDeskChatModels(): DeskChatModel[] {
  return DESK_CHAT_MODELS.filter((m) => m.provider === "none");
}

export type ResolvedDeskChatModel =
  | {
      ok: true;
      provider: "openai";
      apiModel: string;
      label: string;
      apiKey: string;
    }
  | {
      ok: true;
      provider: "anthropic";
      apiModel: string;
      label: string;
      apiKey: string;
    }
  | {
      ok: true;
      provider: "google";
      apiModel: string;
      label: string;
      apiKey: string;
    };

export function resolveDeskChatModelForRequest(
  modelId: string | null | undefined,
  clientKeys: SanitizedClientApiKeys,
): ResolvedDeskChatModel | { ok: false; error: string } {
  const id =
    typeof modelId === "string" && modelId.trim()
      ? modelId.trim()
      : DEFAULT_DESK_CHAT_MODEL_ID;

  const entry = DESK_CHAT_MODELS.find((m) => m.id === id);
  if (!entry) {
    return { ok: false, error: "Modèle inconnu." };
  }
  if (entry.provider === "none") {
    return {
      ok: false,
      error:
        "Ce modèle n’est pas disponible dans le Desk (famille o1). Utilise Cursor ou un modèle listé ci-dessus.",
    };
  }

  if (entry.provider === "openai") {
    const apiKey =
      clientKeys.openai?.trim() || process.env.OPENAI_API_KEY?.trim() || "";
    if (!apiKey) {
      return {
        ok: false,
        error:
          "Clé OpenAI manquante. Ouvre « Clés API » dans le chat ou définis OPENAI_API_KEY sur le serveur.",
      };
    }
    return {
      ok: true,
      provider: "openai",
      apiModel: entry.apiModel,
      label: entry.cursorLabel,
      apiKey,
    };
  }

  if (entry.provider === "anthropic") {
    const apiKey =
      clientKeys.anthropic?.trim() ||
      process.env.ANTHROPIC_API_KEY?.trim() ||
      "";
    if (!apiKey) {
      return {
        ok: false,
        error:
          "Clé API Anthropic manquante. Clique sur « Clés API » et renseigne la clé, ou définis ANTHROPIC_API_KEY sur le serveur.",
      };
    }
    return {
      ok: true,
      provider: "anthropic",
      apiModel: entry.apiModel,
      label: entry.cursorLabel,
      apiKey,
    };
  }

  if (entry.provider === "google") {
    const apiKey =
      clientKeys.google?.trim() ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY?.trim() ||
      "";
    if (!apiKey) {
      return {
        ok: false,
        error:
          "Clé API Google AI manquante. Utilise « Clés API » ou GOOGLE_GENERATIVE_AI_API_KEY / GEMINI_API_KEY sur le serveur.",
      };
    }
    return {
      ok: true,
      provider: "google",
      apiModel: entry.apiModel,
      label: entry.cursorLabel,
      apiKey,
    };
  }

  return { ok: false, error: "Fournisseur non pris en charge." };
}

export function getDeskChatModelLabel(id: string): string {
  return (
    DESK_CHAT_MODELS.find((m) => m.id === id)?.cursorLabel ??
    DESK_CHAT_MODELS.find((m) => m.id === DEFAULT_DESK_CHAT_MODEL_ID)!
      .cursorLabel
  );
}
