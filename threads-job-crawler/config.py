"""Configuration for the Threads job lead crawler.

Edit this file for local defaults, or override selected values with
environment variables when running in another environment.
"""

from pathlib import Path
import os


BASE_DIR = Path(__file__).resolve().parent

KEYWORDS_FILE = BASE_DIR / "keywords.txt"
SEEN_POSTS_FILE = BASE_DIR / "seen_posts.json"
OUTPUT_DIR = BASE_DIR / "output"
JSON_OUTPUT_FILE = OUTPUT_DIR / "leads.json"
CSV_OUTPUT_FILE = OUTPUT_DIR / "leads.csv"

THREADS_SEARCH_URL = "https://www.threads.net/search"


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        return default


# Default is safe for daily automation. Set THREADS_HEADLESS=false for debugging.
HEADLESS = _env_bool("THREADS_HEADLESS", True)

# Maximum exported leads per run/day.
MAX_LEADS = _env_int("MAX_LEADS", 20)

# Optional n8n integration. Leave empty to only write local JSON/CSV files.
N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "").strip()
N8N_REQUEST_TIMEOUT_SECONDS = _env_float("N8N_REQUEST_TIMEOUT_SECONDS", 15.0)

# Browser/page behavior.
PAGE_TIMEOUT_MS = _env_int("PAGE_TIMEOUT_MS", 30_000)
SCROLL_COUNT = _env_int("SCROLL_COUNT", 5)
SCROLL_DELAY_SECONDS = _env_float("SCROLL_DELAY_SECONDS", 2.0)
KEYWORD_DELAY_SECONDS = _env_float("KEYWORD_DELAY_SECONDS", 2.0)
POST_EXTRACTION_LIMIT_PER_KEYWORD = _env_int("POST_EXTRACTION_LIMIT_PER_KEYWORD", 40)

# Lead scoring.
MIN_LEAD_SCORE = _env_int("MIN_LEAD_SCORE", 4)
POSITIVE_SCORE = 2
NEGATIVE_SCORE = -3

POSITIVE_KEYWORDS = [
    "butuh",
    "cari",
    "looking for",
    "need",
    "urgent",
    "rekomendasi",
    "vendor",
    "freelance",
    "event",
    "dokumentasi",
    "seminar",
    "launching",
    "company",
    "kantor",
    "corporate",
    "photographer",
    "fotografer",
    "videographer",
    "videografer",
]

NEGATIVE_KEYWORDS = [
    "portfolio",
    "hasil foto",
    "tips",
    "preset",
    "jual kamera",
    "aku photographer",
    "saya photographer",
    "open jasa",
    "promo jasa",
    "kelas fotografi",
]
