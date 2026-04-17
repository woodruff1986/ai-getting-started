#!/usr/bin/env python3
"""Build a shot plan JSON from a dialogue continuity markdown file.

Expected input format:

## SCENE: Scene title
LOCATION: optional location text
TIME: optional time text
SHOT: short visual direction
ACTION: scene action
CHARACTERS: Rose, Marie-Antoinette
DIALOGUE:
- ROSE: line here
- GARDE: line here

The output includes both `scenes` and normalized `shots` so the plan can be
consumed directly by render and assembly scripts.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


SCENE_HEADER_RE = re.compile(r"^##\s*SCENE\s*:\s*(.+)$", re.IGNORECASE)
FIELD_RE = re.compile(r"^(LOCATION|TIME|SHOT|ACTION|CHARACTERS)\s*:\s*(.*)$", re.IGNORECASE)
DIALOGUE_LINE_RE = re.compile(r"^-\s*([A-Z0-9 .'\-()]+)\s*:\s*(.+)$")


def build_prompt(scene: dict) -> str:
    fragments = [
        f"Scene: {scene['title']}",
        f"Location: {scene['location']}" if scene["location"] else "",
        f"Time: {scene['time']}" if scene["time"] else "",
        f"Shot direction: {scene['shot']}" if scene["shot"] else "",
        f"Action: {scene['action']}" if scene["action"] else "",
    ]
    if scene["characters"]:
        fragments.append("Characters: " + ", ".join(scene["characters"]))
    if scene["dialogue"]:
        dialogue = " ".join(f"{d['speaker']}: {d['line']}" for d in scene["dialogue"][:3])
        fragments.append(f"Dialogue beat: {dialogue}")
    return ", ".join(part for part in fragments if part)


def parse_dialogue_file(path: Path, default_duration: float, fps: int) -> dict:
    scenes: list[dict] = []
    current: dict | None = None
    in_dialogue = False

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line:
            continue

        scene_match = SCENE_HEADER_RE.match(line)
        if scene_match:
            if current:
                scenes.append(current)
            current = {
                "title": scene_match.group(1).strip(),
                "location": "",
                "time": "",
                "shot": "",
                "action": "",
                "characters": [],
                "dialogue": [],
                "duration_seconds": default_duration,
            }
            in_dialogue = False
            continue

        if current is None:
            continue

        if line.upper() == "DIALOGUE:":
            in_dialogue = True
            continue

        if in_dialogue:
            dmatch = DIALOGUE_LINE_RE.match(line)
            if dmatch:
                current["dialogue"].append({"speaker": dmatch.group(1).strip(), "line": dmatch.group(2).strip()})
            continue

        fmatch = FIELD_RE.match(line)
        if fmatch:
            key = fmatch.group(1).lower()
            value = fmatch.group(2).strip()
            if key == "characters":
                current[key] = [item.strip() for item in value.split(",") if item.strip()]
            else:
                current[key] = value

    if current:
        scenes.append(current)

    if not scenes:
        raise ValueError("No scene detected. Add at least one '## SCENE: ...' block.")

    shots: list[dict] = []
    for idx, scene in enumerate(scenes, start=1):
        scene["id"] = f"scene_{idx:02d}"
        scene["index"] = idx
        shots.append(
            {
                "id": scene["id"],
                "index": idx,
                "duration_seconds": scene["duration_seconds"],
                "duration_frames": int(round(scene["duration_seconds"] * fps)),
                "positive_prompt": build_prompt(scene),
                "negative_prompt": "blurry, deformed face, extra limbs, low quality, text artifacts",
                "seed": 1000 + idx,
            }
        )

    return {
        "version": 1,
        "source": str(path),
        "fps": fps,
        "scenes": scenes,
        "shots": shots,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Create shot plan JSON from dialogue markdown.")
    parser.add_argument("--dialogue", required=True, type=Path, help="Path to dialogue markdown.")
    parser.add_argument("--out", required=True, type=Path, help="Path to output plan JSON.")
    parser.add_argument("--fps", type=int, default=24, help="Target fps for shot frame durations.")
    parser.add_argument(
        "--default-duration",
        type=float,
        default=4.0,
        help="Default duration per scene in seconds when not specified.",
    )
    args = parser.parse_args()

    plan = parse_dialogue_file(args.dialogue, args.default_duration, args.fps)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(plan, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Created shot plan: {args.out}")
    print(f"Scenes: {len(plan['scenes'])}")


if __name__ == "__main__":
    main()
