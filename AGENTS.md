# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

This is a Python Playwright-based Threads job lead crawler (`threads-job-crawler/`). It scrapes public Threads search pages for photographer/videographer leads focused on the Jabodetabek (Jakarta metro) area. See `threads-job-crawler/README.md` for full documentation (in Indonesian).

### Running the crawler

```bash
cd threads-job-crawler
source .venv/bin/activate
python crawler.py
```

Override config via env vars (see `config.py` for full list). Quick demo with relaxed filters:

```bash
SCROLL_COUNT=1 MAX_LEADS=3 REQUIRE_LOCATION_MATCH=false REQUIRE_RECENT_POSTS=false MIN_LEAD_SCORE=1 python crawler.py
```

### Important caveats

- **Threads access restriction**: Threads.net frequently limits public search access from headless browsers and cloud/datacenter IPs. Getting 0 leads with "Threads may be limiting public access" warnings is expected in CI/cloud environments. This is not a bug — the crawler handles it gracefully. To debug, use `THREADS_HEADLESS=false python crawler.py` in a headed desktop session.
- **No automated test suite**: The codebase has no test framework or test files. Validate changes by running the crawler and testing key functions manually (see `crawler.py` for the dataclass/function signatures).
- **No linter configured**: No `pyproject.toml`, `setup.cfg`, or linter config exists. Use `python -m py_compile config.py crawler.py` for basic syntax validation.
- **Virtualenv location**: The virtualenv is at `threads-job-crawler/.venv`. Always activate it before running the crawler.
- **Playwright Chromium**: Must be installed separately after pip install via `playwright install chromium`. The update script handles this.
- **n8n webhook is optional**: The crawler works without `N8N_WEBHOOK_URL` set — it writes local JSON/CSV to `threads-job-crawler/output/`.
