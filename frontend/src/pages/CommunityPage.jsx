import { useState, useEffect, useRef, useCallback } from "react";
import { C, API_BASE } from "../constants";


// ─── COMMUNITY PAGE ─────────────────────────────────────────────────────────

const REACT_EMOJIS = ["👍", "❤️", "😄", "😮"];

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "Vừa xong";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

function avatarColor(id) {
  return `hsl(${(id * 53) % 360},55%,38%)`;
}

const FRAME_RING = {
  "khung-hoa-mai": { border: "2px solid #F06292", shadow: "0 0 0 3px #FCE4EC", gradient: "linear-gradient(135deg,#FCE4EC,#F06292,#FCE4EC)" },
  "khung-legendary": { border: "2px solid #FFD700", shadow: "0 0 0 3px rgba(255,215,0,0.3), 0 0 12px rgba(255,215,0,0.5)", gradient: "linear-gradient(135deg,#FFF9C4,#FFD700,#FFF9C4)" },
};

function UserAvatar({ user, size = 40, fontSize = "0.88rem" }) {
  const frame = FRAME_RING[user?.equipped_frame];
  const borderR = size * 0.5;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {frame?.gradient && (
        <div style={{ position: "absolute", inset: -3, borderRadius: "50%", background: frame.gradient, zIndex: 0 }} />
      )}
      <div style={{
        position: "relative", zIndex: 1,
        width: size, height: size, borderRadius: "50%",
        border: frame ? frame.border : "none",
        boxShadow: frame ? frame.shadow : "none",
        overflow: "hidden",
        background: user?.avatar_url ? "transparent" : avatarColor(user?.id ?? 0),
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "white", fontWeight: 700, fontSize,
      }}>
        {user?.avatar_url
          ? <img src={`${API_BASE}${user.avatar_url}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : (user?.name?.[0] ?? "?").toUpperCase()
        }
      </div>
    </div>
  );
}

export default function CommunityPage({ onBack, currentUser, pendingTask, onClearPendingTask }) {
  const [posts, setPosts]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [skip, setSkip]                   = useState(0);
  const [hasMore, setHasMore]             = useState(true);

  const [newContent, setNewContent]       = useState("");
  const [newPrivacy, setNewPrivacy]       = useState("public");
  const [newImage, setNewImage]           = useState(null);       // File object
  const [newPreview, setNewPreview]       = useState(null);       // object URL for preview
  const [submitting, setSubmitting]       = useState(false);
  const [dragOver, setDragOver]           = useState(false);
  const fileInputRef                      = useRef(null);

  const [expandedComments, setExpandedComments] = useState(new Set());
  const [commentsMap, setCommentsMap]           = useState({});
  const [commentInputs, setCommentInputs]       = useState({});
  const [commentSending, setCommentSending]     = useState({});

  const [showPicker, setShowPicker]   = useState(null);
  const [editingId, setEditingId]     = useState(null);
  const [editText, setEditText]       = useState("");
  const [editPrivacy, setEditPrivacy] = useState("public");
  const [editSaving, setEditSaving]   = useState(false);
  const [deleting, setDeleting]       = useState(new Set());

  const [taskDone, setTaskDone] = useState(false);

  const LIMIT = 20;
  const token  = localStorage.getItem("access_token");
  const authH  = token ? { Authorization: `Bearer ${token}` } : {};
  const meId   = currentUser?.id ?? null;

  const completePendingTask = useCallback(async () => {
    if (!pendingTask || taskDone) return;
    setTaskDone(true);
    if (token) {
      try {
        await fetch(`${API_BASE}/api/v1/profile/daily-tasks/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ task_id: pendingTask.id, exp: pendingTask.exp }),
        });
      } catch {}
    }
    setTimeout(() => onClearPendingTask?.(), 2000);
  }, [pendingTask, taskDone, token, onClearPendingTask]);

  const fetchPosts = useCallback(async (skp, append) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/community/posts?skip=${skp}&limit=${LIMIT}`, { headers: authH });
      if (!res.ok) return;
      const data = await res.json();
      setPosts(prev => append ? [...prev, ...data] : data);
      setHasMore(data.length === LIMIT);
      setSkip(skp + data.length);
    } catch {}
    finally { setLoading(false); setLoadingMore(false); }
  }, []); // eslint-disable-line

  useEffect(() => { fetchPosts(0, false); }, []); // eslint-disable-line

  useEffect(() => {
    if (!showPicker) return;
    const handler = () => setShowPicker(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showPicker]);

  // Revoke object URL on cleanup to avoid memory leak
  useEffect(() => () => { if (newPreview) URL.revokeObjectURL(newPreview); }, [newPreview]);

  const applyImageFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (newPreview) URL.revokeObjectURL(newPreview);
    setNewImage(file);
    setNewPreview(URL.createObjectURL(file));
  };

  const removeNewImage = () => {
    if (newPreview) URL.revokeObjectURL(newPreview);
    setNewImage(null);
    setNewPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreate = async () => {
    if (!newContent.trim() || submitting || !token) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("content", newContent.trim());
      fd.append("privacy", newPrivacy);
      if (newImage) fd.append("image", newImage);
      const res = await fetch(`${API_BASE}/api/v1/community/posts`, {
        method: "POST",
        headers: authH,
        body: fd,
      });
      if (!res.ok) return;
      const p = await res.json();
      setPosts(prev => [p, ...prev]);
      setNewContent("");
      setNewPrivacy("public");
      removeNewImage();
    } catch {}
    finally { setSubmitting(false); }
  };

  const handleReact = async (postId, emoji) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/community/posts/${postId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authH },
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setPosts(prev => prev.map(p => p.id === postId ? updated : p));
      if (pendingTask?.id === "like") completePendingTask();
    } catch {}
  };

  const loadComments = async (postId) => {
    if (commentsMap[postId] !== undefined) return;
    setCommentsMap(prev => ({ ...prev, [postId]: null }));
    try {
      const res = await fetch(`${API_BASE}/api/v1/community/posts/${postId}/comments`);
      if (!res.ok) return;
      const data = await res.json();
      setCommentsMap(prev => ({ ...prev, [postId]: data }));
    } catch {}
  };

  const toggleComments = (postId) => {
    setExpandedComments(prev => {
      const s = new Set(prev);
      if (s.has(postId)) { s.delete(postId); } else { s.add(postId); loadComments(postId); }
      return s;
    });
  };

  const handleAddComment = async (postId) => {
    const text = (commentInputs[postId] || "").trim();
    if (!text || !token || commentSending[postId]) return;
    setCommentSending(p => ({ ...p, [postId]: true }));
    try {
      const res = await fetch(`${API_BASE}/api/v1/community/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authH },
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) return;
      const c = await res.json();
      setCommentsMap(p => ({ ...p, [postId]: [...(p[postId] || []), c] }));
      setCommentInputs(p => ({ ...p, [postId]: "" }));
      setPosts(p => p.map(x => x.id === postId ? { ...x, comment_count: x.comment_count + 1 } : x));
      if (pendingTask?.id === "comment") completePendingTask();
    } catch {}
    finally { setCommentSending(p => ({ ...p, [postId]: false })); }
  };

  const handleDeleteComment = async (postId, cid) => {
    if (!token) return;
    const res = await fetch(`${API_BASE}/api/v1/community/comments/${cid}`, { method: "DELETE", headers: authH }).catch(() => null);
    if (res?.ok) {
      setCommentsMap(p => ({ ...p, [postId]: (p[postId] || []).filter(c => c.id !== cid) }));
      setPosts(p => p.map(x => x.id === postId ? { ...x, comment_count: Math.max(0, x.comment_count - 1) } : x));
    }
  };

  const handleDeletePost = async (postId) => {
    if (!token) return;
    setDeleting(p => new Set([...p, postId]));
    const res = await fetch(`${API_BASE}/api/v1/community/posts/${postId}`, { method: "DELETE", headers: authH }).catch(() => null);
    if (res?.ok) setPosts(p => p.filter(x => x.id !== postId));
    setDeleting(p => { const s = new Set(p); s.delete(postId); return s; });
  };

  const startEdit = (post) => { setEditingId(post.id); setEditText(post.content); setEditPrivacy(post.privacy); };

  const saveEdit = async () => {
    if (!editText.trim() || editSaving) return;
    setEditSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/community/posts/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authH },
        body: JSON.stringify({ content: editText.trim(), privacy: editPrivacy }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setPosts(p => p.map(x => x.id === editingId ? updated : x));
      setEditingId(null);
    } catch {}
    finally { setEditSaving(false); }
  };

  const groupReactions = (reactions) =>
    reactions.reduce((m, r) => ({ ...m, [r.emoji]: (m[r.emoji] || 0) + 1 }), {});

  const avatarInitial = (name) => (name?.[0] ?? "?").toUpperCase();

  return (
    <div style={{ minHeight: "100vh", background: "#EEF1EC", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Be+Vietnam+Pro:wght@300;400;500;600;700&display=swap');
        .cpost { animation: slideInUp 0.32s cubic-bezier(0.22,1,0.36,1) both; }
        .react-emoji { transition: transform 0.14s; cursor: pointer; user-select: none; }
        .react-emoji:hover { transform: scale(1.3); }
        @keyframes pickerIn { from{opacity:0;transform:scale(0.8) translateY(6px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .picker-in { animation: pickerIn 0.18s cubic-bezier(0.34,1.4,0.64,1) forwards; }
        .comm-action-btn:hover { background: rgba(61,90,62,0.07) !important; }
        .img-drop-zone { transition: border-color 0.2s, background 0.2s; }
        .img-drop-zone.drag { border-color: #3D5A3E !important; background: #EAF0EA !important; }
      `}</style>

      {/* ── TOPBAR ── */}
      <header style={{ background: "white", borderBottom: "1px solid rgba(0,0,0,0.07)", position: "sticky", top: 0, zIndex: 100, height: 56, display: "flex", alignItems: "center", padding: "0 1.5rem", gap: 12, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <button onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", color: C.moss, fontSize: "0.82rem", fontWeight: 600, fontFamily: "'Be Vietnam Pro', sans-serif", display: "flex", alignItems: "center", gap: 5, padding: "0.3rem 0.65rem", borderRadius: 8, transition: "background 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(61,90,62,0.08)"}
          onMouseLeave={e => e.currentTarget.style.background = "none"}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Trang chủ
        </button>
        <div style={{ width: 1, height: 22, background: "#E5E5E5" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg,${C.moss},#2A4A2B)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "0.85rem" }}>🌿</span>
          </div>
          <div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "0.9rem", color: C.moss, margin: 0, lineHeight: 1.1 }}>Cộng đồng Bình Lợi</p>
            <p style={{ fontSize: "0.58rem", color: "#aaa", letterSpacing: "0.08em", margin: 0, textTransform: "uppercase" }}>Chia sẻ · Kết nối · Khám phá</p>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {!token && (
          <span style={{ fontSize: "0.74rem", color: "#bbb", fontStyle: "italic" }}>Đăng nhập để đăng bài</span>
        )}
      </header>

      {/* ── MISSION BANNER ── */}
      {pendingTask && (
        <div style={{
          background: taskDone ? "linear-gradient(90deg,#EEF5EE,#D4EDD4)" : "linear-gradient(90deg,#FFF8EE,#FFF0D0)",
          borderBottom: `2px solid ${taskDone ? C.moss : C.gold}`,
          padding: "0.75rem 1.5rem",
          display: "flex", alignItems: "center", gap: 12,
          transition: "all 0.4s",
        }}>
          <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>
            {taskDone ? "✅" : pendingTask.id === "like" ? "❤️" : "💬"}
          </span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, color: taskDone ? C.moss : C.earth, margin: "0 0 2px" }}>
              {taskDone ? "Nhiệm vụ hoàn thành! 🎉" : "Nhiệm vụ hằng ngày đang chờ"}
            </p>
            <p style={{ fontSize: "0.72rem", color: "#888", margin: 0 }}>
              {taskDone
                ? `+${pendingTask.exp} EXP đã được cộng vào tài khoản của bạn`
                : pendingTask.id === "like"
                  ? "Hãy thích 1 bài viết bất kỳ bên dưới để nhận phần thưởng"
                  : "Hãy bình luận 1 bài viết bất kỳ bên dưới để nhận phần thưởng"
              }
            </p>
          </div>
          <span style={{
            fontSize: "0.72rem", fontWeight: 800,
            color: taskDone ? C.moss : C.gold,
            background: taskDone ? "#C8EEC8" : "#FFF0CC",
            border: `1px solid ${taskDone ? "#A0D8A0" : "#F0D080"}`,
            padding: "0.2rem 0.65rem", borderRadius: "2rem", flexShrink: 0,
          }}>
            +{pendingTask.exp} EXP
          </span>
        </div>
      )}

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "1.5rem 1rem 6rem" }}>

        {/* ── CREATE POST CARD ── */}
        {token && (
          <div style={{ background: "white", borderRadius: 16, marginBottom: "1rem", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            {/* Author row */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "1rem 1rem 0" }}>
              <UserAvatar user={currentUser} size={40} />
              <textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleCreate(); }}
                placeholder={`${currentUser?.name?.split(" ").at(-1) ?? "Bạn"} ơi, chia sẻ điều gì về Bình Lợi nhé...`}
                rows={3}
                style={{ flex: 1, border: "none", outline: "none", fontSize: "0.9rem", fontFamily: "'Be Vietnam Pro', sans-serif", color: C.dark, resize: "none", background: "transparent", lineHeight: 1.7, paddingTop: "0.5rem" }}
              />
            </div>

            {/* Image preview */}
            {newPreview && (
              <div style={{ margin: "0.75rem 1rem 0", position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)" }}>
                <img src={newPreview} alt="preview" style={{ width: "100%", maxHeight: 320, objectFit: "cover", display: "block" }} />
                <button onClick={removeNewImage}
                  style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.55)", border: "none", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", lineHeight: 1 }}>
                  ×
                </button>
              </div>
            )}

            {/* Drop zone (shown when no image selected) */}
            {!newPreview && (
              <div
                className={`img-drop-zone${dragOver ? " drag" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); applyImageFile(e.dataTransfer.files[0]); }}
                style={{ margin: "0.75rem 1rem 0", border: "1.5px dashed rgba(61,90,62,0.25)", borderRadius: 12, padding: "0.6rem 1rem", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "#aaa", fontSize: "0.78rem" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span>Thêm ảnh · Kéo thả hoặc nhấn để chọn (JPG, PNG, WebP, GIF · tối đa 8MB)</span>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => applyImageFile(e.target.files[0])} />

            {/* Footer */}
            <div style={{ display: "flex", alignItems: "center", padding: "0.75rem 1rem", gap: 8, borderTop: "1px solid rgba(0,0,0,0.05)", marginTop: "0.75rem" }}>
              {[["public","🌍","Công khai"],["private","🔒","Riêng tư"]].map(([v,ic,lb]) => (
                <button key={v} onClick={() => setNewPrivacy(v)}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "0.25rem 0.7rem", borderRadius: 20, fontSize: "0.73rem", fontFamily: "'Be Vietnam Pro', sans-serif", cursor: "pointer", border: `1.5px solid ${newPrivacy === v ? C.moss : "rgba(0,0,0,0.12)"}`, background: newPrivacy === v ? "#E8F0E8" : "transparent", color: newPrivacy === v ? C.moss : "#aaa", fontWeight: newPrivacy === v ? 600 : 400, transition: "all 0.15s" }}>
                  {ic} {lb}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <button onClick={handleCreate} disabled={!newContent.trim() || submitting}
                style={{ padding: "0.4rem 1.2rem", background: newContent.trim() && !submitting ? C.moss : "#D4D4D4", color: "white", border: "none", borderRadius: 20, fontSize: "0.82rem", fontWeight: 600, fontFamily: "'Be Vietnam Pro', sans-serif", cursor: newContent.trim() && !submitting ? "pointer" : "not-allowed", transition: "background 0.2s", letterSpacing: "0.01em" }}>
                {submitting ? "Đang đăng..." : "Đăng bài"}
              </button>
            </div>
          </div>
        )}

        {/* ── FEED ── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "5rem 0", color: "#aaa" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem", animation: "floatChar 2s ease-in-out infinite" }}>🌿</div>
            <p style={{ fontSize: "0.85rem", margin: 0 }}>Đang tải bài viết...</p>
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "5rem 0", color: "#aaa" }}>
            <div style={{ marginBottom: "0.75rem" }}><img src="/img/main_page/hoa_mai.png" style={{ width: 56, height: 56, objectFit: "contain" }} alt="" /></div>
            <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "#888", marginBottom: "0.35rem" }}>Chưa có bài viết nào</p>
            <p style={{ fontSize: "0.82rem" }}>Hãy là người đầu tiên chia sẻ về Bình Lợi!</p>
          </div>
        ) : posts.map((post, idx) => {
          const isOwn        = meId !== null && meId === post.user_id;
          const rGroups      = groupReactions(post.reactions);
          const myEmoji      = post.reactions.find(r => r.user_id === meId)?.emoji ?? null;
          const commExpanded = expandedComments.has(post.id);
          const comments     = commentsMap[post.id];
          const isEditing    = editingId === post.id;
          const totalReacts  = post.reactions.length;

          return (
            <div key={post.id} className="cpost" style={{ background: "white", borderRadius: 16, marginBottom: "0.75rem", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", animationDelay: `${Math.min(idx, 5) * 0.05}s`, overflow: "hidden" }}>

              {/* ── POST HEADER ── */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.9rem 1rem 0.5rem" }}>
                <UserAvatar user={post.author} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: "0.88rem", color: "#1A1A1A", margin: 0, lineHeight: 1.3 }}>{post.author.name}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <span style={{ fontSize: "0.7rem", color: "#B0B0B0" }}>{relativeTime(post.created_at)}</span>
                    <span style={{ color: "#DDD", fontSize: "0.6rem" }}>·</span>
                    <span style={{ fontSize: "0.7rem", color: post.privacy === "public" ? C.sage : "#C0C0C0", display: "flex", alignItems: "center", gap: 2 }}>
                      {post.privacy === "public" ? "🌍" : "🔒"} {post.privacy === "public" ? "Công khai" : "Riêng tư"}
                    </span>
                  </div>
                </div>
                {isOwn && !isEditing && (
                  <div style={{ display: "flex", gap: 1 }}>
                    <button onClick={() => startEdit(post)} title="Chỉnh sửa"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "0.35rem", borderRadius: 8, color: "#CCC", transition: "color 0.15s, background 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.color = C.moss; e.currentTarget.style.background = "rgba(61,90,62,0.07)"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "#CCC"; e.currentTarget.style.background = "none"; }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => handleDeletePost(post.id)} disabled={deleting.has(post.id)} title="Xoá"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "0.35rem", borderRadius: 8, color: "#CCC", transition: "color 0.15s, background 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#E53E3E"; e.currentTarget.style.background = "rgba(229,62,62,0.07)"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "#CCC"; e.currentTarget.style.background = "none"; }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                )}
              </div>

              {/* ── POST BODY ── */}
              <div style={{ padding: "0 1rem 0.85rem" }}>
                {isEditing ? (
                  <div>
                    <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={4}
                      style={{ width: "100%", border: `1.5px solid ${C.moss}`, borderRadius: 10, padding: "0.65rem 0.85rem", fontSize: "0.88rem", fontFamily: "'Be Vietnam Pro', sans-serif", color: C.dark, resize: "none", outline: "none", background: "#F9FCF9", boxSizing: "border-box", marginBottom: "0.5rem", lineHeight: 1.65 }} />
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      {[["public","🌍","Công khai"],["private","🔒","Riêng tư"]].map(([v,ic,lb]) => (
                        <button key={v} onClick={() => setEditPrivacy(v)}
                          style={{ display: "flex", alignItems: "center", gap: 3, padding: "0.2rem 0.6rem", borderRadius: 20, fontSize: "0.72rem", fontFamily: "'Be Vietnam Pro', sans-serif", cursor: "pointer", border: `1.5px solid ${editPrivacy === v ? C.moss : "#E0E0E0"}`, background: editPrivacy === v ? "#E8F0E8" : "transparent", color: editPrivacy === v ? C.moss : "#aaa", fontWeight: editPrivacy === v ? 600 : 400 }}>
                          {ic} {lb}
                        </button>
                      ))}
                      <div style={{ flex: 1 }} />
                      <button onClick={() => setEditingId(null)} style={{ padding: "0.28rem 0.75rem", borderRadius: 20, border: "1px solid #E0E0E0", background: "none", cursor: "pointer", fontSize: "0.76rem", fontFamily: "'Be Vietnam Pro', sans-serif", color: "#777" }}>Huỷ</button>
                      <button onClick={saveEdit} disabled={editSaving} style={{ padding: "0.28rem 0.9rem", borderRadius: 20, border: "none", background: C.moss, color: "white", cursor: "pointer", fontSize: "0.76rem", fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 600 }}>
                        {editSaving ? "Lưu..." : "Lưu lại"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: "0.91rem", lineHeight: 1.75, color: "#2A2A2A", margin: 0, whiteSpace: "pre-wrap" }}>{post.content}</p>
                )}
              </div>

              {/* ── POST IMAGE ── */}
              {post.image_url && !isEditing && (
                <div style={{ borderTop: "1px solid rgba(0,0,0,0.05)", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                  <img
                    src={`${API_BASE}${post.image_url}`}
                    alt=""
                    loading="lazy"
                    style={{ width: "100%", maxHeight: 420, objectFit: "cover", display: "block" }}
                  />
                </div>
              )}

              {/* ── REACTION SUMMARY ── */}
              {totalReacts > 0 && (
                <div style={{ padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ display: "flex", gap: 2 }}>
                    {Object.entries(rGroups).slice(0, 3).map(([em]) => (
                      <span key={em} style={{ fontSize: "0.88rem", lineHeight: 1 }}>{em}</span>
                    ))}
                  </div>
                  <span style={{ fontSize: "0.73rem", color: "#A0A0A0" }}>
                    {totalReacts} lượt cảm xúc
                    {post.comment_count > 0 && <> · {post.comment_count} bình luận</>}
                  </span>
                </div>
              )}

              {/* ── ACTION BAR ── */}
              <div style={{ display: "flex", borderTop: "1px solid rgba(0,0,0,0.06)", margin: "0" }}>
                {/* React button */}
                <div style={{ position: "relative", flex: 1 }}>
                  <button className="comm-action-btn"
                    onClick={e => { e.stopPropagation(); if (!token) return; setShowPicker(p => p === post.id ? null : post.id); }}
                    style={{ width: "100%", padding: "0.6rem 0", border: "none", cursor: token ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "none", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.82rem", color: myEmoji ? C.moss : "#888", fontWeight: myEmoji ? 600 : 400, borderRadius: "0 0 0 16px", transition: "background 0.15s" }}>
                    <span style={{ fontSize: "1.05rem" }}>{myEmoji ?? "👍"}</span>
                    <span>{myEmoji ? "Đã thích" : "Thích"}</span>
                  </button>
                  {showPicker === post.id && (
                    <div className="picker-in" onClick={e => e.stopPropagation()}
                      style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "white", borderRadius: 40, padding: "0.5rem 0.8rem", boxShadow: "0 8px 32px rgba(0,0,0,0.16)", border: "1px solid rgba(0,0,0,0.08)", display: "flex", gap: 8, zIndex: 40 }}>
                      {REACT_EMOJIS.map(em => (
                        <span key={em} className="react-emoji"
                          style={{ fontSize: "1.6rem", display: "inline-block", lineHeight: 1 }}
                          onClick={() => { handleReact(post.id, em); setShowPicker(null); }}>
                          {em}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ width: 1, background: "rgba(0,0,0,0.06)" }} />

                {/* Comment button */}
                <button className="comm-action-btn" onClick={() => toggleComments(post.id)}
                  style={{ flex: 1, padding: "0.6rem 0", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "none", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.82rem", color: commExpanded ? C.moss : "#888", fontWeight: commExpanded ? 600 : 400, borderRadius: "0 0 16px 0", transition: "background 0.15s" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <span>Bình luận{post.comment_count > 0 ? ` (${post.comment_count})` : ""}</span>
                </button>
              </div>

              {/* ── COMMENTS ── */}
              {commExpanded && (
                <div style={{ borderTop: "1px solid rgba(0,0,0,0.05)", padding: "0.85rem 1rem 0.85rem", background: "#F8FAF8" }}>
                  {comments === null ? (
                    <p style={{ fontSize: "0.78rem", color: "#C0C0C0", textAlign: "center", padding: "0.5rem 0" }}>Đang tải...</p>
                  ) : !comments || comments.length === 0 ? (
                    <p style={{ fontSize: "0.78rem", color: "#C8C8C8", textAlign: "center", padding: "0.25rem 0 0.5rem" }}>Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "0.85rem" }}>
                      {comments.map(c => (
                        <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                          <div style={{ marginTop: 1 }}>
                            <UserAvatar user={c.author} size={30} fontSize="0.72rem" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ background: "white", borderRadius: "0 14px 14px 14px", padding: "0.5rem 0.8rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "inline-block", maxWidth: "100%" }}>
                              <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "#1A1A1A", margin: "0 0 2px" }}>{c.author.name}</p>
                              <p style={{ fontSize: "0.84rem", color: "#333", margin: 0, lineHeight: 1.55, wordBreak: "break-word" }}>{c.content}</p>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, paddingLeft: 4 }}>
                              <span style={{ fontSize: "0.65rem", color: "#C0C0C0" }}>{relativeTime(c.created_at)}</span>
                              {c.user_id === meId && (
                                <button onClick={() => handleDeleteComment(post.id, c.id)}
                                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.68rem", color: "#C0C0C0", padding: 0, fontFamily: "'Be Vietnam Pro', sans-serif", transition: "color 0.15s" }}
                                  onMouseEnter={e => e.currentTarget.style.color = "#E53E3E"}
                                  onMouseLeave={e => e.currentTarget.style.color = "#C0C0C0"}>
                                  Xoá
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {token && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <UserAvatar user={currentUser} size={30} fontSize="0.72rem" />
                      <div style={{ flex: 1, display: "flex", alignItems: "center", background: "white", borderRadius: 24, border: "1.5px solid rgba(0,0,0,0.09)", paddingRight: 4, transition: "border-color 0.2s" }}
                        onFocusCapture={e => e.currentTarget.style.borderColor = C.moss}
                        onBlurCapture={e => e.currentTarget.style.borderColor = "rgba(0,0,0,0.09)"}>
                        <input
                          value={commentInputs[post.id] || ""}
                          onChange={e => setCommentInputs(p => ({ ...p, [post.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(post.id); } }}
                          placeholder="Viết bình luận..."
                          style={{ flex: 1, border: "none", outline: "none", padding: "0.45rem 0.85rem", fontSize: "0.83rem", fontFamily: "'Be Vietnam Pro', sans-serif", color: C.dark, background: "transparent", borderRadius: 24 }}
                        />
                        <button onClick={() => handleAddComment(post.id)} disabled={!commentInputs[post.id]?.trim() || commentSending[post.id]}
                          style={{ width: 30, height: 30, borderRadius: "50%", background: commentInputs[post.id]?.trim() ? C.moss : "#E0E0E0", border: "none", cursor: commentInputs[post.id]?.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, transition: "background 0.2s" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {!loading && hasMore && (
          <div style={{ textAlign: "center", paddingTop: "0.75rem" }}>
            <button onClick={() => fetchPosts(skip, true)} disabled={loadingMore}
              style={{ padding: "0.6rem 2rem", border: `1.5px solid ${C.moss}`, borderRadius: 24, background: "white", color: C.moss, fontSize: "0.82rem", fontWeight: 500, fontFamily: "'Be Vietnam Pro', sans-serif", cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = C.moss; e.currentTarget.style.color = "white"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = C.moss; }}>
              {loadingMore ? "Đang tải..." : "Tải thêm bài viết"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
