/** Clé localStorage partagée (client uniquement). */
export const DESK_API_KEYS_STORAGE_KEY = "desk-api-keys-v1";

export type DeskApiKeyField = "openai" | "anthropic" | "google";

export type DeskApiKeysState = {
  openai: string;
  anthropic: string;
  google: string;
};

export const EMPTY_DESK_API_KEYS: DeskApiKeysState = {
  openai: "",
  anthropic: "",
  google: "",
};
