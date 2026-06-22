import { useState, useEffect, useRef, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const GoldIcon = ({ size = 16 }) => <img src="/img/main_page/gold.png" style={{ width: size, height: size, verticalAlign: "middle", objectFit: "contain", display: "inline-block" }} alt="" />;

/* ── Seed catalog ─────────────────────────────────────────── */
const SEEDS = {
  "hat-hoa-mai": {
    label: "Hoa Mai",
    icon: <img src="/img/main_page/hoa_mai.png" style={{ width: "1em", height: "1em", objectFit: "contain", verticalAlign: "middle" }} alt="" />,
    price: 30,
    baseGold: 50,
    resultImg: "/img/game_trong_cay/hoa_mai.png",
    goldenImg: "/img/game_trong_cay/hoa_mai_hoangkim.png",
  },
  "hat-dua": {
    label: "Dừa",
    icon: "🥥",
    price: 15,
    baseGold: 30,
    resultImg: "/img/game_trong_cay/cay_dua.png",
    goldenImg: "/img/game_trong_cay/cay_dua_hoangkim.png",
  },
};

/* Stage durations (seconds) */
const DUR_SPROUT = 30;  // stage 1 → 2
const DUR_YOUNG  = 20;  // stage 2 → 3 (bloom)

const C = {
  moss: "#3D5A3E", gold: "#C8963E", cream: "#F5F0E8",
  dark: "#1C2B1D", soil: "#5E3A1A",
};

/* ── CSS ───────────────────────────────────────────────────── */
const treeStyles = `
  @keyframes bloomGlow {
    0%,100% { filter: drop-shadow(0 0 6px rgba(255,200,50,0.5)); transform: scale(1); }
    50%      { filter: drop-shadow(0 0 18px rgba(255,200,50,0.95)); transform: scale(1.06); }
  }
  @keyframes goldenShimmer {
    0%,100% { filter: drop-shadow(0 0 10px rgba(255,215,0,0.8)); }
    50%      { filter: drop-shadow(0 0 28px rgba(255,215,0,1)); }
  }
  @keyframes plantBob {
    0%,100% { transform: translateY(0); }
    50%      { transform: translateY(-4px); }
  }
  @keyframes harvestPop {
    0%   { opacity:1; transform:translateY(0) scale(1); }
    100% { opacity:0; transform:translateY(-42px) scale(1.6); }
  }
  @keyframes slideUp {
    from { opacity:0; transform:translateY(28px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity:0; } to { opacity:1; }
  }
  @keyframes winBounce {
    0%,20%,50%,80%,100% { transform:translateY(0); }
    40%  { transform:translateY(-16px); }
    60%  { transform:translateY(-8px); }
  }
  @keyframes toastIn {
    from { opacity:0; transform:translate(-50%,-8px); }
    to   { opacity:1; transform:translate(-50%,0); }
  }
  @keyframes spin1s { to { transform: rotate(360deg); } }
  .plot-btn { transition: transform 0.15s, box-shadow 0.15s; }
  .plot-btn:hover { transform: translateY(-3px) scale(1.03); box-shadow: 0 8px 24px rgba(0,0,0,0.25) !important; }
  .harvest-float { position:absolute; pointer-events:none; animation:harvestPop 0.85s ease-out forwards; font-weight:800; font-family:'Be Vietnam Pro',sans-serif; }
`;

/* ── Helpers ───────────────────────────────────────────────── */
function authHeaders() {
  const t = localStorage.getItem("access_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function computeStage(stage2At, bloomsAt) {
  const now = Date.now();
  const s2   = new Date(stage2At).getTime();
  const bl   = new Date(bloomsAt).getTime();
  if (now < s2) return { stage: 1, timer: Math.ceil((s2 - now) / 1000) };
  if (now < bl) return { stage: 2, timer: Math.ceil((bl - now) / 1000) };
  return { stage: 3, timer: 0 };
}

async function apiLoadPlots() {
  const res = await fetch(`${API_BASE}/api/v1/game/plant/plots`, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

async function apiPlant(plotIndex, seedType) {
  const res = await fetch(`${API_BASE}/api/v1/game/plant/plant`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ plot_index: plotIndex, seed_type: seedType }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Lỗi");
  return res.json();
}

async function apiHarvestPlot(plotIndex) {
  const res = await fetch(`${API_BASE}/api/v1/game/plant/harvest`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ plot_index: plotIndex }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Lỗi");
  return res.json();
}

async function fetchInventory() {
  const res = await fetch(`${API_BASE}/api/v1/shop/inventory`, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

/* ── Plot factory ──────────────────────────────────────────── */
function emptyPlot(id) {
  return { id, stage: 0, timer: 0, seedType: null, isGolden: false, stage2At: null, bloomsAt: null };
}

function plotFromApi(p) {
  const { stage, timer } = computeStage(p.stage2_at, p.blooms_at);
  return {
    id: p.plot_index,
    stage,
    timer,
    seedType: p.seed_type,
    isGolden: p.is_golden,
    stage2At: p.stage2_at,
    bloomsAt: p.blooms_at,
  };
}

/* ── Sub-component: single plot ────────────────────────────── */
function PlotCell({ plot, onPlantClick, onHarvestClick, selectedSeed, floats }) {
  const { stage, timer, seedType, isGolden } = plot;
  const seed = SEEDS[seedType];

  const maxDur = stage === 1 ? DUR_SPROUT : stage === 2 ? DUR_YOUNG : 1;
  const elapsed = maxDur - timer;
  const pct = stage > 0 && stage < 3 ? Math.min(100, (elapsed / maxDur) * 100) : (stage === 3 ? 100 : 0);

  let imgSrc = null;
  if (stage === 1) imgSrc = "/img/game_trong_cay/mam_cay.png";
  else if (stage === 2) imgSrc = "/img/game_trong_cay/cay_non.png";
  else if (stage === 3) imgSrc = isGolden ? seed?.goldenImg : seed?.resultImg;

  const isBloom = stage === 3;

  return (
    <div className="plot-btn" onClick={() => isBloom ? onHarvestClick(plot.id) : onPlantClick(plot.id)}
      style={{
        position: "relative", cursor: "pointer",
        borderRadius: 16, overflow: "hidden",
        aspectRatio: "1",
        backgroundImage: "url('/img/game_trong_cay/dat.png')",
        backgroundSize: "cover", backgroundPosition: "center",
        boxShadow: isGolden && isBloom
          ? "0 0 0 3px #FFD700, 0 8px 28px rgba(255,215,0,0.5)"
          : isBloom
            ? "0 0 0 2px rgba(200,150,62,0.7), 0 6px 20px rgba(200,150,62,0.35)"
            : "0 4px 14px rgba(0,0,0,0.22)",
        userSelect: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>

      {imgSrc && (
        <img src={imgSrc} alt=""
          style={{
            width: stage === 1 ? "48%" : stage === 2 ? "65%" : "82%",
            height: stage === 1 ? "48%" : stage === 2 ? "65%" : "82%",
            objectFit: "contain",
            display: "block",
            animation: isBloom
              ? (isGolden ? "goldenShimmer 1.5s ease-in-out infinite" : "bloomGlow 1.8s ease-in-out infinite")
              : "plantBob 2.4s ease-in-out infinite",
            filter: isGolden && isBloom ? "drop-shadow(0 0 12px #FFD700)" : undefined,
          }}
        />
      )}

      {stage === 0 && selectedSeed && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: 16,
          border: "2.5px dashed rgba(200,150,62,0.75)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 4,
          background: "rgba(0,0,0,0.08)",
        }}>
          <span style={{ fontSize: "1.4rem" }}>{SEEDS[selectedSeed]?.icon}</span>
          <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.9)", fontWeight: 600, textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>Nhấn để trồng</span>
        </div>
      )}

      {stage > 0 && stage < 3 && (
        <div style={{
          position: "absolute", top: 6, left: 6,
          background: "rgba(0,0,0,0.52)", backdropFilter: "blur(4px)",
          color: "white", fontSize: "0.55rem", fontWeight: 600,
          padding: "2px 7px", borderRadius: "2rem",
        }}>
          {stage === 1 ? "🌱 Mầm cây" : "🌿 Cây non"} · {timer}s
        </div>
      )}

      {isGolden && isBloom && (
        <div style={{
          position: "absolute", top: 6, right: 6,
          background: "linear-gradient(135deg,#FFD700,#FFA500)",
          color: "#3E2200", fontSize: "0.6rem", fontWeight: 800,
          padding: "2px 7px", borderRadius: "2rem",
          boxShadow: "0 2px 8px rgba(255,215,0,0.6)",
        }}>
          ✨ HOÀNG KIM
        </div>
      )}

      {isBloom && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "linear-gradient(0deg,rgba(0,0,0,0.65) 0%,transparent 100%)",
          padding: "16px 0 8px",
          display: "flex", justifyContent: "center",
        }}>
          <span style={{
            background: isGolden ? "linear-gradient(135deg,#FFD700,#FFA500)" : C.gold,
            color: isGolden ? "#3E2200" : C.dark,
            fontSize: "0.62rem", fontWeight: 700,
            padding: "3px 12px", borderRadius: "2rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}>
            Thu hoạch +{isGolden ? Math.round(SEEDS[seedType]?.baseGold * 1.5) : SEEDS[seedType]?.baseGold}<GoldIcon size={14} />
          </span>
        </div>
      )}

      {stage > 0 && stage < 3 && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "rgba(0,0,0,0.3)" }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: "linear-gradient(90deg,#7DC97E,#4CAF50)",
            transition: "width 1s linear",
          }} />
        </div>
      )}

      {floats?.map(f => (
        <div key={f.id} className="harvest-float"
          style={{ left: "50%", top: "20%", transform: "translateX(-50%)", color: f.color, fontSize: f.size }}>
          {f.text}
        </div>
      ))}
    </div>
  );
}

/* ── Main component ────────────────────────────────────────── */
export default function PlantGame({ onClose, onComplete, standalone = false }) {
  const [phase, setPhase]           = useState("idle");
  const [plots, setPlots]           = useState(() => Array.from({ length: 16 }, (_, i) => emptyPlot(i)));
  const [selectedSeed, setSelected] = useState(null);
  const [inventory, setInventory]   = useState({});
  const [gold, setGold]             = useState(null);
  const [floats, setFloats]         = useState({});
  const [toast, setToast]           = useState(null);
  const [totalHarvested, setTotalHarvested] = useState(0);
  const [goldEarned, setGoldEarned] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading]       = useState(false);

  const phaseRef = useRef("idle");
  const plotsRef = useRef(plots);
  const tickRef  = useRef(null);

  const isLoggedIn = !!localStorage.getItem("access_token");

  /* ── Toast ── */
  const showToast = useCallback((msg, ok = true, duration = 2200) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), duration);
  }, []);

  /* ── Float ── */
  const addFloat = useCallback((plotId, text, color = C.gold, size = "1rem") => {
    const id = Date.now() + Math.random();
    setFloats(prev => ({ ...prev, [plotId]: [...(prev[plotId] || []), { id, text, color, size }] }));
    setTimeout(() => setFloats(prev => ({ ...prev, [plotId]: (prev[plotId] || []).filter(f => f.id !== id) })), 900);
  }, []);

  /* ── Refresh inventory (seeds) ── */
  const refreshInventory = useCallback(async () => {
    if (!isLoggedIn) return;
    const items = await fetchInventory();
    const map = {};
    items.filter(i => i.category === "seed").forEach(i => { map[i.item_id] = i.quantity; });
    setInventory(map);
  }, [isLoggedIn]);

  useEffect(() => { refreshInventory(); }, [refreshInventory]);

  /* ── Load gold from localStorage ── */
  useEffect(() => {
    try {
      const ud = JSON.parse(localStorage.getItem("user_data") || "{}");
      if (ud.gold != null) setGold(ud.gold);
    } catch {}
  }, []);

  /* ── Tick: so sánh now với stage2_at / blooms_at ── */
  const tick = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    const next = plotsRef.current.map(p => {
      if (!p.bloomsAt || p.stage === 3) return p;
      const { stage, timer } = computeStage(p.stage2At, p.bloomsAt);
      return { ...p, stage, timer };
    });
    plotsRef.current = next;
    setPlots([...next]);
  }, []);

  /* ── Load plots from DB ── */
  const loadDbPlots = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const data = await apiLoadPlots();
      const fresh = Array.from({ length: 16 }, (_, i) => emptyPlot(i));
      data.forEach(p => { fresh[p.plot_index] = plotFromApi(p); });
      plotsRef.current = fresh;
      setPlots([...fresh]);
    } catch (e) {
      console.error("Load plots error", e);
    }
  }, [isLoggedIn]);

  /* ── Start session ── */
  const startSession = useCallback(async () => {
    phaseRef.current = "playing";
    setPhase("playing");
    setTotalHarvested(0);
    setGoldEarned(0);
    setFloats({});
    setSelected(null);
    setLoading(true);
    await loadDbPlots();
    setLoading(false);
    clearInterval(tickRef.current);
    tickRef.current = setInterval(tick, 1000);
  }, [loadDbPlots, tick]);

  useEffect(() => () => clearInterval(tickRef.current), []);

  /* ── Plant ── */
  const handlePlantClick = useCallback(async (plotId) => {
    if (phaseRef.current !== "playing") return;
    if (!selectedSeed) { showToast("Chọn loại hạt giống trước! 🌱", false); return; }
    if (!isLoggedIn) { showToast("Đăng nhập để trồng cây!", false); return; }
    if ((inventory[selectedSeed] || 0) < 1) {
      showToast("Hết hạt giống! Mua thêm ở Cửa hàng 🏪", false); return;
    }
    const p = plotsRef.current.find(x => x.id === plotId);
    if (!p || p.stage !== 0) return;

    try {
      setSubmitting(true);
      const res = await apiPlant(plotId, selectedSeed);
      setInventory(prev => ({ ...prev, [selectedSeed]: Math.max(0, (prev[selectedSeed] || 1) - 1) }));
      const next = plotsRef.current.map(x =>
        x.id === plotId ? plotFromApi(res) : x
      );
      plotsRef.current = next;
      setPlots([...next]);
      addFloat(plotId, "🌱 Đã trồng!", "#A3E635", "0.8rem");
    } catch (e) {
      showToast(e.message || "Lỗi khi trồng cây", false);
    } finally {
      setSubmitting(false);
    }
  }, [selectedSeed, inventory, isLoggedIn, showToast, addFloat]);

  /* ── Harvest ── */
  const handleHarvestClick = useCallback(async (plotId) => {
    if (phaseRef.current !== "playing") return;
    const p = plotsRef.current.find(x => x.id === plotId);
    if (!p || p.stage !== 3) return;

    try {
      setSubmitting(true);
      const res = await apiHarvestPlot(plotId);
      setGold(res.gold);
      setTotalHarvested(h => h + 1);
      setGoldEarned(g => g + res.gold_earned);

      const next = plotsRef.current.map(x => x.id === plotId ? emptyPlot(plotId) : x);
      plotsRef.current = next;
      setPlots([...next]);

      const floatColor = p.isGolden ? "#FFD700" : C.gold;
      addFloat(plotId, `+${res.gold_earned} vàng${p.isGolden ? " ✨" : ""}`, floatColor, "1.1rem");
      if (p.isGolden) showToast(`Hoa Hoàng Kim! +${res.gold_earned} vàng ✨`, true);

      // Sync gold to localStorage
      try {
        const ud = JSON.parse(localStorage.getItem("user_data") || "{}");
        localStorage.setItem("user_data", JSON.stringify({ ...ud, gold: res.gold }));
      } catch {}
    } catch (e) {
      showToast(e.message || "Lỗi khi thu hoạch", false);
    } finally {
      setSubmitting(false);
    }
  }, [addFloat, showToast]);

  /* ── Derived ── */
  const seedCounts = { "hat-hoa-mai": inventory["hat-hoa-mai"] || 0, "hat-dua": inventory["hat-dua"] || 0 };
  const totalSeeds = seedCounts["hat-hoa-mai"] + seedCounts["hat-dua"];

  /* ── Header ── */
  const headerBar = (
    <div style={{ background: "linear-gradient(135deg,#1A3A22,#243B2A)", padding: "0.85rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img src="/img/game_trong_cay/hoa_mai.png" alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
        <div>
          <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.95rem", fontWeight: 600, color: "white", margin: 0 }}>Trồng Cây Bình Lợi</p>
          <p style={{ fontSize: "0.6rem", color: "rgba(245,240,232,0.6)", margin: 0 }}>Chọn hạt · trồng · chờ nở · thu hoạch 🌾</p>
        </div>
      </div>
      {phase === "playing" && (
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {gold !== null && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.55rem", color: "rgba(245,240,232,0.55)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Vàng</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", fontWeight: 600, color: C.gold }}><GoldIcon size={20} />{gold}</div>
            </div>
          )}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.55rem", color: "rgba(245,240,232,0.55)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Thu hoạch</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", fontWeight: 600, color: "#A3E635" }}>+{goldEarned}<GoldIcon size={20} /></div>
          </div>
        </div>
      )}
      <button onClick={onClose} style={{
        background: "rgba(255,255,255,0.12)", border: "none", cursor: "pointer", color: "white",
        ...(standalone
          ? { padding: "0.4rem 1rem", borderRadius: "2rem", fontSize: "0.82rem", fontFamily: "'Be Vietnam Pro',sans-serif", fontWeight: 500 }
          : { width: 30, height: 30, borderRadius: "50%", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }),
      }}>
        {standalone ? "← Quay lại" : "×"}
      </button>
    </div>
  );

  /* ── Idle screen ── */
  const idleScreen = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "1.1rem", padding: "2rem 1.5rem", overflowY: "auto" }}>
      <img src="/img/game_trong_cay/hoa_mai.png" alt="" style={{ width: 80, height: 80, objectFit: "contain", animation: "plantBob 2.5s ease-in-out infinite" }} />
      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.5rem", color: C.dark, textAlign: "center", margin: 0 }}>Trồng Cây Bình Lợi 🌱</h2>
      <p style={{ fontSize: "0.84rem", color: "#666", lineHeight: 1.75, textAlign: "center", maxWidth: 340, margin: 0 }}>
        Mua hạt giống từ <strong>Cửa hàng</strong>, trồng vào 16 ô đất, chờ nở và thu hoạch để nhận vàng! Tiến trình được lưu tự động.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", width: "100%", maxWidth: 400 }}>
        {Object.entries(SEEDS).map(([id, s]) => (
          <div key={id} style={{ background: "white", borderRadius: 16, padding: "1rem", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.6rem" }}>
              <img src={s.resultImg} alt="" style={{ width: 36, height: 36, objectFit: "contain" }} />
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: C.dark }}>Hạt giống {s.label}</div>
                <div style={{ fontSize: "0.65rem", color: "#aaa" }}>{id === "hat-hoa-mai" ? "Quý hiếm" : "Phổ thông"}</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#666", borderTop: "1px solid #F0EBE3", paddingTop: "0.5rem" }}>
              <span>💰 Mua: <strong style={{ color: C.soil }}>{s.price}<GoldIcon size={13} /></strong></span>
              <span>🌾 Thu: <strong style={{ color: "#2D6A4F" }}>{s.baseGold}<GoldIcon size={13} /></strong></span>
            </div>
            <div style={{ fontSize: "0.62rem", color: C.gold, marginTop: 4 }}>✨ 10% may mắn hoàng kim x1.5</div>
            <div style={{ fontSize: "0.65rem", color: "#888", marginTop: 2 }}>Túi đồ: <strong>{seedCounts[id]}</strong> hạt</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#F5F0E8", borderRadius: 14, padding: "0.85rem 1rem", width: "100%", maxWidth: 400 }}>
        <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#8D6E63", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.6rem" }}>Quá trình tăng trưởng</div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexWrap: "wrap", justifyContent: "center" }}>
          {[
            ["dat.png","Đất trống",""],
            ["mam_cay.png","Mầm cây","30s"],
            ["cay_non.png","Cây non","20s"],
            ["hoa_mai.png","Nở hoa",""],
          ].map(([img, label, dur], i, arr) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <div style={{ textAlign: "center" }}>
                <img src={`/img/game_trong_cay/${img}`} alt="" style={{ width: 32, height: 32, objectFit: "contain", display: "block", margin: "0 auto 2px" }} />
                <div style={{ fontSize: "0.58rem", color: "#7A5525", fontWeight: 600 }}>{label}</div>
                {dur && <div style={{ fontSize: "0.55rem", color: "#aaa" }}>~{dur}</div>}
              </div>
              {i < arr.length - 1 && <span style={{ color: "#C8A96E", fontSize: "0.8rem" }}>→</span>}
            </div>
          ))}
        </div>
      </div>

      {!isLoggedIn && (
        <div style={{ background: "#FFF8E1", border: "1px solid rgba(200,150,62,0.3)", borderRadius: 12, padding: "0.65rem 1rem", width: "100%", maxWidth: 400, fontSize: "0.78rem", color: "#7A5525", textAlign: "center" }}>
          ⚠️ Đăng nhập để trồng cây và nhận vàng thật
        </div>
      )}

      {isLoggedIn && totalSeeds === 0 && (
        <div style={{ background: "#FFF8E1", border: "1px solid rgba(200,150,62,0.3)", borderRadius: 12, padding: "0.65rem 1rem", width: "100%", maxWidth: 400, fontSize: "0.78rem", color: "#7A5525", textAlign: "center" }}>
          🛍️ Bạn chưa có hạt giống! Mua trong <strong>Cửa hàng → Túi đồ</strong> để bắt đầu
        </div>
      )}

      <button onClick={startSession} style={{
        background: "linear-gradient(135deg,#1A3A22,#2D6A4F)", color: "white", border: "none",
        padding: "0.85rem 2.5rem", borderRadius: "2rem", fontSize: "0.92rem", fontWeight: 600,
        cursor: "pointer", fontFamily: "'Be Vietnam Pro',sans-serif",
        boxShadow: "0 8px 24px rgba(45,106,79,0.4)", transition: "transform 0.2s,box-shadow 0.2s",
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(45,106,79,0.5)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(45,106,79,0.4)"; }}>
        🌱 Vào vườn cây
      </button>
    </div>
  );

  /* ── Playing screen ── */
  const playingScreen = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "linear-gradient(180deg,#0D1F10,#1B2E1C)", overflow: "hidden" }}>
      {toast && (
        <div style={{
          position: "absolute", top: 70, left: "50%",
          background: toast.ok ? "rgba(45,106,79,0.95)" : "rgba(153,58,26,0.95)",
          color: "white", padding: "0.45rem 1.2rem", borderRadius: "2rem",
          fontSize: "0.8rem", fontWeight: 600, zIndex: 20, whiteSpace: "nowrap",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)", animation: "toastIn 0.25s ease-out",
          pointerEvents: "none",
        }}>
          {toast.msg}
        </div>
      )}

      {/* Seed selector */}
      <div style={{ padding: "0.65rem 1rem 0.55rem", background: "rgba(0,0,0,0.45)", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {Object.entries(SEEDS).map(([id, s]) => {
            const qty = seedCounts[id];
            const isActive = selectedSeed === id;
            const isEmpty = qty === 0;
            return (
              <button key={id} onClick={() => !isEmpty && setSelected(sel => sel === id ? null : id)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                  padding: "0.55rem 1.1rem",
                  borderRadius: 14,
                  border: `2px solid ${isActive ? C.gold : isEmpty ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.15)"}`,
                  background: isActive ? "rgba(200,150,62,0.22)" : "rgba(255,255,255,0.06)",
                  cursor: isEmpty ? "not-allowed" : "pointer",
                  fontFamily: "'Be Vietnam Pro',sans-serif",
                  transition: "all 0.2s",
                  boxShadow: isActive ? "0 0 0 3px rgba(200,150,62,0.2)" : "none",
                  opacity: isEmpty ? 0.45 : 1,
                }}>
                <img src={s.resultImg} alt="" style={{ width: 44, height: 44, objectFit: "contain", filter: isEmpty ? "grayscale(0.8)" : "none" }} />
                <div style={{ fontSize: "0.72rem", fontWeight: 600, color: isActive ? C.gold : "rgba(255,255,255,0.85)" }}>{s.label}</div>
                <div style={{
                  background: qty > 0 ? (isActive ? C.gold : "rgba(255,255,255,0.18)") : "rgba(255,255,255,0.07)",
                  color: qty > 0 ? (isActive ? C.dark : "white") : "rgba(255,255,255,0.35)",
                  padding: "1px 10px", borderRadius: "2rem", fontSize: "0.68rem", fontWeight: 700,
                }}>
                  ×{qty}
                </div>
              </button>
            );
          })}
          <div style={{ flex: 1, fontSize: "0.68rem", color: selectedSeed ? C.gold : "rgba(255,255,255,0.3)", lineHeight: 1.6, paddingLeft: "0.25rem" }}>
            {selectedSeed
              ? <><strong style={{ color: C.gold }}>{SEEDS[selectedSeed].label}</strong><br />Nhấn ô đất để trồng</>
              : "Chọn hạt giống\nrồi nhấn ô đất"}
          </div>
          {(submitting || loading) && (
            <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", animation: "spin1s 1s linear infinite", display: "inline-block" }}>⟳</span>
          )}
        </div>
      </div>

      {/* Plots grid 4×4 */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.5rem", padding: "0.6rem 0.85rem 0.75rem", alignContent: "start" }}>
        {plots.map(plot => (
          <PlotCell
            key={plot.id}
            plot={plot}
            onPlantClick={handlePlantClick}
            onHarvestClick={handleHarvestClick}
            selectedSeed={selectedSeed}
            floats={floats[plot.id] || []}
          />
        ))}
      </div>

      <div style={{ padding: "0 1rem 0.75rem", textAlign: "center" }}>
        <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)" }}>
          {selectedSeed
            ? `🌱 Chọn ô đất trống để trồng ${SEEDS[selectedSeed].label} · Nhấn vào cây nở để thu hoạch`
            : "Chọn loại hạt giống ở trên · Nhấn ô đất để trồng · Thu hoạch khi cây nở hoa 🌸"}
        </span>
      </div>
    </div>
  );

  const body = (
    <>
      <style>{treeStyles}</style>
      <div style={{
        display: "flex", flexDirection: "column",
        background: phase === "playing" ? "#0D1F10" : C.cream,
        ...(standalone ? { minHeight: "100vh" } : { borderRadius: 24, overflow: "hidden", width: 520, maxWidth: "98vw", maxHeight: "96vh", boxShadow: "0 32px 80px rgba(0,0,0,0.28)", animation: "slideUp 0.4s cubic-bezier(0.34,1.2,0.64,1) forwards", position: "relative" }),
      }}>
        {headerBar}
        {phase === "idle"    && idleScreen}
        {phase === "playing" && playingScreen}
      </div>
    </>
  );

  if (standalone) return body;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(28,43,29,0.55)", zIndex: 500, backdropFilter: "blur(3px)" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 501, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ pointerEvents: "auto" }}>{body}</div>
      </div>
    </>
  );
}
