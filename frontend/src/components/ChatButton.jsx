import { C } from "../constants";

export default function ChatButton({ onClick }) {
  return (
    <div
      style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 200 }}
      className="chat-fab"
    >
      {/* Ripple */}
      <div style={{
        position: "absolute", inset: -8, borderRadius: "50%",
        border: `2px solid ${C.moss}`, animation: "ripple 2s ease-out infinite",
        pointerEvents: "none"
      }} />
      <button
        onClick={onClick}
        className="chat-pulse"
        style={{
          width: 56, height: 56, borderRadius: "50%",
          background: `linear-gradient(135deg, ${C.moss}, #2A4A2B)`,
          border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", position: "relative", zIndex: 1
        }}
        title="Trò chuyện với Mai"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
      <div style={{
        position: "absolute", right: "calc(100% + 10px)", top: "50%", transform: "translateY(-50%)",
        background: C.dark, color: C.cream, fontSize: "0.72rem", fontWeight: 500,
        padding: "0.3rem 0.7rem", borderRadius: "2rem", whiteSpace: "nowrap",
        pointerEvents: "none", opacity: 0.9
      }}>
        Trò chuyện với Mai
      </div>
    </div>
  );
}
