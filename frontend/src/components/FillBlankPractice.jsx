import { useState, useEffect, useRef, useCallback } from "react";
import { generateExamples } from "../utils/groqApi";
import { saveResult } from "../utils/db";

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function makeBlank(sentence, word) {
  const regex = new RegExp(`\\b(${word}(?:s|ed|ing|er|est|ly)?)\\b`, "gi");
  return sentence.replace(regex, (m) => "_".repeat(m.length));
}

function isCorrect(input, word) {
  const i = input.trim().toLowerCase();
  const w = word.toLowerCase();
  if (i === w) return true;
  const variants = [w, w + "s", w + "ed", w + "ing", w + "er", w + "ly", w + "est",
    w.replace(/e$/, "ing"), w.replace(/e$/, "ed"), w.replace(/y$/, "ies")];
  return variants.includes(i);
}

// Visual representation of the hidden word: "accidentally" → "_ _ _ _ _ _ _ _ _ _ _ _"
function wordMask(word) {
  return word.split("").map((_, i) => (
    <span key={i} className="fb-mask-letter">_</span>
  ));
}

const STREAK_MSGS = ["", "", "2🔥", "3🔥", "4🔥", "5🔥 Xuất sắc!", "6🔥 Tuyệt vời!", "7🔥 Không thể tin được!"];

export default function FillBlankPractice({ words, onClose }) {
  const [pool] = useState(() => shuffle(words));
  const [idx, setIdx] = useState(0);
  const [sentence, setSentence] = useState(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [state, setState] = useState("idle"); // idle | correct | wrong
  const [score, setScore] = useState({ correct: 0, wrong: 0, skipped: 0 });
  const [streak, setStreak] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [finished, setFinished] = useState(false);
  const inputRef = useRef(null);

  const current = pool[idx] || null;

  useEffect(() => {
    if (!current) return;
    setSentence(null);
    setState("idle");
    setInput("");
    setShowHint(false);
    loadSentence(current);
  }, [idx, current?.id]);

  useEffect(() => {
    if (sentence && state === "idle") inputRef.current?.focus();
  }, [sentence, state]);

  // Always use Groq — PDF examples have merged-word spacing issues
  async function loadSentence(word) {
    setLoading(true);
    try {
      const data = await generateExamples(word.word, word.vietnamese);
      // Pick the example that actually contains the word
      const ex =
        data.examples?.find((e) =>
          e.english?.toLowerCase().includes(word.word.toLowerCase())
        ) || data.examples?.[0];

      if (ex?.english) {
        setSentence({
          original: ex.english,
          blanked: makeBlank(ex.english, word.word),
          viet: ex.vietnamese,
        });
      } else {
        setSentence(null);
      }
    } catch {
      setSentence(null);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (state !== "idle" || !sentence?.blanked) return;
    const correct = isCorrect(input, current.word);
    setState(correct ? "correct" : "wrong");
    saveResult(current.id, correct);
    setScore((s) => ({
      ...s,
      correct: s.correct + (correct ? 1 : 0),
      wrong: s.wrong + (correct ? 0 : 1),
    }));
    setStreak((s) => (correct ? s + 1 : 0));
  }

  function next() {
    if (idx + 1 >= pool.length) { setFinished(true); return; }
    setIdx((i) => i + 1);
  }

  function skip() {
    setScore((s) => ({ ...s, skipped: s.skipped + 1 }));
    setStreak(0);
    next();
  }

  const restart = useCallback(() => {
    setIdx(0);
    setScore({ correct: 0, wrong: 0, skipped: 0 });
    setStreak(0);
    setFinished(false);
    setState("idle");
    setInput("");
  }, []);

  function highlight(text, word) {
    const parts = text.split(
      new RegExp(`(\\b${word}(?:s|ed|ing|er|est|ly)?\\b)`, "gi")
    );
    return parts.map((p, i) =>
      p.toLowerCase().startsWith(word.toLowerCase()) ? (
        <mark key={i} className="fb-highlight">{p}</mark>
      ) : p
    );
  }

  // ── FINISHED ──
  if (finished) {
    const total = score.correct + score.wrong + score.skipped;
    const pct = total ? Math.round((score.correct / total) * 100) : 0;
    return (
      <div className="fb-overlay">
        <div className="fb-box fb-result-box">
          <div className="fb-result-icon">{pct >= 70 ? "🎉" : pct >= 40 ? "💪" : "📖"}</div>
          <h2>Hoàn thành luyện tập!</h2>
          <div className="fb-result-stats">
            <div className="fb-stat-item fb-correct"><span>{score.correct}</span>Đúng</div>
            <div className="fb-stat-item fb-wrong-s"><span>{score.wrong}</span>Sai</div>
            <div className="fb-stat-item fb-skipped"><span>{score.skipped}</span>Bỏ qua</div>
          </div>
          <div className="fb-pct">{pct}% chính xác</div>
          <div className="fb-result-actions">
            <button className="fb-btn-secondary" onClick={restart}>🔄 Làm lại</button>
            <button className="fb-btn-primary" onClick={onClose}>✓ Xong</button>
          </div>
        </div>
      </div>
    );
  }

  const progress = pool.length ? (idx / pool.length) * 100 : 0;
  const streakLabel = STREAK_MSGS[Math.min(streak, STREAK_MSGS.length - 1)];

  return (
    <div className="fb-overlay">
      <div className="fb-box">
        {/* ── HEADER ── */}
        <div className="fb-header">
          <span className="fb-title">✏️ Điền vào chỗ trống</span>
          <div className="fb-header-right">
            {streakLabel && <span className="fb-streak">{streakLabel}</span>}
            <button className="fb-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* ── PROGRESS ── */}
        <div className="fb-progress-wrap">
          <div className="fb-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <div className="fb-meta">
          <span>Câu {idx + 1} / {pool.length}</span>
          <span className="fb-score">
            <span className="fb-ok">✓ {score.correct}</span>
            <span className="fb-no">✗ {score.wrong}</span>
          </span>
        </div>

        {/* ── WORD INFO — từ bị ẩn, chỉ hiện số chữ cái + từ loại ── */}
        {current && (
          <div className="fb-word-info">
            <div className="fb-mask-wrap">
              {wordMask(current.word)}
              <span className="fb-letter-count">({current.word.length} chữ cái)</span>
            </div>
            <div className="fb-word-meta">
              <span className="fb-pos">{current.pos}</span>
              <span className="fb-topic-tag">{current.topic}</span>
            </div>
          </div>
        )}

        {/* ── QUESTION AREA ── */}
        <div className="fb-question-area">
          {loading && (
            <div className="fb-loading">
              <div className="fb-spinner" />
              <p>AI đang tạo câu ví dụ...</p>
            </div>
          )}

          {!loading && !sentence && (
            <div className="fb-no-sentence">
              <p>Không tạo được câu ví dụ cho từ này.</p>
              <button className="fb-btn-skip" onClick={skip}>Bỏ qua →</button>
            </div>
          )}

          {!loading && sentence && (
            <>
              {/* Câu với chỗ trống */}
              <div className="fb-sentence-box">
                {state === "idle" ? (
                  <p className="fb-sentence">{sentence.blanked}</p>
                ) : (
                  <p className="fb-sentence fb-revealed">
                    {highlight(sentence.original, current.word)}
                  </p>
                )}
              </div>

              {/* Nghĩa tiếng Việt + gợi ý */}
              <div className="fb-hint-row">
                <span className="fb-viet-hint">🇻🇳 {sentence.viet || current.vietnamese}</span>
                {state === "idle" && (
                  <button
                    className="fb-hint-btn"
                    onClick={() => setShowHint(true)}
                    disabled={showHint}
                  >
                    {showHint
                      ? `${current.word[0].toUpperCase()}${"_ ".repeat(current.word.length - 1).trim()}`
                      : "💡 Gợi ý"}
                  </button>
                )}
              </div>

              {/* Input / kết quả */}
              {state === "idle" ? (
                <form onSubmit={handleSubmit} className="fb-form">
                  <input
                    ref={inputRef}
                    className="fb-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Nhập từ còn thiếu..."
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="submit"
                    className="fb-btn-check"
                    disabled={!input.trim()}
                  >
                    Kiểm tra
                  </button>
                </form>
              ) : (
                <div className={`fb-result-row ${state}`}>
                  {state === "correct" ? (
                    <span className="fb-feedback fb-feedback-ok">
                      ✓ Chính xác! <strong>{current.word}</strong>
                    </span>
                  ) : (
                    <span className="fb-feedback fb-feedback-no">
                      ✗ Sai. Đáp án đúng: <strong>{current.word}</strong>
                      {input && <em> (bạn nhập: "{input}")</em>}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="fb-footer">
          {state === "idle" ? (
            <button className="fb-btn-skip" onClick={skip}>Bỏ qua →</button>
          ) : (
            <button className="fb-btn-next" onClick={next}>
              {idx + 1 >= pool.length ? "Xem kết quả →" : "Tiếp theo →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
