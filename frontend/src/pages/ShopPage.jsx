import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "../constants";

const GoldIcon = ({ size = 16 }) => <img src="/img/main_page/gold.png" style={{ width: size, height: size, verticalAlign: "middle", objectFit: "contain", display: "inline-block" }} alt="" />;

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

export default function ShopPage({ onBack, onGoBag, currentUser }) {
  const [items, setItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [gold, setGold] = useState(currentUser?.gold ?? 0);
  const [filter, setFilter] = useState("all");
  const [buying, setBuying] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("access_token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/v1/shop/items`).then(r => r.json()),
      token
        ? fetch(`${API_BASE}/api/v1/shop/inventory`, { headers }).then(r => r.ok ? r.json() : [])
        : Promise.resolve([]),
      token
        ? fetch(`${API_BASE}/api/v1/users/me`, { headers }).then(r => r.ok ? r.json() : null)
        : Promise.resolve(null),
    ]).then(([shopItems, inv, me]) => {
      setItems(shopItems);
      setInventory(inv);
      if (me) setGold(me.gold ?? 0);
      setLoading(false);
    });
  }, []);

  const ownedMap = Object.fromEntries(inventory.map(i => [i.item_id, i.quantity]));

  const buy = useCallback(async (item) => {
    if (!token) { showToast("Vui lòng đăng nhập để mua vật phẩm", false); return; }
    if (buying) return;
    setBuying(item.id);
    try {
      const res = await fetch(`${API_BASE}/api/v1/shop/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ item_id: item.id }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.detail || "Mua thất bại", false); return; }
      setGold(data.gold);
      setInventory(prev => {
        const idx = prev.findIndex(i => i.item_id === item.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
          return next;
        }
        return [data.item, ...prev];
      });
      showToast(`Đã mua "${item.name}" thành công! 🎉`);
    } catch {
      showToast("Lỗi kết nối, thử lại sau", false);
    } finally {
      setBuying(null);
    }
  }, [buying, token]);

  const categories = ["all", ...Object.keys(CATEGORY_LABELS)];
  const filtered = filter === "all" ? items : items.filter(i => i.category === filter);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#FFF8E1 0%,#FFF3CD 40%,#FFFDE7 100%)", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,248,225,0.96)", backdropFilter: "blur(12px)", borderBottom: "2px solid #F9A825", padding: "0.85rem 1.25rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", lineHeight: 1, padding: "0.2rem 0.4rem", borderRadius: 8, color: "#5D4037" }}>←</button>
        <img src="/img/main_page/cua_hang.jpeg" alt="cửa hàng" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 8, border: "2px solid #F9A825" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#3E2723" }}>Cửa hàng</div>
          <div style={{ fontSize: "0.7rem", color: "#8D6E63" }}>Đổi vàng lấy vật phẩm đặc biệt</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "#F9A825", color: "#3E2723", fontWeight: 700, fontSize: "0.9rem", padding: "0.35rem 0.8rem", borderRadius: 20, boxShadow: "0 2px 8px rgba(249,168,37,0.35)" }}>
          <GoldIcon size={20} />
          <span>{gold.toLocaleString()}</span>
        </div>
        <button onClick={onGoBag} style={{ background: "#5D4037", border: "none", color: "#FFF8E1", fontWeight: 600, fontSize: "0.8rem", padding: "0.4rem 0.85rem", borderRadius: 18, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <img src="/img/main_page/tui_do.png" alt="túi đồ" style={{ width: 18, height: 18, objectFit: "contain" }} />
          Túi đồ
        </button>
      </div>

      {/* Category filter */}
      <div style={{ display: "flex", gap: "0.5rem", padding: "0.85rem 1.25rem 0", overflowX: "auto", scrollbarWidth: "none" }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)} style={{
            flexShrink: 0, border: "none", cursor: "pointer", padding: "0.35rem 0.85rem", borderRadius: 20,
            background: filter === cat ? "#F9A825" : "rgba(255,255,255,0.7)",
            color: filter === cat ? "#3E2723" : "#795548",
            fontWeight: filter === cat ? 700 : 500, fontSize: "0.8rem",
            boxShadow: filter === cat ? "0 2px 8px rgba(249,168,37,0.4)" : "0 1px 4px rgba(0,0,0,0.08)",
            transition: "all 0.2s",
          }}>
            {cat === "all" ? "Tất cả" : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#A1887F", fontSize: "1rem" }}>Đang tải...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.85rem", padding: "0.85rem 1.25rem 5rem" }}>
          {filtered.map(item => {
            const rm = RARITY_META[item.rarity] || RARITY_META.common;
            const owned = ownedMap[item.id] ?? 0;
            const canAfford = gold >= item.price;
            const isBuying = buying === item.id;

            return (
              <div key={item.id} style={{
                background: "#FFFDE7",
                borderRadius: 16,
                border: `2px solid ${owned ? "#43A047" : rm.color}22`,
                boxShadow: owned ? "0 4px 16px rgba(67,160,71,0.15)" : "0 2px 12px rgba(0,0,0,0.07)",
                overflow: "hidden", position: "relative", transition: "transform 0.15s, box-shadow 0.15s",
                cursor: "default",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.12)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = owned ? "0 4px 16px rgba(67,160,71,0.15)" : "0 2px 12px rgba(0,0,0,0.07)"; }}
              >
                {owned > 0 && (
                  <div style={{ position: "absolute", top: 8, right: 8, background: "#43A047", color: "#fff", fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 10 }}>
                    ✓ Đã có {owned > 1 ? `x${owned}` : ""}
                  </div>
                )}

                {/* Icon area */}
                <div style={{ background: rm.bg, display: "flex", alignItems: "center", justifyContent: "center", height: 90, fontSize: "2.8rem" }}>
                  {item.icon}
                </div>

                {/* Info */}
                <div style={{ padding: "0.6rem 0.75rem" }}>
                  <div style={{ display: "inline-block", background: rm.bg, color: rm.color, fontSize: "0.6rem", fontWeight: 700, padding: "0.1rem 0.45rem", borderRadius: 8, marginBottom: "0.35rem", letterSpacing: "0.04em" }}>
                    {rm.label}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#3E2723", lineHeight: 1.3, marginBottom: "0.25rem" }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#8D6E63", lineHeight: 1.4, marginBottom: "0.55rem" }}>
                    {item.description}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontWeight: 700, fontSize: "0.88rem", color: "#E65100" }}>
                      <GoldIcon /> {item.price}
                    </div>
                    <button
                      onClick={() => buy(item)}
                      disabled={isBuying || !canAfford}
                      style={{
                        border: "none", cursor: canAfford ? "pointer" : "not-allowed",
                        background: canAfford ? "#F9A825" : "#BCAAA4",
                        color: canAfford ? "#3E2723" : "#fff",
                        fontWeight: 700, fontSize: "0.72rem", padding: "0.35rem 0.65rem",
                        borderRadius: 12, transition: "all 0.15s", opacity: isBuying ? 0.7 : 1,
                      }}
                    >
                      {isBuying ? "..." : !canAfford ? <>Không đủ <GoldIcon size={13} /></> : "Mua"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
          background: toast.ok ? "#43A047" : "#E53935", color: "#fff",
          padding: "0.7rem 1.4rem", borderRadius: 20, fontWeight: 600, fontSize: "0.88rem",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)", zIndex: 200, whiteSpace: "nowrap",
          animation: "slideUp 0.25s ease",
        }}>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
