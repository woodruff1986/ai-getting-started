"use client";

import { useCallback, useState } from "react";
import { useDeskSkills } from "@/hooks/useDeskSkills";
import { Plus, Trash2, Pencil, Download, Upload } from "lucide-react";

export default function DeskSkillsManager() {
  const { skills, ready, addSkill, updateSkill, removeSkill, setSkills } =
    useDeskSkills();
  const [name, setName] = useState("");
  const [instruction, setInstruction] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const onSubmit = useCallback(() => {
    if (editingId) {
      updateSkill(editingId, name, instruction);
      setEditingId(null);
      setName("");
      setInstruction("");
      return;
    }
    addSkill(name, instruction);
    setName("");
    setInstruction("");
  }, [addSkill, updateSkill, editingId, name, instruction]);

  const startEdit = useCallback(
    (id: string) => {
      const s = skills.find((x) => x.id === id);
      if (!s) return;
      setEditingId(id);
      setName(s.name);
      setInstruction(s.instruction);
    },
    [skills],
  );

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(skills, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "desk-skills.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }, [skills]);

  const importJson = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result));
          if (!Array.isArray(data)) return;
          const next = data
            .filter(
              (x: unknown) =>
                x &&
                typeof x === "object" &&
                typeof (x as { id?: string }).id === "string" &&
                typeof (x as { name?: string }).name === "string" &&
                typeof (x as { instruction?: string }).instruction === "string",
            )
            .map(
              (x: {
                id: string;
                name: string;
                instruction: string;
              }) => ({
                id: x.id || crypto.randomUUID(),
                name: String(x.name).slice(0, 120),
                instruction: String(x.instruction).slice(0, 4000),
              }),
            );
          if (next.length) setSkills(next);
        } catch {
          /* ignore */
        }
      };
      reader.readAsText(file);
    },
    [setSkills],
  );

  if (!ready) {
    return (
      <p className="p-6 text-sm" style={{ color: "var(--text-muted)" }}>
        Chargement…
      </p>
    );
  }

  return (
    <div className="skale-animate-in space-y-6 p-6 lg:p-8">
      <div>
        <h2
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Skills personnalisés
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Chaque skill ajoute des consignes dans le prompt système quand tu
          l’actives dans le chat. Stockage local (navigateur).
        </p>
      </div>

      <div
        className="rounded-2xl border p-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <p
          className="mb-3 text-xs font-medium uppercase tracking-wide"
          style={{ color: "var(--text-muted)" }}
        >
          {editingId ? "Modifier" : "Nouveau skill"}
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom court (ex. Stack Next.js du projet)"
          className="mb-2 w-full rounded-xl border-0 px-3 py-2 text-sm outline-none ring-1 ring-[var(--border)] focus:ring-2 focus:ring-[var(--ring)]"
          style={{
            background: "var(--background)",
            color: "var(--text-primary)",
          }}
        />
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Instructions pour l’agent (conventions, dossiers, interdits…)"
          rows={5}
          className="w-full resize-y rounded-xl border-0 px-3 py-2 text-sm outline-none ring-1 ring-[var(--border)] focus:ring-2 focus:ring-[var(--ring)]"
          style={{
            background: "var(--background)",
            color: "var(--text-primary)",
          }}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!name.trim() || !instruction.trim()}
            className="inline-flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: "var(--accent)" }}
          >
            <Plus className="h-4 w-4" />
            {editingId ? "Enregistrer" : "Ajouter"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setName("");
                setInstruction("");
              }}
              className="rounded-xl px-4 py-2 text-sm"
              style={{
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              Annuler
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={exportJson}
          className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium"
          style={{
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          <Download className="h-3.5 w-3.5" />
          Exporter JSON
        </button>
        <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
          <Upload className="h-3.5 w-3.5" />
          Importer JSON
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJson(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <ul className="space-y-3">
        {skills.length === 0 && (
          <li
            className="rounded-xl border border-dashed p-6 text-center text-sm"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-muted)",
            }}
          >
            Aucun skill — ajoute-en un pour guider l’agent sur ton stack ou tes
            règles internes.
          </li>
        )}
        {skills.map((s) => (
          <li
            key={s.id}
            className="rounded-2xl border p-4"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3
                  className="font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {s.name}
                </h3>
                <p
                  className="mt-2 whitespace-pre-wrap text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {s.instruction}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(s.id)}
                  className="rounded-lg p-2"
                  style={{ color: "var(--text-muted)" }}
                  aria-label="Modifier"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeSkill(s.id)}
                  className="rounded-lg p-2 text-rose-500"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
