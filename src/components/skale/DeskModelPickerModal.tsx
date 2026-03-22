"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import clsx from "clsx";
import {
  DEFAULT_DESK_CHAT_MODEL_ID,
  getReferenceDeskChatModels,
  getSelectableDeskChatModels,
  type DeskChatModel,
} from "@/lib/deskChatModels";
import type { DeskApiKeyField, DeskApiKeysState } from "@/lib/deskApiKeysStorage";
import { Sparkles, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  value: string;
  onSelect: (id: string) => void;
  embedded?: boolean;
  apiKeys: DeskApiKeysState;
  onRequestKeys: (field: DeskApiKeyField) => void;
};

function byProvider(models: DeskChatModel[], p: DeskChatModel["provider"]) {
  return models.filter((m) => m.provider === p);
}

export default function DeskModelPickerModal({
  open,
  onClose,
  value,
  onSelect,
  embedded = false,
  apiKeys,
  onRequestKeys,
}: Props) {
  const selectable = getSelectableDeskChatModels();
  const openaiList = byProvider(selectable, "openai");
  const anthropicList = byProvider(selectable, "anthropic");
  const googleList = byProvider(selectable, "google");
  const reference = getReferenceDeskChatModels();

  const pick = (m: DeskChatModel) => {
    onSelect(m.id);
    onClose();
  };

  const cardBase = (active: boolean) =>
    clsx(
      "w-full rounded-xl border p-4 text-left transition",
      embedded
        ? active
          ? "border-[var(--accent)] bg-[var(--accent-muted)]"
          : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]"
        : active
          ? "border-sky-500/50 bg-sky-500/10"
          : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]",
    );

  const needsBrowserKey = (m: DeskChatModel): DeskApiKeyField | null => {
    if (m.provider === "anthropic" && !apiKeys.anthropic.trim()) {
      return "anthropic";
    }
    if (m.provider === "google" && !apiKeys.google.trim()) {
      return "google";
    }
    return null;
  };

  const renderModelCard = (m: DeskChatModel) => {
    const active = m.id === value;
    const isDefault = m.id === DEFAULT_DESK_CHAT_MODEL_ID;
    const keyGap = needsBrowserKey(m);

    return (
      <li key={m.id} className="space-y-2">
        <button
          type="button"
          onClick={() => pick(m)}
          className={cardBase(active)}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={clsx(
                "font-medium",
                embedded
                  ? "text-[color:var(--text-primary)]"
                  : "text-white",
              )}
            >
              {m.cursorLabel}
            </span>
            {isDefault && (
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                  embedded
                    ? "bg-[var(--accent-muted)] text-[var(--accent)]"
                    : "bg-sky-500/20 text-sky-300",
                )}
              >
                Défaut
              </span>
            )}
          </div>
          {m.subtitle && (
            <p
              className={clsx(
                "mt-1 text-xs",
                embedded
                  ? "text-[color:var(--text-muted)]"
                  : "text-slate-500",
              )}
            >
              {m.subtitle}
            </p>
          )}
          <p
            className={clsx(
              "mt-2 font-mono text-[10px]",
              embedded ? "text-[color:var(--text-muted)]" : "text-slate-600",
            )}
          >
            {m.provider === "openai" && `OpenAI · ${m.apiModel}`}
            {m.provider === "anthropic" && `Anthropic · ${m.apiModel}`}
            {m.provider === "google" && `Google AI · ${m.apiModel}`}
          </p>
        </button>
        {keyGap && (
          <button
            type="button"
            onClick={() => onRequestKeys(keyGap)}
            className={clsx(
              "w-full rounded-lg px-3 py-2 text-left text-xs font-medium",
              embedded
                ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/15"
                : "bg-amber-500/15 text-amber-200 hover:bg-amber-500/25",
            )}
          >
            Aucune clé {keyGap === "anthropic" ? "Anthropic" : "Google AI"}{" "}
            dans le navigateur — ouvrir « Clés API » (le serveur peut aussi
            fournir la clé).
          </button>
        )}
      </li>
    );
  };

  const sectionTitle = (t: string) => (
    <p
      className={clsx(
        "mb-3 text-xs font-semibold uppercase tracking-wide",
        embedded ? "text-[color:var(--text-muted)]" : "text-slate-500",
      )}
    >
      {t}
    </p>
  );

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={onClose}>
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

        <div className="fixed inset-0 z-[100] overflow-y-auto p-4 sm:p-6">
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
                  "w-full max-w-lg rounded-2xl border shadow-2xl",
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
                  <div>
                    <Dialog.Title
                      className={clsx(
                        "flex items-center gap-2 text-lg font-semibold",
                        embedded
                          ? "text-[color:var(--text-primary)]"
                          : "text-white",
                      )}
                    >
                      <Sparkles
                        className={clsx(
                          "h-5 w-5",
                          embedded ? "text-[var(--accent)]" : "text-sky-400",
                        )}
                      />
                      Modèle du chat
                    </Dialog.Title>
                    <p
                      className={clsx(
                        "mt-1 text-sm",
                        embedded
                          ? "text-[color:var(--text-secondary)]"
                          : "text-slate-400",
                      )}
                    >
                      OpenAI, Claude et Gemini selon les clés (navigateur ou
                      variables d’environnement serveur). Les pièces jointes
                      (fichiers / images) ne sont prises en charge qu’avec les
                      modèles OpenAI.
                    </p>
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

                <div className="max-h-[min(70vh,560px)] overflow-y-auto px-5 py-4">
                  {sectionTitle("OpenAI")}
                  <ul className="mb-6 space-y-2">
                    {openaiList.map((m) => renderModelCard(m))}
                  </ul>

                  {sectionTitle("Claude · Anthropic")}
                  <ul className="mb-6 space-y-2">
                    {anthropicList.map((m) => renderModelCard(m))}
                  </ul>

                  {sectionTitle("Gemini · Google AI")}
                  <ul className="mb-6 space-y-2">
                    {googleList.map((m) => renderModelCard(m))}
                  </ul>

                  {sectionTitle("Non disponibles dans ce Desk")}
                  <ul className="space-y-2">
                    {reference.map((m) => (
                      <li key={m.id}>
                        <div
                          className={clsx(
                            "rounded-xl border p-4",
                            embedded
                              ? "border-[var(--border)] bg-[var(--surface)]"
                              : "border-white/10 bg-white/[0.04]",
                          )}
                          role="note"
                        >
                          <span
                            className={clsx(
                              "font-medium",
                              embedded
                                ? "text-[color:var(--text-secondary)]"
                                : "text-slate-300",
                            )}
                          >
                            {m.cursorLabel}
                          </span>
                          <p
                            className={clsx(
                              "mt-1 text-xs",
                              embedded
                                ? "text-[color:var(--text-muted)]"
                                : "text-slate-500",
                            )}
                          >
                            {m.referenceNote}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  className={clsx(
                    "border-t px-5 py-3",
                    embedded ? "border-[var(--border)]" : "border-white/10",
                  )}
                >
                  <button
                    type="button"
                    onClick={onClose}
                    className={clsx(
                      "w-full rounded-xl py-2.5 text-sm font-medium",
                      embedded
                        ? "bg-[var(--surface-light)] text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)]"
                        : "bg-white/10 text-white hover:bg-white/15",
                    )}
                  >
                    Fermer
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
