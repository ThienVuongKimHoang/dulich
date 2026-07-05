"""
Web Crawler + DQN Agent (tích hợp)
====================================
Kết hợp crawler tối ưu RAM (100k trang) với DQN agent chọn URL thông minh.

Thay đổi chính so với 2 file riêng:
  - AgentFrontier wrap URLFrontier, dùng agent.score() để re-rank
  - crawl_url() trả về reward → gọi agent_frontier.observe_reward()
  - --live: online training trong lúc crawl thật
  - --offline: train từ CSV có sẵn
  - --eval: chỉ score test URLs, không crawl

Usage:
  python crawler_with_dqn.py                  # crawl + online DQN
  python crawler_with_dqn.py --no-agent       # crawl thuần, không DQN
  python crawler_with_dqn.py --offline        # train offline từ CSV
  python crawler_with_dqn.py --eval           # eval agent với test URLs
"""

from __future__ import annotations

import argparse
import csv
import gc
import hashlib
import heapq
import logging
import math
import os
import queue
import random
import re
import sqlite3
import threading
import time
from collections import defaultdict, deque
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urljoin, urlparse

import numpy as np
import requests
import torch
import torch.nn as nn
import torch.optim as optim
from bs4 import BeautifulSoup

try:
    from datasketch import MinHash, MinHashLSH
    USE_MINHASH = True
except ImportError:
    USE_MINHASH = False

try:
    from tqdm import tqdm
    USE_TQDM = True
except ImportError:
    USE_TQDM = False

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
    USE_PLAYWRIGHT = True
except ImportError:
    USE_PLAYWRIGHT = False

# ──────────────────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════
# SECTION 1 — Config
# ══════════════════════════════════════════════════════════

NUM_THREADS           = 8          # giảm từ 32 → tránh rate limit
MAX_PAGES             = 100_000
MAX_PAGES_PER_DOMAIN  = 500
DB_PATH               = "crawler.db"
CSV_PATH              = "crawler_dataset.csv"
DB_BATCH_SIZE         = 200
DB_QUEUE_MAXSIZE      = 500
REQUEST_TIMEOUT       = 12
MAX_CONTENT_CHARS     = 8_000
CONTENT_STORE_LIMIT   = 4_000
FRONTIER_TRIM_EVERY   = 5_000
FRONTIER_TRIM_KEEP    = 30_000
GC_EVERY              = 2_000
DOMAIN_DELAY          = 1.0        # giây giữa 2 request cùng domain
PW_ZERO_LINK_THRESH   = 3          # sau N lần zero_links → dùng Playwright cho domain đó
PW_TIMEOUT            = 20_000     # ms

SEED_URLS = [
    # Y tế / sức khỏe
    ("https://nhathuoclongchau.com.vn/bai-viet",          50),
    ("https://nhathuoclongchau.com.vn/benh",              48),
    ("https://hellobacsi.com/benh",                       45),
    ("https://hellobacsi.com/song-khoe",                  44),
    ("https://medlatec.vn/tin-tuc",                       43),
    ("https://tamanhhospital.vn/benh-vien",               42),
    ("https://suckhoedoisong.vn",                         42),
    ("https://www.vinmec.com/vi/tin-tuc/thong-tin-suc-khoe/", 40),
    # Du lịch
    ("https://dulichvietnam.com.vn",                      40),
    ("https://www.traveloka.com/vi-vn/explore/destination", 38),
    ("https://vntrip.vn/cam-nang",                        38),
    # Tin tức tổng hợp
    ("https://vnexpress.net/suc-khoe",                    40),
    ("https://vnexpress.net/du-lich",                     38),
    ("https://dantri.com.vn/suc-khoe",                   37),
    ("https://tuoitre.vn/suc-khoe",                       37),
    ("https://baomoi.com",                                35),
    # Wikipedia tiếng Việt (thân thiện với crawler)
    ("https://vi.wikipedia.org/wiki/Danh_s%C3%A1ch_c%C3%A1c_lo%E1%BA%A1i_b%E1%BB%87nh", 45),
    ("https://vi.wikipedia.org/wiki/Y_h%E1%BB%8Dc",      44),
]

# DQN hyper-parameters
STATE_DIM       = 11
ACTION_DIM      = 2
HIDDEN          = 256
LR              = 1e-3
GAMMA           = 0.95
BATCH_SIZE      = 64
REPLAY_CAPACITY = 50_000
TARGET_UPDATE   = 500
EPS_START       = 1.0
EPS_END         = 0.05
EPS_DECAY       = 5_000
MIN_REPLAY      = 1_000
CHECKPOINT      = "dqn_crawler.pt"

# AgentFrontier
AGENT_LOOKAHEAD = 20   # số candidate lấy từ heap để agent re-rank


# ══════════════════════════════════════════════════════════
# SECTION 2 — DQN Feature Engineering
# ══════════════════════════════════════════════════════════

_GOOD_KW_DQN = {
    "blog": 5, "article": 6, "guide": 8, "tutorial": 8,
    "news": 4, "travel": 8, "experience": 8, "workshop": 10,
    "festival": 7, "event": 6, "culture": 7, "destination": 8,
    "food": 6, "restaurant": 5, "hotel": 5, "homestay": 5,
}
_BAD_KW_DQN = {
    "login": 30, "signin": 30, "signup": 30, "logout": 30,
    "cart": 20, "checkout": 20, "account": 15, "search": 10,
}


def url_to_state(url: str) -> torch.Tensor:
    """Chuyển URL thành feature vector 11 chiều ∈ [0,1]."""
    try:
        parsed = urlparse(url.lower().strip())
    except Exception:
        return torch.zeros(STATE_DIM)

    domain = parsed.netloc
    path   = parsed.path
    query  = parsed.query

    # [0] domain trust
    if ".gov." in domain or domain.endswith(".gov"):   trust = 1.0
    elif ".edu." in domain or domain.endswith(".edu"): trust = 0.9
    elif domain.endswith(".vn"):  trust = 0.6
    elif domain.endswith(".org"): trust = 0.5
    elif domain.endswith(".com"): trust = 0.3
    else:                          trust = 0.1

    url_len     = max(0.0, 1.0 - len(url) / 300.0)
    depth       = len([s for s in path.split("/") if s]) / 8.0
    has_year    = 1.0 if re.findall(r"20(2[2-6])", url) else 0.0
    has_query   = 1.0 if query else 0.0
    good_score  = sum(w for kw, w in _GOOD_KW_DQN.items() if kw in path) / 20.0
    bad_score   = sum(p for kw, p in _BAD_KW_DQN.items() if kw in path) / 30.0

    segs    = [s for s in path.split("/") if s]
    slug_ok = 0.0
    if segs:
        parts = segs[-1].split("-")
        if 3 <= len(parts) <= 12 and all(p.isalpha() for p in parts[:3]):
            slug_ok = 1.0

    tracking     = ["utm_", "fbclid", "gclid", "yclid", "ref=", "tracking", "affiliate"]
    has_tracking = 1.0 if any(t in url for t in tracking) else 0.0
    digit_ratio  = sum(c.isdigit() for c in path) / max(len(path), 1)
    is_https     = 1.0 if parsed.scheme == "https" else 0.0

    return torch.tensor([
        trust, url_len, min(depth, 1.0), has_year, has_query,
        min(good_score, 1.0), min(bad_score, 1.0), slug_ok,
        has_tracking, digit_ratio, is_https,
    ], dtype=torch.float32)


# ══════════════════════════════════════════════════════════
# SECTION 3 — DQN Network + Replay Buffer + Agent
# ══════════════════════════════════════════════════════════

class DQN(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(STATE_DIM, HIDDEN), nn.ReLU(),
            nn.Linear(HIDDEN, HIDDEN),    nn.ReLU(),
            nn.Linear(HIDDEN, ACTION_DIM),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class ReplayBuffer:
    def __init__(self, capacity: int = REPLAY_CAPACITY):
        self._buf = deque(maxlen=capacity)

    def push(self, state, action, reward, next_state, done):
        self._buf.append((state, action, reward, next_state, done))

    def sample(self, n: int):
        return random.sample(self._buf, n)

    def __len__(self):
        return len(self._buf)


class DQNAgent:
    """
    Double DQN agent.

    API chính:
      select(url)  → 0/1
      score(url)   → Q-value hành động crawl
      observe(...)  → lưu transition + train
    """

    def __init__(self, device: str = "auto", checkpoint: str = CHECKPOINT):
        self.device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
            if device == "auto" else device
        )
        self.policy_net = DQN().to(self.device)
        self.target_net = DQN().to(self.device)
        self.target_net.load_state_dict(self.policy_net.state_dict())
        self.target_net.eval()

        self.optimizer     = optim.Adam(self.policy_net.parameters(), lr=LR)
        self.replay        = ReplayBuffer()
        self.steps         = 0
        self.checkpoint    = checkpoint
        self._loss_history: list[float] = []

        if os.path.exists(checkpoint):
            self._load(checkpoint)
            log.info(f"[DQN] Loaded checkpoint '{checkpoint}' (step {self.steps:,})")
        else:
            log.info(f"[DQN] Fresh agent on {self.device}")

    @property
    def epsilon(self) -> float:
        return EPS_END + (EPS_START - EPS_END) * math.exp(-self.steps / EPS_DECAY)

    def select(self, url: str) -> int:
        if random.random() < self.epsilon:
            return random.randint(0, 1)
        return int(self._q(url).argmax().item())

    def score(self, url: str) -> float:
        """Q-value của action=crawl, dùng để sort frontier."""
        return float(self._q(url)[1].item())

    def _q(self, url: str) -> torch.Tensor:
        s = url_to_state(url).unsqueeze(0).to(self.device)
        with torch.no_grad():
            return self.policy_net(s)[0]

    def observe(
        self,
        url: str,
        action: int,
        reward: float,
        next_url: str | None,
        done: bool = False,
    ):
        state      = url_to_state(url)
        next_state = url_to_state(next_url) if next_url else torch.zeros(STATE_DIM)
        self.replay.push(state, action, reward, next_state, float(done))
        self.steps += 1
        self._train_step()

        if self.steps % TARGET_UPDATE == 0:
            self.target_net.load_state_dict(self.policy_net.state_dict())

        if self.steps % 1_000 == 0:
            self._save(self.checkpoint)
            avg = np.mean(self._loss_history[-100:]) if self._loss_history else 0.0
            log.info(
                f"[DQN] step={self.steps:,}  ε={self.epsilon:.3f}"
                f"  replay={len(self.replay):,}  loss={avg:.4f}"
            )

    def _train_step(self):
        if len(self.replay) < MIN_REPLAY:
            return
        batch       = self.replay.sample(BATCH_SIZE)
        states      = torch.stack([b[0] for b in batch]).to(self.device)
        actions     = torch.tensor([b[1] for b in batch], dtype=torch.long).to(self.device)
        rewards     = torch.tensor([b[2] for b in batch], dtype=torch.float32).to(self.device)

        # ★ FIX: contextual bandit, không cần next_state/done — bỏ Bellman hoàn toàn.
        #   Vấn đề gốc: gather() chỉ update Q[action_taken], nên Q[crawl] chỉ
        #   được học từ positive samples (reward cao), không bao giờ thấy
        #   negative samples → Q[crawl] hội tụ về hằng số bất kể URL.
        #
        #   Fix: với mỗi sample ta BIẾT chắc target cho CẢ 2 action:
        #     - action thực tế (0 hoặc 1) → target = reward quan sát được
        #     - action còn lại            → target = giá trị đối nghịch
        #   Vì dataset được thiết kế: positive(action=1)=URL tốt, reward cao
        #                              negative(action=0)=URL xấu, reward=0
        #   nên với URL tốt:  Q[crawl]=reward,  Q[skip]=0
        #        với URL xấu: Q[crawl]=0,       Q[skip]=reward_xấu (≈0, coi đúng khi skip)
        q_pred = self.policy_net(states)   # [B, 2] = [Q_skip, Q_crawl]

        targets = q_pred.detach().clone()
        for i in range(len(batch)):
            a = actions[i].item()
            r = rewards[i].item()
            if a == 1:
                # Sample này là crawl thật, reward quan sát được cho crawl
                targets[i, 1] = r
                targets[i, 0] = 0.0      # skip một URL tốt → mất reward đó
            else:
                # Sample này là skip thật (URL xấu, reward=0 nếu crawl)
                targets[i, 0] = 0.05     # skip đúng → reward nhỏ dương (đúng quyết định)
                targets[i, 1] = r        # nếu lỡ crawl URL xấu → reward thấp (≈0)

        loss = nn.functional.smooth_l1_loss(q_pred, targets)
        self.optimizer.zero_grad()
        loss.backward()
        nn.utils.clip_grad_norm_(self.policy_net.parameters(), 10.0)
        self.optimizer.step()
        self._loss_history.append(loss.item())

    def _save(self, path: str):
        torch.save({
            "policy_state": self.policy_net.state_dict(),
            "target_state": self.target_net.state_dict(),
            "optimizer":    self.optimizer.state_dict(),
            "steps":        self.steps,
        }, path)

    def _load(self, path: str):
        ck = torch.load(path, map_location=self.device)
        self.policy_net.load_state_dict(ck["policy_state"])
        self.target_net.load_state_dict(ck["target_state"])
        self.optimizer.load_state_dict(ck["optimizer"])
        self.steps = ck["steps"]


# ══════════════════════════════════════════════════════════
# SECTION 4 — AgentFrontier (wrapper tích hợp DQN ↔ URLFrontier)
# ══════════════════════════════════════════════════════════

class AgentFrontier:
    """
    Wrap URLFrontier bằng DQNAgent.

    pop():
      1. Lấy tối đa AGENT_LOOKAHEAD candidate từ heap
      2. Agent score → sort giảm dần
      3. Trả về best; push lại phần còn lại
      4. Nếu agent quyết định SKIP best → observe(skip) và trả candidate tiếp
    observe_reward(reward, next_url):
      Gọi sau crawl_url() để cập nhật agent với reward thực tế.
    """

    def __init__(self, base_frontier: "URLFrontier", agent: DQNAgent,
                 lookahead: int = AGENT_LOOKAHEAD):
        self._f        = base_frontier
        self._agent    = agent
        self._look     = lookahead
        self._last_url: str | None = None

    # Proxy các method của URLFrontier
    def push(self, url: str, priority: float = 0):
        self._f.push(url, priority)

    def empty(self) -> bool:
        return self._f.empty()

    def __len__(self):
        return len(self._f)

    def trim(self, keep: int):
        self._f.trim(keep)

    def pop(self) -> str | None:
        # Lấy candidates từ heap
        candidates: list[str] = []
        for _ in range(self._look):
            u = self._f.pop()
            if u is None:
                break
            candidates.append(u)

        if not candidates:
            return None

        # Agent re-rank
        scored = sorted(
            [(self._agent.score(u), u) for u in candidates],
            key=lambda x: -x[0],
        )

        best_score, best_url = scored[0]
        rest = scored[1:]

        # Quyết định crawl/skip
        action = 1 if best_score > 0 else self._agent.select(best_url)

        # Push lại candidates không được chọn
        for s, u in rest:
            self._f.push(u, priority=s)

        if action == 0:
            # SKIP: observe rồi trả candidate tiếp
            # ★ done=True: contextual bandit, không bootstrap qua state kế tiếp
            next_url = rest[0][1] if rest else None
            self._agent.observe(best_url, 0, 0.0, next_url, done=True)
            return next_url  # có thể None nếu frontier cạn

        self._last_url = best_url
        return best_url

    def observe_reward(self, reward: float, next_url: str | None):
        """Gọi sau crawl_url() để cập nhật agent với reward thực tế."""
        if self._last_url is not None:
            # ★ done=True: mỗi quyết định crawl/skip độc lập, không phải
            #   1 chuỗi MDP liên tục → tránh Q-value cộng dồn vô hạn
            self._agent.observe(self._last_url, 1, reward, next_url, done=True)
            self._last_url = None


# ══════════════════════════════════════════════════════════
# SECTION 5 — Bloom Filter
# ══════════════════════════════════════════════════════════

class BloomFilter:
    def __init__(self, m: int = 8_000_000, k: int = 7):
        self._m    = m
        self._k    = k
        self._bits = bytearray(m // 8 + 1)
        self._lock = threading.Lock()

    def _positions(self, item: bytes):
        h1 = int.from_bytes(hashlib.md5(item).digest()[:8],  "little")
        h2 = int.from_bytes(hashlib.sha1(item).digest()[:8], "little")
        for i in range(self._k):
            yield (h1 + i * h2) % self._m

    def add(self, item: bytes):
        with self._lock:
            for pos in self._positions(item):
                self._bits[pos >> 3] |= (1 << (pos & 7))

    def __contains__(self, item: bytes) -> bool:
        for pos in self._positions(item):
            if not (self._bits[pos >> 3] & (1 << (pos & 7))):
                return False
        return True


# ══════════════════════════════════════════════════════════
# SECTION 6 — URLFrontier (giữ nguyên từ crawler gốc)
# ══════════════════════════════════════════════════════════

class URLFrontier:
    HARD_BLOCK_DOMAINS = {
        "googleads.g.doubleclick.net",
        "doubleclick.net",
        "adservice.google.com",
    }
    HARD_BLOCK_EXTENSIONS = (
        ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp",
        ".pdf", ".zip", ".rar", ".7z",
        ".mp3", ".wav", ".mp4", ".avi", ".mov",
    )

    def __init__(self):
        self._lock        = threading.Lock()
        self.heap         = []
        self.seen         = set()
        self.domain_count = defaultdict(int)

    def should_skip(self, url: str) -> bool:
        if not url:
            return True
        url = url.strip().lower()
        if url.startswith(("mailto:", "javascript:", "tel:")):
            return True
        try:
            parsed = urlparse(url)
        except Exception:
            return True
        domain = parsed.netloc.lower()
        if any(domain.endswith(d) for d in self.HARD_BLOCK_DOMAINS):
            return True
        if url.endswith(self.HARD_BLOCK_EXTENSIONS):
            return True
        return False

    def push(self, url: str, priority: float = 0):
        if self.should_skip(url):
            return
        with self._lock:
            if url in self.seen:
                return
            domain = urlparse(url).netloc.lower()
            if self.domain_count[domain] >= MAX_PAGES_PER_DOMAIN:
                return
            bonus = 20 / (1 + self.domain_count[domain])
            heapq.heappush(self.heap, (-(priority + bonus), url))
            self.seen.add(url)

    def pop(self) -> str | None:
        with self._lock:
            while self.heap:
                _, url = heapq.heappop(self.heap)
                domain = urlparse(url).netloc.lower()
                self.domain_count[domain] += 1
                return url
        return None

    def trim(self, keep: int = FRONTIER_TRIM_KEEP):
        with self._lock:
            if len(self.heap) <= keep:
                return
            top = heapq.nsmallest(keep, self.heap)
            self.heap = top
            heapq.heapify(self.heap)
            log.info(f"Frontier trimmed → {len(self.heap):,} entries")

    def empty(self) -> bool:
        with self._lock:
            return len(self.heap) == 0

    def __len__(self) -> int:
        with self._lock:
            return len(self.heap)


# ══════════════════════════════════════════════════════════
# SECTION 7 — HTTP + Parsers
# ══════════════════════════════════════════════════════════

_thread_local = threading.local()

def get_session() -> requests.Session:
    if not hasattr(_thread_local, "session"):
        s = requests.Session()
        s.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
        })
        adapter = requests.adapters.HTTPAdapter(
            pool_connections=4, pool_maxsize=8, max_retries=0,
        )
        s.mount("http://",  adapter)
        s.mount("https://", adapter)
        _thread_local.session = s
    return _thread_local.session

_fetch_stats: dict[str, int] = defaultdict(int)
_fetch_lock  = threading.Lock()

# Per-domain rate limiter
_domain_last: dict[str, float] = defaultdict(float)
_domain_lock = threading.Lock()

# Đếm số lần zero_links mỗi domain → quyết định dùng Playwright
_domain_zero: dict[str, int] = defaultdict(int)
_domain_zero_lock = threading.Lock()

def _should_use_playwright(domain: str) -> bool:
    if not USE_PLAYWRIGHT:
        return False
    with _domain_zero_lock:
        return _domain_zero[domain] >= PW_ZERO_LINK_THRESH

def _mark_zero_links(domain: str):
    with _domain_zero_lock:
        _domain_zero[domain] += 1

# ── Playwright browser pool (1 browser, N pages đồng thời) ──────────
_pw_lock    = threading.Lock()
_pw_context = None   # playwright BrowserContext, khởi tạo lazy

def _get_pw_context():
    """Lazy-init 1 Playwright browser context dùng chung toàn bộ threads."""
    global _pw_context
    if _pw_context is not None:
        return _pw_context
    with _pw_lock:
        if _pw_context is None:
            if not USE_PLAYWRIGHT:
                return None
            try:
                pw = sync_playwright().start()
                browser = pw.chromium.launch(
                    headless=True,
                    args=[
                        "--no-sandbox",
                        "--disable-dev-shm-usage",
                        "--disable-gpu",
                        "--disable-images",          # tắt ảnh → nhanh hơn
                        "--blink-settings=imagesEnabled=false",
                    ],
                )
                _pw_context = browser.new_context(
                    user_agent=(
                        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                    ),
                    java_script_enabled=True,
                    bypass_csp=True,
                )
                log.info("[Playwright] Browser launched")
            except Exception as e:
                log.warning(f"[Playwright] Launch failed: {e}")
                _pw_context = None
    return _pw_context

_pw_page_sem = threading.Semaphore(4)   # tối đa 4 tab đồng thời

def fetch_playwright(url: str) -> tuple[str | None, list[str]]:
    """
    Dùng Playwright render JS → trả (html_text, links).
    Thread-safe qua semaphore.
    """
    ctx = _get_pw_context()
    if ctx is None:
        return None, []

    _pw_page_sem.acquire()
    page = None
    try:
        page = ctx.new_page()
        # Chặn resource không cần thiết để tăng tốc
        page.route("**/*.{png,jpg,jpeg,gif,svg,webp,ico,woff,woff2,ttf,mp4,mp3}",
                   lambda r: r.abort())
        page.goto(url, wait_until="domcontentloaded", timeout=PW_TIMEOUT)
        page.wait_for_timeout(1500)    # chờ JS render xong

        links = page.eval_on_selector_all(
            "a[href]", "els => els.map(e => e.href)"
        )
        html = page.content()
        with _fetch_lock: _fetch_stats["ok_playwright"] += 1
        return html, [l for l in links if l.startswith("http")]
    except Exception as e:
        with _fetch_lock: _fetch_stats[f"pw_err_{type(e).__name__}"] += 1
        log.debug(f"[Playwright] {url}: {e}")
        return None, []
    finally:
        if page:
            try: page.close()
            except: pass
        _pw_page_sem.release()

def _domain_throttle(url: str):
    """Đảm bảo >= DOMAIN_DELAY giây giữa 2 request cùng domain."""
    domain = urlparse(url).netloc
    with _domain_lock:
        wait = DOMAIN_DELAY - (time.time() - _domain_last[domain])
        if wait > 0:
            _domain_last[domain] = time.time() + wait
        else:
            _domain_last[domain] = time.time()
    if wait > 0:
        time.sleep(wait)


def _extract_links_from_js_html(base_url: str, html: str) -> list[str]:
    """
    Fallback khi BeautifulSoup không thấy <a href>:
    dùng regex tìm URL trong JSON/JS inline (Next.js, React, v.v.)
    """
    base = "/".join(base_url.split("/")[:3])
    # Tìm chuỗi dạng "/path/to/page" hoặc "https://domain/path" trong JS
    pattern = re.compile(
        r'(?:href|url|\"path\"|\'path\')\s*[:=]\s*["\']'
        r'(/[a-zA-Z0-9_\-/\.]+|https?://[a-zA-Z0-9_\-/\.]+)'
        r'["\']'
    )
    found = []
    for m in pattern.finditer(html):
        u = m.group(1)
        if u.startswith("/"):
            u = base + u
        if u.startswith(base):       # chỉ lấy internal links
            found.append(u)
    return list(set(found))[:200]   # tối đa 200 link/page


def fetch(url: str) -> str | None:
    _domain_throttle(url)
    for attempt in range(2):
        try:
            resp = get_session().get(url, timeout=REQUEST_TIMEOUT, allow_redirects=True)
            if resp.status_code == 200:
                ct = resp.headers.get("Content-Type", "")
                if not any(t in ct for t in ("html", "xml", "text")):
                    with _fetch_lock: _fetch_stats["non_html"] += 1
                    return None
                with _fetch_lock: _fetch_stats["ok"] += 1
                return resp.text
            if resp.status_code == 429:
                with _fetch_lock: _fetch_stats["rate_limited"] += 1
                backoff = 5 * (2 ** attempt)
                log.debug(f"429 → sleep {backoff}s: {url}")
                time.sleep(backoff)
                continue
            with _fetch_lock: _fetch_stats[f"http_{resp.status_code}"] += 1
            log.debug(f"HTTP {resp.status_code}: {url}")
            return None
        except requests.exceptions.Timeout:
            with _fetch_lock: _fetch_stats["timeout"] += 1
            log.debug(f"Timeout: {url}")
        except Exception as e:
            with _fetch_lock: _fetch_stats[f"err_{type(e).__name__}"] += 1
            log.debug(f"Fetch error {url}: {e}")
        if attempt == 0:
            time.sleep(1.0)
    return None


def fetch_sitemap_urls(base_url: str, max_urls: int = 2000) -> list[str]:
    """
    Đọc sitemap.xml để bootstrap frontier cho JS-heavy sites.
    Xử lý cả sitemap index (lồng nhau tối đa 2 cấp).
    """
    import xml.etree.ElementTree as ET

    found: list[str] = []
    visited_sms: set[str] = set()
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

    def _parse_sm(sm_url: str, depth: int = 0):
        if sm_url in visited_sms or len(found) >= max_urls:
            return
        visited_sms.add(sm_url)
        html = fetch(sm_url)
        if not html:
            return
        try:
            root = ET.fromstring(html.encode("utf-8", errors="replace"))
        except Exception:
            return

        locs = [el.text.strip() for el in root.findall(".//sm:loc", ns) if el.text]

        child_sms = [l for l in locs if "sitemap" in l.lower() and l.endswith((".xml", ".xml.gz"))]
        page_urls  = [l for l in locs if l not in child_sms]

        # Thêm page URLs
        for u in page_urls:
            if len(found) >= max_urls:
                break
            found.append(u)

        # Đệ quy vào child sitemaps (tối đa depth=1, lấy tất cả child sms)
        if depth < 2:
            for csm in child_sms:
                if len(found) >= max_urls:
                    break
                _parse_sm(csm, depth + 1)

    candidates = [
        f"{base_url.rstrip('/')}/sitemap.xml",
        f"{base_url.rstrip('/')}/sitemap_index.xml",
        f"{base_url.rstrip('/')}/sitemap-index.xml",
        f"{base_url.rstrip('/')}/news-sitemap.xml",
    ]
    for sm_url in candidates:
        if sm_url in visited_sms:
            continue
        _parse_sm(sm_url)
        if found:
            log.info(f"[Sitemap] {len(found):,} URLs từ {sm_url}")
            break

    return found[:max_urls]


def parse_page(base_url: str, html: str) -> tuple[str, list[str]]:
    soup  = BeautifulSoup(html, "html.parser")
    text  = soup.get_text(separator=" ", strip=True)[:MAX_CONTENT_CHARS]
    links = [urljoin(base_url, a["href"]) for a in soup.find_all("a", href=True)]
    soup.decompose()
    return text, links


# ══════════════════════════════════════════════════════════
# SECTION 8 — SQLite + CSV writers
# ══════════════════════════════════════════════════════════

_db_queue: queue.Queue = queue.Queue(maxsize=DB_QUEUE_MAXSIZE)
_db_stop  = threading.Event()

def _db_writer():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=-8000")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS pages (
            url TEXT PRIMARY KEY,
            content TEXT
        )
    """)
    conn.commit()
    batch = []
    while not (_db_stop.is_set() and _db_queue.empty()):
        try:
            item = _db_queue.get(timeout=1)
            batch.append(item)
            if len(batch) >= DB_BATCH_SIZE:
                conn.executemany(
                    "INSERT OR REPLACE INTO pages(url, content) VALUES (?,?)", batch,
                )
                conn.commit()
                batch.clear()
        except queue.Empty:
            if batch:
                conn.executemany(
                    "INSERT OR REPLACE INTO pages(url, content) VALUES (?,?)", batch,
                )
                conn.commit()
                batch.clear()
    conn.close()

def save_page(url: str, content: str):
    _db_queue.put((url, content[:CONTENT_STORE_LIMIT]))

_csv_lock   = threading.Lock()
_csv_file   = None
_csv_writer = None
_csv_count  = 0

def _init_csv():
    global _csv_file, _csv_writer
    _csv_file   = open(CSV_PATH, "w", newline="", encoding="utf-8", buffering=1)
    _csv_writer = csv.DictWriter(
        _csv_file,
        fieldnames=["url", "score_url", "freshness", "quality", "discovery", "reward"],
    )
    _csv_writer.writeheader()

def write_csv_row(row: dict):
    global _csv_count
    with _csv_lock:
        _csv_writer.writerow(row)
        _csv_count += 1

def close_csv():
    if _csv_file:
        _csv_file.close()


# ══════════════════════════════════════════════════════════
# SECTION 9 — URL Scorer + Reward Engine
# ══════════════════════════════════════════════════════════

_GOOD_KW = {
    "blog": 5, "article": 6, "guide": 8, "tutorial": 8,
    "news": 4, "travel": 8, "experience": 8, "workshop": 10,
    "festival": 7, "event": 6, "culture": 7, "destination": 8,
    "food": 6, "restaurant": 5, "hotel": 5, "homestay": 5,
    "tour": 5, "review": 4,
}
_BAD_KW = {
    "login": -30, "signin": -30, "signup": -30, "register": -30,
    "logout": -30, "cart": -20, "checkout": -20, "account": -15,
    "profile": -15, "search": -10, "tag": -10, "category": -8,
    "author": -8, "privacy": -5, "policy": -5, "terms": -5,
}
_TRACKING = ["utm_", "fbclid", "gclid", "yclid", "ref=", "tracking", "affiliate"]
_ADS      = ["ads", "adserver", "doubleclick", "banner", "sponsor", "popup"]
_BAD_EXT  = (
    ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".ico",
    ".pdf", ".zip", ".rar", ".7z", ".mp4", ".avi", ".mov",
    ".mp3", ".wav", ".doc", ".docx", ".xls", ".xlsx",
)

def score_url(url: str) -> int:
    score   = 0
    url_low = url.strip().lower()
    try:
        parsed = urlparse(url_low)
    except Exception:
        return -999

    domain, path = parsed.netloc, parsed.path

    if ".gov." in domain or domain.endswith(".gov"):   score += 20
    elif ".edu." in domain or domain.endswith(".edu"): score += 15
    elif domain.endswith(".vn"):  score += 5
    elif domain.endswith(".org"): score += 3
    elif domain.endswith(".com"): score += 1

    ln = len(url_low)
    if ln < 60:    score += 5
    elif ln < 100: score += 3
    elif ln > 200: score -= 5

    depth = len([x for x in path.split("/") if x])
    if depth <= 3:   score += 5
    elif depth <= 5: score += 2
    else:            score -= 3

    for kw, w in _GOOD_KW.items():
        if kw in path: score += w
    for kw, p in _BAD_KW.items():
        if kw in path: score += p

    years = re.findall(r"20\d{2}", url_low)
    if years:
        ny = max(map(int, years))
        if ny >= 2026:   score += 10
        elif ny >= 2024: score += 6
        elif ny >= 2022: score += 3

    if parsed.query: score -= 3
    for p in _TRACKING:
        if p in url_low: score -= 15
    for p in _ADS:
        if p in url_low: score -= 50
    if url_low.endswith(_BAD_EXT): score -= 100

    digits = sum(c.isdigit() for c in path)
    if digits > 15: score -= 5

    slug_parts = [x for x in path.split("/") if x]
    if slug_parts and 3 <= len(slug_parts[-1].split("-")) <= 12:
        score += 5

    return score


def _minhash(text: str, num_perm: int = 128):
    m = MinHash(num_perm=num_perm)
    for word in text.lower().split():
        m.update(word.encode("utf8"))
    return m

class RewardEngine:
    LSH_THRESHOLD = 0.8
    NUM_PERM      = 128

    def __init__(self):
        self._lock      = threading.Lock()
        self._bloom     = BloomFilter(m=8_000_000, k=7)
        self._doc_count = 0
        if USE_MINHASH:
            self._lsh = MinHashLSH(threshold=self.LSH_THRESHOLD, num_perm=self.NUM_PERM)
        else:
            log.warning("datasketch không tìm thấy — freshness sẽ luôn = 1.0")
            self._lsh = None

    def is_duplicate(self, content: str) -> bool:
        digest = hashlib.md5(content.encode("utf-8")).digest()
        if digest in self._bloom:
            return True
        self._bloom.add(digest)
        return False

    def compute_freshness(self, content: str) -> float:
        if not USE_MINHASH or self._lsh is None:
            return 1.0
        m = _minhash(content, self.NUM_PERM)
        with self._lock:
            results = self._lsh.query(m)
        return max(0.0, 1.0 - len(results) * 0.1) if results else 1.0

    def register(self, content: str):
        if not USE_MINHASH or self._lsh is None:
            return
        m = _minhash(content, self.NUM_PERM)
        with self._lock:
            key = f"doc_{self._doc_count}"
            self._doc_count += 1
            try:
                self._lsh.insert(key, m)
            except Exception:
                pass

    @staticmethod
    def compute_quality(content: str) -> float:
        n = len(content)
        if n > 3000: return 1.0
        if n > 1500: return 0.6
        if n > 500:  return 0.3
        return 0.0

    def compute_reward(self, content: str, discovered_links: int) -> dict:
        freshness = self.compute_freshness(content)
        quality   = self.compute_quality(content)
        discovery = min(discovered_links / 50, 1.0)
        reward    = 0.5 * freshness + 0.3 * quality + 0.2 * discovery
        self.register(content)
        return {
            "freshness": freshness,
            "quality":   quality,
            "discovery": discovery,
            "reward":    reward,
        }


# ══════════════════════════════════════════════════════════
# SECTION 10 — crawl_url() — trả về reward để observe
# ══════════════════════════════════════════════════════════

def crawl_url(
    url: str,
    frontier,
    reward_engine: RewardEngine,
) -> dict | None:
    """
    Crawl 1 URL với 3-tier fallback:
      1. requests (nhanh, nhẹ)
      2. regex scan JS inline  (nếu zero links)
      3. Playwright render     (nếu domain liên tục zero links)
    """
    domain = urlparse(url).netloc

    # ── Tier 1: requests ────────────────────────────────────
    html  = fetch(url)
    links: list[str] = []
    content = ""

    if html is not None:
        content, links = parse_page(url, html)

        # ── Tier 2: regex JS scan ───────────────────────────
        if not links:
            links = _extract_links_from_js_html(url, html)
            if links:
                with _fetch_lock: _fetch_stats["js_links_rescued"] += 1
        del html

    # ── Tier 3: Playwright ──────────────────────────────────
    # Kích hoạt khi: requests thất bại HOẶC domain đã zero_links nhiều lần
    use_pw = (html is None or not links) and _should_use_playwright(domain)
    if use_pw:
        pw_html, pw_links = fetch_playwright(url)
        if pw_html is not None:
            if not content:
                soup = BeautifulSoup(pw_html, "html.parser")
                content = soup.get_text(separator=" ", strip=True)[:MAX_CONTENT_CHARS]
                soup.decompose()
            if pw_links:
                links = pw_links
                with _fetch_lock: _fetch_stats["pw_links_rescued"] += 1

    # ── Ghi nhận zero_links để trigger Playwright lần sau ──
    if not links:
        _mark_zero_links(domain)
        with _fetch_lock: _fetch_stats["zero_links"] += 1
        if not content:
            return None   # không có gì để lưu

    if not content:
        return None

    if reward_engine.is_duplicate(content):
        with _fetch_lock: _fetch_stats["duplicate"] += 1
        return None

    metrics = reward_engine.compute_reward(content, len(links))
    save_page(url, content)
    del content

    for link in links:
        frontier.push(link, priority=score_url(link))

    return {"url": url, "score_url": score_url(url), **metrics}


# ══════════════════════════════════════════════════════════
# SECTION 11 — Main crawl loop
# ══════════════════════════════════════════════════════════

def run_crawler(use_agent: bool = True):
    log.info(
        f"Crawler start — threads={NUM_THREADS}  target={MAX_PAGES:,}  "
        f"DQN={'ON' if use_agent else 'OFF'}"
    )

    _init_csv()
    db_thread = threading.Thread(target=_db_writer, daemon=True)
    db_thread.start()

    base_frontier = URLFrontier()
    reward_engine = RewardEngine()

    # ★ Tích hợp: dùng AgentFrontier nếu --agent (default)
    if use_agent:
        agent    = DQNAgent()
        frontier = AgentFrontier(base_frontier, agent)
        log.info("[DQN] AgentFrontier active")
    else:
        agent    = None
        frontier = base_frontier
        log.info("[DQN] Disabled — pure heuristic frontier")

    # Bootstrap sitemap — chỉ fetch 1 lần mỗi base domain
    seeded_bases: set[str] = set()
    for seed_url, seed_priority in SEED_URLS:
        frontier.push(seed_url, priority=seed_priority)
        base = "/".join(seed_url.split("/")[:3])
        if base in seeded_bases:
            continue
        seeded_bases.add(base)
        sm_urls = fetch_sitemap_urls(base, max_urls=2000)
        pushed = 0
        for u in sm_urls:
            # push thẳng vào base_frontier để bypass AgentFrontier lookahead overhead
            base_frontier.push(u, priority=score_url(u))
            pushed += 1
        if pushed:
            log.info(f"[Sitemap] Pushed {pushed:,} URLs từ {base}")

    log.info(f"[Bootstrap] Frontier size sau sitemap: {len(base_frontier):,} URLs")

    pages_submitted = 0
    pages_lock      = threading.Lock()
    pending         = 0
    pending_lock    = threading.Lock()
    pending_event   = threading.Event()
    pending_event.set()
    sem  = threading.Semaphore(NUM_THREADS * 4)
    pbar = tqdm(total=MAX_PAGES, unit="page", dynamic_ncols=True) if USE_TQDM else None

    def on_done(fut, crawled_url: str):
        nonlocal pending, pages_submitted
        sem.release()
        try:
            row = fut.result()
        except Exception as exc:
            log.debug(f"Worker error: {exc}")
            row = None

        if row is not None:
            write_csv_row(row)
            # ★ Cập nhật agent với reward thực tế
            if use_agent:
                next_url = base_frontier.heap[0][1] if base_frontier.heap else None
                frontier.observe_reward(row["reward"], next_url)
            if pbar:
                pbar.update(1)
        else:
            # crawl thất bại → reward=0
            if use_agent:
                frontier.observe_reward(0.0, None)

        with pending_lock:
            pending -= 1
            if pending == 0:
                pending_event.clear()

    start_time = time.time()

    with ThreadPoolExecutor(max_workers=NUM_THREADS) as executor:
        while True:
            with pages_lock:
                if pages_submitted >= MAX_PAGES:
                    break

            url = frontier.pop()

            if url is None:
                with pending_lock:
                    p = pending
                if p == 0:
                    log.info("Frontier rỗng — dừng.")
                    break
                pending_event.wait(timeout=1.0)
                pending_event.set()
                continue

            sem.acquire()

            with pages_lock:
                pages_submitted += 1

            if pages_submitted % FRONTIER_TRIM_EVERY == 0:
                frontier.trim(FRONTIER_TRIM_KEEP)
            if pages_submitted % GC_EVERY == 0:
                gc.collect()

            with pending_lock:
                pending += 1
                pending_event.set()

            if not pbar and pages_submitted % 500 == 0:
                elapsed = time.time() - start_time
                rate    = pages_submitted / max(elapsed, 1)
                log.info(
                    f"[{pages_submitted:,}/{MAX_PAGES:,}]"
                    f"  saved={_csv_count:,}"
                    f"  frontier={len(frontier):,}"
                    f"  pending={pending}"
                    f"  rate={rate:.1f}p/s"
                    + (f"  ε={agent.epsilon:.3f}" if agent else "")
                )

            fut = executor.submit(crawl_url, url, frontier, reward_engine)
            # closure để giữ url đúng cho callback
            fut.add_done_callback(lambda f, u=url: on_done(f, u))

    if pbar:
        pbar.close()

    elapsed = time.time() - start_time
    log.info(
        f"Crawl xong: submitted={pages_submitted:,}  saved={_csv_count:,}"
        f"  time={elapsed/60:.1f}m  rate={pages_submitted/max(elapsed,1):.1f}p/s"
    )

    # ── Fetch stats — chẩn đoán tại sao frontier cạn sớm ──
    total_attempts = sum(_fetch_stats.values())
    log.info("── Fetch Stats ──────────────────────────────")
    for k, v in sorted(_fetch_stats.items(), key=lambda x: -x[1]):
        pct = v / max(total_attempts, 1) * 100
        log.info(f"  {k:<25s} {v:>6,}  ({pct:.1f}%)")
    log.info(f"  {'TOTAL':<25s} {total_attempts:>6,}")
    log.info("─────────────────────────────────────────────")

    _db_stop.set()
    db_thread.join(timeout=30)
    close_csv()

    if agent:
        agent._save(CHECKPOINT)
        log.info(f"[DQN] Saved checkpoint → {CHECKPOINT}")
    log.info(f"CSV saved → {CSV_PATH} ({_csv_count:,} rows)")


# ══════════════════════════════════════════════════════════
# SECTION 12 — Offline training + Eval
# ══════════════════════════════════════════════════════════

def _make_negative_samples(n: int) -> list[dict]:
    """
    Negative samples đa dạng hơn — bao gồm nhiều pattern URL xấu
    với reward=0, action=0.
    """
    templates = [
        # Auth / account
        "https://{d}/login",
        "https://{d}/signin?next=/home",
        "https://{d}/signup?ref=header",
        "https://{d}/register",
        "https://{d}/logout",
        "https://{d}/account/settings",
        "https://{d}/account/profile",
        "https://{d}/user/dashboard",
        # Commerce
        "https://{d}/cart",
        "https://{d}/checkout",
        "https://{d}/payment",
        "https://{d}/order/confirm",
        # Tracking / ads
        "https://{d}/click?utm_source=fb&utm_campaign=retarget&gclid=abc",
        "https://{d}/ads/banner?ref=sidebar",
        "https://{d}/tracking?fbclid=xyz&source=email",
        "https://ads.{d}/redirect?affiliate=123",
        # Low quality
        "https://{d}/search?q=random&page=99",
        "https://{d}/tag/misc?sort=date",
        "https://{d}/category/uncategorized",
        "https://{d}/author/admin",
        "https://{d}/privacy-policy",
        "https://{d}/terms-of-service",
        "https://{d}/cookie-policy",
        # Spam domains
        "https://spam-ads.net/popup?id={i}",
        "https://doubleclick.net/ad?slot={i}",
        "https://tracker.io/pixel?uid={i}&ref=mail",
    ]
    domains = ["example.com", "shop.vn", "store.com", "site.vn", "web.com"]
    samples = []
    for i in range(n):
        tmpl   = templates[i % len(templates)]
        domain = domains[i % len(domains)]
        url    = tmpl.format(d=domain, i=i)
        samples.append({"url": url, "reward": 0.0, "_action": 0})
    return samples


def train_offline(csv_path: str = CSV_PATH, epochs: int = 10):
    if not Path(csv_path).exists():
        log.error(f"[Offline] Không tìm thấy {csv_path}")
        return

    pos_rows = []
    with open(csv_path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            row["_action"] = 1
            pos_rows.append(row)

    # 1:1 ratio pos:neg để agent học phân biệt rõ hơn
    neg_rows = _make_negative_samples(len(pos_rows))
    all_rows = pos_rows + neg_rows

    log.info(
        f"[Offline] {len(pos_rows):,} positive + {len(neg_rows):,} negative"
        f" = {len(all_rows):,} samples"
    )

    # ★ Reset checkpoint — bắt đầu từ weights mới
    #   270k steps cũ đã học "luôn CRAWL" quá sâu, fine-tune không đủ
    if os.path.exists(CHECKPOINT):
        os.rename(CHECKPOINT, CHECKPOINT + ".bak")
        log.info(f"[Offline] Backup checkpoint → {CHECKPOINT}.bak")

    agent = DQNAgent()   # fresh weights

    # LR nhỏ hơn để học ổn định
    for g in agent.optimizer.param_groups:
        g["lr"] = 5e-4

    best_loss = float("inf")
    prev_loss = float("inf")

    for epoch in range(1, epochs + 1):
        random.shuffle(all_rows)
        total_pos_r = 0.0
        n_pos = 0

        for i, row in enumerate(all_rows):
            url    = row["url"]
            reward = float(row.get("reward", 0.0))
            action = int(row.get("_action", 1))
            if action == 1:
                total_pos_r += reward
                n_pos += 1
            next_url = all_rows[i + 1]["url"] if i + 1 < len(all_rows) else None
            # ★ done=True luôn: đây là contextual bandit (mỗi URL độc lập),
            #   KHÔNG phải sequential MDP. Nếu done=False, Bellman bootstrap
            #   γ·max Q(s') cộng dồn vô hạn → Q hội tụ về r/(1-γ)=17.2
            #   bất kể URL tốt/xấu, làm mất hết tín hiệu phân biệt.
            agent.observe(url, action=action, reward=reward,
                         next_url=next_url, done=True)

        avg_loss = float(np.mean(agent._loss_history[-500:])) if agent._loss_history else 0.0
        delta    = prev_loss - avg_loss
        prev_loss = avg_loss

        log.info(
            f"[Offline] Epoch {epoch:2d}/{epochs}"
            f"  avg_reward={total_pos_r/max(n_pos,1):.4f}"
            f"  loss={avg_loss:.4f}  Δloss={delta:+.4f}"
            f"  steps={agent.steps:,}"
        )

        if avg_loss < best_loss:
            best_loss = avg_loss
            agent._save(CHECKPOINT)

    log.info(f"[Offline] Best loss={best_loss:.4f} → Saved {CHECKPOINT}")

    # Sanity check với Q-value spread rõ ràng
    log.info("[Offline] Sanity check — Q phải phân tán rõ:")
    test = [
        ("https://nhathuoclongchau.com.vn/bai-viet/huong-dan-su-dung-thuoc.html", "CRAWL"),
        ("https://tamanhhospital.vn/tin-tuc/benh-vien-tam-anh-ha-noi",            "CRAWL"),
        ("https://vi.wikipedia.org/wiki/Y_h%E1%BB%8Dc",                           "CRAWL"),
        ("https://example.com/login?redirect=/cart",                               "SKIP"),
        ("https://shop.vn/checkout",                                               "SKIP"),
        ("https://ads.example.com/click?utm_source=fb&gclid=xxx",                 "SKIP"),
        ("https://example.com/search?q=test&page=5",                              "SKIP"),
        ("https://example.com/account/settings",                                  "SKIP"),
    ]
    all_correct = True
    for url, expected in test:
        q = agent.score(url)
        a = "CRAWL" if agent.select(url) == 1 else "SKIP"
        ok = "✓" if a == expected else "✗"
        if a != expected:
            all_correct = False
        log.info(f"  {ok} {a:5s} (exp={expected:5s})  Q={q:+7.3f}  {url[:65]}")

    if all_correct:
        log.info("[Offline] ✓ Agent học tốt — sẵn sàng dùng trong crawler")
    else:
        log.warning("[Offline] ✗ Agent chưa phân biệt được — thử tăng epochs hoặc thêm data")


def run_eval():
    agent = DQNAgent()
    test_urls = [
        "https://nhathuoclongchau.com.vn/bai-viet/huong-dan-su-dung-thuoc.html",
        "https://nhathuoclongchau.com.vn/login?redirect=/cart",
        "https://blog.example.vn/2025/travel-guide-hanoi",
        "https://ads.doubleclick.net/click?utm_source=fb",
        "https://vnexpress.net/du-lich/kinh-nghiem-di-hoi-an-4567890.html",
        "https://example.com/account/settings?ref=header",
        "https://doctorai.digiso.vn/auth",
        "https://qlns.medinet.org.vn/Management/Login",
        "https://vpcp.dichvucong.gov.vn/p/home/dvc-trang-chu.html"
        ,
    ]
    print("\n── Eval mode ──────────────────────────────────────")
    print(f"  {'ACTION':<6}  {'Q-crawl':>8}  URL")
    print("  " + "─" * 60)
    for u in test_urls:
        q = agent.score(u)
        a = "CRAWL" if q > 0.3 else "SKIP"
        print(f"  {a:<6}  {q:>+8.3f}  {u}")


# ══════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Web Crawler + DQN Agent")
    parser.add_argument("--no-agent", action="store_true",
                        help="Crawl thuần heuristic, không dùng DQN")
    parser.add_argument("--offline",  action="store_true",
                        help="Train offline từ CSV (không crawl)")
    parser.add_argument("--eval",     action="store_true",
                        help="Chỉ eval agent, không crawl")
    parser.add_argument("--csv",      default=CSV_PATH,
                        help=f"Path CSV (default: {CSV_PATH})")
    parser.add_argument("--epochs",   type=int, default=5,
                        help="Số epoch offline training")
    args = parser.parse_args()

    level = os.environ.get("LOG_LEVEL", "INFO").upper()
    logging.getLogger().setLevel(getattr(logging, level, logging.INFO))

    if args.eval:
        run_eval()
    elif args.offline:
        train_offline(csv_path=args.csv, epochs=args.epochs)
    else:
        run_crawler(use_agent=not args.no_agent)