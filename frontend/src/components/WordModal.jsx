import { useState, useEffect } from "react";
import { generateExamples } from "../utils/groqApi";
import { isInQueue, addToQueue, removeFromQueue } from "../utils/db";

const TOPIC_COLORS = {
  accidents: "#ef5350", appearance: "#ab47bc", communication: "#42a5f5",
  countryside: "#66bb6a", culture: "#ff7043", education: "#26a69a",
  entertainment: "#ec407a", environment: "#4caf50", family: "#ff8a65",
  food: "#ffa726", health: "#26c6da",
};

export default function WordModal({ word, onClose, onQueueChange }) {
  const [examples, setExamples] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inQueue, setInQueue] = useState(() => isInQueue(word.id));
  const [revealed, setRevealed] = useState(() => new Set());

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    fetchExamples();
  }, [word.id]);

  async function fetchExamples() {
    setLoading(true);
    setError(null);
    setRevealed(new Set());
    try {
      const data = await generateExamples(word.word, word.vietnamese);
      setExamples(data.examples);
    } catch {
      setError("Không thể tạo ví dụ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  function speak(text) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  }

  function toggleQueue() {
    if (inQueue) {
      removeFromQueue(word.id);
      setInQueue(false);
    } else {
      addToQueue(word);
      setInQueue(true);
    }
    onQueueChange?.();
  }

  const color = TOPIC_COLORS[word.category] || "#607d8b";
  const imgUrl = `https://loremflickr.com/600/260/${encodeURIComponent(word.word)}?lock=${word.id}`;

  function highlightWord(sentence) {
    const parts = sentence.split(new RegExp(`(\\b${word.word}s?\\b)`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase().startsWith(word.word.toLowerCase())
        ? <strong key={i} style={{ color }}>{part}</strong>
        : part
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <img
          src={imgUrl}
          alt={word.word}
          className="modal-image"
          onError={(e) => { e.target.src = `https://picsum.photos/seed/${word.word}/600/260`; }}
        />

        <div className="modal-title-area">
          <div className="modal-word-row">
            <h2 className="modal-word" style={{ color }}>{word.word}</h2>
            <button className="speak-btn" style={{ color }} onClick={() => speak(word.word)}>🔊</button>
            <button
              className={`queue-btn ${inQueue ? "in-queue" : ""}`}
              onClick={toggleQueue}
              style={inQueue ? { backgroundColor: color, color: "white", borderColor: color } : { color, borderColor: color }}
              title={inQueue ? "Xóa khỏi hàng ôn tập" : "Thêm vào hàng ôn tập"}
            >
              {inQueue ? "✓ Đang ôn" : "+ Thêm vào ôn"}
            </button>
          </div>
          <p className="modal-pos">{word.pos}</p>
          <p className="modal-viet">🇻🇳 {word.vietnamese}</p>
          {word.topic && (
            <span className="modal-badge" style={{ backgroundColor: color }}>{word.topic}</span>
          )}

          {/* Example from PDF */}
          {word.example && (
            <div className="pdf-example">
              <span className="pdf-ex-label">📄 Ví dụ gốc: </span>
              <span>{highlightWord(word.example)}</span>
              <button className="speak-small" onClick={() => speak(word.example)}>🔊</button>
            </div>
          )}
        </div>

        <div className="modal-examples">
          <div className="examples-header">
            <h3>🤖 Ví dụ do AI tạo</h3>
            <button className="regen-btn" onClick={fetchExamples} disabled={loading}
              style={{ borderColor: color, color }}>
              {loading ? "⏳ Đang tạo..." : "🔄 Tạo lại"}
            </button>
          </div>

          {loading && (
            <div className="loading-area">
              <div className="spinner" style={{ borderTopColor: color }} />
              <p>AI đang tạo ví dụ cho "{word.word}"...</p>
            </div>
          )}
          {error && (
            <div className="error-box">
              <p>{error}</p>
              <button onClick={fetchExamples} style={{ color }}>Thử lại</button>
            </div>
          )}
          {examples && !loading && (
            <div className="examples-list">
              {examples.map((ex, i) => (
                <div className="example-item" key={i} style={{ borderLeftColor: color }}>
                  <div className="example-en">
                    <span className="ex-num" style={{ backgroundColor: color }}>{i + 1}</span>
                    <p>{highlightWord(ex.english)}</p>
                    <button className="speak-small" onClick={() => speak(ex.english)}>🔊</button>
                  </div>
                  {revealed.has(i) ? (
                    <p className="example-viet">🇻🇳 {ex.vietnamese}</p>
                  ) : (
                    <button
                      className="viet-spoiler"
                      onClick={() => setRevealed((prev) => new Set(prev).add(i))}
                    >
                      👁 Bấm để xem nghĩa tiếng Việt
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
