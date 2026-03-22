"use client";

import { Fragment, useEffect, useId, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import clsx from "clsx";
import type { DeskApiKeyField, DeskApiKeysState } from "@/lib/deskApiKeysStorage";
import { KeyRound, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  embedded?: boolean;
  initialFocus?: DeskApiKeyField | null;
  keys: DeskApiKeysState;
  onFieldChange: (field: keyof DeskApiKeysState, value: string) => void;
  onSave: () => void;
  onClear: () => void;
};

export default function DeskApiKeysModal({
  open,
  onClose,
  embedded = false,
  initialFocus,
  keys,
  onFieldChange,
  onSave,
  onClear,
}: Props) {
  const openaiRef = useRef<HTMLInputElement>(null);
  const anthropicRef = useRef<HTMLInputElement>(null);
  const googleRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      if (initialFocus === "anthropic") anthropicRef.current?.focus();
      else if (initialFocus === "google") googleRef.current?.focus();
      else if (initialFocus === "openai") openaiRef.current?.focus();
      else openaiRef.current?.focus();
    }, 80);
    return () => window.clearTimeout(t);
  }, [open, initialFocus]);

  const fieldClass = clsx(
    "mt-1 w-full rounded-xl border-0 px-3 py-2.5 font-mono text-sm outline-none ring-1 focus:ring-2",
    embedded
      ? "bg-[var(--background)] text-[color:var(--text-primary)] ring-[var(--border)] focus:ring-[var(--ring)]"
      : "bg-black/40 text-white ring-white/15 focus:ring-sky-500",
  );

  const labelClass = embedded
    ? "text-xs font-medium text-[color:var(--text-secondary)]"
    : "text-xs font-medium text-slate-400";

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[110]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 z-[110] overflow-y-auto p-4 sm:p-6">
          <div className="flex min-h-full items-center justify-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={clsx(
                  "w-full max-w-md rounded-2xl border shadow-2xl",
                  embedded
                    ? "border-[var(--border)] bg-[var(--surface)]"
                    : "border-white/10 bg-slate-900",
                )}
              >
                <div
                  className={clsx(
                    "flex items-start justify-between gap-3 border-b px-5 py-4",
                    embedded ? "border-[var(--border)]" : "border-white/10",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <KeyRound
                      className={clsx(
                        "mt-0.5 h-5 w-5 shrink-0",
                        embedded ? "text-[var(--accent)]" : "text-sky-400",
                      )}
                    />
                    <div>
                      <Dialog.Title
                        id={titleId}
                        className={clsx(
                          "text-lg font-semibold",
                          embedded
                            ? "text-[color:var(--text-primary)]"
                            : "text-white",
                        )}
                      >
                        Clés API
                      </Dialog.Title>
                      <p
                        className={clsx(
                          "mt-1 text-sm",
                          embedded
                            ? "text-[color:var(--text-secondary)]"
                            : "text-slate-400",
                        )}
                      >
                        Stockées <strong>uniquement dans ton navigateur</strong>{" "}
                        (localStorage). Elles sont envoyées au serveur uniquement
                        pour les requêtes de chat, jamais enregistrées côté serveur.
                        Tu peux aussi définir les mêmes valeurs en variables
                        d’environnement sur le serveur.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className={clsx(
                      "rounded-lg p-1.5",
                      embedded
                        ? "text-[color:var(--text-muted)] hover:bg-[var(--surface-hover)]"
                        : "text-slate-400 hover:bg-white/10",
                    )}
                    aria-label="Fermer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4 px-5 py-4">
                  <div>
                    <label htmlFor="desk-key-openai" className={labelClass}>
                      OpenAI (optionnel)
                    </label>
                    <p
                      className={clsx(
                        "mb-1 text-[11px]",
                        embedded
                          ? "text-[color:var(--text-muted)]"
                          : "text-slate-500",
                      )}
                    >
                      Surcharge la clé serveur <code>OPENAI_API_KEY</code> pour
                      ce navigateur.
                    </p>
                    <input
                      ref={openaiRef}
                      id="desk-key-openai"
                      type="password"
                      autoComplete="off"
                      value={keys.openai}
                      onChange={(e) => onFieldChange("openai", e.target.value)}
                      placeholder="sk-…"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="desk-key-anthropic" className={labelClass}>
                      Anthropic (Claude)
                    </label>
                    <p
                      className={clsx(
                        "mb-1 text-[11px]",
                        embedded
                          ? "text-[color:var(--text-muted)]"
                          : "text-slate-500",
                      )}
                    >
                      Ou variable serveur <code>ANTHROPIC_API_KEY</code>.
                    </p>
                    <input
                      ref={anthropicRef}
                      id="desk-key-anthropic"
                      type="password"
                      autoComplete="off"
                      value={keys.anthropic}
                      onChange={(e) =>
                        onFieldChange("anthropic", e.target.value)
                      }
                      placeholder="sk-ant-…"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="desk-key-google" className={labelClass}>
                      Google AI (Gemini)
                    </label>
                    <p
                      className={clsx(
                        "mb-1 text-[11px]",
                        embedded
                          ? "text-[color:var(--text-muted)]"
                          : "text-slate-500",
                      )}
                    >
                      Ou <code>GOOGLE_GENERATIVE_AI_API_KEY</code> /{" "}
                      <code>GEMINI_API_KEY</code> sur le serveur.
                    </p>
                    <input
                      ref={googleRef}
                      id="desk-key-google"
                      type="password"
                      autoComplete="off"
                      value={keys.google}
                      onChange={(e) => onFieldChange("google", e.target.value)}
                      placeholder="AIza…"
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div
                  className={clsx(
                    "flex flex-col gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end",
                    embedded ? "border-[var(--border)]" : "border-white/10",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onClear();
                      onClose();
                    }}
                    className={clsx(
                      "order-3 rounded-xl px-4 py-2.5 text-sm font-medium sm:order-1",
                      embedded
                        ? "text-[color:var(--text-muted)] hover:bg-[var(--surface-hover)]"
                        : "text-slate-400 hover:bg-white/10",
                    )}
                  >
                    Effacer tout
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className={clsx(
                      "order-2 rounded-xl border px-4 py-2.5 text-sm font-medium",
                      embedded
                        ? "border-[var(--border)] text-[color:var(--text-primary)]"
                        : "border-white/15 text-white",
                    )}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSave();
                      onClose();
                    }}
                    className={clsx(
                      "order-1 rounded-xl px-5 py-2.5 text-sm font-semibold text-white sm:order-3",
                      embedded
                        ? "bg-[var(--accent)] hover:bg-[var(--accent-hover)]"
                        : "bg-sky-600 hover:bg-sky-500",
                    )}
                  >
                    Enregistrer
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
