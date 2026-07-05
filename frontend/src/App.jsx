import { useState, useMemo, useEffect, useCallback } from "react";
import { vocabulary, categories } from "./data/vocabulary";
import WordCard from "./components/WordCard";
import WordModal from "./components/WordModal";
import QuizMode from "./components/QuizMode";
import FillBlankPractice from "./components/FillBlankPractice";
import GrammarPractice from "./components/GrammarPractice";
import { getQueue, clearQueue, removeFromQueue } from "./utils/db";
import "./App.css";

const PAGE_SIZE = 40;

export default function App() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedWord, setSelectedWord] = useState(null);
  const [page, setPage] = useState(1);
  const [queue, setQueue] = useState(() => getQueue());
  const [showQuiz, setShowQuiz] = useState(false);
  const [showFillBlank, setShowFillBlank] = useState(false);
  const [showGrammar, setShowGrammar] = useState(false);
  const [showQueuePanel, setShowQueuePanel] = useState(false);
  const [toast, setToast] = useState(null);

  // Refresh queue from storage
  const refreshQueue = useCallback(() => {
    setQueue(getQueue());
  }, []);

  // When word clicked from grid → open modal (also triggers queue add inside modal)
  function handleCardClick(word) {
    setSelectedWord(word);
  }

  // Show toast notification
  function showToast(msg, type = "info") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return vocabulary.filter((w) => {
      const matchCat = activeCategory === "all" || w.category === activeCategory;
      const matchSearch =
        !q ||
        w.word.toLowerCase().includes(q) ||
        w.vietnamese.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, activeCategory]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, activeCategory]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;

  const queueIds = useMemo(() => new Set(queue.map((w) => w.id)), [queue]);

  // Resolve full word objects for queue (for quiz)
  const queueFull = useMemo(
    () => queue.map((q) => vocabulary.find((w) => w.id === q.id)).filter(Boolean),
    [queue]
  );

  function handleStartQuiz() {
    if (queue.length < 2) {
      showToast("Cần ít nhất 2 từ trong hàng ôn tập để bắt đầu!", "error");
      return;
    }
    setShowQuiz(true);
    setShowQueuePanel(false);
  }

  function handleRemoveFromQueue(wordId) {
    removeFromQueue(wordId);
    refreshQueue();
  }

  return (
    <div className="app">
      {/* HEADER */}
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">📖</span>
            <div>
              <h1>VocabMaster</h1>
              <p>2000 từ vựng B2 · AI ví dụ · Groq</p>
            </div>
          </div>
          <div className="header-actions">
            <div className="header-stats">
              <div className="stat"><span className="stat-num">{vocabulary.length}</span><span className="stat-label">Từ</span></div>
              <div className="stat"><span className="stat-num">{categories.length - 1}</span><span className="stat-label">Chủ đề</span></div>
            </div>
            <button
              className={`queue-trigger ${queue.length > 0 ? "has-items" : ""}`}
              onClick={() => setShowQueuePanel((v) => !v)}
            >
              📋 <span className="btn-label">Ôn tập</span>
              {queue.length > 0 && <span className="queue-badge">{queue.length}</span>}
            </button>
            <button
              className="fill-trigger"
              onClick={() => { setShowFillBlank(true); setShowQueuePanel(false); }}
              disabled={queue.length < 1}
            >
              ✏️ <span className="btn-label">Điền chỗ trống</span>
            </button>
            <button
              className="grammar-trigger"
              onClick={() => { setShowGrammar(true); setShowQueuePanel(false); }}
            >
              📝 <span className="btn-label">Ngữ pháp</span>
            </button>
            <button
              className="quiz-trigger"
              onClick={handleStartQuiz}
              disabled={queue.length < 2}
            >
              🎯 <span className="btn-label">Kiểm tra</span>
            </button>
          </div>
        </div>
      </header>

      {/* QUEUE PANEL */}
      {showQueuePanel && (
        <div className="queue-panel">
          <div className="queue-panel-header">
            <h3>📋 Hàng ôn tập ({queue.length} từ)</h3>
            <div className="queue-panel-actions">
              {queue.length > 0 && (
                <>
                  <button className="qp-start-btn" onClick={handleStartQuiz}>🎯 Kiểm tra ngay</button>
                  <button className="qp-clear-btn" onClick={() => { clearQueue(); refreshQueue(); }}>🗑 Xoá hết</button>
                </>
              )}
              <button className="qp-close" onClick={() => setShowQueuePanel(false)}>✕</button>
            </div>
          </div>
          {queue.length === 0 ? (
            <p className="queue-empty">Chưa có từ nào. Hãy click vào từ và chọn "+ Thêm vào ôn" trong chi tiết từ.</p>
          ) : (
            <div className="queue-list">
              {queue.map((w) => (
                <div className="queue-item" key={w.id}>
                  <span className="qi-word">{w.word}</span>
                  <span className="qi-viet">{w.vietnamese}</span>
                  <button className="qi-remove" onClick={() => handleRemoveFromQueue(w.id)}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MAIN */}
      <main className="app-main">
        <div className="controls">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              type="text"
              placeholder="Tìm từ tiếng Anh hoặc tiếng Việt..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && <button className="clear-btn" onClick={() => setSearch("")}>✕</button>}
          </div>
          <div className="category-tabs-wrap">
          <div className="category-tabs">
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`cat-tab ${activeCategory === cat.id ? "active" : ""}`}
                style={activeCategory === cat.id ? { backgroundColor: cat.color, borderColor: cat.color } : { borderColor: cat.color, color: cat.color }}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.emoji} {cat.label}
                {cat.count && <span className="cat-count">{cat.count}</span>}
              </button>
            ))}
          </div>
          </div>
        </div>

        <div className="results-info">
          Hiển thị <strong>{paginated.length}</strong> / <strong>{filtered.length}</strong> từ
          {queue.length > 0 && <span className="queue-info-badge">· {queue.length} từ trong hàng ôn</span>}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>😔 Không tìm thấy từ nào.</p>
            <button onClick={() => { setSearch(""); setActiveCategory("all"); }}>Xem tất cả</button>
          </div>
        ) : (
          <>
            <div className="word-grid">
              {paginated.map((word) => (
                <WordCard
                  key={word.id}
                  word={word}
                  onClick={handleCardClick}
                  inQueue={queueIds.has(word.id)}
                />
              ))}
            </div>
            {hasMore && (
              <div className="load-more-wrap">
                <button className="load-more-btn" onClick={() => setPage((p) => p + 1)}>
                  Xem thêm ({filtered.length - paginated.length} từ còn lại)
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>VocabMaster · 635 từ vựng B2 · Ví dụ tạo bởi <strong>Groq AI</strong> · {new Date().getFullYear()}</p>
      </footer>

      {/* MODALS */}
      {selectedWord && (
        <WordModal
          word={selectedWord}
          onClose={() => { setSelectedWord(null); refreshQueue(); }}
          onQueueChange={refreshQueue}
        />
      )}

      {showQuiz && (
        <QuizMode
          queueWords={queueFull}
          allWords={vocabulary}
          onClose={() => { setShowQuiz(false); refreshQueue(); }}
          onRemoveWord={handleRemoveFromQueue}
        />
      )}

      {showFillBlank && (
        <FillBlankPractice
          words={queueFull}
          onClose={() => { setShowFillBlank(false); refreshQueue(); }}
        />
      )}

      {showGrammar && (
        <GrammarPractice onClose={() => setShowGrammar(false)} />
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}
