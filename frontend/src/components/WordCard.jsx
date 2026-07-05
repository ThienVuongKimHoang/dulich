import { getImageUrl } from "../utils/groqApi";

const TOPIC_COLORS = {
  accidents: { bg: "#fde8e8", border: "#ef5350", badge: "#c62828" },
  appearance: { bg: "#f3e5f5", border: "#ab47bc", badge: "#6a1b9a" },
  communication: { bg: "#e3f2fd", border: "#42a5f5", badge: "#1565c0" },
  countryside: { bg: "#e8f5e9", border: "#66bb6a", badge: "#2e7d32" },
  culture: { bg: "#fbe9e7", border: "#ff7043", badge: "#bf360c" },
  education: { bg: "#e0f2f1", border: "#26a69a", badge: "#00695c" },
  entertainment: { bg: "#fce4ec", border: "#ec407a", badge: "#880e4f" },
  environment: { bg: "#f1f8e9", border: "#4caf50", badge: "#1b5e20" },
  family: { bg: "#fff3e0", border: "#ff8a65", badge: "#bf360c" },
  food: { bg: "#fff8e1", border: "#ffa726", badge: "#e65100" },
  health: { bg: "#e0f7fa", border: "#26c6da", badge: "#006064" },
};

function getColors(category) {
  return TOPIC_COLORS[category] || { bg: "#f5f5f5", border: "#9e9e9e", badge: "#424242" };
}

export default function WordCard({ word, onClick, inQueue }) {
  const colors = getColors(word.category);
  const imgUrl = `https://loremflickr.com/400/220/${encodeURIComponent(word.word)}?lock=${word.id}`;

  return (
    <div
      className={`word-card ${inQueue ? "in-queue" : ""}`}
      style={{ borderColor: colors.border, backgroundColor: colors.bg }}
      onClick={() => onClick(word)}
    >
      {inQueue && <div className="queue-dot" title="Đang trong hàng đợi" />}

      <div className="card-image-wrap">
        <img
          src={imgUrl}
          alt={word.word}
          className="card-image"
          loading="lazy"
          onError={(e) => {
            e.target.src = `https://picsum.photos/seed/${word.word}/400/220`;
          }}
        />
        <span className="category-badge" style={{ backgroundColor: colors.badge }}>
          {word.category}
        </span>
      </div>

      <div className="card-body">
        <h3 className="card-word">{word.word}</h3>
        <p className="card-pos">{word.pos}</p>
        <p className="card-vietnamese" style={{ color: colors.badge }}>
          🇻🇳 {word.vietnamese}
        </p>
        <button className="view-btn" style={{ backgroundColor: colors.badge }}>
          Xem chi tiết →
        </button>
      </div>
    </div>
  );
}
