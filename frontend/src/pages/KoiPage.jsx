import { useEffect, useRef, useState } from "react";
import { C } from "../constants";
import LogoIcon from "../components/LogoIcon";

const OVERVIEW_DATA = [
  { label: "Vị trí",      value: "Xã Bình Lợi, huyện Bình Chánh, TP.HCM" },
  { label: "Quy mô",      value: "~20ha nuôi cá cảnh (trong tổng 60ha toàn huyện Bình Chánh)" },
  { label: "Thương hiệu", value: '"Cá Koi thuần Việt" — lai tạo & thuần hóa từ giống Nhật Bản' },
  { label: "Đặc điểm",   value: "Màu sắc đẹp, độ bền cao, phù hợp khí hậu Việt Nam — chuyển mình từ canh tác truyền thống sang nông nghiệp đô thị hiện đại" },
];

const JOURNEY = [
  {
    step: "01", icon: "👀", label: "Bước vào trang trại",
    quote: "Lần đầu tiên nhìn thấy hàng trăm cá Koi bơi dưới ánh nắng.",
    desc: "Tận mắt chứng kiến quy trình nuôi cá Koi từ ao đất đến hồ kính, hồ xi măng hiện đại — nơi mà mỗi hồ là một tác phẩm sống.",
    media: { type: "video", src: "/img/ho_koi/koi.mp4" },
    accent: "#43A047", bg: "#EDF7ED",
  },
  {
    step: "02", icon: "📖", label: "Gặp người nghệ nhân",
    quote: "Từ người nuôi cá tra đến người sở hữu đàn Koi trị giá hàng tỷ.",
    desc: "Câu chuyện chuyển mình của những nông dân Bình Lợi — từ canh tác truyền thống sang nghề nuôi cá quý tộc mang lại doanh thu tiền tỷ.",
    media: { type: "image", src: "/img/ho_koi/trang_trai_2.jpg" },
    accent: "#EF6C00", bg: "#FFF8EE",
  },
  {
    step: "03", icon: "🌿", label: "Dạo vườn & thư giãn",
    quote: "Vườn mai vàng, dưa lưới thủy canh — một buổi chiều không thể quên.",
    desc: "Kết hợp tham quan vườn mai vàng, vườn dưa lưới thủy canh — tạo thành tour nông nghiệp đô thị trọn vẹn giữa lòng TP.HCM.",
    media: { type: "image", src: "/img/ho_koi/trang_trai_3.jpeg" },
    accent: "#43A047", bg: "#EDF7ED",
  },
  {
    step: "04", icon: "🛍", label: "Mang một phần Bình Lợi về nhà",
    quote: "Chọn cá, học cách chăm sóc, check-in cùng hồ Koi.",
    desc: "Lựa chọn cá trực tiếp tại trại, học cách chăm sóc Koi từ những chủ trại dày dạn kinh nghiệm — kỷ niệm mang về nhà.",
    media: { type: "image", src: "/img/ho_koi/trang_trai_1.jpg" },
    accent: "#EF6C00", bg: "#FFF8EE",
  },
];

const GALLERY = [
  { src: "/img/ho_koi/trang_trai_1.jpg", label: "Ao nuôi cá Koi" },
  { src: "/img/ho_koi/trang_trai_2.jpg", label: "Cá Koi thuần Việt" },
  { src: "/img/ho_koi/trang_trai_3.jpeg", label: "Trang trại hiện đại" },
];

const STATS = [
  { num: "20ha",  label: "Diện tích nuôi cá cảnh" },
  { num: "124+",  label: "Hộ nông dân tham gia" },
  { num: "100%",  label: "Cá Koi thuần Việt" },
  { num: "30km",  label: "Cách trung tâm TP.HCM" },
];

const NAV_H    = 60;
const NUM_CARDS = 6;

export default function KoiPage({ onBack, onNavigate }) {
  const [activeCard,  setActiveCard]  = useState(0);
  const [prevCard,    setPrevCard]    = useState(null);
  const [dir,         setDir]         = useState(1);
  const [videoMuted,  setVideoMuted]  = useState(true);
  const activeCardRef = useRef(0);
  const sectionRef    = useRef(null);
  const videoRef      = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const scrollRange = el.offsetHeight - window.innerHeight;
      if (scrollRange <= 0) return;
      const scrolled  = -el.getBoundingClientRect().top;
      const progress  = Math.max(0, Math.min(0.9999, scrolled / scrollRange));
      const next      = Math.min(NUM_CARDS - 1, Math.floor(progress * NUM_CARDS));
      if (next !== activeCardRef.current) {
        setDir(next > activeCardRef.current ? 1 : -1);
        setPrevCard(activeCardRef.current);
        setActiveCard(next);
        activeCardRef.current = next;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setVideoMuted(videoRef.current.muted);
  };

  /* ── card renderers ── */
  const renderCard = (idx) => {

    /* Card 0 — Tổng quan */
    if (idx === 0) return (
      <div style={{ height: "100%", background: "white", display: "flex", alignItems: "stretch" }}>
        {/* left text */}
        <div style={{ flex: "0 0 52%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "3rem 3.5rem 3rem 6rem", boxSizing: "border-box" }}>
          <p style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: C.moss, marginBottom: "0.6rem" }}>Tổng quan</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: C.dark, margin: "0 0 1.75rem", lineHeight: 1.25 }}>Hồ cá Koi</h3>
          {OVERVIEW_DATA.map(item => (
            <div key={item.label} style={{ display: "flex", gap: "1rem", marginBottom: "1.1rem", alignItems: "flex-start" }}>
              <div style={{ minWidth: 100, fontSize: "0.65rem", fontWeight: 700, color: C.moss, textTransform: "uppercase", letterSpacing: "0.08em", paddingTop: 3, flexShrink: 0 }}>{item.label}</div>
              <div style={{ flex: 1, fontSize: "0.875rem", color: "#555", lineHeight: 1.75 }}>{item.value}</div>
            </div>
          ))}
        </div>
        {/* right image */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <img src="/img/ho_koi/anh_1.webp" alt="Hồ cá Koi" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      </div>
    );

    /* Card 1 — Hành trình khám phá */
    if (idx === 1) return (
      <div style={{ position: "relative", height: "100%", overflow: "hidden" }}>
        <img src="/img/ho_koi/trang_trai_1.jpg" alt="Hành trình khám phá" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.08) 55%)" }} />
        <div style={{ position: "absolute", bottom: "3.5rem", left: "6rem", right: "6rem" }}>
          <p style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: C.gold, marginBottom: "0.6rem" }}>🗺 Hành trình</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.2rem", color: "white", margin: "0 0 0.75rem", lineHeight: 1.2 }}>Hành trình khám phá</h3>
          <p style={{ color: "rgba(255,255,255,0.72)", fontSize: "0.9rem", lineHeight: 1.7, margin: "0 0 1.4rem", maxWidth: 580 }}>
            4 bước trải nghiệm đáng nhớ tại Làng Cá Koi Bình Lợi — từ khi đặt chân vào trang trại cho đến khi mang kỷ niệm về nhà.
          </p>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            {["👀 Bước vào trang trại", "📖 Gặp nghệ nhân", "🌿 Dạo vườn", "🛍 Mang về nhà"].map((s, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: "2rem", padding: "0.35rem 0.9rem", fontSize: "0.7rem", color: "white", fontWeight: 500 }}>{s}</div>
            ))}
          </div>
        </div>
      </div>
    );

    /* Cards 2-5 — Bước 01-04 */
    const step = JOURNEY[idx - 2];
    if (!step) return null;
    const mediaLeft = idx % 2 === 0;
    const media = (
      <div style={{ flex: "0 0 50%", overflow: "hidden", position: "relative" }}>
        {step.media.type === "video" ? (
          <>
            <video ref={videoRef} src={step.media.src} autoPlay muted loop playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <button onClick={toggleMute}
              style={{ position: "absolute", bottom: "0.85rem", right: "0.85rem", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "none", color: "white", borderRadius: "2rem", padding: "0.35rem 0.9rem", fontSize: "0.72rem", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              {videoMuted ? "🔇" : "🔊"} <span>{videoMuted ? "Bật âm thanh" : "Tắt âm thanh"}</span>
            </button>
          </>
        ) : (
          <img src={step.media.src} alt={step.label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        )}
      </div>
    );
    const text = (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "3rem 4rem", background: step.bg, boxSizing: "border-box" }}>
        {/* large watermark */}
        <div style={{ position: "absolute", fontSize: "clamp(5rem,14vw,12rem)", fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "rgba(0,0,0,0.04)", lineHeight: 1, userSelect: "none", pointerEvents: "none", right: mediaLeft ? "auto" : "1rem", left: mediaLeft ? "1rem" : "auto", bottom: "-1rem" }}>{step.step}</div>
        <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: step.accent, marginBottom: "0.65rem" }}>
          {step.icon}&nbsp;&nbsp;Bước {step.step}
        </p>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.4rem, 2.5vw, 2rem)", color: C.dark, margin: "0 0 1.25rem", lineHeight: 1.25 }}>{step.label}</h3>
        <blockquote style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", color: "#555", fontStyle: "italic", borderLeft: `3px solid ${step.accent}`, paddingLeft: "1.1rem", margin: "0 0 1.1rem", lineHeight: 1.75 }}>
          "{step.quote}"
        </blockquote>
        <p style={{ fontSize: "0.875rem", color: "#666", lineHeight: 1.85, margin: 0 }}>{step.desc}</p>
      </div>
    );
    return (
      <div style={{ height: "100%", display: "flex", position: "relative" }}>
        {mediaLeft ? <>{media}{text}</> : <>{text}{media}</>}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F0F7F0", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap');

        @keyframes koiExitUp {
          0%   { opacity:1; filter:blur(0px);  transform:translateY(0)     scale(1); }
          15%  { opacity:1; filter:blur(0px);  transform:translateY(-5%)   scale(0.96); }
          75%  { opacity:1; filter:blur(0px);  transform:translateY(-90%)  scale(0.84); }
          100% { opacity:0; filter:blur(3px);  transform:translateY(-130%) scale(0.78); }
        }
        @keyframes koiEnterDown {
          0%   { opacity:0; filter:blur(3px);  transform:translateY(100px) scale(0.88); }
          30%  { opacity:1; filter:blur(0px);  transform:translateY(20px)  scale(0.97); }
          70%  { opacity:1; filter:blur(0px);  transform:translateY(-8px)  scale(1.02); }
          100% { opacity:1; filter:blur(0px);  transform:translateY(0)     scale(1); }
        }
        @keyframes koiExitDown {
          0%   { opacity:1; filter:blur(0px);  transform:translateY(0)     scale(1); }
          15%  { opacity:1; filter:blur(0px);  transform:translateY(5%)    scale(0.96); }
          75%  { opacity:1; filter:blur(0px);  transform:translateY(90%)   scale(0.84); }
          100% { opacity:0; filter:blur(3px);  transform:translateY(130%)  scale(0.78); }
        }
        @keyframes koiEnterUp {
          0%   { opacity:0; filter:blur(3px);  transform:translateY(-100px) scale(0.88); }
          30%  { opacity:1; filter:blur(0px);  transform:translateY(-20px)  scale(0.97); }
          70%  { opacity:1; filter:blur(0px);  transform:translateY(8px)    scale(1.02); }
          100% { opacity:1; filter:blur(0px);  transform:translateY(0)      scale(1); }
        }
        .koi-enter-down { animation: koiEnterDown 1.4s cubic-bezier(0.16,1,0.3,1) both; will-change:transform,opacity,filter; }
        .koi-exit-up    { animation: koiExitUp    1.2s cubic-bezier(0.4,0,0.6,1)  both; will-change:transform,opacity,filter; }
        .koi-enter-up   { animation: koiEnterUp   1.4s cubic-bezier(0.16,1,0.3,1) both; will-change:transform,opacity,filter; }
        .koi-exit-down  { animation: koiExitDown  1.2s cubic-bezier(0.4,0,0.6,1)  both; will-change:transform,opacity,filter; }

        .pdot { width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.35);transition:all 0.35s ease;flex-shrink:0; }
        .pdot.active { width:22px;border-radius:4px;background:white; }
        .pdot.done { background:rgba(255,255,255,0.75); }

        .gallery-thumb { overflow:hidden;border-radius:14px;position:relative;cursor:pointer; }
        .gallery-thumb img { width:100%;height:100%;object-fit:cover;transition:transform 0.45s ease; }
        .gallery-thumb:hover img { transform:scale(1.06); }
        .gallery-thumb .label-overlay { position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.6));color:white;font-size:0.72rem;font-weight:500;padding:0.6rem 0.75rem 0.55rem;opacity:0;transition:opacity 0.3s; }
        .gallery-thumb:hover .label-overlay { opacity:1; }
      `}</style>

      {/* Nav */}
      <nav style={{ background: "rgba(240,247,240,0.97)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(61,90,62,0.15)", padding: "0 2rem", height: NAV_H, display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 200 }}>
        <button onClick={onBack}
          style={{ background: "none", border: "1.5px solid rgba(61,90,62,0.3)", color: C.moss, padding: "0.35rem 0.85rem", borderRadius: "2rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: 500, fontFamily: "'Be Vietnam Pro', sans-serif", display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.background = C.moss; e.currentTarget.style.color = "white"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.moss; }}>
          ← Trang chủ
        </button>
        <div style={{ width: 1, height: 20, background: "rgba(0,0,0,0.1)", margin: "0 4px" }} />
        <LogoIcon size={28} />
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", color: C.dark }}>Hồ Cá Koi Bình Lợi</span>
      </nav>

      {/* ── Hero (nội dung bình thường) ── */}
      <div style={{ position: "relative", height: 380, overflow: "hidden" }}>
        <img src="/img/ho_koi/anh_1.webp" alt="Hồ cá Koi Bình Lợi" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.28) 100%)" }} />
        <div style={{ position: "absolute", bottom: "2.5rem", left: "5rem" }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", color: C.gold, marginBottom: "0.5rem" }}>✦ Làng cá cảnh · Bình Lợi</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.8rem", color: "white", fontWeight: 400, margin: 0, lineHeight: 1.2, textShadow: "0 2px 24px rgba(0,0,0,0.4)" }}>
            Làng Cá Koi Bình Lợi
          </h1>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "1rem", marginTop: "0.6rem", fontWeight: 300 }}>
            "Thủ phủ" cá cảnh của TP.HCM — nơi nông dân chuyển mình thành nghệ nhân
          </p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "3rem 5rem" }}>
        <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
          {STATS.map(s => (
            <div key={s.num} style={{ background: "white", borderRadius: 14, padding: "1rem 1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", textAlign: "center", flex: "1 1 110px" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.7rem", color: C.moss, fontWeight: 600 }}>{s.num}</div>
              <div style={{ fontSize: "0.7rem", color: "#888", marginTop: 4, lineHeight: 1.4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section title ── */}
      <div style={{ textAlign: "center", padding: "1rem 2rem 2rem" }}>
        <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: C.moss, marginBottom: "0.5rem" }}>Trải nghiệm</p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: C.dark, margin: 0 }}>Khám phá từng bước</h2>
        <p style={{ fontSize: "0.82rem", color: "#999", marginTop: "0.5rem" }}>Cuộn xuống để trải nghiệm ↓</p>
      </div>

      {/* ── 6-card sticky scroll (full width) ── */}
      <section ref={sectionRef} style={{ position: "relative", height: `${NUM_CARDS * 100}vh` }}>
        <div style={{ position: "sticky", top: NAV_H, height: `calc(100vh - ${NAV_H}px)`, overflow: "hidden" }}>

          {/* Exiting card */}
          {prevCard !== null && (
            <div
              key={`prev-${prevCard}`}
              className={dir > 0 ? "koi-exit-up" : "koi-exit-down"}
              style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
              onAnimationEnd={() => setPrevCard(null)}
            >
              {renderCard(prevCard)}
            </div>
          )}

          {/* Entering card */}
          <div
            key={`curr-${activeCard}`}
            className={prevCard !== null ? (dir > 0 ? "koi-enter-down" : "koi-enter-up") : ""}
            style={{ position: "absolute", inset: 0 }}
          >
            {renderCard(activeCard)}
          </div>

          {/* Progress dots — bottom center */}
          <div style={{ position: "absolute", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: "0.4rem", zIndex: 10, background: "rgba(0,0,0,0.25)", backdropFilter: "blur(8px)", borderRadius: "2rem", padding: "0.45rem 0.85rem" }}>
            {Array.from({ length: NUM_CARDS }).map((_, i) => (
              <div key={i} className={`pdot${i === activeCard ? " active" : i < activeCard ? " done" : ""}`} />
            ))}
            <span style={{ marginLeft: "0.35rem", fontSize: "0.62rem", color: "rgba(255,255,255,0.7)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
              {activeCard + 1} / {NUM_CARDS}
            </span>
          </div>
        </div>
      </section>

      {/* ── Gallery + CTA (giữ nguyên) ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "4rem 5rem" }}>
        <div style={{ marginBottom: "3rem" }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: C.moss, marginBottom: "0.6rem" }}>Hình ảnh</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", color: C.dark, marginBottom: "1.75rem" }}>Khung cảnh trang trại</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
            {GALLERY.map((g, i) => (
              <div key={i} className="gallery-thumb" style={{ height: 200 }}>
                <img src={g.src} alt={g.label} />
                <div className="label-overlay">{g.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: C.moss, borderRadius: 20, padding: "2.5rem 2rem" }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", color: C.cream, marginBottom: "0.5rem", textAlign: "center" }}>Sẵn sàng khám phá Bình Lợi?</h3>
          <p style={{ color: "rgba(245,240,232,0.65)", fontSize: "0.85rem", marginBottom: "1.75rem", textAlign: "center" }}>Tiếp tục hành trình với những trải nghiệm khác</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            {[
              { icon: "🗺️", title: "Xem bản đồ", desc: "Tìm đường đến trang trại Koi", action: "map" },
              { icon: "📅", title: "Đặt lịch tham quan", desc: "Hẹn trước để có hướng dẫn viên", action: "booking" },
              { icon: "🌿", title: "Workshop uốn mai", desc: "Trải nghiệm nghệ thuật mai vàng", action: "workshop" },
            ].map(({ icon, title, desc, action }) => (
              <button key={action}
                onClick={() => onNavigate?.(action)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "flex-start",
                  background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 14, padding: "1.1rem 1.1rem",
                  cursor: "pointer", textAlign: "left", transition: "all 0.22s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.18)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.transform = "none"; }}>
                <span style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>{icon}</span>
                <p style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.85rem", fontWeight: 600, color: C.cream, margin: "0 0 0.2rem" }}>{title}</p>
                <p style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.72rem", color: "rgba(245,240,232,0.55)", margin: 0 }}>{desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
