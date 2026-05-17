"""Simple Threads public search crawler for photographer/videographer leads.

This script intentionally does not log in, send messages, comment, like, or try
to bypass platform protections. It only reads public content that is visible to
the browser session.
"""

import asyncio
import csv
import hashlib
import json
import logging
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote_plus, urljoin, urlparse, urlunparse

import requests
from playwright.async_api import (
    Error as PlaywrightError,
    TimeoutError as PlaywrightTimeoutError,
    async_playwright,
)
from requests import RequestException

import config


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("threads-job-crawler")


POST_CONTAINER_SELECTORS = [
    "article",
    '[role="article"]',
    'div:has(a[href*="/post/"])',
]
POST_LINK_SELECTOR = 'a[href*="/post/"]'

ACCESS_RESTRICTION_HINTS = [
    "log in",
    "login",
    "sign up",
    "masuk",
    "captcha",
    "challenge",
    "try again later",
    "something went wrong",
]

CSV_FIELDS = [
    "keyword",
    "username",
    "text",
    "post_url",
    "scraped_at",
    "lead_score",
    "status",
]


@dataclass
class Lead:
    keyword: str
    username: str
    text: str
    post_url: str
    scraped_at: str
    lead_score: int
    status: str
    unique_id: str

    def to_output_dict(self) -> dict[str, Any]:
        return {
            "keyword": self.keyword,
            "username": self.username,
            "text": self.text,
            "post_url": self.post_url,
            "scraped_at": self.scraped_at,
            "lead_score": self.lead_score,
            "status": self.status,
        }


def load_keywords(path: Path) -> list[str]:
    if not path.exists():
        raise FileNotFoundError(f"Keyword file not found: {path}")

    keywords: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        keyword = line.strip()
        if keyword and not keyword.startswith("#"):
            keywords.append(keyword)
    return keywords


def load_seen_posts(path: Path) -> set[str]:
    if not path.exists():
        return set()

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        logger.warning("Could not parse %s. Starting with an empty seen set.", path)
        return set()

    if isinstance(data, list):
        return {str(item) for item in data}

    logger.warning("%s should contain a JSON list. Starting with an empty seen set.", path)
    return set()


def save_seen_posts(path: Path, seen_posts: set[str]) -> None:
    path.write_text(
        json.dumps(sorted(seen_posts), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def calculate_lead_score(text: str) -> int:
    lowered = text.lower()
    score = 0

    for keyword in config.POSITIVE_KEYWORDS:
        if keyword.lower() in lowered:
            score += config.POSITIVE_SCORE

    for keyword in config.NEGATIVE_KEYWORDS:
        if keyword.lower() in lowered:
            score += config.NEGATIVE_SCORE

    return score


def normalize_post_url(url: str) -> str:
    if not url:
        return ""

    absolute_url = urljoin("https://www.threads.net", url)
    parsed = urlparse(absolute_url)
    if "threads.net" not in parsed.netloc:
        return ""

    # Drop query/fragment values so the same post does not appear as duplicates.
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path.rstrip("/"), "", "", ""))


def make_unique_id(post_url: str, text: str) -> str:
    if post_url:
        return post_url
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def extract_username_from_url(url: str) -> str:
    parsed = urlparse(url)
    for part in parsed.path.split("/"):
        if part.startswith("@") and len(part) > 1:
            return part[1:]
    return ""


def extract_username_from_text(text: str) -> str:
    match = re.search(r"@([A-Za-z0-9._]+)", text)
    return match.group(1) if match else ""


def find_post_url(links: list[dict[str, str]]) -> str:
    for link in links:
        href = link.get("href", "")
        if "/post/" in href:
            return normalize_post_url(href)
    return ""


def find_username(links: list[dict[str, str]], post_url: str, text: str) -> str:
    username = extract_username_from_url(post_url)
    if username:
        return username

    for link in links:
        href = normalize_post_url(link.get("href", ""))
        username = extract_username_from_url(href)
        if username:
            return username

    return extract_username_from_text(text)


async def get_container_text(container: Any) -> str:
    """Return readable text without failing if Threads changes its markup."""
    try:
        text = await container.inner_text(timeout=2_000)
        return normalize_text(text)
    except PlaywrightError:
        return ""


async def get_container_links(container: Any) -> list[dict[str, str]]:
    try:
        links = await container.locator("a").evaluate_all(
            """elements => elements.map(element => ({
                href: element.href || element.getAttribute("href") || "",
                text: element.innerText || element.textContent || ""
            }))"""
        )
    except PlaywrightError:
        return []

    cleaned_links: list[dict[str, str]] = []
    for link in links:
        if not isinstance(link, dict):
            continue
        cleaned_links.append(
            {
                "href": str(link.get("href", "")),
                "text": normalize_text(str(link.get("text", ""))),
            }
        )
    return cleaned_links


async def extract_posts_from_links(page: Any) -> list[dict[str, str]]:
    """Extract individual post candidates by starting from post permalinks.

    Threads search markup changes often. In current public search pages, the
    most stable signal is the permalink containing "/post/"; walking up to the
    nearest parent with only one post link avoids collecting the whole results
    column as a single lead.
    """
    try:
        posts = await page.evaluate(
            f"""() => {{
                const normalize = (value) => (value || "").replace(/\\s+/g, " ").trim();
                const anchors = Array.from(document.querySelectorAll({POST_LINK_SELECTOR!r}));
                return anchors.map((anchor) => {{
                    let bestNode = null;
                    let fallbackNode = null;
                    let node = anchor;

                    for (let level = 0; node && level < 12; level += 1, node = node.parentElement) {{
                        const text = normalize(node.innerText || node.textContent || "");
                        if (text.length < 40) {{
                            continue;
                        }}

                        const postLinkCount = node.querySelectorAll({POST_LINK_SELECTOR!r}).length;
                        if (!fallbackNode || text.length < normalize(fallbackNode.innerText || fallbackNode.textContent || "").length) {{
                            fallbackNode = node;
                        }}

                        if (postLinkCount <= 1) {{
                            bestNode = node;
                            break;
                        }}
                    }}

                    const container = bestNode || fallbackNode || anchor;
                    return {{
                        href: anchor.href || anchor.getAttribute("href") || "",
                        text: normalize(container.innerText || container.textContent || ""),
                    }};
                }}).filter((post) => post.text);
            }}"""
        )
    except PlaywrightError as exc:
        logger.debug("Post link extraction failed: %s", exc)
        return []

    cleaned_posts: list[dict[str, str]] = []
    for post in posts:
        if not isinstance(post, dict):
            continue

        text = normalize_text(str(post.get("text", "")))
        post_url = normalize_post_url(str(post.get("href", "")))
        if text and post_url:
            cleaned_posts.append({"text": text, "post_url": post_url})

    return cleaned_posts


async def find_post_containers(page: Any) -> Any | None:
    for selector in POST_CONTAINER_SELECTORS:
        try:
            locator = page.locator(selector)
            count = await locator.count()
        except PlaywrightError as exc:
            logger.debug("Selector failed (%s): %s", selector, exc)
            continue

        if count > 0:
            logger.info("Using post selector %r with %s candidates.", selector, count)
            return locator

    return None


async def maybe_log_access_restriction(page: Any, keyword: str) -> None:
    try:
        body_text = (await page.locator("body").inner_text(timeout=2_000)).lower()
    except PlaywrightError:
        return

    if any(hint in body_text for hint in ACCESS_RESTRICTION_HINTS):
        logger.warning(
            "Threads may be limiting public access for keyword %r. "
            "Try running with THREADS_HEADLESS=false and inspect the page manually.",
            keyword,
        )


async def scroll_page(page: Any) -> None:
    for index in range(config.SCROLL_COUNT):
        await page.mouse.wheel(0, 1800)
        await page.wait_for_timeout(int(config.SCROLL_DELAY_SECONDS * 1000))
        logger.debug("Finished scroll %s/%s.", index + 1, config.SCROLL_COUNT)


async def extract_leads_for_keyword(page: Any, keyword: str) -> list[Lead]:
    link_posts = await extract_posts_from_links(page)
    if link_posts:
        logger.info("Found %s post permalink candidates for keyword %r.", len(link_posts), keyword)
        scraped_at = datetime.now(timezone.utc).isoformat()
        leads: list[Lead] = []

        for post in link_posts[: config.POST_EXTRACTION_LIMIT_PER_KEYWORD]:
            text = post["text"]
            score = calculate_lead_score(text)
            if score < config.MIN_LEAD_SCORE:
                continue

            post_url = post["post_url"]
            leads.append(
                Lead(
                    keyword=keyword,
                    username=find_username([], post_url, text),
                    text=text,
                    post_url=post_url,
                    scraped_at=scraped_at,
                    lead_score=score,
                    status="new",
                    unique_id=make_unique_id(post_url, text),
                )
            )

        return leads

    containers = await find_post_containers(page)
    if containers is None:
        logger.warning("No post containers found for keyword %r.", keyword)
        await maybe_log_access_restriction(page, keyword)
        return []

    candidate_count = min(
        await containers.count(),
        config.POST_EXTRACTION_LIMIT_PER_KEYWORD,
    )
    leads: list[Lead] = []
    scraped_at = datetime.now(timezone.utc).isoformat()

    for index in range(candidate_count):
        container = containers.nth(index)
        text = await get_container_text(container)
        if not text:
            continue

        score = calculate_lead_score(text)
        if score < config.MIN_LEAD_SCORE:
            continue

        links = await get_container_links(container)
        post_url = find_post_url(links)
        username = find_username(links, post_url, text)

        leads.append(
            Lead(
                keyword=keyword,
                username=username,
                text=text,
                post_url=post_url,
                scraped_at=scraped_at,
                lead_score=score,
                status="new",
                unique_id=make_unique_id(post_url, text),
            )
        )

    return leads


async def crawl_keyword(page: Any, keyword: str) -> list[Lead]:
    search_url = f"{config.THREADS_SEARCH_URL}?q={quote_plus(keyword)}"
    logger.info("Searching Threads for %r.", keyword)

    try:
        await page.goto(
            search_url,
            wait_until="domcontentloaded",
            timeout=config.PAGE_TIMEOUT_MS,
        )
        await page.wait_for_timeout(int(config.KEYWORD_DELAY_SECONDS * 1000))
        await scroll_page(page)
        return await extract_leads_for_keyword(page, keyword)
    except PlaywrightTimeoutError:
        logger.error("Page load timed out for keyword %r. Continuing.", keyword)
    except PlaywrightError as exc:
        logger.error("Playwright error for keyword %r: %s", keyword, exc)
    except Exception:
        logger.exception("Unexpected error while processing keyword %r.", keyword)

    return []


def deduplicate_and_rank(leads: list[Lead], seen_posts: set[str]) -> list[Lead]:
    new_leads: list[Lead] = []
    seen_this_run: set[str] = set()

    for lead in leads:
        if lead.unique_id in seen_posts or lead.unique_id in seen_this_run:
            continue
        seen_this_run.add(lead.unique_id)
        new_leads.append(lead)

    new_leads.sort(key=lambda item: item.lead_score, reverse=True)
    return new_leads[: config.MAX_LEADS]


def write_json(path: Path, leads: list[Lead]) -> None:
    path.write_text(
        json.dumps([lead.to_output_dict() for lead in leads], indent=2, ensure_ascii=False)
        + "\n",
        encoding="utf-8",
    )


def write_csv(path: Path, leads: list[Lead]) -> None:
    with path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for lead in leads:
            writer.writerow(lead.to_output_dict())


def send_to_n8n(leads: list[Lead]) -> None:
    """Send exported leads to n8n when N8N_WEBHOOK_URL is configured."""
    if not config.N8N_WEBHOOK_URL:
        logger.info("N8N_WEBHOOK_URL is empty. Skipping n8n webhook.")
        return

    payload = {
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "source": "threads",
        "total_leads": len(leads),
        "leads": [lead.to_output_dict() for lead in leads],
    }

    try:
        response = requests.post(
            config.N8N_WEBHOOK_URL,
            json=payload,
            timeout=config.N8N_REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        logger.info("Sent %s leads to n8n webhook.", len(leads))
    except RequestException as exc:
        logger.error("Failed to send leads to n8n webhook: %s", exc)


def print_summary(leads: list[Lead]) -> None:
    print(f"Found {len(leads)} new leads")

    for index, lead in enumerate(leads[:5], start=1):
        short_text = lead.text[:140] + ("..." if len(lead.text) > 140 else "")
        print(f"{index}. score={lead.lead_score} | {short_text}")


async def run() -> None:
    keywords = load_keywords(config.KEYWORDS_FILE)
    if not keywords:
        logger.warning("No keywords found in %s.", config.KEYWORDS_FILE)
        print_summary([])
        return

    config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    seen_posts = load_seen_posts(config.SEEN_POSTS_FILE)
    all_candidates: list[Lead] = []

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=config.HEADLESS)
        context = await browser.new_context(locale="id-ID", timezone_id="Asia/Jakarta")
        page = await context.new_page()

        try:
            for keyword in keywords:
                all_candidates.extend(await crawl_keyword(page, keyword))
                await page.wait_for_timeout(int(config.KEYWORD_DELAY_SECONDS * 1000))
        finally:
            await context.close()
            await browser.close()

    new_leads = deduplicate_and_rank(all_candidates, seen_posts)
    seen_posts.update(lead.unique_id for lead in new_leads)

    write_json(config.JSON_OUTPUT_FILE, new_leads)
    write_csv(config.CSV_OUTPUT_FILE, new_leads)
    save_seen_posts(config.SEEN_POSTS_FILE, seen_posts)
    send_to_n8n(new_leads)
    print_summary(new_leads)


def main() -> None:
    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        logger.info("Crawler stopped by user.")


if __name__ == "__main__":
    main()
