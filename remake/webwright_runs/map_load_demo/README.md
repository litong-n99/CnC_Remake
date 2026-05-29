Map Load Demo (Webwright scaffold)

This folder contains a Webwright-style scaffold for demonstrating a map-load
workflow for the `remake` project. It's a template: adapt selectors and
interactions to match the real UI.

Files
-----
- `final_script.py`: Playwright scaffold script (sync API). Run directly with Python.
- `plan.md`: Human-readable plan of the script steps.
- `task.json`: Metadata for task showcase or dashboard ingestion.

Quick run (local dev server)
---------------------------
1. Start the `remake` dev server:

```bash
cd remake
npm run dev
```

2. In a separate terminal, run the scaffold script (ensure Playwright is installed):

```bash
pip install playwright
playwright install chromium
python remake/webwright_runs/map_load_demo/final_script.py --start-url http://localhost:5173 --task-id map_load_demo -o remake/webwright_runs/outputs
```

Outputs will be written under `remake/webwright_runs/outputs/map_load_demo/`.

Notes
-----
- This is a scaffold to be iterated on. Replace generic waits/selectors with the
  actual `remake` UI selectors to interact with map loading controls.
- If you prefer to run under a full Webwright install, you can integrate this
  script into a Webwright `final_script.py` generation flow or call it via
  `python -m webwright.run.cli` when Webwright is available.
