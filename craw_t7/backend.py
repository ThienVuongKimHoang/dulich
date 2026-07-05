"""
FastAPI backend cho DQN Crawler Eval UI.

Chạy:  uvicorn backend:app --reload --port 8765
"""

import os
import sys
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE_DIR = Path(__file__).parent
os.chdir(BASE_DIR)
sys.path.insert(0, str(BASE_DIR))

from crawl_dqn import DQNAgent, score_url, url_to_state

CHECKPOINT = str(BASE_DIR / "dqn_crawler.pt")
agent = DQNAgent(checkpoint=CHECKPOINT)

app = FastAPI(title="DQN Crawler Eval")

FEATURE_NAMES = [
    "domain_trust",
    "url_length",
    "path_depth",
    "has_year",
    "has_query",
    "good_keywords",
    "bad_keywords",
    "slug_quality",
    "has_tracking",
    "digit_ratio",
    "is_https",
]

FETCH_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
}


class EvalRequest(BaseModel):
    url: str
    max_links: int = 60


def _eval_url(url: str, is_seed: bool) -> dict:
    q = agent.score(url)
    action = "CRAWL" if q > 0.3 else "SKIP"
    features = url_to_state(url).tolist()
    return {
        "url": url,
        "q_value": round(q, 4),
        "action": action,
        "url_score": score_url(url),
        "features": {n: round(v, 3) for n, v in zip(FEATURE_NAMES, features)},
        "is_seed": is_seed,
    }


@app.get("/")
def index():
    return FileResponse(BASE_DIR / "static" / "index.html")


@app.post("/api/eval")
def eval_endpoint(req: EvalRequest):
    seed = req.url.strip()
    if not seed.startswith("http"):
        raise HTTPException(400, "URL phải bắt đầu bằng http/https")

    discovered: list[str] = []
    fetch_error: str | None = None

    try:
        resp = requests.get(seed, timeout=12, headers=FETCH_HEADERS)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "html.parser")
            raw = [urljoin(seed, a["href"]) for a in soup.find_all("a", href=True)]
            soup.decompose()
            discovered = [l for l in raw if l.startswith("http")]
        else:
            fetch_error = f"HTTP {resp.status_code}"
    except Exception as exc:
        fetch_error = str(exc)

    # Deduplicate giữ thứ tự, seed URL đầu tiên
    seen: set[str] = {seed}
    unique = [seed]
    for l in discovered:
        if l not in seen:
            seen.add(l)
            unique.append(l)
    unique = unique[: req.max_links + 1]

    results = [_eval_url(u, u == seed) for u in unique]
    results.sort(key=lambda x: (-x["q_value"], x["url"]))

    crawl_count = sum(1 for r in results if r["action"] == "CRAWL")
    return {
        "seed_url": seed,
        "fetch_error": fetch_error,
        "total": len(results),
        "crawl_count": crawl_count,
        "skip_count": len(results) - crawl_count,
        "results": results,
    }


@app.get("/api/health")
def health():
    return {"status": "ok", "checkpoint": CHECKPOINT, "exists": os.path.exists(CHECKPOINT)}


app.mount("/", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
