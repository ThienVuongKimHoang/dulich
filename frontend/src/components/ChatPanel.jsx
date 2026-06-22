import { useState, useEffect, useRef, useCallback } from "react";
import { C, API_BASE } from "../constants";

// ─── RAG KNOWLEDGE BASE ───
const RAG_KB = [
  {
    placeId: "sake-quan",
    keywords: ["sake quán", "sake", "cầu đôi", "cá tai tượng", "gỏi củ hủ dừa", "ẩm thực sân vườn", "nhà hàng cầu đôi", "trần văn giàu"],
    reply: "🍽️ Sake Quán nằm ngay chân Cầu Đôi (D8/67/1 Trần Văn Giàu, xã Bình Lợi). Không gian sân vườn rộng thoáng mát với các món dân dã miền Tây: cá tai tượng chiên xù, gỏi củ hủ dừa tôm thịt, lẩu cá diêu hồng, dồi trường chiên giòn. Giá bình dân, lý tưởng cho gia đình và đoàn dã ngoại cuối tuần!",
  },
  {
    placeId: "xuan-huong",
    keywords: ["xuân hương", "xuan huong", "câu cá giải trí", "gà hấp mắm nhĩ", "heo tộc", "dừa nước", "cầu khỉ", "lẩu cá măng"],
    reply: "🎣 Khu ẩm thực sinh thái Xuân Hương (C12/40 Long Vĩnh, ấp 5, Bình Hưng) mang đậm chất làng quê Nam Bộ với hàng dừa nước, cầu khỉ đong đưa và câu cá giải trí. Nổi tiếng với gà xé lên mâm, gà hấp mắm nhĩ trong lu, lẩu cá măng chua, heo tộc lên mẹt!",
  },
  {
    placeId: "tan-phong-koi",
    keywords: ["tấn phong", "tan phong", "koi farm", "trang trại koi", "ao cá koi", "cá nhật", "9 ha", "cho cá ăn"],
    reply: "🎏 Tấn Phong Koi Farm (A3/69, ấp 1, xã Bình Lợi) là trang trại cá Koi lớn nhất vùng với hơn 9 ha ao nuôi! Du khách tự tay rải thức ăn cho hàng vạn cá Koi rực rỡ nổi lên mặt nước, và chọn mua cá giống trực tiếp. Mô hình nông nghiệp đô thị công nghệ cao rất thú vị!",
  },
  {
    placeId: "ba-quyen",
    keywords: ["ba quyền", "ba quyen", "trại cá ba quyền", "cá ba đuôi"],
    reply: "🐟 Trại cá cảnh Ba Quyền (ấp 1, xã Bình Lợi) là điểm tham quan cá Koi và cá cảnh đa dạng (cá ba đuôi, cá vàng...). Quy mô thân thiện, nằm gần Tấn Phong Koi Farm — rất tiện để kết hợp trong một chuyến!",
  },
  {
    placeId: "dua-luoi-hong-van",
    keywords: ["dưa lưới", "hồng vân", "hong van", "nhà màng", "thủy canh", "tưới nhỏ giọt", "vườn dưa", "nông nghiệp nhà màng", "lê minh xuân dưa"],
    reply: "🍈 Vườn Dưa Lưới Huỳnh Thị Hồng Vân (ấp 2, xã Bình Lợi) cho trải nghiệm làm 'nông dân công nghệ cao' trong nhà màng vô trùng! Bạn được mặc đồ bảo hộ, tìm hiểu công nghệ tưới nhỏ giọt thủy canh và tự tay hái những quả dưa lưới căng mọng ngọt thanh ngay tại vườn!",
  },
  {
    placeId: "vuon-lan-son-ha",
    keywords: ["sơn hà", "son ha", "vườn lan sơn hà", "lan dendrobium", "dendrobium", "lan thái", "hoa lan sơn hà", "40 sắc màu"],
    reply: "🌺 Vườn Lan Sơn Hà (ấp 5, xã Đa Phước, Bình Chánh) là trang trại hoa lan lớn nhất Bình Chánh với 12.000 m², chuyên thuần hóa lan Dendrobium từ Thái Lan với hơn 40 sắc màu rực rỡ. Bạn được chia sẻ kinh nghiệm chọn giống, bón phân và kích hoa ra đều quanh năm!",
  },
  {
    placeId: "me-lan",
    keywords: ["mê lan", "me lan", "lan ngọc điểm", "ngọc điểm", "lan rừng quý", "rạch cầu suối", "vĩnh lộc a lan"],
    reply: "🌸 Vườn Mê Lan (Tổ 9, ấp 6B, Rạch Cầu Suối, Vĩnh Lộc A) chuyên sưu tầm lan rừng quý Ngọc Điểm — loài lan nổi tiếng với hương thơm ngát đặc trưng và bộ rễ đẹp. Không gian kênh rạch thơ mộng, yên bình!",
  },
  {
    placeId: "lang-nhang",
    keywords: ["nhang", "làng nhang", "se nhang", "nhang trầm", "workshop nhang", "làm nhang", "mai bá hương nhang", "cơ sở nhang"],
    reply: "🕯️ Làng Nhang Lê Minh Xuân (đường Mai Bá Hương, ấp 9, xã Bình Lợi) — làng nghề se nhang gần 100 năm tuổi, cơ sở sản xuất nhang lớn nhất Nam Bộ! Những sào nhang đỏ, hồng, vàng rực rỡ phơi dọc đường là điểm check-in được Sở Du lịch TP.HCM công nhận. Bạn có thể tham gia workshop làm nhang tự tay!",
  },
  {
    placeId: "dap-xe",
    keywords: ["đạp xe", "rừng tràm", "tràm lê minh xuân", "cào cào adventures", "xuồng ba lá", "rau choại", "đường mòn rừng"],
    reply: "🚴 Tuyến đạp xe rừng tràm Lê Minh Xuân cách trung tâm ~30 km, qua đường mòn đất đỏ rợp bóng tràm mát rượi. Ngoài đạp xe, bạn còn trải nghiệm chèo xuồng ba lá qua kênh xanh, tự tay hái đọt rau choại, và ngâm chân thảo dược hồi phục sau hành trình!",
  },
  {
    placeId: "chua-thanh-tam",
    keywords: ["chùa thanh tâm", "phật cô đơn", "bát bửu", "tâm linh bình lợi", "cầu duyên bình lợi", "phật thích ca bình lợi"],
    reply: "🛕 Chùa Thanh Tâm — hay 'Phật Cô Đơn' — là điểm tâm linh nổi tiếng nhất ngoại ô TP.HCM (ấp 1, xã Bình Lợi). Tượng Phật Thích Ca nặng 4 tấn đứng vững giữa tro tàn sau chiến tranh là một kỳ tích lịch sử. Chùa mở cửa 05:00–21:00, thu hút đông đảo bạn trẻ cầu duyên vào ngày rằm và Valentine!",
  },
  {
    placeId: "lang-mai",
    keywords: ["làng mai", "mai vàng", "vườn mai", "hoa mai tết", "mai bình lợi", "trồng mai"],
    reply: "🌼 Làng Mai Bình Lợi (đường Mai Bá Hương, ấp 9) nổi tiếng với nghề trồng mai vàng truyền thống lâu đời. Hàng trăm vườn mai nở rộ mỗi dịp Tết, tạo khung cảnh vàng rực rỡ hiếm thấy giữa ngoại ô Sài Gòn. Đẹp nhất từ tháng 11 đến tháng 1 âm lịch!",
  },
  {
    placeId: null,
    keywords: ["lịch trình", "tour một ngày", "kế hoạch đi", "gợi ý lịch", "đi trong ngày", "plan"],
    reply: "🗓️ Gợi ý lịch trình 1 ngày tại Bình Lợi:\n• 08:30–09:15 Ăn sáng tại Nhà hàng chay Hoa Sen\n• 09:15–11:00 Đạp xe rừng Lê Minh Xuân + Workshop làm nhang\n• 11:15–13:00 Ăn trưa tại Nhà hàng Bến Sông Bình Lợi\n• 13:30–15:30 Tham quan World Farm – Thế Giới Nông Trại\n• 15:30–17:00 Dạo ven sông Vàm Cỏ Đông ngắm đồng ruộng\n• 17:00–18:00 Ngắm hoàng hôn bên sông\n• 18:15–19:30 Ăn tối nhà hàng sinh thái ven sông\n• 20:00 Trở về TP.HCM ✨",
  },
  {
    placeId: null,
    keywords: ["đi nhóm bạn bè", "team building", "đi cặp đôi", "gia đình có trẻ em", "đại gia đình", "đi đoàn"],
    reply: "👥 Bình Lợi phù hợp với mọi nhóm:\n• Cặp đôi: Hoàng hôn ven sông, chèo SUP/kayak, picnic sân vườn 🌅\n• Gia đình: Vườn dưa lưới, hồ cá Koi, World Farm cho trẻ em 🌱\n• Bạn bè: BBQ, đạp xe rừng tràm, workshop nhang 🚴\n• Đại gia đình: Sake Quán & Xuân Hương đủ chỗ đoàn lớn 🍽️\nBạn đi với ai để mình tư vấn thêm nhé? 😊",
  },
];

// Detect place ID from text (for API responses)
const PLACE_NAME_CLUES = [
  { placeId: "sake-quan",         clues: ["sake quán", "sake quan", "cầu đôi"] },
  { placeId: "xuan-huong",        clues: ["xuân hương", "xuan huong"] },
  { placeId: "tan-phong-koi",     clues: ["tấn phong", "tan phong", "koi farm"] },
  { placeId: "ba-quyen",          clues: ["ba quyền", "ba quyen"] },
  { placeId: "dua-luoi-hong-van", clues: ["hồng vân", "hong van", "dưa lưới"] },
  { placeId: "vuon-lan-son-ha",   clues: ["sơn hà", "son ha", "vườn lan sơn hà"] },
  { placeId: "me-lan",            clues: ["mê lan", "me lan", "ngọc điểm"] },
  { placeId: "lang-nhang",        clues: ["làng nhang", "lang nhang"] },
  { placeId: "dap-xe",            clues: ["đạp xe", "rừng tràm"] },
  { placeId: "chua-thanh-tam",    clues: ["chùa thanh tâm", "phật cô đơn", "bát bửu"] },
  { placeId: "lang-mai",          clues: ["làng mai", "lang mai", "mai vàng"] },
];

function detectPlaceId(text) {
  const t = text.toLowerCase();
  for (const { placeId, clues } of PLACE_NAME_CLUES) {
    if (clues.some(c => t.includes(c))) return placeId;
  }
  return null;
}

// RAG retrieval: return best-match { text, placeId }
function getBotReply(text) {
  const t = text.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;
  for (const entry of RAG_KB) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (t.includes(kw.toLowerCase())) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }
  if (bestMatch && bestScore > 0) {
    return { text: bestMatch.reply, placeId: bestMatch.placeId };
  }
  // General fallbacks
  const t2 = t;
  if (t2.includes("đường") || t2.includes("đi như") || (t2.includes("đi") && t2.includes("xe"))) {
    return { text: "🚗 Từ trung tâm Sài Gòn, theo hướng Bình Chánh khoảng 45–60 phút. Đi xe máy, ô tô hoặc xe công nghệ đều được. Lúc đến Bình Lợi, nhớ thử các con đường ven sông để ngắm cảnh nhé!", placeId: null };
  }
  if (t2.includes("giá") || t2.includes("bao nhiêu") || t2.includes("phí")) {
    return { text: "💰 Nhiều điểm tham quan miễn phí đó bạn! Workshop từ 150k–500k/người tùy loại. Ăn uống tại Sake Quán hay Xuân Hương rất bình dân, khoảng 80–200k/người.", placeId: null };
  }
  if (t2.includes("koi") || t2.includes("cá")) {
    return { text: "🐠 Bình Lợi có làng cá Koi công nghệ cao với ao nuôi hơn 9 ha! Tấn Phong Koi Farm là điểm lớn nhất, bạn được tự tay cho cá ăn và chọn mua cá về làm cảnh.", placeId: "tan-phong-koi" };
  }
  if (t2.includes("mai") || t2.includes("hoa")) {
    return { text: "🌼 Làng mai vàng Bình Lợi có lịch sử hàng trăm năm! Đẹp nhất vào tháng 1–2 âm lịch — cả một trời vàng rực, chụp ảnh ra cực đẹp đó bạn!", placeId: "lang-mai" };
  }
  const defaults = [
    { text: "Bình Lợi ở huyện Bình Chánh, TP.HCM — chỉ cách trung tâm ~20km thôi! Bạn muốn biết về điểm nào? Ẩm thực, hồ cá Koi, vườn lan, làng nhang hay đạp xe rừng tràm? 😊", placeId: null },
    { text: "Mình có thể giúp bạn tìm hiểu làng mai, làng nhang, hồ koi, vườn dưa lưới hay các điểm ăn uống đặc sắc ở đây. Bạn quan tâm điều gì nhất?", placeId: null },
    { text: "Tháng Chạp là thời điểm đẹp nhất để ghé — mai vàng bắt đầu nở rộ, không khí Tết rất dễ chịu! Bạn có hỏi về lịch trình cụ thể không?", placeId: null },
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

const SUGGESTIONS = ["Làng mai có gì?", "Ăn ở đâu ngon?", "Trang trại cá Koi", "Lịch trình 1 ngày", "Đường đi?", "Workshop nhang"];

// ─── CHAT SOUNDS ───
function playSendSound() {
  try {
    const ctx = new (window.AudioContext || window["webkitAudioContext"])();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(1080, t + 0.1);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.13, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.22);
  } catch (_) {}
}

function playReceiveSound() {
  try {
    const ctx = new (window.AudioContext || window["webkitAudioContext"])();
    const t = ctx.currentTime;
    const chime = (freq, delay, vol = 0.14) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + delay);
      gain.gain.linearRampToValueAtTime(vol, t + delay + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + delay);
      osc.stop(t + delay + 0.6);
    };
    chime(1046.5, 0);
    chime(1318.5, 0.13);
  } catch (_) {}
}

// ─── CHAT PANEL ───
const AVATAR_CHATBOT = "/img/avatar_chatbot.jpeg";
const CHAT_SESSION_KEY = "bl_chat_v2";

function getInitialMessages() {
  try {
    const saved = sessionStorage.getItem(CHAT_SESSION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [
    {
      id: 1,
      role: "bot",
      text: "Chào bạn! 🌸 Mình là Mai, người bạn đồng hành tại Bình Lợi. Hỏi mình về ẩm thực, cá Koi, vườn lan, làng nhang hay bất cứ điều gì — hoặc gửi ảnh để chia sẻ cùng nhau nhé!",
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      placeId: null,
    },
  ];
}

// Extract booking hints from a user message
function extractBookingHints(text) {
  const hints = {};
  const t = text.toLowerCase();

  // Date: dd/mm or dd/mm/yyyy or dd-mm
  const dateMatch = t.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, "0");
    const month = dateMatch[2].padStart(2, "0");
    let year = dateMatch[3];
    if (!year) year = new Date().getFullYear();
    if (String(year).length === 2) year = "20" + year;
    const candidate = `${year}-${month}-${day}`;
    if (!isNaN(new Date(candidate))) hints.date = candidate;
  }
  // "ngày mai" → tomorrow
  if (t.includes("ngày mai")) {
    const d = new Date(); d.setDate(d.getDate() + 1);
    hints.date = d.toISOString().split("T")[0];
  }
  // "cuối tuần" / "thứ 7" / "chủ nhật"
  if (t.includes("thứ 7") || t.includes("thứ bảy") || t.includes("cuối tuần")) {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() + ((6 - day + 7) % 7 || 7));
    hints.date = d.toISOString().split("T")[0];
  }

  // People count: "X người"
  const peopleMatch = t.match(/(\d+)\s*người/);
  if (peopleMatch) hints.people = parseInt(peopleMatch[1]);

  // Notes/preferences keywords
  const noteKw = ["thích", "muốn", "cần", "yêu cầu", "dị ứng", "trẻ em", "xe lăn", "ăn chay", "vegetarian"];
  if (noteKw.some(k => t.includes(k))) {
    hints.notes = text.slice(0, 120);
  }

  return Object.keys(hints).length > 0 ? hints : null;
}

export default function ChatPanel({ onClose, onNavigateToMap, onBookingHints }) {
  const [messages, setMessages] = useState(getInitialMessages);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [sendRipple, setSendRipple] = useState(false);
  const [lastBotId, setLastBotId] = useState(null);
  const [avatarErr, setAvatarErr] = useState(false);
  const userMsgCount = useRef(0);
  const isSendingRef = useRef(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  function nowTime() {
    return new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);

  useEffect(() => {
    try {
      sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  const pickImage = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const clearImage = () => { setImageFile(null); setImagePreview(null); };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) pickImage(file);
  };

  const tryUpdatePersonality = useCallback((allMsgs) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const history = allMsgs
      .filter(m => m.text)
      .map(m => ({ role: m.role === "bot" ? "bot" : "user", text: m.text }));
    fetch(`${API_BASE}/api/v1/chat/update-personality`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ history }),
    }).catch(() => { });
  }, []);

  const canSend = (input.trim() || imageFile) && !busy;

  const send = async () => {
    if (!canSend) return;
    const text = input.trim();
    const file = imageFile;
    const preview = imagePreview;
    const token = localStorage.getItem("access_token");

    // Snapshot current messages before state update, for history
    const historySnapshot = messages;

    // Extract booking hints from text messages
    if (text && onBookingHints) {
      const hints = extractBookingHints(text);
      if (hints) onBookingHints(hints);
    }

    const userMsg = { id: Date.now(), role: "user", text: text || null, image: preview, time: nowTime(), placeId: null };
    setMessages(prev => [...prev, userMsg]);
    playSendSound();
    isSendingRef.current = true;
    setSendRipple(true);
    setTimeout(() => setSendRipple(false), 500);
    setInput("");
    if (inputRef.current) inputRef.current.value = "";
    clearImage();
    setTimeout(() => { isSendingRef.current = false; }, 150);
    setTyping(true);
    setBusy(true);
    userMsgCount.current += 1;

    try {
      const fd = new FormData();
      if (text) fd.append("message", text);
      if (file) fd.append("image", file, file.name);

      // Send last 16 text messages as history (skip images to avoid large payload)
      if (!file) {
        const historyPayload = historySnapshot
          .filter(m => m.text)
          .slice(-4)
          .map(m => ({ role: m.role, text: m.text }));
        fd.append("history", JSON.stringify(historyPayload));
      }

      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/v1/chat/message`, {
        method: "POST",
        headers,
        body: fd,
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const apiText = data.reply || data.message || "";
      setTyping(false);
      playReceiveSound();
      setMessages(prev => {
        const botId = Date.now() + 1;
        setLastBotId(botId);
        const placeId = detectPlaceId(apiText) || (text ? getBotReply(text).placeId : null);
        const next = [...prev, {
          id: botId,
          role: "bot",
          text: apiText || getBotReply(text || "").text,
          time: nowTime(),
          placeId,
        }];
        if (userMsgCount.current % 5 === 0) tryUpdatePersonality(next);
        return next;
      });
    } catch {
      await new Promise(r => setTimeout(r, 800 + Math.random() * 500));
      setTyping(false);
      playReceiveSound();
      const localReply = getBotReply(text || "");
      const botId = Date.now() + 1;
      setLastBotId(botId);
      setMessages(prev => [...prev, {
        id: botId,
        role: "bot",
        text: localReply.text,
        time: nowTime(),
        placeId: localReply.placeId,
      }]);
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleExplorePlace = useCallback((placeId) => {
    if (onNavigateToMap) {
      onNavigateToMap(placeId);
      onClose();
    }
  }, [onNavigateToMap, onClose]);

  return (
    <>
      <style>{`
        @keyframes msgUserPop {
          0%   { opacity:0; transform:translateX(28px) scale(0.85); }
          55%  { opacity:1; transform:translateX(-5px) scale(1.03); }
          80%  { transform:translateX(2px) scale(0.99); }
          100% { opacity:1; transform:translateX(0) scale(1); }
        }
        @keyframes msgBotPop {
          0%   { opacity:0; transform:translateX(-28px) scale(0.85); }
          55%  { opacity:1; transform:translateX(5px) scale(1.03); }
          80%  { transform:translateX(-2px) scale(0.99); }
          100% { opacity:1; transform:translateX(0) scale(1); }
        }
        @keyframes avatarPing {
          0%   { box-shadow:0 0 0 0 rgba(122,158,126,0.75); }
          70%  { box-shadow:0 0 0 9px rgba(122,158,126,0); }
          100% { box-shadow:0 0 0 0 rgba(122,158,126,0); }
        }
        @keyframes sendPop {
          0%   { transform:scale(1); }
          35%  { transform:scale(0.82); }
          70%  { transform:scale(1.14); }
          100% { transform:scale(1); }
        }
        @keyframes rippleOut {
          0%   { transform:scale(0); opacity:0.55; }
          100% { transform:scale(2.8); opacity:0; }
        }
        @keyframes explorePop {
          0%   { opacity:0; transform:translateY(6px) scale(0.92); }
          100% { opacity:1; transform:translateY(0) scale(1); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(28,43,29,0.25)", zIndex: 400, backdropFilter: "blur(2px)", animation: "backdropFade 0.25s ease forwards" }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: 500, maxWidth: "100vw",
          zIndex: 401,
          display: "flex", flexDirection: "column",
          background: isDragOver ? "#EEF5EE" : "#FEFCF8",
          boxShadow: "-12px 0 48px rgba(0,0,0,0.14)",
          animation: "panelSlideIn 0.35s cubic-bezier(0.4,0,0.2,1) forwards",
          transition: "background 0.2s",
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag-over overlay */}
        {isDragOver && (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(61,90,62,0.08)", border: `3px dashed ${C.moss}`, borderRadius: 0, pointerEvents: "none" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.moss} strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            <p style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontWeight: 700, color: C.moss, marginTop: 12, fontSize: "1rem" }}>Thả ảnh vào đây</p>
          </div>
        )}

        {/* ── Header ── */}
        <div style={{
          background: `linear-gradient(135deg, ${C.moss} 0%, #2A4A2B 100%)`,
          padding: "1.25rem 1.25rem 1.5rem",
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
        }}>
          <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(200,150,62,0.15)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -30, left: -10, width: 80, height: 80, borderRadius: "50%", background: "rgba(245,240,232,0.07)", pointerEvents: "none" }} />

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ position: "relative" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", border: "2.5px solid rgba(245,240,232,0.5)", animation: "floatChar 3s ease-in-out infinite", background: "rgba(255,255,255,0.15)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {avatarErr ? (
                    <div style={{ fontSize: "1.8rem" }}>🌸</div>
                  ) : (
                    <img
                      src={AVATAR_CHATBOT}
                      alt="Mai"
                      style={{ width: 42, height: 42, objectFit: "contain", display: "block" }}
                      onError={() => setAvatarErr(true)}
                    />
                  )}
                </div>
                <div style={{ position: "absolute", bottom: 2, right: 2, width: 11, height: 11, borderRadius: "50%", background: "#4CAF50", border: "2px solid white" }} />
              </div>
              <div>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 600, color: "white" }}>Mai</p>
                <p style={{ fontSize: "0.7rem", color: "rgba(245,240,232,0.65)", marginTop: 2 }}>🌿 Người bạn đồng hành · Đang online</p>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.12)", border: "none", cursor: "pointer", color: "white", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", transition: "background 0.2s", flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}>×</button>
          </div>
        </div>

        {/* ── Messages ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem", display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
            <span style={{ background: "#EEF5EE", color: "#888", fontSize: "0.68rem", padding: "0.25rem 0.85rem", borderRadius: "2rem" }}>
              Hôm nay, {new Date().toLocaleDateString("vi-VN", { day: "numeric", month: "long" })}
            </span>
          </div>

          {messages.map(msg => {
            const isBot = msg.role === "bot";
            const isLatestBot = isBot && msg.id === lastBotId;
            return (
              <div key={msg.id} style={{ display: "flex", flexDirection: isBot ? "row" : "row-reverse", alignItems: "flex-end", gap: 8, marginBottom: "0.6rem", animation: `${isBot ? "msgBotPop" : "msgUserPop"} 0.42s cubic-bezier(0.34,1.26,0.64,1) forwards` }}>
                {isBot && (
                  <div style={{ width: 30, height: 30, borderRadius: "50%", overflow: "hidden", background: "#EEF5EE", border: `2px solid ${C.sage}`, flexShrink: 0, alignSelf: "flex-end", animation: isLatestBot ? "avatarPing 0.7s ease-out 0.2s" : "none" }}>
                    {avatarErr ? (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>🌿</div>
                    ) : (
                      <img src={AVATAR_CHATBOT} alt="Mai" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} onError={() => setAvatarErr(true)} />
                    )}
                  </div>
                )}
                <div style={{ maxWidth: "78%", display: "flex", flexDirection: "column", gap: 4, alignItems: isBot ? "flex-start" : "flex-end" }}>
                  {msg.image && (
                    <div style={{ borderRadius: isBot ? "16px 16px 16px 4px" : "16px 16px 4px 16px", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.12)" }}>
                      <img src={msg.image} alt="ảnh gửi" style={{ maxWidth: 220, maxHeight: 220, display: "block", objectFit: "cover" }} />
                    </div>
                  )}
                  {msg.text && (
                    <div style={{
                      padding: "0.65rem 0.9rem",
                      borderRadius: isBot ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
                      background: isBot ? "#FFF8EE" : C.moss,
                      color: isBot ? C.dark : "white",
                      fontSize: "0.86rem",
                      lineHeight: 1.65,
                      border: isBot ? "1px solid rgba(200,150,62,0.12)" : "none",
                      boxShadow: isBot
                        ? isLatestBot ? `0 4px 18px rgba(122,158,126,0.28)` : "0 2px 8px rgba(0,0,0,0.05)"
                        : "0 2px 10px rgba(61,90,62,0.2)",
                      whiteSpace: "pre-wrap",
                      transition: "box-shadow 0.4s",
                    }}>
                      {msg.text}
                    </div>
                  )}

                  {/* ── Nút Khám phá bản đồ ── */}
                  {isBot && msg.placeId && onNavigateToMap && (
                    <button
                      onClick={() => handleExplorePlace(msg.placeId)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: "white",
                        border: `1.5px solid ${C.moss}`,
                        color: C.moss,
                        borderRadius: "2rem",
                        padding: "0.35rem 0.85rem",
                        fontSize: "0.73rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "'Be Vietnam Pro', sans-serif",
                        transition: "all 0.2s",
                        animation: "explorePop 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = C.moss;
                        e.currentTarget.style.color = "white";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = "white";
                        e.currentTarget.style.color = C.moss;
                      }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      Khám phá trên bản đồ
                    </button>
                  )}

                  <div style={{ fontSize: "0.6rem", color: "#bbb", paddingInline: "0.25rem" }}>{msg.time}</div>
                </div>
              </div>
            );
          })}

          {typing && (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: "0.6rem" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", overflow: "hidden", background: "#EEF5EE", border: `2px solid ${C.sage}`, flexShrink: 0 }}>
                {avatarErr ? (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>🌿</div>
                ) : (
                  <img src={AVATAR_CHATBOT} alt="Mai" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} onError={() => setAvatarErr(true)} />
                )}
              </div>
              <div style={{ padding: "0.65rem 1rem", background: "#FFF8EE", borderRadius: "16px 16px 16px 4px", border: "1px solid rgba(200,150,62,0.12)", display: "flex", gap: 4, alignItems: "center" }}>
                {[0, 0.2, 0.4].map((d, i) => (
                  <span key={i} style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: C.sage, animation: `typingDot 1.2s ease-in-out ${d}s infinite` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Suggestions ── */}
        <div style={{ padding: "0 1.25rem 0.5rem", display: "flex", gap: 6, overflowX: "auto", flexShrink: 0 }}>
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 0); }}
              style={{ padding: "0.35rem 0.8rem", border: `1.5px solid rgba(61,90,62,0.2)`, borderRadius: "2rem", fontSize: "0.72rem", fontWeight: 500, color: C.moss, background: "white", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Be Vietnam Pro', sans-serif", transition: "all 0.18s", flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.background = C.moss; e.currentTarget.style.color = "white"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = C.moss; }}>
              {s}
            </button>
          ))}
        </div>

        {/* ── Image preview ── */}
        {imagePreview && (
          <div style={{ padding: "0 1.25rem 0.5rem", flexShrink: 0 }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <img src={imagePreview} alt="preview" style={{ height: 72, borderRadius: 10, objectFit: "cover", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }} />
              <button onClick={clearImage}
                style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#F44336", border: "2px solid white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "0.65rem", fontWeight: 700, padding: 0, lineHeight: 1 }}>
                ×
              </button>
              <div style={{ position: "absolute", bottom: 4, left: 4, background: "rgba(0,0,0,0.5)", borderRadius: 4, padding: "1px 5px", fontSize: "0.6rem", color: "white" }}>
                {imageFile?.name?.length > 16 ? imageFile.name.slice(0, 14) + "…" : imageFile?.name}
              </div>
            </div>
          </div>
        )}

        {/* ── Input ── */}
        <div style={{ padding: "0.75rem 1.25rem 1.25rem", borderTop: "1px solid rgba(0,0,0,0.06)", background: "white", flexShrink: 0 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) pickImage(f); e.target.value = ""; }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Tải ảnh lên"
              style={{ width: 38, height: 38, borderRadius: "50%", background: imageFile ? C.moss + "22" : "#F0F0F0", border: imageFile ? `1.5px solid ${C.moss}` : "1.5px solid #ddd", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: imageFile ? C.moss : "#999", flexShrink: 0, transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = C.moss + "18"; e.currentTarget.style.borderColor = C.moss; e.currentTarget.style.color = C.moss; }}
              onMouseLeave={e => { if (!imageFile) { e.currentTarget.style.background = "#F0F0F0"; e.currentTarget.style.borderColor = "#ddd"; e.currentTarget.style.color = "#999"; } }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
            </button>

            <textarea
              ref={inputRef}
              rows={1}
              placeholder={imageFile ? "Thêm mô tả cho ảnh... (tùy chọn)" : "Hỏi Mai về Bình Lợi... hoặc kéo ảnh vào đây"}
              value={input}
              onChange={e => { if (!isSendingRef.current) setInput(e.target.value); }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              style={{ flex: 1, padding: "0.65rem 0.9rem", border: `1.5px solid rgba(61,90,62,0.2)`, borderRadius: 20, fontSize: "0.86rem", fontFamily: "'Be Vietnam Pro', sans-serif", color: C.dark, background: "#FEFCF8", outline: "none", resize: "none", lineHeight: 1.5, maxHeight: 90, transition: "border-color 0.2s" }}
              onFocus={e => e.target.style.borderColor = C.moss}
              onBlur={e => e.target.style.borderColor = "rgba(61,90,62,0.2)"}
            />

            <button
              onClick={send}
              disabled={!canSend}
              style={{ position: "relative", width: 42, height: 42, borderRadius: "50%", background: canSend ? C.moss : "#ccc", border: "none", cursor: canSend ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, overflow: "hidden", animation: sendRipple ? "sendPop 0.42s cubic-bezier(0.34,1.3,0.64,1) forwards" : "none", transition: "background 0.2s" }}
              onMouseEnter={e => { if (canSend && !sendRipple) e.currentTarget.style.transform = "scale(1.08)"; }}
              onMouseLeave={e => { if (!sendRipple) e.currentTarget.style.transform = "scale(1)"; }}>
              {sendRipple && (
                <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(255,255,255,0.35)", animation: "rippleOut 0.5s ease-out forwards", pointerEvents: "none" }} />
              )}
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "relative", zIndex: 1 }}>
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p style={{ fontSize: "0.62rem", color: "#bbb", marginTop: "0.5rem", textAlign: "center" }}>
            Enter để gửi · Shift+Enter xuống dòng · Kéo & thả ảnh vào cửa sổ chat
          </p>
        </div>
      </div>
    </>
  );
}
