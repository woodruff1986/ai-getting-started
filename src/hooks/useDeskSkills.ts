"use client";

import { useCallback, useEffect, useState } from "react";
import type { DeskSkill } from "@/lib/deskSkillsTypes";
import { DESK_SKILLS_STORAGE_KEY } from "@/lib/deskSkillsTypes";

function isSkill(x: unknown): x is DeskSkill {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.instruction === "string"
  );
}

function normalizeSkills(raw: unknown): DeskSkill[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isSkill);
}

export function useDeskSkills() {
  const [skills, setSkillsState] = useState<DeskSkill[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DESK_SKILLS_STORAGE_KEY);
      if (raw) setSkillsState(normalizeSkills(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const setSkills = useCallback((next: DeskSkill[]) => {
    setSkillsState(next);
    try {
      localStorage.setItem(DESK_SKILLS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const addSkill = useCallback((name: string, instruction: string) => {
    const trimmedName = name.trim();
    const trimmedInstr = instruction.trim();
    if (!trimmedName || !trimmedInstr) return;
    setSkillsState((prev) => {
      const next = [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: trimmedName.slice(0, 120),
          instruction: trimmedInstr.slice(0, 4000),
        },
      ];
      try {
        localStorage.setItem(DESK_SKILLS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const updateSkill = useCallback((id: string, name: string, instruction: string) => {
    setSkillsState((prev) => {
      const next = prev.map((s) =>
        s.id === id
          ? {
              ...s,
              name: name.trim().slice(0, 120),
              instruction: instruction.trim().slice(0, 4000),
            }
          : s,
      );
      try {
        localStorage.setItem(DESK_SKILLS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const removeSkill = useCallback((id: string) => {
    setSkillsState((prev) => {
      const next = prev.filter((s) => s.id !== id);
      try {
        localStorage.setItem(DESK_SKILLS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return {
    skills,
    ready,
    setSkills,
    addSkill,
    updateSkill,
    removeSkill,
  };
}
