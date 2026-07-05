import { useState } from "react";
import { generateGrammarQuiz } from "../utils/groqApi";

const TOPICS = [
  {
    id: "present_simple",
    emoji: "🕐",
    label: "Hiện tại đơn",
    desc: "She goes to school every day.",
  },
  {
    id: "present_continuous",
    emoji: "🏃",
    label: "Hiện tại tiếp diễn",
    desc: "She is going to school now.",
  },
  {
    id: "mixed",
    emoji: "🎲",
    label: "Trộn cả hai",
    desc: "Phân biệt hai thì trong cùng bài.",
  },
];

const QUESTION_COUNT = 10;

export default function GrammarPractice({ onClose }) {
  const [topic, setTopic] = useState(null); // null = topic picker screen
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null); // index of chosen option, null = not answered
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  async function startTopic(t) {
    setTopic(t);
    setLoading(true);
    setError(null);
    setQuestions([]);
    setIdx(0);
    setPicked(null);
    setScore(0);
    setFinished(false);
    try {
      const data = await generateGrammarQuiz(t.id, QUESTION_COUNT);
      setQuestions(data.questions || []);
    } catch {
      setError("Không tạo được bài tập. Kiểm tra mạng rồi thử lại nhé.");
    } finally {
      setLoading(false);
    }
  }

  function pick(i) {
    if (picked !== null) return;
    setPicked(i);
    if (i === questions[idx].answer) setScore((s) => s + 1);
  }

  function next() {
    if (idx + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIdx((n) => n + 1);
    setPicked(null);
  }

  const current = questions[idx] || null;

  // ── TOPIC PICKER ──
  if (!topic) {
    return (
      <div className="fb-overlay">
        <div className="fb-box gp-box">
          <div className="fb-header">
            <span className="fb-title">📝 Bài tập ngữ pháp</span>
            <button className="fb-close" onClick={onClose}>✕</button>
          </div>
          <p className="gp-intro">Chọn chủ đề ngữ pháp — AI sẽ tạo {QUESTION_COUNT} câu trắc nghiệm cho bạn.</p>
          <div className="gp-topics">
            {TOPICS.map((t) => (
              <button key={t.id} className="gp-topic-card" onClick={() => startTopic(t)}>
                <span className="gp-topic-emoji">{t.emoji}</span>
                <span className="gp-topic-label">{t.label}</span>
                <span className="gp-topic-desc">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── FINISHED ──
  if (finished) {
    const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;
    return (
      <div className="fb-overlay">
        <div className="fb-box fb-result-box">
          <div className="fb-result-icon">{pct >= 70 ? "🎉" : pct >= 40 ? "💪" : "📖"}</div>
          <h2>Hoàn thành bài tập!</h2>
          <p className="gp-result-topic">{topic.emoji} {topic.label}</p>
          <div className="fb-pct">{score} / {questions.length} câu đúng ({pct}%)</div>
          <div className="fb-result-actions">
            <button className="fb-btn-secondary" onClick={() => startTopic(topic)}>🔄 Bài mới</button>
            <button className="fb-btn-secondary" onClick={() => setTopic(null)}>📚 Đổi chủ đề</button>
            <button className="fb-btn-primary" onClick={onClose}>✓ Xong</button>
          </div>
        </div>
      </div>
    );
  }

  const progress = questions.length ? (idx / questions.length) * 100 : 0;

  return (
    <div className="fb-overlay">
      <div className="fb-box gp-box">
        {/* ── HEADER ── */}
        <div className="fb-header">
          <span className="fb-title">{topic.emoji} {topic.label}</span>
          <button className="fb-close" onClick={onClose}>✕</button>
        </div>

        {loading && (
          <div className="fb-loading gp-loading">
            <div className="fb-spinner" />
            <p>AI đang soạn {QUESTION_COUNT} câu hỏi...</p>
          </div>
        )}

        {!loading && error && (
          <div className="fb-no-sentence">
            <p>{error}</p>
            <div className="fb-result-actions">
              <button className="fb-btn-secondary" onClick={() => startTopic(topic)}>🔄 Thử lại</button>
              <button className="fb-btn-secondary" onClick={() => setTopic(null)}>← Đổi chủ đề</button>
            </div>
          </div>
        )}

        {!loading && !error && current && (
          <>
            {/* ── PROGRESS ── */}
            <div className="fb-progress-wrap">
              <div className="fb-progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <div className="fb-meta">
              <span>Câu {idx + 1} / {questions.length}</span>
              <span className="fb-score"><span className="fb-ok">✓ {score}</span></span>
            </div>

            {/* ── QUESTION ── */}
            <div className="fb-sentence-box">
              <p className="fb-sentence">{current.question}</p>
            </div>

            {/* ── OPTIONS ── */}
            <div className="gp-options">
              {current.options.map((opt, i) => {
                let cls = "gp-option";
                if (picked !== null) {
                  if (i === current.answer) cls += " gp-correct";
                  else if (i === picked) cls += " gp-wrong";
                  else cls += " gp-dim";
                }
                return (
                  <button key={i} className={cls} onClick={() => pick(i)} disabled={picked !== null}>
                    <span className="gp-option-letter">{String.fromCharCode(65 + i)}</span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* ── EXPLANATION ── */}
            {picked !== null && (
              <div className={`gp-explain ${picked === current.answer ? "ok" : "no"}`}>
                {picked === current.answer ? "✓ Chính xác! " : "✗ Chưa đúng. "}
                {current.explanation}
              </div>
            )}

            {/* ── FOOTER ── */}
            <div className="fb-footer">
              {picked !== null && (
                <button className="fb-btn-next" onClick={next}>
                  {idx + 1 >= questions.length ? "Xem kết quả →" : "Tiếp theo →"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
