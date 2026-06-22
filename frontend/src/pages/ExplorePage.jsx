import { useState, useRef } from "react";
import { C, API_BASE } from "../constants";
import LogoIcon from "../components/LogoIcon";
import MaiGame from "./minigame";
import PlantGame from "./planttree";

const PRESETS = [
  { label: "🐟 Nông dân Koi",       prompt: "Vietnamese koi fish farmer wearing áo bà ba, standing beside a beautiful koi pond, golden sunlight, peaceful rural atmosphere",    style: "(No style)" },
  { label: "🪔 Nghệ nhân nhang",     prompt: "Vietnamese incense artisan in a traditional workshop, surrounded by colorful incense sticks, warm amber lighting, detailed craftsmanship", style: "Watercolor" },
  { label: "🌸 Áo dài hoa mai",      prompt: "Elegant person wearing traditional Vietnamese áo dài, standing in a blooming yellow mai flower garden, Bình Lợi village, beautiful golden light", style: "Spring Festival" },
  { label: "🏯 Võ tướng triều Nguyễn", prompt: "Vietnamese Nguyen dynasty general in ancient armor, dramatic lighting, intricate golden details, epic portrait",               style: "Film Noir" },
  { label: "🧘 Nhà sư Bình Lợi",    prompt: "Serene Buddhist monk in saffron robes, Vietnamese pagoda garden, lotus flowers, soft morning light, peaceful spiritual atmosphere", style: "(No style)" },
  { label: "🌾 Người làng xưa",      prompt: "Traditional Vietnamese villager surrounded by lush green rice fields and tropical garden, warm nostalgic atmosphere",             style: "Watercolor" },
];

// ─── EXPLORE PAGE ───
export default function ExplorePage({ onBack }) {
  const [view, setView] = useState("categories");

  // Transform state
  const [preview, setPreview]         = useState(null);
  const [imageFile, setImageFile]     = useState(null);
  const [dragging, setDragging]       = useState(false);
  const [selectedPreset, setSelected] = useState(null);
  const [customPrompt, setCustom]     = useState("");
  const [generating, setGenerating]   = useState(false);
  const [result, setResult]           = useState(null);
  const [tError, setTError]           = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setTError(null);
  };

  const handleGenerate = async () => {
    const prompt = selectedPreset?.prompt || customPrompt.trim();
    if (!imageFile) { setTError("Vui lòng upload ảnh chân dung trước."); return; }
    if (!prompt)    { setTError("Vui lòng chọn phong cách hoặc nhập mô tả."); return; }
    setGenerating(true);
    setResult(null);
    setTError(null);
    try {
      const fd = new FormData();
      fd.append("file", imageFile);
      fd.append("prompt", prompt);
      fd.append("style", selectedPreset?.style || "(No style)");
      const res = await fetch(`${API_BASE}/api/v1/transform`, { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Lỗi server"); }
      const data = await res.json();
      setResult(data.image_url);
    } catch (e) {
      setTError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  if (view === "playing-mai") {
    return <MaiGame standalone onClose={() => setView("minigame")} onComplete={(s) => console.log("Score:", s)} />;
  }
  if (view === "playing-tree") {
    return <PlantGame standalone onClose={() => setView("minigame")} onComplete={(s) => console.log("Score:", s)} />;
  }
  // legacy compat
  if (view === "playing") {
    return <MaiGame standalone onClose={() => setView("minigame")} onComplete={(s) => console.log("Score:", s)} />;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#F7F3ED", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap');
        @keyframes fallDemo { 0%{transform:translateY(-10px) rotate(0deg); opacity:1} 100%{transform:translateY(110px) rotate(360deg); opacity:0.6} }
        @keyframes bobChar  { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(-6px)} }
        @keyframes bloomPulseCard { 0%,100%{transform:scale(1); filter:drop-shadow(0 0 6px rgba(255,200,50,0.5))} 50%{transform:scale(1.15); filter:drop-shadow(0 0 14px rgba(255,200,50,0.9))} }
        @keyframes treeBobCard { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        .explore-card { transition: transform 0.22s ease, box-shadow 0.22s ease; cursor: pointer; }
        .explore-card:hover { transform: translateY(-5px); box-shadow: 0 24px 56px rgba(0,0,0,0.14) !important; }
      `}</style>

      {/* ── Top nav ── */}
      <nav style={{ background: "rgba(254,252,248,0.97)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(200,150,62,0.15)", padding: "0 2rem", height: 60, display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 100, flexShrink: 0 }}>
        <button onClick={onBack}
          style={{ background: "none", border: "1.5px solid rgba(61,90,62,0.3)", color: C.moss, padding: "0.35rem 0.85rem", borderRadius: "2rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: 500, fontFamily: "'Be Vietnam Pro', sans-serif", display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s", whiteSpace: "nowrap" }}
          onMouseEnter={e => { e.currentTarget.style.background = C.moss; e.currentTarget.style.color = "white"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.moss; }}>
          ← Trang chủ
        </button>
        <div style={{ width: 1, height: 20, background: "rgba(0,0,0,0.1)", margin: "0 4px" }} />
        <LogoIcon />
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", fontWeight: 600, color: C.moss }}>BÌNH LỢI</span>
        <span style={{ color: "#d0c8bc", fontSize: "0.85rem" }}>/</span>
        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: view === "categories" ? C.dark : C.moss, cursor: view !== "categories" ? "pointer" : "default" }} onClick={() => view !== "categories" && setView("categories")}>Khám phá</span>
        {view === "minigame" && (
          <>
            <span style={{ color: "#d0c8bc", fontSize: "0.85rem" }}>/</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: C.dark }}>Minigame</span>
          </>
        )}
        {view === "transform" && (
          <>
            <span style={{ color: "#d0c8bc", fontSize: "0.85rem" }}>/</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: C.dark }}>Hóa thân nhân vật</span>
          </>
        )}
      </nav>

      {/* ── Body ── */}
      <div style={{ flex: 1, maxWidth: 1100, width: "100%", margin: "0 auto", padding: "3rem 2rem 4rem" }}>

        {/* ────────── VIEW: CATEGORIES ────────── */}
        {view === "categories" && (
          <>
            <div style={{ marginBottom: "2.5rem" }}>
              <p style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: C.gold, marginBottom: "0.5rem" }}>✦ Bình Lợi</p>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 600, color: C.dark, lineHeight: 1.25, marginBottom: "0.75rem" }}>Khám phá</h1>
              <p style={{ fontSize: "0.88rem", color: "#888", lineHeight: 1.75, maxWidth: 440 }}>
                Trải nghiệm những hoạt động thú vị tại Bình Lợi — từ mini game tích điểm đến bản đồ khám phá vùng đất.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem", maxWidth: 680 }}>

              {/* ── Card Hóa Thân ── */}
              <div className="explore-card" onClick={() => { setView("transform"); setResult(null); setTError(null); }}
                style={{ background: "white", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 4px 18px rgba(0,0,0,0.07)" }}>
                <div style={{ height: 190, background: "linear-gradient(135deg,#1a0533,#3b1060,#6d28a7)", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {/* sparkle particles */}
                  {[{l:"18%",t:"22%",s:18},{l:"68%",t:"14%",s:14},{l:"80%",t:"60%",s:20},{l:"30%",t:"70%",s:12},{l:"55%",t:"45%",s:16}].map((p,i)=>(
                    <div key={i} style={{ position:"absolute", left:p.l, top:p.t, width:p.s, height:p.s, borderRadius:"50%", background:"rgba(255,220,100,0.55)", filter:"blur(3px)", animation:`bloomPulseCard ${1.5+i*0.3}s ease-in-out ${i*0.4}s infinite` }} />
                  ))}
                  <div style={{ position:"relative", textAlign:"center" }}>
                    <div style={{ fontSize:"3.2rem", filter:"drop-shadow(0 0 12px rgba(200,150,255,0.9))", lineHeight:1 }}>✨</div>
                    <div style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.7)", marginTop:6, letterSpacing:"0.12em", fontWeight:500 }}>AI TRANSFORM</div>
                  </div>
                  <div style={{ position:"absolute", top:12, left:12, background:"rgba(109,40,167,0.85)", color:"#E9D5FF", fontSize:"0.6rem", fontWeight:700, padding:"0.2rem 0.65rem", borderRadius:"2rem", backdropFilter:"blur(4px)" }}>🪄 AI</div>
                </div>
                <div style={{ padding: "1.25rem 1.4rem 1.5rem" }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 600, color: C.dark, marginBottom: "0.4rem" }}>Hóa thân nhân vật</h3>
                  <p style={{ fontSize: "0.8rem", color: "#888", lineHeight: 1.65, marginBottom: "1rem" }}>
                    Upload ảnh chân dung — AI giữ nguyên khuôn mặt bạn, hóa thân thành nông dân Koi, võ tướng... theo phong cách Bình Lợi.
                  </p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.7rem", color: "#bbb" }}>Powered by InstantID</span>
                    <span style={{ fontSize: "0.78rem", color: "#7C3AED", fontWeight: 700 }}>Thử ngay →</span>
                  </div>
                </div>
              </div>

              <div className="explore-card" onClick={() => setView("minigame")}
                style={{ background: "white", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 4px 18px rgba(0,0,0,0.07)" }}>

                {/* Thumbnail */}
                <div style={{ height: 190, backgroundImage: "url('/img/minigame_1/background.jpeg')", backgroundSize: "cover", backgroundPosition: "center", position: "relative", overflow: "hidden" }}>
                  {[{ left: "18%", top: -8, size: 24, dur: "2.1s", delay: "0s" }, { left: "50%", top: -14, size: 19, dur: "2.5s", delay: "0.6s" }, { left: "76%", top: -4, size: 28, dur: "1.9s", delay: "1.2s" }].map((f, i) => (
                    <div key={i} style={{ position: "absolute", left: f.left, top: f.top, animation: `fallDemo ${f.dur} linear ${f.delay} infinite` }}>
                      <img src="/img/minigame_1/hoa_mai.png" alt="" style={{ width: f.size, height: f.size, objectFit: "contain" }} />
                    </div>
                  ))}
                  <div style={{ position: "absolute", bottom: 34, left: "50%", transform: "translateX(-50%)", width: 68, height: 28, border: "1.5px dashed rgba(200,150,62,0.65)", borderRadius: "50%" }} />
                  <div style={{ position: "absolute", bottom: 10, left: "50%", animation: "bobChar 2s ease-in-out infinite" }}>
                    <img src="/img/minigame_1/character.png" alt="" style={{ width: 56, height: 56, objectFit: "contain", filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.35))", display: "block" }} />
                  </div>
                  <div style={{ position: "absolute", top: 12, left: 12, background: C.gold, color: C.dark, fontSize: "0.6rem", fontWeight: 700, padding: "0.2rem 0.65rem", borderRadius: "2rem", letterSpacing: "0.06em" }}>🎮 MINI GAME</div>
                </div>

                {/* Info */}
                <div style={{ padding: "1.25rem 1.4rem 1.5rem" }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 600, color: C.dark, marginBottom: "0.4rem" }}>Minigame</h3>
                  <p style={{ fontSize: "0.8rem", color: "#888", lineHeight: 1.65, marginBottom: "1rem" }}>
                    Tham gia các trò chơi vui nhộn, tích EXP để đổi ưu đãi Workshop độc quyền.
                  </p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.7rem", color: "#bbb" }}>2 trò chơi</span>
                    <span style={{ fontSize: "0.78rem", color: C.moss, fontWeight: 600 }}>Khám phá →</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ────────── VIEW: MINIGAME ────────── */}
        {view === "minigame" && (
          <>
            <div style={{ marginBottom: "2.5rem" }}>
              <p style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: C.gold, marginBottom: "0.5rem" }}>✦ Mini Game</p>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 600, color: C.dark, lineHeight: 1.25, marginBottom: "0.75rem" }}>Minigame</h1>
              <p style={{ fontSize: "0.88rem", color: "#888", lineHeight: 1.75, maxWidth: 440 }}>
                Chọn trò chơi bạn muốn thử. Hoàn thành để nhận EXP đổi ưu đãi Workshop!
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1.25rem", maxWidth: 580 }}>

              {/* ── Card 1: Nhặt hoa mai ── */}
              <div className="explore-card" onClick={() => setView("playing-mai")}
                style={{ background: "white", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 4px 18px rgba(0,0,0,0.07)" }}>
                <div style={{ height: 190, backgroundImage: "url('/img/minigame_1/background.jpeg')", backgroundSize: "cover", backgroundPosition: "center", position: "relative", overflow: "hidden" }}>
                  {[{ left: "20%", top: -8, size: 26, dur: "2.1s", delay: "0s" }, { left: "52%", top: -14, size: 20, dur: "2.5s", delay: "0.5s" }, { left: "75%", top: -4, size: 28, dur: "1.9s", delay: "1s" }].map((f, i) => (
                    <div key={i} style={{ position: "absolute", left: f.left, top: f.top, animation: `fallDemo ${f.dur} linear ${f.delay} infinite` }}>
                      <img src="/img/minigame_1/hoa_mai.png" alt="" style={{ width: f.size, height: f.size, objectFit: "contain" }} />
                    </div>
                  ))}
                  <div style={{ position: "absolute", bottom: 34, left: "50%", transform: "translateX(-50%)", width: 68, height: 28, border: "1.5px dashed rgba(200,150,62,0.65)", borderRadius: "50%" }} />
                  <div style={{ position: "absolute", bottom: 10, left: "50%", animation: "bobChar 2s ease-in-out infinite" }}>
                    <img src="/img/minigame_1/character.png" alt="" style={{ width: 56, height: 56, objectFit: "contain", filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.35))", display: "block" }} />
                  </div>
                  <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(28,43,29,0.78)", color: "#F5F0E8", fontSize: "0.6rem", fontWeight: 600, padding: "0.2rem 0.65rem", borderRadius: "2rem", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", gap: 4 }}><img src="/img/main_page/hoa_mai.png" style={{ width: 12, height: 12, objectFit: "contain" }} alt="" /> Nhặt hoa mai</div>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(200,150,62,0.9)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 18px rgba(0,0,0,0.3)" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    </div>
                  </div>
                </div>
                <div style={{ padding: "1.25rem 1.4rem 1.5rem" }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 600, color: C.dark, marginBottom: "0.4rem" }}>Nhặt Hoa Mai</h3>
                  <p style={{ fontSize: "0.8rem", color: "#888", lineHeight: 1.65, marginBottom: "1rem" }}>
                    Điều khiển Mai nhặt những bông hoa mai rơi. Đừng để hoa chạm đất — tích combo để nhân điểm!
                  </p>
                  <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                    {[["⏱", "60 giây"], ["❤️", "3 mạng"], ["🔥", "Combo x5"]].map(([e, t]) => (
                      <span key={t} style={{ background: "#F0F7F0", color: C.moss, fontSize: "0.68rem", fontWeight: 500, padding: "0.18rem 0.55rem", borderRadius: "2rem", border: "1px solid rgba(61,90,62,0.18)" }}>{e} {t}</span>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.7rem", color: "#bbb" }}>+1 điểm / bông</span>
                    <span style={{ fontSize: "0.78rem", color: C.gold, fontWeight: 700 }}>Chơi ngay →</span>
                  </div>
                </div>
              </div>

              {/* ── Card 2: Trồng cây ── */}
              <div className="explore-card" onClick={() => setView("playing-tree")}
                style={{ background: "white", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 4px 18px rgba(0,0,0,0.07)" }}>
                <div style={{
                  height: 190, position: "relative", overflow: "hidden",
                  background: "linear-gradient(160deg, #0D1F10, #1A3A22)",
                }}>
                  {/* Animated soil plots preview */}
                  <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, padding: "18px 20px 14px" }}>
                    {[
                      { emoji: <img src="/img/main_page/hoa_mai.png" style={{ width: 24, height: 24, objectFit: "contain" }} alt="" />, glow: true, delay: "0s" },
                      { emoji: "🌲", glow: false, delay: "0.3s" },
                      { emoji: "🌿", glow: false, delay: "0.6s" },
                      { emoji: "🌱", glow: false, delay: "0.2s" },
                      { emoji: <img src="/img/main_page/hoa_mai.png" style={{ width: 24, height: 24, objectFit: "contain" }} alt="" />, glow: true, delay: "0.8s" },
                      { emoji: "🌿", glow: false, delay: "0.5s" },
                    ].map((p, i) => (
                      <div key={i} style={{
                        borderRadius: 12, background: p.glow ? "rgba(200,150,62,0.18)" : "rgba(255,255,255,0.06)",
                        border: `1.5px solid ${p.glow ? "rgba(200,150,62,0.55)" : "rgba(255,255,255,0.1)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1.5rem",
                        animation: p.glow ? `bloomPulseCard 2s ease-in-out ${p.delay} infinite` : `treeBobCard 2.5s ease-in-out ${p.delay} infinite`,
                      }}>
                        {p.emoji}
                      </div>
                    ))}
                  </div>
                  <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(45,106,79,0.85)", color: "#A3E635", fontSize: "0.6rem", fontWeight: 600, padding: "0.2rem 0.65rem", borderRadius: "2rem", backdropFilter: "blur(4px)" }}>🌱 Trồng cây</div>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(45,106,79,0.9)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 18px rgba(0,0,0,0.3)" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    </div>
                  </div>
                </div>
                <div style={{ padding: "1.25rem 1.4rem 1.5rem" }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 600, color: C.dark, marginBottom: "0.4rem" }}>Trồng Cây Bình Lợi</h3>
                  <p style={{ fontSize: "0.8rem", color: "#888", lineHeight: 1.65, marginBottom: "1rem" }}>
                    Trồng hạt, tưới nước, bón phân — chăm sóc 6 ô đất và thu hoạch hoa trước khi hết giờ!
                  </p>
                  <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                    {[
                      ["⏱", "2 phút"],
                      ["💧", "Tưới nước"],
                      ["🌿", "Bón phân"],
                      [<img key="mai" src="/img/main_page/hoa_mai.png" style={{ width: 12, height: 12, objectFit: "contain", verticalAlign: "middle" }} alt="" />, "+15đ / hoa"],
                    ].map(([e, t]) => (
                      <span key={t} style={{ background: "#F0F7F0", color: C.moss, fontSize: "0.68rem", fontWeight: 500, padding: "0.18rem 0.55rem", borderRadius: "2rem", border: "1px solid rgba(61,90,62,0.18)", display: "inline-flex", alignItems: "center", gap: 3 }}>{e} {t}</span>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.7rem", color: "#bbb" }}>4 giai đoạn tăng trưởng</span>
                    <span style={{ fontSize: "0.78rem", color: C.gold, fontWeight: 700 }}>Chơi ngay →</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        {/* ────────── VIEW: TRANSFORM ────────── */}
        {view === "transform" && (
          <>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{ marginBottom: "2rem" }}>
              <p style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#7C3AED", marginBottom: "0.5rem" }}>✦ AI · InstantID</p>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 600, color: C.dark, lineHeight: 1.25, marginBottom: "0.6rem" }}>Hóa thân nhân vật</h1>
              <p style={{ fontSize: "0.88rem", color: "#888", lineHeight: 1.75, maxWidth: 500 }}>
                Upload ảnh chân dung — AI giữ nguyên khuôn mặt bạn và hóa thân thành nhân vật Bình Lợi.
              </p>
            </div>

            <div className="bl-explore-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", maxWidth: 860 }}>

              {/* LEFT: upload */}
              <div>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#555", marginBottom: "0.75rem" }}>1. Ảnh chân dung của bạn</p>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
                  style={{ border: `2px dashed ${dragging ? "#7C3AED" : preview ? "#7C3AED" : "rgba(0,0,0,0.15)"}`, borderRadius: 16, background: dragging ? "rgba(124,58,237,0.04)" : "#FAFAFA", minHeight: 280, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", transition: "all 0.2s", position: "relative" }}>
                  {preview ? (
                    <img src={preview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
                  ) : (
                    <div style={{ textAlign: "center", padding: "2rem" }}>
                      <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🖼️</div>
                      <p style={{ fontSize: "0.82rem", color: "#aaa", lineHeight: 1.6 }}>Kéo thả hoặc click để chọn ảnh<br /><span style={{ fontSize: "0.72rem" }}>JPG, PNG · Nên dùng ảnh chân dung rõ mặt</span></p>
                    </div>
                  )}
                  {preview && (
                    <button onClick={e => { e.stopPropagation(); setPreview(null); setImageFile(null); setResult(null); }}
                      style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", color: "white", fontSize: "0.68rem", padding: "0.25rem 0.6rem", borderRadius: "2rem", border: "none", cursor: "pointer" }}>
                      ✕ Đổi ảnh
                    </button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files?.[0])} />
              </div>

              {/* RIGHT: style + generate */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                <div>
                  <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#555", marginBottom: "0.65rem" }}>2. Chọn phong cách</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {PRESETS.map((p) => (
                      <div key={p.label} onClick={() => { setSelected(p); setCustom(""); setResult(null); setTError(null); }}
                        style={{ padding: "0.55rem 0.9rem", borderRadius: 10, border: `1.5px solid ${selectedPreset?.label === p.label ? "#7C3AED" : "rgba(0,0,0,0.1)"}`, background: selectedPreset?.label === p.label ? "rgba(124,58,237,0.06)" : "white", cursor: "pointer", fontSize: "0.82rem", color: selectedPreset?.label === p.label ? "#7C3AED" : C.dark, fontWeight: selectedPreset?.label === p.label ? 600 : 400, transition: "all 0.15s" }}>
                        {p.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#555", marginBottom: "0.45rem" }}>Hoặc tự nhập prompt</p>
                  <textarea
                    value={customPrompt}
                    onChange={e => { setCustom(e.target.value); setSelected(null); setResult(null); setTError(null); }}
                    placeholder="VD: samurai warrior in ancient Japan, cherry blossoms..."
                    rows={3}
                    style={{ width: "100%", borderRadius: 10, border: "1.5px solid rgba(0,0,0,0.12)", padding: "0.65rem 0.85rem", fontSize: "0.82rem", fontFamily: "'Be Vietnam Pro', sans-serif", resize: "vertical", outline: "none", boxSizing: "border-box", color: C.dark }}
                  />
                </div>

                {tError && (
                  <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "0.6rem 0.85rem", fontSize: "0.8rem", color: "#DC2626" }}>{tError}</div>
                )}

                <button onClick={handleGenerate} disabled={generating}
                  style={{ background: generating ? "#A78BFA" : "linear-gradient(135deg,#7C3AED,#9333EA)", color: "white", border: "none", borderRadius: 12, padding: "0.9rem 1.5rem", fontWeight: 700, fontSize: "0.9rem", cursor: generating ? "not-allowed" : "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", boxShadow: generating ? "none" : "0 6px 24px rgba(124,58,237,0.35)", transition: "all 0.2s" }}>
                  {generating
                    ? <><span style={{ display: "inline-block", width: 16, height: 16, border: "2.5px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> Đang hóa thân (~30s)...</>
                    : "✨ Hóa thân ngay"}
                </button>
              </div>
            </div>

            {/* Result before/after */}
            {result && (
              <div style={{ marginTop: "2.5rem", maxWidth: 860 }}>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7C3AED", marginBottom: "1rem" }}>✦ Kết quả</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                  <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>
                    <img src={preview} alt="original" style={{ width: "100%", display: "block", aspectRatio: "1", objectFit: "cover" }} />
                    <div style={{ padding: "0.5rem 0.75rem", background: "#f5f5f5", fontSize: "0.72rem", color: "#999", textAlign: "center" }}>Ảnh gốc</div>
                  </div>
                  <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 32px rgba(124,58,237,0.2)" }}>
                    <img src={result} alt="result" style={{ width: "100%", display: "block", aspectRatio: "1", objectFit: "cover" }} />
                    <div style={{ padding: "0.5rem 0.75rem", background: "rgba(124,58,237,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.72rem", color: "#7C3AED", fontWeight: 600 }}>✨ {selectedPreset?.label || "Nhân vật AI"}</span>
                      <a href={result} target="_blank" rel="noreferrer"
                        style={{ fontSize: "0.72rem", color: "#7C3AED", fontWeight: 700, textDecoration: "none", background: "rgba(124,58,237,0.1)", padding: "0.2rem 0.6rem", borderRadius: "2rem" }}>
                        ↓ Tải về
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
