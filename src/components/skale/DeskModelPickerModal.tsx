"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import clsx from "clsx";
import {
  DEFAULT_DESK_CHAT_MODEL_ID,
  getEnabledDeskChatModels,
  getReferenceDeskChatModels,
  type DeskChatModel,
} from "@/lib/deskChatModels";
import { Sparkles, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  value: string;
  onSelect: (id: string) => void;
  embedded?: boolean;
};

export default function DeskModelPickerModal({
  open,
  onClose,
  value,
  onSelect,
  embedded = false,
}: Props) {
  const enabled = getEnabledDeskChatModels();
  const reference = getReferenceDeskChatModels();

  const pick = (m: DeskChatModel) => {
    if (!m.enabled) return;
    onSelect(m.id);
    onClose();
  };

  const cardBase = (active: boolean, clickable: boolean) =>
    clsx(
      "w-full rounded-xl border p-4 text-left transition",
      embedded
        ? active
          ? "border-[var(--accent)] bg-[var(--accent-muted)]"
          : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]"
        : active
          ? "border-sky-500/50 bg-sky-500/10"
          : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]",
      clickable ? "cursor-pointer" : "cursor-not-allowed opacity-55",
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
                      Noms comme dans Cursor. Ce Desk envoie les modèles
                      activés vers <strong>OpenAI</strong> ; les autres restent
                      pour référence (IDE Cursor ou autres APIs).
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

                <div className="max-h-[min(70vh,520px)] overflow-y-auto px-5 py-4">
                  <p
                    className={clsx(
                      "mb-3 text-xs font-semibold uppercase tracking-wide",
                      embedded
                        ? "text-[color:var(--text-muted)]"
                        : "text-slate-500",
                    )}
                  >
                    Disponibles (API OpenAI)
                  </p>
                  <ul className="space-y-2">
                    {enabled.map((m) => {
                      const active = m.id === value;
                      const isDefault = m.id === DEFAULT_DESK_CHAT_MODEL_ID;
                      return (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => pick(m)}
                            className={cardBase(active, true)}
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
                                embedded
                                  ? "text-[color:var(--text-muted)]"
                                  : "text-slate-600",
                              )}
                            >
                              API : {m.apiModel}
                            </p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <p
                    className={clsx(
                      "mb-3 mt-8 text-xs font-semibold uppercase tracking-wide",
                      embedded
                        ? "text-[color:var(--text-muted)]"
                        : "text-slate-500",
                    )}
                  >
                    Référence — comme dans Cursor (non routés ici)
                  </p>
                  <ul className="space-y-2">
                    {reference.map((m) => (
                      <li key={m.id}>
                        <div className={cardBase(false, false)} role="note">
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
                            {m.disabledReason}
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
