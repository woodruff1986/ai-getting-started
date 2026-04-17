#!/usr/bin/env python3
"""Assemble rendered shots into a final MP4 via ffmpeg.

Input plan format:
{
  "scenes": [
    {"id": "scene_01", "duration_seconds": 4.0},
    ...
  ]
}

Expected files in --shots-dir:
- scene_01.mp4 (preferred)
- or scene_01_01.mp4 / scene_01_01.png fallback
"""

from __future__ import annotations

import argparse
import json
import shlex
import subprocess
import sys
from pathlib import Path


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Assemble generated shot clips into a final MP4."
    )
    parser.add_argument(
        "--plan",
        default="video-pipeline/plans/example-shots.json",
        help="Path to scene plan JSON file.",
    )
    parser.add_argument(
        "--output",
        default="video-pipeline/outputs/final/final-cut.mp4",
        help="Path for final video output.",
    )
    parser.add_argument(
        "--shots-dir",
        default="video-pipeline/outputs/shots",
        help="Directory containing rendered clips/images.",
    )
    parser.add_argument(
        "--fps",
        type=int,
        default=24,
        help="Output framerate (default: 24).",
    )
    return parser


def load_plan(path: Path) -> dict:
    if not path.exists():
        raise FileNotFoundError(f"Plan not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def _first_existing(paths: list[Path]) -> Path | None:
    for path in paths:
        if path.exists():
            return path
    return None


def _materialize_scene_clip(scene_id: str, duration: float, shots_dir: Path, staging_dir: Path, fps: int) -> Path:
    direct_clip = _first_existing(
        [
            shots_dir / f"{scene_id}.mp4",
            shots_dir / f"{scene_id}_01.mp4",
        ]
    )
    if direct_clip:
        return direct_clip

    still = _first_existing(
        [
            shots_dir / f"{scene_id}.png",
            shots_dir / f"{scene_id}_01.png",
            shots_dir / f"{scene_id}.jpg",
            shots_dir / f"{scene_id}_01.jpg",
            shots_dir / f"{scene_id}.jpeg",
            shots_dir / f"{scene_id}_01.jpeg",
        ]
    )
    if still is None:
        raise FileNotFoundError(f"No media found for {scene_id} in {shots_dir}")

    scene_clip = staging_dir / f"{scene_id}.mp4"
    command = [
        "ffmpeg",
        "-y",
        "-loop",
        "1",
        "-i",
        str(still),
        "-t",
        f"{duration:.2f}",
        "-r",
        str(fps),
        "-vf",
        "zoompan=z='min(zoom+0.0005,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1,scale=1920:1080",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        str(scene_clip),
    ]
    subprocess.run(command, check=True)
    return scene_clip


def write_concat_file(plan: dict, shots_dir: Path, concat_file: Path, fps: int) -> None:
    staging_dir = concat_file.parent / "scene-clips"
    staging_dir.mkdir(parents=True, exist_ok=True)

    lines: list[str] = []
    scenes = plan.get("scenes", [])
    if not scenes:
        raise ValueError("Plan has no scenes.")

    for scene in scenes:
        scene_id = scene["id"]
        duration = float(scene.get("duration_seconds", 4.0))
        clip = _materialize_scene_clip(scene_id, duration, shots_dir, staging_dir, fps)
        lines.append(f"file '{clip.resolve().as_posix()}'")

    concat_file.write_text("\n".join(lines) + "\n", encoding="utf-8")


def run_ffmpeg(concat_file: Path, output: Path, fps: int) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    command = [
        "ffmpeg",
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(concat_file),
        "-r",
        str(fps),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(output),
    ]
    print("Running:", shlex.join(command))
    subprocess.run(command, check=True)


def main() -> int:
    args = build_parser().parse_args()
    plan_path = Path(args.plan)
    shots_dir = Path(args.shots_dir)
    output = Path(args.output)
    concat_file = Path("video-pipeline/outputs/final/concat-list.txt")

    try:
        plan = load_plan(plan_path)
        write_concat_file(plan, shots_dir, concat_file, args.fps)
        run_ffmpeg(concat_file, output, args.fps)
    except (FileNotFoundError, ValueError, subprocess.CalledProcessError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    print(f"Final video exported to: {output.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
