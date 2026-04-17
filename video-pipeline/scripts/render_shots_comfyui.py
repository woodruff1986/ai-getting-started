#!/usr/bin/env python3
"""Render planned shots through a local ComfyUI instance.

This script supports a small config file that maps ComfyUI node IDs to
prompt/seed fields, so you can plug in your own workflow JSON once and keep
using this script for future projects.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
import uuid
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:  # pragma: no cover - optional dependency
    yaml = None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Render shots with ComfyUI")
    parser.add_argument("--plan", required=True, help="Path to plan JSON")
    parser.add_argument("--workflow", required=True, help="Path to ComfyUI workflow JSON")
    parser.add_argument("--config", required=True, help="Path to pipeline YAML config")
    parser.add_argument(
        "--output",
        default="video-pipeline/outputs/shots",
        help="Directory where rendered shots are written",
    )
    parser.add_argument(
        "--comfy-url",
        default="http://127.0.0.1:8188",
        help="Base URL for ComfyUI API",
    )
    parser.add_argument(
        "--wait-timeout",
        type=int,
        default=1800,
        help="Per-shot timeout in seconds",
    )
    return parser.parse_args()


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def load_yaml(path: Path) -> dict[str, Any]:
    if yaml is None:
        raise RuntimeError("PyYAML is required. Install with: pip install pyyaml")
    with path.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    if not isinstance(data, dict):
        raise ValueError("YAML config must be a mapping at top-level.")
    return data


def comfy_get(url: str) -> Any:
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def comfy_post(url: str, payload: dict[str, Any]) -> Any:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def set_node_value(workflow: dict[str, Any], node_id: str, field: str, value: Any) -> None:
    node = workflow.get(str(node_id))
    if not node:
        raise KeyError(f"Node '{node_id}' not found in workflow.")
    inputs = node.get("inputs", {})
    if field not in inputs:
        raise KeyError(f"Field '{field}' not found in node '{node_id}' inputs.")
    inputs[field] = value


def apply_prompt_mapping(
    workflow_obj: dict[str, Any], mapping: dict[str, Any], prompt: str, negative_prompt: str, seed: int
) -> dict[str, Any]:
    workflow = json.loads(json.dumps(workflow_obj))
    set_node_value(workflow, str(mapping["positive_prompt"]["node_id"]), mapping["positive_prompt"]["field"], prompt)
    set_node_value(
        workflow,
        str(mapping["negative_prompt"]["node_id"]),
        mapping["negative_prompt"]["field"],
        negative_prompt,
    )
    set_node_value(workflow, str(mapping["seed"]["node_id"]), mapping["seed"]["field"], int(seed))
    return workflow


def queue_prompt(comfy_url: str, workflow: Any) -> str:
    payload = {"prompt": workflow, "client_id": str(uuid.uuid4())}
    result = comfy_post(f"{comfy_url}/prompt", payload)
    prompt_id = result.get("prompt_id")
    if not prompt_id:
        raise RuntimeError(f"ComfyUI did not return prompt_id: {result}")
    return prompt_id


def wait_for_prompt(comfy_url: str, prompt_id: str, timeout_s: int) -> dict[str, Any]:
    start = time.time()
    while True:
        history = comfy_get(f"{comfy_url}/history/{prompt_id}")
        if prompt_id in history:
            return history[prompt_id]
        if time.time() - start > timeout_s:
            raise TimeoutError(f"Timeout waiting for prompt {prompt_id}")
        time.sleep(2)


def extract_outputs(history_item: dict[str, Any]) -> list[dict[str, str]]:
    outputs: list[dict[str, str]] = []
    nodes = history_item.get("outputs", {})
    for node_result in nodes.values():
        images = node_result.get("images", [])
        for img in images:
            # filename/subfolder/type is enough to build /view URL
            if {"filename", "subfolder", "type"} <= img.keys():
                outputs.append(
                    {
                        "filename": img["filename"],
                        "subfolder": img["subfolder"],
                        "type": img["type"],
                    }
                )
        videos = node_result.get("gifs", []) or node_result.get("videos", [])
        for vid in videos:
            if {"filename", "subfolder", "type"} <= vid.keys():
                outputs.append(
                    {
                        "filename": vid["filename"],
                        "subfolder": vid["subfolder"],
                        "type": vid["type"],
                    }
                )
    return outputs


def download_file(comfy_url: str, file_meta: dict[str, str], dest: Path) -> None:
    query = urllib.parse.urlencode(file_meta)
    url = f"{comfy_url}/view?{query}"
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = resp.read()
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)


def main() -> int:
    args = parse_args()
    plan_path = Path(args.plan)
    workflow_path = Path(args.workflow)
    output_dir = Path(args.output)
    config = load_yaml(Path(args.config))

    plan = load_json(plan_path)
    workflow_template = load_json(workflow_path)
    comfy_cfg = config.get("comfyui", {})
    render_cfg = config.get("render", {})
    mapping = comfy_cfg.get("prompt_mapping", {})
    if not {"positive_prompt", "negative_prompt", "seed"} <= mapping.keys():
        raise ValueError("config.comfyui.prompt_mapping must define positive_prompt, negative_prompt, and seed.")
    output_dir.mkdir(parents=True, exist_ok=True)

    renders_summary: dict[str, Any] = {
        "plan_file": str(plan_path),
        "workflow_file": str(workflow_path),
        "comfy_url": args.comfy_url,
        "shots": [],
    }

    for shot in plan.get("shots", []):
        shot_id = shot["id"]
        base_prompt = shot.get("positive_prompt") or shot.get("prompt")
        if not base_prompt:
            print(f"[error] shot {shot_id} has no positive prompt field", file=sys.stderr)
            renders_summary["shots"].append(
                {"id": shot_id, "status": "failed", "error": "Missing positive prompt", "seed": shot.get("seed")}
            )
            continue
        prompt_prefix = render_cfg.get("prompt_prefix", "")
        positive = f"{prompt_prefix}, {base_prompt}".strip(", ")
        negative = render_cfg.get("negative_prompt", "")
        seed = shot.get("seed") or random.randint(1, 2_147_483_647)

        print(f"[render] {shot_id} (seed={seed})")
        workflow = apply_prompt_mapping(workflow_template, mapping, positive, negative, seed)

        try:
            prompt_id = queue_prompt(args.comfy_url, workflow)
            history_item = wait_for_prompt(args.comfy_url, prompt_id, args.wait_timeout)
            outputs = extract_outputs(history_item)
        except (urllib.error.URLError, TimeoutError, RuntimeError) as exc:
            print(f"[error] shot {shot_id} failed: {exc}", file=sys.stderr)
            renders_summary["shots"].append(
                {"id": shot_id, "status": "failed", "error": str(exc), "seed": seed}
            )
            continue

        if not outputs:
            print(f"[warn] no output files found for {shot_id}")
            renders_summary["shots"].append(
                {"id": shot_id, "status": "failed", "error": "No outputs", "seed": seed}
            )
            continue

        saved_files: list[str] = []
        for idx, file_meta in enumerate(outputs, start=1):
            ext = Path(file_meta["filename"]).suffix or ".bin"
            dest = output_dir / f"{shot_id}_{idx:02d}{ext}"
            try:
                download_file(args.comfy_url, file_meta, dest)
                saved_files.append(str(dest))
            except urllib.error.URLError as exc:
                print(f"[warn] download failed for {shot_id} output {idx}: {exc}", file=sys.stderr)

        status = "ok" if saved_files else "failed"
        renders_summary["shots"].append(
            {
                "id": shot_id,
                "status": status,
                "seed": seed,
                "prompt_id": prompt_id,
                "files": saved_files,
            }
        )

    summary_path = output_dir / "render-summary.json"
    save_json(summary_path, renders_summary)
    print(f"[done] render summary -> {summary_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
