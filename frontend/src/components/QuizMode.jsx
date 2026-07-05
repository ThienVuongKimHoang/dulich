import { useState, useEffect, useCallback } from "react";
import { vocabulary } from "../data/vocabulary";
import { saveResult, removeFromQueue } from "../utils/db";
import { generateExamples } from "../utils/groqApi";

// Shuffle array
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// Pick 3 wrong answers from vocab (different word)
function pickWrongOptions(correctWord, allWords) {
  const others = allWords.filter((w) => w.id !== correctWord.id && w.vietnamese);
  return shuffle(others).slice(0, 3);
}

// Build a fill-in-blank question from an example sentence
function buildFillBlank(word, example) {
  if (!example) return null;
  const regex = new RegExp(`\\b${word}\\b`, "gi");
  if (!regex.test(example)) return null;
  const blank = example.replace(regex, "_____");
  return blank;
}

const QUESTION_TYPES = ["mc_en_vi", "mc_vi_en", "fill_blank"];

function buildQuestion(queueWords, allWords, index) {
  const word = queueWords[index % queueWords.length];
  const fullWord = allWords.find((w) => w.id === word.id) || word;

  // Rotate question types
  const type = QUESTION_TYPES[index % QUESTION_TYPES.length];

  if (type === "fill_blank") {
    const blank = buildFillBlank(fullWord.word, fullWord.example);
    if (!blank) {
      // Fallback to mc_en_vi
      return buildMCQuestion(fullWord, allWords, "mc_en_vi");
    }
    return { type: "fill_blank", word: fullWord, blank, hint: fullWord.vietnamese };
  }

  return buildMCQuestion(fullWord, allWords, type);
}

function buildMCQuestion(word, allWords, type) {
  const wrongOpts = pickWrongOptions(word, allWords);
  const options = shuffle([word, ...wrongOpts]);

  return {
    type,
    word,
    options,
    correctId: word.id,
  };
}

export default function QuizMode({ queueWords, allWords, onClose, onRemoveWord }) {
  const [index, setIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState(null); // for MC
  const [fillInput, setFillInput] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [finished, setFinished] = useState(false);
  const [aiExample, setAiExample] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  // Build all questions once
  useEffect(() => {
    const qs = queueWords.map((_, i) => buildQuestion(queueWords, allWords, i));
    // Also add a second pass reversed
    setQuestions(qs);
  }, [queueWords, allWords]);

  const current = questions[index];

  // Load AI example for fill_blank questions that don't have a native example
  useEffect(() => {
    if (!current) return;
    setAiExample(null);
    if (current.type === "fill_blank" && !current.word.example) {
      setLoadingAI(true);
      generateExamples(current.word.word, current.word.vietnamese)
        .then((data) => {
          const ex = data.examples?.[0]?.english || "";
          const blank = buildFillBlank(current.word.word, ex);
          if (blank) setAiExample({ blank, original: ex });
        })
        .catch(() => {})
        .finally(() => setLoadingAI(false));
    }
  }, [current]);

  const handleAnswer = useCallback(
    (isCorrect) => {
      saveResult(current.word.id, isCorrect);
      setScore((s) => ({
        correct: s.correct + (isCorrect ? 1 : 0),
        wrong: s.wrong + (isCorrect ? 0 : 1),
      }));
      setRevealed(true);
    },
    [current]
  );

  function handleMCSelect(optionId) {
    if (revealed) return;
    setSelected(optionId);
    handleAnswer(optionId === current.correctId);
  }

  function handleFillSubmit(e) {
    e.preventDefault();
    if (revealed) return;
    const answer = fillInput.trim().toLowerCase();
    const correct = current.word.word.toLowerCase();
    handleAnswer(answer === correct);
    setRevealed(true);
  }

  function nextQuestion() {
    if (index + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setFillInput("");
    setRevealed(false);
    setAiExample(null);
  }

  if (!questions.length || !current) {
    return (
      <div className="quiz-overlay">
        <div className="quiz-box">
          <p>Đang tải câu hỏi...</p>
        </div>
      </div>
    );
  }

  if (finished) {
    const total = score.correct + score.wrong;
    const pct = Math.round((score.correct / total) * 100);
    return (
      <div className="quiz-overlay">
        <div className="quiz-box quiz-result">
          <div className="result-icon">{pct >= 70 ? "🎉" : pct >= 40 ? "💪" : "📖"}</div>
          <h2>Kết quả kiểm tra</h2>
          <div className="result-score">
            <span className="score-correct">{score.correct}</span>
            <span className="score-sep">/</span>
            <span className="score-total">{total}</span>
          </div>
          <p className="result-pct">{pct}% chính xác</p>
          <p className="result-msg">
            {pct >= 80
              ? "Xuất sắc! Bạn đã nắm vững các từ này."
              : pct >= 60
              ? "Khá tốt! Hãy ôn lại những từ còn sai."
              : "Hãy ôn lại nhiều hơn nhé!"}
          </p>
          <div className="result-actions">
            <button className="btn-restart" onClick={() => { setIndex(0); setScore({ correct: 0, wrong: 0 }); setFinished(false); setRevealed(false); setSelected(null); setFillInput(""); }}>
              🔄 Làm lại
            </button>
            <button className="btn-close-quiz" onClick={onClose}>
              ✓ Xong
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((index) / questions.length) * 100;
  const blank = aiExample?.blank || current.blank;
  const originalSentence = aiExample?.original || current.word?.example;

  return (
    <div className="quiz-overlay">
      <div className="quiz-box">
        {/* Header */}
        <div className="quiz-header">
          <span className="quiz-title">📝 Kiểm tra từ vựng</span>
          <button className="quiz-close" onClick={onClose}>✕</button>
        </div>

        {/* Progress */}
        <div className="quiz-progress-wrap">
          <div className="quiz-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <div className="quiz-counter">
          Câu {index + 1} / {questions.length} &nbsp;·&nbsp;
          <span className="q-correct">✓ {score.correct}</span>
          &nbsp;·&nbsp;
          <span className="q-wrong">✗ {score.wrong}</span>
        </div>

        {/* Question area */}
        <div className="quiz-question-area">

          {/* MC: English → Vietnamese */}
          {current.type === "mc_en_vi" && (
            <>
              <p className="q-label">Từ tiếng Anh này có nghĩa là gì?</p>
              <div className="q-word">{current.word.word}</div>
              <p className="q-pos">{current.word.pos}</p>
              <div className="mc-options">
                {current.options.map((opt) => {
                  const isCorrect = opt.id === current.correctId;
                  const isSelected = selected === opt.id;
                  let cls = "mc-option";
                  if (revealed) {
                    if (isCorrect) cls += " correct";
                    else if (isSelected) cls += " wrong";
                  } else if (isSelected) {
                    cls += " selected";
                  }
                  return (
                    <button key={opt.id} className={cls} onClick={() => handleMCSelect(opt.id)} disabled={revealed}>
                      {opt.vietnamese}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* MC: Vietnamese → English */}
          {current.type === "mc_vi_en" && (
            <>
              <p className="q-label">Nghĩa tiếng Việt này ứng với từ nào?</p>
              <div className="q-word q-viet">🇻🇳 {current.word.vietnamese}</div>
              <p className="q-pos">{current.word.pos}</p>
              <div className="mc-options">
                {current.options.map((opt) => {
                  const isCorrect = opt.id === current.correctId;
                  const isSelected = selected === opt.id;
                  let cls = "mc-option";
                  if (revealed) {
                    if (isCorrect) cls += " correct";
                    else if (isSelected) cls += " wrong";
                  } else if (isSelected) {
                    cls += " selected";
                  }
                  return (
                    <button key={opt.id} className={cls} onClick={() => handleMCSelect(opt.id)} disabled={revealed}>
                      {opt.word}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Fill in blank */}
          {current.type === "fill_blank" && (
            <>
              <p className="q-label">Điền từ còn thiếu vào chỗ trống:</p>
              {loadingAI ? (
                <p className="q-loading">⏳ Đang tạo câu hỏi...</p>
              ) : (
                <div className="fill-sentence">{blank || `_____ (${current.word.pos})`}</div>
              )}
              <p className="q-hint">Gợi ý: 🇻🇳 {current.word.vietnamese}</p>
              {!revealed ? (
                <form onSubmit={handleFillSubmit} className="fill-form">
                  <input
                    autoFocus
                    className="fill-input"
                    value={fillInput}
                    onChange={(e) => setFillInput(e.target.value)}
                    placeholder="Nhập từ còn thiếu..."
                  />
                  <button type="submit" className="fill-submit">Kiểm tra</button>
                </form>
              ) : (
                <div className={`fill-result ${fillInput.trim().toLowerCase() === current.word.word.toLowerCase() ? "correct" : "wrong"}`}>
                  {fillInput.trim().toLowerCase() === current.word.word.toLowerCase()
                    ? "✓ Chính xác!"
                    : `✗ Đáp án đúng: "${current.word.word}"`}
                  {originalSentence && (
                    <p className="fill-original">📄 {originalSentence}</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Revealed state: show answer + next */}
        {revealed && (
          <div className="quiz-revealed">
            <div className="revealed-answer">
              <strong>{current.word.word}</strong> ({current.word.pos}) — {current.word.vietnamese}
            </div>
            <button className="btn-next" onClick={nextQuestion}>
              {index + 1 >= questions.length ? "Xem kết quả →" : "Câu tiếp →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
