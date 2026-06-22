import { useState, useEffect, useRef, useCallback } from "react";
import { C } from "../constants";
import LogoIcon from "../components/LogoIcon";

// ─── PALETTE ───
const R = {
  deep:   "#3B0A0A",
  red:    "#8B1A1A",
  warm:   "#C0392B",
  gold:   "#C8963E",
  cream:  "#FFF8F0",
  sage:   "#3D5A3E",
  smoke:  "rgba(200,150,62,0.18)",
};

// ─── DATA ───
const INGREDIENTS = [
  { name: "Bột gỗ bầu dó", icon: "🪵", color: "#8B5E3C", desc: "Mùn cưa mịn từ thân cây bầu dó hoặc lồng mứt — tạo nên phần thân nhang xốp, cháy đều", scent: "Mùi gỗ ấm, tự nhiên" },
  { name: "Keo vỏ bời lời", icon: "🌿", color: "#5D4037", desc: "Chất keo kết dính tự nhiên khai thác từ vỏ cây bời lời — giữ nhang không bị vỡ vụn", scent: "Không mùi, độ kết dính cao" },
  { name: "Quế hương", icon: "🌰", color: "#A0522D", desc: "Vỏ quế tươi xay thành bột mịn — tầng hương đầu tiên bùng lên khi ngọn lửa chạm nhang", scent: "Cay nồng, ấm áp nồng nàn" },
  { name: "Trầm hương", icon: "✨", color: "#6B4226", desc: "Gỗ trầm quý hiếm khai thác từ cây Aquilaria — tinh chất thanh tịnh nhất của cả nén nhang", scent: "Sâu, thanh, đắng nhẹ, thiêng liêng" },
  { name: "Cốt tre / nứa", icon: "🎋", color: "#4E7C4E", desc: "Thanh tre hoặc nứa vót mỏng tay — xương sống tạo hình dáng và độ cứng cho nén nhang", scent: "Mùi tre xanh mát lành" },
];

const ARTISANS = [
  {
    name: "Chị Nguyễn Cát Bụi Thúy",
    title: "Chủ cơ sở Minh Phước",
    years: "20+ năm",
    emoji: "👩‍🦱",
    highlight: "Tiên phong máy sấy hiện đại",
    story: "Cơ sở nhang Minh Phước của chị Thúy là một trong những xưởng lớn nhất làng, duy trì hơn 20 nhân công và đi đầu đầu tư hệ thống máy sấy hiện đại — giải quyết nỗi lo mùa mưa mà bao đời thợ nhang phải chịu.\n\n\"Mỗi nén nhang mình làm ra là gửi gắm một lời bình an đến người thắp. Máy móc giúp mình làm nhiều hơn, nhưng cái tâm thì vẫn phải đặt vào từng mẻ,\" chị Thúy chia sẻ.",
  },
  {
    name: "Bác Năm Tư",
    title: "Nghệ nhân lâu năm",
    years: "30 năm",
    emoji: "👴",
    highlight: "Giữ hồn nghề truyền thống",
    story: "Bác Năm Tư theo nghề se nhang từ năm 1994, khi làng nghề ở vùng ven còn thưa thớt. \"Hồi đó se tay hết, bảy tám thiên một ngày, bàn tay chai mà vui lắm,\" bác nhớ lại.\n\nDù máy móc thay thế nhiều công đoạn, bác vẫn giữ thói quen ngửi từng mẻ nhang trước khi đóng gói. Theo bác, mũi người thợ lành nghề là thước đo chính xác nhất không có máy nào thay được.",
  },
  {
    name: "Anh Minh Tuấn",
    title: "Thế hệ kế thừa",
    years: "5 năm",
    emoji: "👨‍💻",
    highlight: "Kết hợp công nghệ & tay nghề",
    story: "Minh Tuấn, 26 tuổi, là người đầu tiên trong nhà học kỹ thuật trước khi về làm nghề nhang cùng gia đình. \"Em kết hợp cả hai — máy móc để tăng năng suất, tay nghề để giữ chất lượng,\" anh giải thích.\n\nXưởng nhà anh gần đây bắt đầu xuất khẩu nhang trầm sang thị trường Đài Loan và Hàn Quốc — tín hiệu rằng làng nghề trăm năm tuổi hoàn toàn có thể bước ra thế giới.",
  },
];

const JOURNEYS = [
  {
    mood: "Tôi muốn tìm sự tĩnh lặng",
    icon: "🕊️",
    color: "#5D3A1A",
    bg: "#FFF5EE",
    border: "#C8963E",
    path: [
      "Ghé Bát Bửu Phật Đài (Phật Cô Đơn) trong buổi sáng sớm 5–7h",
      "Ngồi thiền 30 phút trong khuôn viên chùa yên tĩnh",
      "Tham quan một xưởng nhang nhỏ, quan sát nghệ nhân làm việc",
      "Mua nhang trầm tự làm mang về nhà thắp",
    ],
    duration: "Nửa ngày · Sáng sớm 5–9h",
  },
  {
    mood: "Tôi muốn khám phá & chụp ảnh",
    icon: "📸",
    color: "#8B1A1A",
    bg: "#FFF0F0",
    border: "#C0392B",
    path: [
      "Đến sân phơi đường Mai Bá Hương lúc 7h30 — nắng sớm + màu sắc = ảnh cực đẹp",
      "Chụp ảnh với sào nhang đỏ, hồng, vàng rực rỡ kéo dài hàng trăm mét",
      "Ghé quán cà phê nông trại trong xã Bình Lợi uống cà phê",
      "Kết hợp thăm làng mai vàng gần đó (cùng tuyến đường)",
    ],
    duration: "Nửa ngày · 7:00 – 11:00 (nắng đẹp nhất)",
  },
  {
    mood: "Tôi muốn học hỏi & trải nghiệm",
    icon: "🎓",
    color: "#3D5A3E",
    bg: "#F0FFF4",
    border: "#3D5A3E",
    path: [
      "Đăng ký tour workshop làm nhang (4h, nhóm 5–15 người)",
      "Học pha trộn bột nhang và các loại hương liệu theo công thức gia truyền",
      "Tự tay se từng nén nhang trên máy hoặc bằng tay (se tay vui hơn!)",
      "Phơi nhang, chờ khô và mang thành phẩm tự làm về nhà",
    ],
    duration: "Cả buổi · Thứ 7, Chủ nhật (8:00 – 12:00)",
  },
];

const STATS = [
  { value: "~100", label: "Năm tuổi nghề", icon: "⏳" },
  { value: "124",  label: "Thành viên hợp tác xã", icon: "👥" },
  { value: "7.5M", label: "Thu nhập TB/tháng (VNĐ)", icon: "💰" },
  { value: "#Top10", label: "Check-in TP.HCM (Sở Du lịch)", icon: "🏆" },
];

// ─── INCENSE STICK (CSS-drawn) ───
function NhangStick({ color = "#CC3333", height = 120, delay = 0, left = "50%" }) {
  return (
    <div style={{
      position: "absolute",
      bottom: 0,
      left,
      transform: "translateX(-50%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      animation: `nhangRise 1.2s ease-out ${delay}s both`,
    }}>
      {/* Smoke particles */}
      {[0,1,2].map(i => (
        <div key={i} style={{
          width: 4 + i * 2,
          height: 4 + i * 2,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.18)",
          marginBottom: 3,
          animation: `smokeUp ${1.8 + i * 0.4}s ease-out ${delay + i * 0.2}s infinite`,
          flexShrink: 0,
        }} />
      ))}
      {/* Glow tip */}
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF6B00", boxShadow: "0 0 8px #FF6B00", marginBottom: 2, flexShrink: 0 }} />
      {/* Stick */}
      <div style={{
        width: 4,
        height,
        background: `linear-gradient(to bottom, ${color} 0%, ${color}88 100%)`,
        borderRadius: "2px 2px 1px 1px",
        flexShrink: 0,
      }} />
    </div>
  );
}

// ─── MAIN COMPONENT ───
export default function LangNhangPage({ onBack, onNavigate }) {
  const [soundOn, setSoundOn] = useState(false);
  const [hoveredIng, setHoveredIng] = useState(null);
  const [openArtisan, setOpenArtisan] = useState(null);
  const [activeJourney, setActiveJourney] = useState(null);
  const [panoramaX, setPanoramaX] = useState(30);
  const audioRef = useRef(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartVal = useRef(0);
  const mainRef = useRef(null);

  // ── Scroll reveal ──
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity = "1";
          e.target.style.transform = "none";
        }
      }),
      { threshold: 0.1 }
    );
    const els = mainRef.current?.querySelectorAll(".nh-reveal") ?? [];
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // ── Sound toggle ──
  const toggleSound = useCallback(() => {
    if (!audioRef.current) return;
    if (soundOn) {
      audioRef.current.pause();
    } else {
      audioRef.current.volume = 0.28;
      audioRef.current.loop = true;
      audioRef.current.play().catch(() => {});
    }
    setSoundOn(s => !s);
  }, [soundOn]);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  // ── Panorama drag ──
  const onPanStart = (clientX) => {
    isDragging.current = true;
    dragStartX.current = clientX;
    dragStartVal.current = panoramaX;
  };
  const onPanMove = useCallback((clientX) => {
    if (!isDragging.current) return;
    const delta = (clientX - dragStartX.current) / 6;
    setPanoramaX(Math.min(100, Math.max(0, dragStartVal.current - delta)));
  }, []);
  const onPanEnd = () => { isDragging.current = false; };

  const stickColors = ["#CC2200","#E63900","#FF5500","#CC7700","#D4A017","#CC2200","#B30000","#FF6600","#CC4400","#D4A017","#B80000","#CC3300"];

  return (
    <div ref={mainRef} style={{ fontFamily: "'Be Vietnam Pro', sans-serif", background: R.cream, overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes nhangRise {
          from { opacity: 0; transform: translateX(-50%) scaleY(0); transform-origin: bottom; }
          to   { opacity: 1; transform: translateX(-50%) scaleY(1); transform-origin: bottom; }
        }
        @keyframes smokeUp {
          0%   { opacity: 0.7; transform: translateY(0) scale(1); }
          100% { opacity: 0;   transform: translateY(-40px) scale(2.5); }
        }
        @keyframes heroFloat {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes glowPulse {
          0%,100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }
        @keyframes revealUp {
          from { opacity: 0; transform: translateY(36px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes popIn {
          0%   { opacity: 0; transform: scale(0.9) translateY(12px); }
          60%  { transform: scale(1.03); }
          100% { opacity: 1; transform: none; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .nh-reveal {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .nh-reveal-left  { opacity: 0; transform: translateX(-32px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .nh-reveal-right { opacity: 0; transform: translateX(32px);  transition: opacity 0.7s ease, transform 0.7s ease; }
        .nh-reveal-left,  .nh-reveal-right { }

        .ing-card {
          transition: all 0.28s cubic-bezier(0.4,0,0.2,1);
        }
        .ing-card:hover {
          transform: translateY(-8px) scale(1.04);
          box-shadow: 0 16px 40px rgba(139,26,26,0.22) !important;
        }
        .artisan-card {
          transition: all 0.25s;
          cursor: pointer;
        }
        .artisan-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 36px rgba(139,26,26,0.18) !important;
        }
        .journey-card {
          transition: all 0.25s;
          cursor: pointer;
        }
        .journey-card:hover {
          transform: translateY(-4px);
        }
        .pan-cursor { cursor: grab; }
        .pan-cursor:active { cursor: grabbing; }
      `}</style>

      {/* Ambient audio */}
      <audio ref={audioRef} src="/audio/nghe_nhang.mp3" loop />

      {/* ─── HERO ─── */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", background: R.deep, overflow: "hidden" }}>

        {/* Back bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 30, height: 60, display: "flex", alignItems: "center", padding: "0 2rem", gap: "1.25rem", background: "rgba(59,10,10,0.55)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(200,150,62,0.18)" }}>
          <button onClick={onBack}
            style={{ display: "flex", alignItems: "center", gap: 7, background: "transparent", border: "1.5px solid rgba(245,240,232,0.25)", color: R.cream, padding: "0.42rem 0.95rem", borderRadius: "2rem", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.78rem", fontWeight: 500, transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = R.gold; e.currentTarget.style.color = R.gold; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(245,240,232,0.25)"; e.currentTarget.style.color = R.cream; }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Quay lại
          </button>
          <LogoIcon />
          <span style={{ fontSize: "0.9rem", fontWeight: 600, color: R.cream, fontFamily: "'Playfair Display', serif" }}>Làng Nhang Lê Minh Xuân</span>

          {/* Sound toggle */}
          <div style={{ marginLeft: "auto" }}>
            <button onClick={toggleSound}
              style={{ display: "flex", alignItems: "center", gap: 6, background: soundOn ? "rgba(200,150,62,0.2)" : "rgba(255,255,255,0.08)", border: `1.5px solid ${soundOn ? R.gold : "rgba(255,255,255,0.2)"}`, color: soundOn ? R.gold : R.cream, padding: "0.38rem 0.95rem", borderRadius: "2rem", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.72rem", fontWeight: 500, transition: "all 0.2s" }}>
              {soundOn
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              }
              {soundOn ? "Tắt âm thanh" : "Bật âm thanh làng nghề"}
            </button>
          </div>
        </div>

        {/* Hero bg image */}
        <img src="https://cdn.tuoitre.vn/thumb_w/1060/471584752817336320/2023/5/29/img9730-168532598423022112956.jpg" alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.28, filter: "saturate(1.3) blur(1px)" }} />

        {/* Gradient overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(59,10,10,0.55) 0%, rgba(59,10,10,0.3) 40%, rgba(59,10,10,0.72) 100%)" }} />

        {/* Red glow */}
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 300, background: "radial-gradient(ellipse, rgba(139,26,26,0.4) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Animated incense sticks */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 180, overflow: "hidden" }}>
          {stickColors.map((col, i) => (
            <NhangStick key={i} color={col}
              height={80 + (i % 4) * 20}
              delay={i * 0.08}
              left={`${4 + i * 8}%`} />
          ))}
        </div>

        {/* Hero text */}
        <div style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "100px 2rem 220px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(200,150,62,0.15)", border: "1px solid rgba(200,150,62,0.35)", padding: "0.3rem 1.1rem", borderRadius: "2rem", marginBottom: "1.75rem", backdropFilter: "blur(8px)" }}>
            <span style={{ color: R.gold, fontSize: "0.68rem", letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 }}>✦ Làng nghề trăm năm · Bình Lợi, Bình Chánh</span>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2.2rem,4.5vw,3.6rem)", color: "white", lineHeight: 1.2, fontWeight: 400, marginBottom: "1.5rem", textShadow: "0 2px 32px rgba(0,0,0,0.6)", animation: "heroFloat 4s ease-in-out infinite" }}>
            <em style={{ fontStyle: "italic", color: R.gold }}>Hơi thở của nắng</em><br/>và thảo mộc
          </h1>
          <p style={{ fontSize: "1rem", color: "rgba(255,248,240,0.75)", maxWidth: 520, lineHeight: 1.85, marginBottom: "2.5rem", fontWeight: 300 }}>
            "Lê Minh Xuân: Nơi nắng hong khô những lời nguyện cầu."<br/>
            Gần 100 năm, những nén nhang vẫn toả hương từ vùng đất này.
          </p>
          <a href="#chapter-1"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: R.gold, color: R.deep, padding: "0.85rem 2rem", borderRadius: "2rem", textDecoration: "none", fontWeight: 600, fontSize: "0.88rem", fontFamily: "'Be Vietnam Pro', sans-serif", boxShadow: `0 8px 28px ${R.gold}55`, transition: "all 0.22s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 12px 36px ${R.gold}77`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 8px 28px ${R.gold}55`; }}>
            Bắt đầu chuyến đi
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg>
          </a>
        </div>
      </section>

      {/* ─── CHAPTER 1: Nguyên liệu ─── */}
      <section id="chapter-1" style={{ padding: "5rem 2rem", maxWidth: 1000, margin: "0 auto" }}>
        <div className="nh-reveal" style={{ marginBottom: "3rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: R.red, marginBottom: "0.5rem" }}>✦ Chương 1 · Sự khởi đầu</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.6rem,3vw,2.4rem)", color: R.deep, marginBottom: "0.85rem" }}>Nguyên liệu & Cái tâm</h2>
          <p style={{ color: "#666", maxWidth: 540, margin: "0 auto", fontSize: "0.9rem", lineHeight: 1.8 }}>
            Hành trình của một nén nhang bắt đầu từ rừng già, vỏ cây và tinh túy thiên nhiên. Rê chuột vào từng nguyên liệu để khám phá.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem" }}>
          {INGREDIENTS.map((ing, i) => {
            const isHov = hoveredIng === i;
            return (
              <div key={i} className="ing-card nh-reveal"
                style={{ transitionDelay: `${i * 0.08}s`, background: isHov ? ing.color : "white", borderRadius: 18, padding: "1.5rem 1rem", textAlign: "center", border: `2px solid ${isHov ? ing.color : "rgba(0,0,0,0.07)"}`, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", cursor: "default", userSelect: "none" }}
                onMouseEnter={() => setHoveredIng(i)}
                onMouseLeave={() => setHoveredIng(null)}>
                <div style={{ fontSize: "2.2rem", marginBottom: "0.75rem" }}>{ing.icon}</div>
                <p style={{ fontWeight: 700, fontSize: "0.82rem", color: isHov ? "white" : R.deep, marginBottom: "0.5rem", lineHeight: 1.3 }}>{ing.name}</p>
                {isHov ? (
                  <div style={{ animation: "revealUp 0.2s ease forwards" }}>
                    <p style={{ fontSize: "0.73rem", color: "rgba(255,255,255,0.88)", lineHeight: 1.6, marginBottom: "0.6rem" }}>{ing.desc}</p>
                    <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "0.35rem 0.6rem", display: "inline-block" }}>
                      <p style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.9)", fontStyle: "italic" }}>🌬️ {ing.scent}</p>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: "0.69rem", color: "#aaa" }}>Rê chuột để khám phá</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── CHAPTER 2: Con người ─── */}
      <section style={{ background: `linear-gradient(135deg, ${R.deep} 0%, #5C0A0A 100%)`, padding: "5rem 2rem" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div className="nh-reveal" style={{ marginBottom: "3rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: R.gold, marginBottom: "0.5rem" }}>✦ Chương 2 · Nhịp sống làng nghề</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.6rem,3vw,2.4rem)", color: "white", marginBottom: "0.85rem" }}>Những nghệ nhân thầm lặng</h2>
            <p style={{ color: "rgba(255,248,240,0.65)", maxWidth: 500, margin: "0 auto", fontSize: "0.88rem", lineHeight: 1.8 }}>
              Nhấp vào từng thẻ để nghe câu chuyện của người gắn đời mình với hương nhang.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem" }}>
            {ARTISANS.map((a, i) => (
              <div key={i} className="artisan-card nh-reveal"
                style={{ transitionDelay: `${i * 0.1}s`, background: "rgba(255,255,255,0.06)", backdropFilter: "blur(8px)", border: "1px solid rgba(200,150,62,0.22)", borderRadius: 20, padding: "2rem 1.5rem", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.25)" }}
                onClick={() => setOpenArtisan(a)}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem", filter: "drop-shadow(0 4px 12px rgba(200,150,62,0.3))" }}>{a.emoji}</div>
                <div style={{ display: "inline-block", background: "rgba(200,150,62,0.15)", border: "1px solid rgba(200,150,62,0.3)", borderRadius: "2rem", padding: "0.2rem 0.7rem", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.6rem", color: R.gold, fontWeight: 700 }}>{a.years}</span>
                </div>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.02rem", color: "white", fontWeight: 600, marginBottom: "0.3rem" }}>{a.name}</p>
                <p style={{ fontSize: "0.72rem", color: "rgba(255,248,240,0.55)", marginBottom: "1rem" }}>{a.title}</p>
                <div style={{ background: "rgba(200,150,62,0.12)", borderRadius: 8, padding: "0.4rem 0.7rem", marginBottom: "1rem" }}>
                  <p style={{ fontSize: "0.67rem", color: R.gold, fontWeight: 600 }}>✦ {a.highlight}</p>
                </div>
                <p style={{ fontSize: "0.7rem", color: "rgba(255,248,240,0.45)", fontStyle: "italic" }}>Nhấp để đọc câu chuyện →</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CHAPTER 3: Sân phơi (Panorama) ─── */}
      <section style={{ padding: "5rem 2rem", background: R.cream }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div className="nh-reveal" style={{ marginBottom: "2.5rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: R.red, marginBottom: "0.5rem" }}>✦ Chương 3 · Vũ điệu sắc màu</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.6rem,3vw,2.4rem)", color: R.deep, marginBottom: "0.85rem" }}>Sân phơi — Linh hồn làng nghề</h2>
            <p style={{ color: "#666", maxWidth: 520, margin: "0 auto", fontSize: "0.88rem", lineHeight: 1.8 }}>
              Trải nghiệm Street View 360° thực tế tại Xưởng nhang Minh Phước — kéo chuột để nhìn xung quanh.
            </p>
          </div>

          {/* Street View 360° embed */}
          <div className="nh-reveal" style={{ position: "relative", borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.18)", marginBottom: "2.5rem" }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!4v1718947200000!6m8!1m7!1sU-geozUhacS1JK4qLG7Cng!2m2!1d106.4829651!2d10.7527181!3f216.44!4f11.97!5f0.7820865974627469"
              width="100%"
              height="420"
              style={{ border: "none", display: "block" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Street View 360° Xưởng nhang Minh Phước"
            />
            {/* Badge */}
            <div style={{ position: "absolute", top: 14, left: 14, background: "rgba(59,10,10,0.75)", backdropFilter: "blur(8px)", color: "white", padding: "0.32rem 0.85rem", borderRadius: "2rem", fontSize: "0.68rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, pointerEvents: "none" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: R.gold, display: "inline-block" }} />
              360° · Xưởng nhang Minh Phước
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
            {STATS.map((s, i) => (
              <div key={i} className="nh-reveal"
                style={{ transitionDelay: `${i * 0.1}s`, background: "white", borderRadius: 16, padding: "1.5rem 1rem", textAlign: "center", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>{s.icon}</div>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 600, color: R.red, marginBottom: "0.3rem" }}>{s.value}</p>
                <p style={{ fontSize: "0.72rem", color: "#888", lineHeight: 1.4 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CHAPTER 4: Lộ trình ─── */}
      <section style={{ padding: "5rem 2rem", background: "#FDF8F4" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div className="nh-reveal" style={{ marginBottom: "3rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: R.sage, marginBottom: "0.5rem" }}>✦ Chương 4 · Lộ trình của bạn</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.6rem,3vw,2.4rem)", color: R.deep, marginBottom: "0.85rem" }}>Bạn muốn trải nghiệm điều gì?</h2>
            <p style={{ color: "#666", maxWidth: 500, margin: "0 auto", fontSize: "0.88rem", lineHeight: 1.8 }}>
              Thay vì danh sách khô khan, chúng tôi gợi ý lộ trình dựa trên tâm trạng của bạn hôm nay.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem" }}>
            {JOURNEYS.map((j, i) => {
              const isAct = activeJourney === i;
              return (
                <div key={i} className="journey-card nh-reveal"
                  style={{ transitionDelay: `${i * 0.1}s`, background: isAct ? j.bg : "white", border: `2px solid ${isAct ? j.border : "rgba(0,0,0,0.07)"}`, borderRadius: 20, padding: "1.75rem 1.5rem", boxShadow: isAct ? `0 8px 32px ${j.color}22` : "0 2px 12px rgba(0,0,0,0.05)", transform: isAct ? "translateY(-6px)" : "none" }}
                  onClick={() => setActiveJourney(isAct ? null : i)}>
                  <div style={{ fontSize: "2.2rem", marginBottom: "1rem" }}>{j.icon}</div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", color: j.color, marginBottom: "0.5rem", lineHeight: 1.35 }}>{j.mood}</h3>
                  <p style={{ fontSize: "0.68rem", color: "#aaa", marginBottom: isAct ? "1.25rem" : 0 }}>{j.duration}</p>

                  {isAct && (
                    <div style={{ animation: "revealUp 0.28s ease forwards" }}>
                      <div style={{ height: 1, background: `${j.border}30`, margin: "1rem 0" }} />
                      {j.path.map((step, si) => (
                        <div key={si} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: "0.65rem" }}>
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: j.color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{si + 1}</div>
                          <p style={{ fontSize: "0.78rem", color: R.deep, lineHeight: 1.55 }}>{step}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {!isAct && (
                    <p style={{ fontSize: "0.68rem", color: "#bbb", marginTop: "0.75rem", fontStyle: "italic" }}>Nhấp để xem lộ trình →</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── FOOTER CTA ─── */}
      <section style={{ background: `linear-gradient(135deg, ${R.deep} 0%, #5C0A0A 100%)`, padding: "4rem 2rem", textAlign: "center" }}>
        <div className="nh-reveal">
          <p style={{ fontSize: "0.7rem", color: R.gold, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "1rem" }}>✦ Sẵn sàng khám phá chưa?</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.5rem,3vw,2.2rem)", color: "white", marginBottom: "1.25rem" }}>Tiếp tục hành trình Bình Lợi</h2>
          <p style={{ color: "rgba(255,248,240,0.65)", fontSize: "0.88rem", marginBottom: "2rem", lineHeight: 1.8 }}>
            Tự tay se nhang, cảm nhận hương thơm từ ngàn năm trước — trải nghiệm chỉ 150,000 VNĐ/người.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => onNavigate?.("booking")}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: R.gold, color: R.deep, padding: "0.85rem 2rem", borderRadius: "2rem", border: "none", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.88rem", fontWeight: 600, transition: "all 0.2s", boxShadow: `0 6px 24px ${R.gold}55` }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "none"}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Đặt lịch ngay
            </button>
            <button onClick={() => onNavigate?.("map")}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: R.cream, padding: "0.85rem 2rem", borderRadius: "2rem", border: "1.5px solid rgba(245,240,232,0.3)", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.88rem", fontWeight: 500, transition: "all 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = R.gold}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(245,240,232,0.3)"}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Xem trên bản đồ
            </button>
            <button onClick={() => onNavigate?.("workshop")}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: R.cream, padding: "0.85rem 2rem", borderRadius: "2rem", border: "1.5px solid rgba(245,240,232,0.3)", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.88rem", fontWeight: 500, transition: "all 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = R.gold}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(245,240,232,0.3)"}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              Workshop uốn mai
            </button>
          </div>
        </div>
      </section>

      {/* ─── ARTISAN POPUP ─── */}
      {openArtisan && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
            <div onClick={() => setOpenArtisan(null)} style={{ position: "absolute", inset: 0, background: "rgba(59,10,10,0.65)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "relative", zIndex: 1, width: "min(520px, 92vw)", maxHeight: "88vh", overflowY: "auto", background: "white", borderRadius: 24, boxShadow: "0 24px 80px rgba(0,0,0,0.4)", animation: "popIn 0.35s cubic-bezier(0.34,1.26,0.64,1) forwards" }}>
            <div style={{ background: `linear-gradient(135deg, ${R.deep} 0%, #5C0A0A 100%)`, padding: "1.75rem 1.75rem 1.25rem", position: "relative" }}>
              <button onClick={() => setOpenArtisan(null)} style={{ position: "absolute", top: 14, right: 14, width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "none", cursor: "pointer", color: "white", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              <div style={{ fontSize: "2.8rem", marginBottom: "0.75rem" }}>{openArtisan.emoji}</div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", color: "white", fontWeight: 600 }}>{openArtisan.name}</p>
              <p style={{ fontSize: "0.72rem", color: "rgba(255,248,240,0.55)", marginBottom: "0.5rem" }}>{openArtisan.title}</p>
              <span style={{ background: "rgba(200,150,62,0.2)", border: "1px solid rgba(200,150,62,0.4)", borderRadius: "2rem", padding: "0.18rem 0.65rem", fontSize: "0.62rem", color: R.gold, fontWeight: 700 }}>{openArtisan.years} gắn bó với nghề</span>
            </div>
            <div style={{ padding: "1.5rem 1.75rem 1.75rem" }}>
              <div style={{ background: `${R.red}10`, border: `1px solid ${R.red}20`, borderRadius: 10, padding: "0.55rem 0.85rem", marginBottom: "1.1rem", display: "inline-block" }}>
                <p style={{ fontSize: "0.67rem", color: R.red, fontWeight: 700 }}>✦ {openArtisan.highlight}</p>
              </div>
              <p style={{ fontSize: "0.86rem", color: "#444", lineHeight: 1.85, whiteSpace: "pre-line" }}>{openArtisan.story}</p>
            </div>
          </div>
          </div>
        </>
      )}
    </div>
  );
}
