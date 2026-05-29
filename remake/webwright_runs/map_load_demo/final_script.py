"""
final_script.py

Example Webwright-style final script for a "map load demo" task.
This is a simple, re-runnable Playwright script scaffold that:
 - navigates to `--start-url` (default http://localhost:5173)
 - waits for a map container or canvas to appear
 - takes screenshots at key points and writes them to output directory
 - writes a small `trajectory.json` summarizing steps

Usage:
  python final_script.py --start-url http://localhost:5173 --task-id map_load_demo -o outputs

Note: This scaffold is intentionally generic — adapt selectors and interactions
to match the actual `remake/` UI.
"""

import argparse
import json
import os
from datetime import datetime
from pathlib import Path
from playwright.sync_api import sync_playwright


def ensure_dir(p: Path):
    p.mkdir(parents=True, exist_ok=True)


def now_iso():
    return datetime.utcnow().isoformat() + 'Z'


def run(start_url: str, task_id: str, output_dir: str, map_path: str | None):
    out = Path(output_dir) / task_id
    ensure_dir(out)
    screenshots = out / "screenshots"
    ensure_dir(screenshots)

    trajectory = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Step 1: Open page
        trajectory.append({"step": 1, "action": "goto", "url": start_url, "time": now_iso()})
        page.goto(start_url, timeout=60000)
        page.wait_for_timeout(500)  # small pause for page JS to run
        s1 = screenshots / "01_loaded.png"
        page.screenshot(path=str(s1), full_page=True)

        # Step 2: Wait for map canvas or container
        trajectory.append({"step": 2, "action": "wait_for_selector", "selector": "#map-canvas, .map-canvas, #terrain, canvas", "time": now_iso()})
        try:
            el = page.wait_for_selector("#map-canvas, .map-canvas, #terrain, canvas", timeout=5000)
            # highlight / screenshot
            s2 = screenshots / "02_map_present.png"
            page.screenshot(path=str(s2), full_page=False)
            trajectory.append({"step": 2.1, "result": "map_present", "time": now_iso()})
        except Exception:
            trajectory.append({"step": 2.1, "result": "map_not_found", "time": now_iso()})

        # Step 3: If a map loader input exists, try to set the map path (best-effort)
        if map_path:
            trajectory.append({"step": 3, "action": "set_map_path", "map_path": map_path, "time": now_iso()})
            try:
                # best-effort: find a file input or a map path input
                file_input = page.query_selector("input[type=\"file\"], input[name*=map], input[id*=map]")
                if file_input:
                    # cannot actually upload in generic scaffold without a real local server mapping
                    trajectory.append({"step": 3.1, "result": "found_file_input_but_skipped_in_scaffold", "time": now_iso()})
                else:
                    trajectory.append({"step": 3.1, "result": "no_file_input_found", "time": now_iso()})
            except Exception as e:
                trajectory.append({"step": 3.9, "error": str(e), "time": now_iso()})

        # Step 4: Final screenshot and cleanup
        s3 = screenshots / "03_final.png"
        page.screenshot(path=str(s3), full_page=True)
        trajectory.append({"step": 4, "action": "screenshot_final", "path": str(s3), "time": now_iso()})

        context.close()
        browser.close()

    # Write trajectory.json
    traj_path = out / "trajectory.json"
    with traj_path.open("w", encoding="utf-8") as fh:
        json.dump({"task_id": task_id, "start_url": start_url, "steps": trajectory}, fh, indent=2)

    print(f"Run complete. Outputs written to: {out}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Webwright-style final_script scaffold for map load demo")
    parser.add_argument("--start-url", default="http://localhost:5173", help="Start URL (default: vite dev server)")
    parser.add_argument("--task-id", default="map_load_demo", help="Task id / output subfolder")
    parser.add_argument("-o", "--output-dir", default="remake/webwright_runs/outputs", help="Output base dir")
    parser.add_argument("--map-path", default=None, help="Optional local map file path to load (best-effort)")
    args = parser.parse_args()

    run(args.start_url, args.task_id, args.output_dir, args.map_path)
