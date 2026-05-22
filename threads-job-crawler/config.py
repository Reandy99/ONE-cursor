"""Configuration for the Threads job lead crawler.

Edit this file for local defaults, or override selected values with
environment variables when running in another environment.
"""

from pathlib import Path
import os


BASE_DIR = Path(__file__).resolve().parent
LOCAL_TIMEZONE = os.getenv("LOCAL_TIMEZONE", "Asia/Jakarta")

KEYWORDS_FILE = BASE_DIR / "keywords.txt"
SEEN_POSTS_FILE = BASE_DIR / "seen_posts.json"
OUTPUT_DIR = BASE_DIR / "output"
JSON_OUTPUT_FILE = OUTPUT_DIR / "leads.json"
CSV_OUTPUT_FILE = OUTPUT_DIR / "leads.csv"

THREADS_SEARCH_URL = "https://www.threads.net/search"
THREADS_API_KEYWORD_SEARCH_URL = "https://graph.threads.net/v1.0/keyword_search"


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

# Optional official Threads API integration. If THREADS_ACCESS_TOKEN is present,
# the crawler can request RECENT results with since/until filters.
THREADS_ACCESS_TOKEN = os.getenv("THREADS_ACCESS_TOKEN", "").strip()
THREADS_API_TIMEOUT_SECONDS = _env_float("THREADS_API_TIMEOUT_SECONDS", 20.0)
THREADS_API_LIMIT = _env_int("THREADS_API_LIMIT", 100)
THREADS_API_SEARCH_TYPE = os.getenv("THREADS_API_SEARCH_TYPE", "RECENT").strip().upper()

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
LOCATION_SCORE = _env_int("LOCATION_SCORE", 3)
REQUIRE_LOCATION_MATCH = _env_bool("REQUIRE_LOCATION_MATCH", True)
REQUIRE_RECENT_POSTS = _env_bool("REQUIRE_RECENT_POSTS", True)
MAX_POST_AGE_HOURS = _env_float("MAX_POST_AGE_HOURS", 5.0)

# Keep this false for strict "last few hours" filtering. Set true only if you
# want to accept date-only posts from today's date even when Threads hides time.
ACCEPT_DATE_ONLY_CURRENT_DAY = _env_bool("ACCEPT_DATE_ONLY_CURRENT_DAY", False)

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

# Default MVP focus is Jabodetabek. Add/remove terms based on your market.
LOCATION_KEYWORDS = [
    "jabodetabek",
    "jakarta",
    "dki jakarta",
    "jaksel",
    "jakarta selatan",
    "jakbar",
    "jakarta barat",
    "jakpus",
    "jakarta pusat",
    "jakut",
    "jakarta utara",
    "jaktim",
    "jakarta timur",
    "bogor",
    "depok",
    "tangerang",
    "tangerang selatan",
    "tangsel",
    "bekasi",
    "bsd",
    "serpong",
    "gading serpong",
    "alam sutera",
    "karawaci",
    "bintaro",
    "cibubur",
    "sentul",
    "cibinong",
    "kelapa gading",
    "kemang",
    "scbd",
    "sudirman",
    "thamrin",
    "kuningan",
    "senayan",
]
