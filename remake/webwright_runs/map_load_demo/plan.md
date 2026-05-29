Plan: Map Load Demo (Webwright-style)

Goal
----
Create a reproducible script that navigates to the `remake` dev UI, verifies the map canvas is present,
captures screenshots, and writes a small `trajectory.json` describing the steps. This serves as an
example Webwright 'final_script' for the repository and a template for further automation.

Steps
-----
1. Open browser and navigate to `--start-url` (default `http://localhost:5173`).
2. Wait for an element that indicates the map/render canvas is ready (selectors: `#map-canvas`, `.map-canvas`, `#terrain`, `canvas`).
3. Capture screenshots at key points: after load, after map presence is detected, final full-page.
4. Attempt best-effort map path injection if a `--map-path` is provided (generic handling; UI specific code may be needed).
5. Write `trajectory.json` summarizing the executed steps and output file paths.

Notes
-----
- This scaffold is intentionally generic. To make it fully functional, adapt selectors and interactions to match the actual UI elements of `remake/` (e.g. the "Load Map" button, map file input, or remote map API).
- To run locally, start the dev server in `remake/` first: `cd remake && npm run dev`.

Run Example
-----------
```bash
# from repository root
python remake/webwright_runs/map_load_demo/final_script.py --start-url http://localhost:5173 --task-id map_load_demo -o remake/webwright_runs/outputs
```

Output
------
- `remake/webwright_runs/outputs/map_load_demo/trajectory.json`
- `remake/webwright_runs/outputs/map_load_demo/screenshots/01_loaded.png`, `02_map_present.png`, `03_final.png`

Next steps
----------
- Replace generic selectors with `remake` UI-specific selectors and interactions.
- Optionally wrap this into a Webwright `run` invocation or generate `final_script.py` via a Webwright `craft` flow.
