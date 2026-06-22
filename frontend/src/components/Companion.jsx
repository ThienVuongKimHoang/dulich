import { useState, useEffect, useRef } from "react";
import { C } from "../constants";

// ─── COMPANION MESSAGES ───
const MESSAGES = [
  { section: "hero", text: "Chào bạn! 🌿 Mình là Mai — sẽ đồng hành cùng bạn khám phá Bình Lợi nhé!" },
  { section: "bento", text: "🐠 Hồ cá Koi buổi chiều rất yên tĩnh, mình hay ngồi thiền ở đó lắm!" },
  { section: "workshop", text: "🕯️ Workshop làm nhang thủ công cuối tuần này còn 3 suất — đăng ký sớm nhé!" },
  { section: "gallery", text: "📸 Góc nào ở Bình Lợi cũng đẹp để chụp ảnh lưu kỷ niệm đấy bạn ơi!" },
  { section: "journey", text: "🌄 Khởi hành lúc 5h30 sáng để kịp đón bình minh bên hồ sen đó bạn!" },
  { section: "footer", text: "🌿 Làng mai nở đẹp nhất vào tháng Chạp — bạn đã lên kế hoạch chưa?" },
];

// ─── COMPANION ───
const SPIN_FRAMES = [2, 3, 4]; // frames khi di chuyển, sau đó về 1

export default function Companion() {
  const [visible, setVisible] = useState(true);
  const [msgIndex, setMsgIndex] = useState(0);
  const [bubbleKey, setBubbleKey] = useState(0);
  const [pos, setPos] = useState({ right: 24, bottom: 110 });
  const [walking, setWalking] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [frame, setFrame] = useState(1);
  const prevRight = useRef(24);

  // Scroll message tracking
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      let section = "hero";
      if (y > 2400) section = "footer";
      else if (y > 1900) section = "journey";
      else if (y > 1300) section = "gallery";
      else if (y > 900) section = "workshop";
      else if (y > 400) section = "bento";
      const idx = MESSAGES.findIndex(m => m.section === section);
      if (idx !== msgIndex) { setMsgIndex(idx); setBubbleKey(k => k + 1); }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [msgIndex]);

  // Random walking around the screen
  useEffect(() => {
    const walk = () => {
      const newRight = Math.floor(Math.random() * 260) + 20;
      const newBottom = Math.floor(Math.random() * 120) + 100;
      setFlipped(newRight > prevRight.current);
      prevRight.current = newRight;
      setWalking(true);
      setPos({ right: newRight, bottom: newBottom });
      setTimeout(() => setWalking(false), 1600);
    };
    const id = setInterval(walk, 6000 + Math.random() * 4000);
    return () => clearInterval(id);
  }, []);

  // Cycling frames 2→3→4→2→... khi walking, về 1 khi dừng
  useEffect(() => {
    if (!walking) {
      setFrame(1);
      return;
    }
    let idx = 0;
    setFrame(SPIN_FRAMES[idx]);
    const id = setInterval(() => {
      idx = (idx + 1) % SPIN_FRAMES.length;
      setFrame(SPIN_FRAMES[idx]);
    }, 160);
    return () => clearInterval(id);
  }, [walking]);

  const handleClick = () => {
    if (visible) { setVisible(false); }
    else { setMsgIndex(i => (i + 1) % MESSAGES.length); setBubbleKey(k => k + 1); setVisible(true); }
  };

  return (
    <div style={{
      position: "fixed",
      bottom: pos.bottom,
      right: pos.right,
      zIndex: 200,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 8,
      pointerEvents: "none",
      transition: "right 1.6s cubic-bezier(0.4,0,0.2,1), bottom 1.6s cubic-bezier(0.4,0,0.2,1)",
    }}>
      {visible && (
        <div key={bubbleKey} className="bubble-anim" style={{
          background: "white",
          border: "1.5px solid rgba(61,90,62,0.2)",
          borderRadius: "14px 14px 4px 14px",
          padding: "0.75rem 1rem",
          fontSize: "0.8rem",
          color: C.dark,
          lineHeight: 1.5,
          maxWidth: 220,
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          pointerEvents: "auto"
        }}>
          {MESSAGES[msgIndex].text.split(/(\*\*.*?\*\*)/).map((part, i) =>
            part.startsWith("**") ? <strong key={i} style={{ color: C.moss }}>{part.slice(2, -2)}</strong> : part
          )}
        </div>
      )}
      <div style={{ pointerEvents: "auto", transform: flipped ? "scaleX(-1)" : "scaleX(1)", transition: "transform 0.3s ease" }}>
        <img
          src={`/img/main_page/${frame}.png`}
          alt="companion"
          onClick={handleClick}
          style={{
            width: 80,
            height: 80,
            objectFit: "contain",
            cursor: "pointer",
            filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.18))",
            imageRendering: "pixelated",
          }}
        />
      </div>
    </div>
  );
}
