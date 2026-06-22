import { useState, useEffect } from "react";
import { API_BASE } from "../constants";

const GoldIcon = ({ size = 20 }) => <img src="/img/main_page/gold.png" style={{ width: size, height: size, verticalAlign: "middle", objectFit: "contain", display: "inline-block" }} alt="" />;

const RARITY_META = {
  common:    { label: "Phổ thông",  color: "#78909C", bg: "#ECEFF1" },
  uncommon:  { label: "Hiếm",       color: "#43A047", bg: "#E8F5E9" },
  rare:      { label: "Quý hiếm",   color: "#1E88E5", bg: "#E3F2FD" },
  epic:      { label: "Huyền bí",   color: "#8E24AA", bg: "#F3E5F5" },
  legendary: { label: "Huyền thoại",color: "#F57F17", bg: "#FFF8E1" },
};

const CATEGORY_LABELS = {
  avatar:     "🖼️ Khung ảnh",
  badge:      "🏅 Huy hiệu",
  collectible:"🏞️ Kỷ vật",
  prop:       "🎨 Đạo cụ",
  voucher:    "🎟️ Voucher",
  ticket:     "🎫 Vé",
};

export default function BagPage({ onBack, onGoShop }) {
  const [inventory, setInventory] = useState([]);
  const [gold, setGold] = useState(0);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noToken, setNoToken] = useState(false);

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    if (!token) { setNoToken(true); setLoading(false); return; }
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_BASE}/api/v1/shop/inventory`, { headers: h }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/v1/users/me`, { headers: h }).then(r => r.ok ? r.json() : null),
    ]).then(([inv, me]) => {
      setInventory(inv);
      if (me) setGold(me.gold ?? 0);
      setLoading(false);
    });
  }, []);

  const categories = ["all", ...new Set(inventory.map(i => i.category))];
  const filtered = filter === "all" ? inventory : inventory.filter(i => i.category === filter);

  if (noToken) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#FFF8E1", fontFamily: "'Be Vietnam Pro', sans-serif", gap: "1rem" }}>
      <img src="/img/main_page/tui_do.png" alt="túi đồ" style={{ width: 80, opacity: 0.5 }} />
      <p style={{ color: "#8D6E63", fontWeight: 600 }}>Vui lòng đăng nhập để xem túi đồ</p>
      <button onClick={onBack} style={{ border: "none", background: "#F9A825", color: "#3E2723", fontWeight: 700, padding: "0.5rem 1.5rem", borderRadius: 20, cursor: "pointer" }}>← Quay lại</button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#EFEBE9 0%,#FFF8E1 60%,#F5F5F5 100%)", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(239,235,233,0.96)", backdropFilter: "blur(12px)", borderBottom: "2px solid #A1887F", padding: "0.85rem 1.25rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", padding: "0.2rem 0.4rem", borderRadius: 8, color: "#5D4037" }}>←</button>
        <img src="/img/main_page/tui_do.png" alt="túi đồ" style={{ width: 36, height: 36, objectFit: "contain" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#3E2723" }}>Túi đồ</div>
          <div style={{ fontSize: "0.7rem", color: "#8D6E63" }}>Vật phẩm đã sở hữu · {inventory.length} loại</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "#F9A825", color: "#3E2723", fontWeight: 700, fontSize: "0.88rem", padding: "0.3rem 0.75rem", borderRadius: 18, boxShadow: "0 2px 8px rgba(249,168,37,0.3)" }}>
          <GoldIcon />
          <span>{gold.toLocaleString()}</span>
        </div>
        <button onClick={onGoShop} style={{ background: "#795548", border: "none", color: "#FFF8E1", fontWeight: 600, fontSize: "0.8rem", padding: "0.4rem 0.9rem", borderRadius: 18, cursor: "pointer" }}>
          🛍️ Cửa hàng
        </button>
      </div>

      {/* Category filter */}
      {inventory.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem", padding: "0.85rem 1.25rem 0", overflowX: "auto", scrollbarWidth: "none" }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} style={{
              flexShrink: 0, border: "none", cursor: "pointer", padding: "0.35rem 0.85rem", borderRadius: 20,
              background: filter === cat ? "#795548" : "rgba(255,255,255,0.7)",
              color: filter === cat ? "#FFF8E1" : "#795548",
              fontWeight: filter === cat ? 700 : 500, fontSize: "0.8rem",
              boxShadow: filter === cat ? "0 2px 8px rgba(121,85,72,0.35)" : "0 1px 4px rgba(0,0,0,0.08)",
              transition: "all 0.2s",
            }}>
              {cat === "all" ? "Tất cả" : CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#A1887F" }}>Đang tải...</div>
      ) : inventory.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "5rem 2rem", textAlign: "center" }}>
          <img src="/img/main_page/tui_do.png" alt="trống" style={{ width: 90, opacity: 0.35 }} />
          <p style={{ color: "#A1887F", fontSize: "0.95rem", fontWeight: 600 }}>Túi đồ trống rỗng</p>
          <p style={{ color: "#BCAAA4", fontSize: "0.82rem" }}>Hãy ghé cửa hàng và sắm vật phẩm đầu tiên!</p>
          <button onClick={onGoShop} style={{ border: "none", background: "#F9A825", color: "#3E2723", fontWeight: 700, padding: "0.55rem 1.5rem", borderRadius: 20, cursor: "pointer", fontSize: "0.88rem" }}>
            🛍️ Đến cửa hàng
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))", gap: "0.85rem", padding: "0.85rem 1.25rem 5rem" }}>
          {filtered.map(item => {
            const rm = RARITY_META[item.rarity] || RARITY_META.common;
            return (
              <div key={item.item_id} onClick={() => setSelected(selected?.item_id === item.item_id ? null : item)} style={{
                background: "#FFFDE7", borderRadius: 16,
                border: `2px solid ${rm.color}33`,
                boxShadow: selected?.item_id === item.item_id ? `0 6px 24px ${rm.color}44` : "0 2px 10px rgba(0,0,0,0.07)",
                overflow: "hidden", cursor: "pointer", transition: "all 0.2s",
                transform: selected?.item_id === item.item_id ? "translateY(-4px)" : "",
              }}>
                <div style={{ background: rm.bg, display: "flex", alignItems: "center", justifyContent: "center", height: 86, fontSize: "2.6rem", position: "relative" }}>
                  {item.icon}
                  {item.quantity > 1 && (
                    <div style={{ position: "absolute", bottom: 6, right: 8, background: "#3E2723", color: "#F9A825", fontSize: "0.65rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: 8 }}>
                      x{item.quantity}
                    </div>
                  )}
                </div>
                <div style={{ padding: "0.55rem 0.7rem" }}>
                  <div style={{ display: "inline-block", background: rm.bg, color: rm.color, fontSize: "0.6rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: 8, marginBottom: "0.3rem" }}>
                    {rm.label}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#3E2723", lineHeight: 1.3 }}>
                    {item.name}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
          background: "#FFF8E1", borderRadius: "24px 24px 0 0",
          borderTop: `3px solid ${(RARITY_META[selected.rarity] || RARITY_META.common).color}`,
          padding: "1.25rem 1.5rem 2.5rem",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.15)",
          animation: "slidePanel 0.25s ease",
        }}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
            <div style={{ background: (RARITY_META[selected.rarity] || RARITY_META.common).bg, borderRadius: 16, width: 72, height: 72, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.2rem", flexShrink: 0 }}>
              {selected.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "#3E2723", marginBottom: "0.25rem" }}>{selected.name}</div>
              <div style={{ fontSize: "0.75rem", color: "#8D6E63", marginBottom: "0.4rem" }}>{selected.description}</div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{ background: (RARITY_META[selected.rarity] || RARITY_META.common).bg, color: (RARITY_META[selected.rarity] || RARITY_META.common).color, fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 10 }}>
                  {(RARITY_META[selected.rarity] || RARITY_META.common).label}
                </span>
                <span style={{ background: "#F5F5F5", color: "#616161", fontSize: "0.65rem", fontWeight: 600, padding: "0.15rem 0.5rem", borderRadius: 10 }}>
                  {CATEGORY_LABELS[selected.category] ?? selected.category}
                </span>
                <span style={{ background: "#FFF3E0", color: "#E65100", fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 10 }}>
                  Số lượng: {selected.quantity}
                </span>
              </div>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "#BCAAA4", padding: "0.2rem" }}>✕</button>
          </div>
          <div style={{ marginTop: "0.75rem", fontSize: "0.7rem", color: "#BCAAA4" }}>
            Thêm vào: {new Date(selected.acquired_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slidePanel {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
