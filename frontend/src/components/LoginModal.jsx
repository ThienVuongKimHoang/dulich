import { useState } from "react";
import { C, API_BASE } from "../constants";
import LogoIcon from "./LogoIcon";

export default function LoginModal({ onClose, onSuccess }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccessMsg("");
    if (!form.email || !form.password) { setError("Vui lòng điền đầy đủ thông tin."); return; }
    if (tab === "register" && !form.name) { setError("Vui lòng nhập họ tên."); return; }
    setLoading(true);
    try {
      if (tab === "register") {
        const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || `Đăng ký thất bại (${res.status})`);
        }
        const data = await res.json();
        // Auto-login sau đăng ký để lấy token
        const loginBody = new URLSearchParams();
        loginBody.append("username", form.email);
        loginBody.append("password", form.password);
        const loginRes = await fetch(`${API_BASE}/api/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: loginBody,
        });
        let token = null;
        if (loginRes.ok) {
          const loginData = await loginRes.json();
          if (loginData.access_token) { localStorage.setItem("access_token", loginData.access_token); token = loginData.access_token; }
        }
        if (token) {
          const meRes = await fetch(`${API_BASE}/api/v1/users/me`, { headers: { Authorization: `Bearer ${token}` } });
          const me = meRes.ok ? await meRes.json() : null;
          onSuccess(me || { name: data.name || form.name });
        } else {
          onSuccess({ name: data.name || form.name });
        }
      } else {
        const body = new URLSearchParams();
        body.append("username", form.email);
        body.append("password", form.password);
        const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || `Đăng nhập thất bại (${res.status})`);
        }
        const data = await res.json();
        if (data.access_token) localStorage.setItem("access_token", data.access_token);
        const meRes = await fetch(`${API_BASE}/api/v1/users/me`, {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        const me = meRes.ok ? await meRes.json() : null;
        onSuccess(me || { name: form.email.split("@")[0] });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(28,43,29,0.65)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#FEFCF8", borderRadius: 24, padding: "2.5rem", width: 420, maxWidth: "90vw", boxShadow: "0 28px 72px rgba(0,0,0,0.22)", animation: "modalIn 0.35s cubic-bezier(0.34,1.2,0.64,1) forwards" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LogoIcon />
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 600, color: C.moss, lineHeight: 1.1 }}>
              BÌNH LỢI
              <span style={{ display: "block", fontSize: "0.6rem", fontWeight: 300, letterSpacing: "0.15em", color: C.gold, textTransform: "uppercase" }}>Healing Journey</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: "1.4rem", lineHeight: 1, padding: 4 }}>×</button>
        </div>

        <div style={{ display: "flex", background: "#F0EBE1", borderRadius: 12, padding: 4, marginBottom: "1.75rem" }}>
          {["login", "register"].map(t => (
            <button key={t} onClick={() => { setTab(t); setError(""); }}
              style={{
                flex: 1, padding: "0.55rem", border: "none", borderRadius: 9, cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.82rem", fontWeight: 500, transition: "all 0.2s",
                background: tab === t ? "white" : "transparent",
                color: tab === t ? C.dark : "#999",
                boxShadow: tab === t ? "0 2px 8px rgba(0,0,0,0.08)" : "none"
              }}>
              {t === "login" ? "Đăng nhập" : "Đăng ký"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {tab === "register" && (
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 500, color: "#666", marginBottom: 6 }}>Họ và tên</label>
              <input className="input-field" type="text" placeholder="Nguyễn Văn A" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
          )}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 500, color: "#666", marginBottom: 6 }}>Email</label>
            <input className="input-field" type="email" placeholder="ban@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 500, color: "#666", marginBottom: 6 }}>Mật khẩu</label>
            <input className="input-field" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>

          {error && (
            <p style={{ color: C.rust, fontSize: "0.78rem", marginBottom: "1rem", background: "#FFF0EC", padding: "0.5rem 0.75rem", borderRadius: 8, border: `1px solid rgba(155,58,26,0.15)` }}>
              ⚠ {error}
            </p>
          )}
          {successMsg && (
            <p style={{ color: C.moss, fontSize: "0.78rem", marginBottom: "1rem", background: "#EEF5EE", padding: "0.5rem 0.75rem", borderRadius: 8 }}>
              ✓ {successMsg}
            </p>
          )}

          <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center", opacity: loading ? 0.7 : 1, pointerEvents: loading ? "none" : "auto" }}>
            {loading ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "walkBounce 0.8s linear infinite" }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                Đang xử lý...
              </>
            ) : tab === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          </button>

          {tab === "login" && (
            <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.78rem", color: "#aaa", cursor: "pointer" }}>
              Quên mật khẩu?
            </p>
          )}
        </form>

        <div style={{ marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <p style={{ textAlign: "center", fontSize: "0.72rem", color: "#bbb", marginBottom: "0.75rem" }}>Hoặc tiếp tục với</p>
          <div style={{ display: "flex", gap: 10 }}>
            {["Google", "Facebook"].map(p => (
              <button key={p} style={{ flex: 1, padding: "0.6rem", border: "1.5px solid rgba(0,0,0,0.1)", borderRadius: 10, background: "white", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.8rem", fontWeight: 500, color: C.dark, transition: "border-color 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.moss}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)"}>
                {p === "Google" ? "🔵 " : "🔷 "}{p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
