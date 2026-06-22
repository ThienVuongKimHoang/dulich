import { useState, useEffect, useRef } from "react";

const C = {
  moss:      "#3D5A3E",
  gold:      "#C8963E",
  cream:     "#F5F0E8",
  dark:      "#1C2B1D",
  warmWhite: "#FEFCF8",
  sage:      "#7A9E7E",
  rust:      "#9B3A1A",
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const chatStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Be Vietnam Pro', sans-serif; }

  @keyframes msgIn {
    from { opacity: 0; transform: translateY(10px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes floatChar {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-6px); }
  }
  @keyframes typingDot {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
    40%            { transform: translateY(-6px); opacity: 1; }
  }
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-24px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  .chat-msg-in  { animation: msgIn 0.35s cubic-bezier(0.34,1.2,0.64,1) forwards; }
  .chat-avatar  { animation: floatChar 3s ease-in-out infinite; }
  .typing-dot   { animation: typingDot 1.2s ease-in-out infinite; display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #7A9E7E; }
  .typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .typing-dot:nth-child(3) { animation-delay: 0.4s; }

  .chat-input { flex: 1; padding: 0.75rem 1rem; border: 1.5px solid rgba(61,90,62,0.2); border-radius: 24px; font-size: 0.9rem; font-family: 'Be Vietnam Pro', sans-serif; color: #1C2B1D; background: #FEFCF8; outline: none; transition: border-color 0.2s, box-shadow 0.2s; resize: none; line-height: 1.5; }
  .chat-input:focus { border-color: #3D5A3E; box-shadow: 0 0 0 3px rgba(61,90,62,0.1); }
  .send-btn { width: 44px; height: 44px; border-radius: 50%; background: #3D5A3E; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; transition: background 0.2s, transform 0.15s; }
  .send-btn:hover { background: #2A4A2B; transform: scale(1.05); }
  .send-btn:disabled { background: #ccc; cursor: not-allowed; transform: none; }

  .suggestion-chip { padding: 0.4rem 0.85rem; border: 1.5px solid rgba(61,90,62,0.25); border-radius: 2rem; font-size: 0.75rem; font-weight: 500; color: #3D5A3E; background: white; cursor: pointer; transition: all 0.2s; white-space: nowrap; font-family: 'Be Vietnam Pro', sans-serif; }
  .suggestion-chip:hover { background: #3D5A3E; color: white; border-color: #3D5A3E; }
`;

function renderMsgText(text) {
  if (!text || !text.includes("🌸")) return text;
  return text.split("🌸").reduce((acc, part, i) => {
    if (i === 0) return [part];
    return [...acc, <img key={i} src="/img/main_page/hoa_mai.png" style={{ width: 16, height: 16, objectFit: "contain", verticalAlign: "middle", margin: "0 1px" }} alt="" />, part];
  }, []);
}

// Static AI replies (fallback when API unavailable)
const BOT_REPLIES = {
  default: [
    "Bình Lợi là vùng đất yên bình ở huyện Bình Chánh, TP.HCM — chỉ cách trung tâm khoảng 20km. Bạn muốn biết thêm về điều gì?",
    "Mình có thể giúp bạn tìm hiểu về làng mai, làng nhang, hồ cá koi hay các workshop ở đây. Bạn quan tâm đến điều gì?",
    "Thời điểm đẹp nhất để ghé thăm là tháng Chạp khi mai vàng bắt đầu nở rộ. Bạn có muốn đặt lịch tham quan không?",
  ],
  mai: ["🌼 Làng mai vàng Bình Lợi có lịch sử hơn 300 năm! Thời điểm đẹp nhất là tháng 1–2 (âm lịch). Các vườn mai trải dài, rực vàng — rất photogenic đó!"],
  nhang: ["🕯️ Làng nhang ở Lê Minh Xuân gần Bình Lợi nổi tiếng với nhang trầm hương tự nhiên. Workshop làm nhang kéo dài khoảng 4 tiếng, phù hợp cả gia đình."],
  koi: ["🐠 Hồ cá koi ở đây rất yên tĩnh và đẹp. Buổi chiều ngồi bên hồ ngắm cá bơi lội — cực kỳ thư giãn. Mình hay thiền ở đó lắm!"],
  workshop: ["📋 Hiện có 3 loại workshop: Uốn mai & cắm hoa (3h), Thiền định bên hồ (2h), Làm nhang thủ công (4h). Bạn muốn đăng ký loại nào?"],
  duong: ["🚗 Từ trung tâm Sài Gòn, bạn đi theo hướng Bình Chánh, mất khoảng 45–60 phút. Có thể đi xe máy, ô tô hoặc đặt xe công nghệ."],
  gia: ["💰 Workshop từ miễn phí đến khoảng 200.000–500.000đ/người tùy loại. Tham quan tự do nhiều điểm miễn phí. Bạn muốn biết giá chi tiết loại nào?"],
};

function getBotReply(text) {
  const t = text.toLowerCase();
  if (t.includes("mai") || t.includes("hoa"))      return BOT_REPLIES.mai[0];
  if (t.includes("nhang") || t.includes("hương"))  return BOT_REPLIES.nhang[0];
  if (t.includes("koi") || t.includes("cá"))       return BOT_REPLIES.koi[0];
  if (t.includes("workshop") || t.includes("đăng ký")) return BOT_REPLIES.workshop[0];
  if (t.includes("đường") || t.includes("đi") || t.includes("xe")) return BOT_REPLIES.duong[0];
  if (t.includes("giá") || t.includes("bao nhiêu") || t.includes("phí")) return BOT_REPLIES.gia[0];
  return BOT_REPLIES.default[Math.floor(Math.random() * BOT_REPLIES.default.length)];
}

const SUGGESTIONS = [
  "Làng mai có gì?", "Workshop làm nhang", "Đường đi như thế nào?",
  "Giá vé bao nhiêu?", "Hồ cá Koi ở đâu?", "Đặt lịch tham quan",
];

// ─── COMPANION AVATAR ───
function AvatarSVG({ size = 48 }) {
  return (
    <img
      src="/img/main_page/hoa_mai.png"
      alt="Mai"
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}

// ─── MESSAGE BUBBLE ───
function Bubble({ msg }) {
  const isBot = msg.role === "bot";
  return (
    <div className="chat-msg-in" style={{
      display: "flex",
      flexDirection: isBot ? "row" : "row-reverse",
      alignItems: "flex-end",
      gap: 10,
      marginBottom: "1rem",
    }}>
      {isBot && (
        <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", background: "#EEF5EE", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${C.sage}` }}>
          <AvatarSVG size={28} />
        </div>
      )}
      <div style={{
        maxWidth: "72%",
        padding: "0.7rem 1rem",
        borderRadius: isBot ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
        background: isBot ? "white" : C.moss,
        color: isBot ? C.dark : "white",
        fontSize: "0.88rem",
        lineHeight: 1.6,
        boxShadow: isBot ? "0 2px 12px rgba(0,0,0,0.07)" : "0 2px 12px rgba(61,90,62,0.25)",
        border: isBot ? `1px solid rgba(0,0,0,0.05)` : "none",
      }}>
        {renderMsgText(msg.text)}
        <div style={{ fontSize: "0.65rem", opacity: 0.5, marginTop: 4, textAlign: isBot ? "left" : "right" }}>
          {msg.time}
        </div>
      </div>
    </div>
  );
}

// ─── TYPING INDICATOR ───
function Typing() {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: "1rem" }}>
      <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", background: "#EEF5EE", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${C.sage}` }}>
        <AvatarSVG size={28} />
      </div>
      <div style={{ padding: "0.75rem 1rem", background: "white", borderRadius: "16px 16px 16px 4px", border: "1px solid rgba(0,0,0,0.05)", display: "flex", gap: 4, alignItems: "center" }}>
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  );
}

// ─── CHAT PAGE ───
export default function ChatPage({ onBack }) {
  const [messages, setMessages] = useState([
    { id: 1, role: "bot", text: "Chào bạn! 🌸 Mình là Mai, người bạn đồng hành tại Bình Lợi. Bạn muốn khám phá điều gì hôm nay?", time: "vừa xong" }
  ]);
  const [input, setInput]     = useState("");
  const [typing, setTyping]   = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const nowTime = () => new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { id: Date.now(), role: "user", text: text.trim(), time: nowTime() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` },
        body: JSON.stringify({ message: text.trim() }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setTyping(false);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: "bot", text: data.reply || data.message || getBotReply(text), time: nowTime() }]);
    } catch {
      // fallback to static reply
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 800));
      setTyping(false);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: "bot", text: getBotReply(text), time: nowTime() }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  return (
    <>
      <style>{chatStyles}</style>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.warmWhite }}>

        {/* ─── HEADER ─── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "1rem 1.5rem", background: "white", borderBottom: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", flexShrink: 0 }}>
          <button onClick={onBack}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.moss, display: "flex", alignItems: "center", gap: 6, padding: "0.4rem 0.75rem", borderRadius: "2rem", fontSize: "0.82rem", fontWeight: 500, fontFamily: "'Be Vietnam Pro', sans-serif", transition: "background 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#EEF5EE"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            Quay lại
          </button>

          {/* Avatar + name */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#EEF5EE", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${C.sage}` }}>
                <AvatarSVG size={28} />
              </div>
              <div style={{ position: "absolute", bottom: 2, right: 2, width: 10, height: 10, borderRadius: "50%", background: "#4CAF50", border: "2px solid white" }} />
            </div>
            <div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 600, color: C.dark }}>Mai</p>
              <p style={{ fontSize: "0.7rem", color: C.sage }}>Người bạn đồng hành · Bình Lợi</p>
            </div>
          </div>

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="18" fill="#3D5A3E" />
              <path d="M18 8 C14 12 10 14 10 20 C10 25 13.5 29 18 29 C22.5 29 26 25 26 20 C26 14 22 12 18 8Z" fill="#7A9E7E" />
              <path d="M18 13 C16 16 14 18 14 21.5 C14 24 15.8 26 18 26 C20.2 26 22 24 22 21.5 C22 18 20 16 18 13Z" fill="#F5F0E8" />
              <circle cx="18" cy="21" r="2.5" fill="#C8963E" />
            </svg>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.9rem", fontWeight: 600, color: C.moss, lineHeight: 1.1 }}>
              BÌNH LỢI
              <span style={{ display: "block", fontSize: "0.55rem", fontWeight: 300, letterSpacing: "0.15em", color: C.gold, textTransform: "uppercase" }}>Healing Journey</span>
            </div>
          </div>
        </div>

        {/* ─── MESSAGES ─── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column" }}>
          {/* Welcome banner */}
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div style={{ display: "inline-block", background: C.cream, borderRadius: 12, padding: "0.5rem 1.25rem", fontSize: "0.72rem", color: "#888" }}>
              🌿 Hôm nay, {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })}
            </div>
          </div>

          {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
          {typing && <Typing />}
          <div ref={bottomRef} />
        </div>

        {/* ─── SUGGESTIONS ─── */}
        <div style={{ padding: "0.5rem 1.5rem 0", display: "flex", gap: "0.5rem", overflowX: "auto", flexShrink: 0, paddingBottom: "0.25rem" }}>
          {SUGGESTIONS.map(s => (
            <button key={s} className="suggestion-chip" onClick={() => sendMessage(s)}>{s}</button>
          ))}
        </div>

        {/* ─── INPUT ─── */}
        <div style={{ padding: "0.75rem 1.5rem 1.25rem", background: "white", borderTop: "1px solid rgba(0,0,0,0.05)", display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
          <textarea
            ref={inputRef}
            className="chat-input"
            rows={1}
            placeholder="Hỏi Lợi về Bình Lợi..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            style={{ maxHeight: 100 }}
          />
          <button className="send-btn" onClick={() => sendMessage(input)} disabled={!input.trim() || loading}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>

      </div>
    </>
  );
}
