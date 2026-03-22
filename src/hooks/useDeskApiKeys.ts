"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DESK_API_KEYS_STORAGE_KEY,
  EMPTY_DESK_API_KEYS,
  type DeskApiKeysState,
} from "@/lib/deskApiKeysStorage";

function parseStored(raw: string | null): DeskApiKeysState {
  if (!raw) return { ...EMPTY_DESK_API_KEYS };
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (!o || typeof o !== "object") return { ...EMPTY_DESK_API_KEYS };
    return {
      openai: typeof o.openai === "string" ? o.openai : "",
      anthropic: typeof o.anthropic === "string" ? o.anthropic : "",
      google: typeof o.google === "string" ? o.google : "",
    };
  } catch {
    return { ...EMPTY_DESK_API_KEYS };
  }
}

export function useDeskApiKeys() {
  const [keys, setKeys] = useState<DeskApiKeysState>(EMPTY_DESK_API_KEYS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setKeys(parseStored(localStorage.getItem(DESK_API_KEYS_STORAGE_KEY)));
    } catch {
      setKeys({ ...EMPTY_DESK_API_KEYS });
    }
    setReady(true);
  }, []);

  const updateField = useCallback(
    (field: keyof DeskApiKeysState, value: string) => {
      setKeys((k) => ({ ...k, [field]: value }));
    },
    [],
  );

  const save = useCallback(() => {
    setKeys((k) => {
      try {
        localStorage.setItem(DESK_API_KEYS_STORAGE_KEY, JSON.stringify(k));
      } catch {
        /* ignore */
      }
      return k;
    });
  }, []);

  const clearAll = useCallback(() => {
    const empty = { ...EMPTY_DESK_API_KEYS };
    setKeys(empty);
    try {
      localStorage.removeItem(DESK_API_KEYS_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return {
    keys,
    ready,
    setKeys,
    updateField,
    save,
    clearAll,
  };
}
