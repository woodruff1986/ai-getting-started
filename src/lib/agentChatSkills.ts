const MAX_SKILLS = 12;
const MAX_NAME_LEN = 100;
const MAX_INSTR_LEN = 3000;

export function parseSkillsFormField(raw: FormDataEntryValue | null): string {
  if (raw == null || raw === "") return "";
  if (typeof raw !== "string") return "";

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return "";
  }

  if (!Array.isArray(parsed)) return "";

  const blocks: string[] = [];
  for (const item of parsed.slice(0, MAX_SKILLS)) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = String(o.name ?? "")
      .trim()
      .slice(0, MAX_NAME_LEN);
    const instruction = String(o.instruction ?? "")
      .trim()
      .slice(0, MAX_INSTR_LEN);
    if (!name || !instruction) continue;
    blocks.push(`Compétence « ${name} » :\n${instruction}`);
  }

  if (blocks.length === 0) return "";

  return (
    "\n\n## Skills utilisateur (à respecter)\n\n" +
    blocks.join("\n\n---\n\n")
  );
}
