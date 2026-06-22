export const C = {
  moss: "#3D5A3E",
  gold: "#C8963E",
  cream: "#F5F0E8",
  earth: "#8B5E3C",
  sage: "#7A9E7E",
  dark: "#1C2B1D",
  warmWhite: "#FEFCF8",
  rust: "#9B3A1A",
};

export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const DEMO_IMGS = {
  mai: "https://cdn.hstatic.net/files/200000439247/article/mai_02e6e37300be4154af6e1096000a9700.jpg",
  koi: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRLVH8mroB47XS_dRhhrEpQqFYEo9b5v8ugEdpFtgPBfhN-Ax2zitUwU9FV&s=10",
  temple: "https://image.giacngo.vn/w950/UserImages/2020/07/24/9/BTN_0048.JPG.webp",
  nhang: "https://cdn.tuoitre.vn/thumb_w/1060/471584752817336320/2023/5/29/img9730-168532598423022112956.jpg",
  workshop1: "https://maivanglongan.com/wp-content/uploads/2024/02/mai-vang-sau-tet-2.jpg",
  workshop2: "https://picsum.photos/seed/zen77/600/360",
  workshop3: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR0vQGtF-a0h8r0luwO7yDGZXiT7BUwJGfF0mhwTA3aMsPCBmV46EBT5pU&s=10",
  gallery1: "https://vcdn1-dulich.vnecdn.net/2023/10/18/TS11-8180-1697622340.jpg?w=0&h=0&q=100&dpr=2&fit=crop&s=G8McufUbNSdLbhbsANpdEg",
  gallery2: "https://cafefcdn.com/203337114487263232/2025/1/25/nhavuonaoca-22473418-1737767072722-17377670731721348841437.jpg",
  gallery3: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS3BEtKL8uhxSdxo7aFqKJDmBrptnApp9z-Zc1Od71i8A&s=10",
  gallery4: "https://images2.thanhnien.vn/Uploaded/thuyttl/2023_01_18/lang-mai-binh-loi-1669089578980393816590-1669089835186141632459-9273.jpeg",
  gallery5: "https://khuyennongtphcm.vn/wp-content/uploads/2019/11/1_zing.jpg",
  gallery6: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRxs4WkuK99Nh9mh6rS_g5tSqLhcH5HOyVAWTipWLiEAL244jIPHOMoPkfT&s=10",
};

export const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { font-family: 'Be Vietnam Pro', sans-serif; background: #FEFCF8; color: #1C2B1D; overflow-x: hidden; }

  @keyframes bubblePop {
    from { opacity: 0; transform: scale(0.8) translateY(10px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes floatChar {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-8px); }
  }
  @keyframes walkBounce {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    20%  { transform: translateY(-9px) rotate(-5deg); }
    40%  { transform: translateY(-4px) rotate(5deg); }
    60%  { transform: translateY(-9px) rotate(-3deg); }
    80%  { transform: translateY(-4px) rotate(3deg); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes modalIn {
    from { opacity: 0; transform: scale(0.94) translateY(16px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes slideInUp {
    from { opacity: 0; transform: translateY(48px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-48px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(48px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.82); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes pulseSoft {
    0%, 100% { transform: scale(1); box-shadow: 0 4px 20px rgba(61,90,62,0.35); }
    50% { transform: scale(1.06); box-shadow: 0 10px 36px rgba(61,90,62,0.55); }
  }
  @keyframes chatPop {
    0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
    70%  { transform: scale(1.12) rotate(3deg); opacity: 1; }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes ripple {
    0%   { transform: scale(0.85); opacity: 0.8; }
    100% { transform: scale(2.8); opacity: 0; }
  }
  @keyframes shimmerBg {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes heroFloat {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    33%  { transform: translateY(-10px) rotate(1deg); }
    66%  { transform: translateY(-5px) rotate(-0.5deg); }
  }
  @keyframes leafDrift {
    0%   { transform: translate(0, 0) rotate(0deg); opacity: 0.8; }
    100% { transform: translate(30px, -80px) rotate(240deg); opacity: 0; }
  }
  @keyframes stampIn {
    from { opacity: 0; transform: scale(1.4) rotate(3deg); }
    to   { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes panelSlideIn {
    from { transform: translateX(100%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }
  @keyframes backdropFade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes msgPop {
    from { opacity: 0; transform: translateY(8px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes typingDot {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
    40%            { transform: translateY(-5px); opacity: 1; }
  }

  .companion-char    { animation: floatChar 3s ease-in-out infinite; }
  .companion-walking { animation: walkBounce 0.45s ease-in-out infinite; }
  .companion-char:hover { transform: scale(1.12) !important; }
  .bubble-anim       { animation: bubblePop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }

  .nav-link { text-decoration: none; font-size: 0.85rem; font-weight: 500; color: #1C2B1D; letter-spacing: 0.02em; transition: color 0.2s; }
  .nav-link:hover { color: #3D5A3E; }

  .btn-primary { display: inline-flex; align-items: center; gap: 8px; background: #C8963E; color: #1C2B1D; padding: 0.85rem 1.75rem; border-radius: 2rem; font-size: 0.85rem; font-weight: 600; text-decoration: none; cursor: pointer; border: none; letter-spacing: 0.03em; transition: transform 0.2s, box-shadow 0.2s; font-family: 'Be Vietnam Pro', sans-serif; }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(200,150,62,0.35); }
  .btn-outline { display: inline-flex; align-items: center; gap: 8px; border: 1.5px solid rgba(245,240,232,0.3); color: #F5F0E8; padding: 0.85rem 1.75rem; border-radius: 2rem; font-size: 0.85rem; font-weight: 500; text-decoration: none; background: transparent; cursor: pointer; transition: border-color 0.2s, background 0.2s; font-family: 'Be Vietnam Pro', sans-serif; }
  .btn-outline:hover { border-color: #C8963E; background: rgba(200,150,62,0.1); }

  .bento-card { background: white; border-radius: 20px; padding: 2rem; position: relative; overflow: hidden; border: 1px solid rgba(0,0,0,0.04); transition: transform 0.3s, box-shadow 0.3s; }
  .bento-card:hover { transform: translateY(-5px); box-shadow: 0 20px 48px rgba(0,0,0,0.13); }

  .workshop-card { border: 1px solid rgba(0,0,0,0.08); border-radius: 20px; overflow: hidden; transition: transform 0.3s, box-shadow 0.3s; background: white; }
  .workshop-card:hover { transform: translateY(-5px); box-shadow: 0 16px 40px rgba(0,0,0,0.12); }
  .workshop-card .card-img { overflow: hidden; height: 200px; }
  .workshop-card .card-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
  .workshop-card:hover .card-img img { transform: scale(1.08); }

  .workshop-btn { display: inline-block; padding: 0.5rem 1.25rem; border: 1.5px solid #3D5A3E; border-radius: 2rem; font-size: 0.78rem; font-weight: 500; color: #3D5A3E; text-decoration: none; background: transparent; cursor: pointer; transition: background 0.2s, color 0.2s; font-family: 'Be Vietnam Pro', sans-serif; }
  .workshop-btn:hover { background: #3D5A3E; color: white; }

  .testimonial-card { background: #F5F0E8; border-radius: 16px; padding: 2rem; position: relative; transition: transform 0.3s, box-shadow 0.3s; }
  .testimonial-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.08); }
  .testimonial-card::before { content: '"'; font-family: 'Playfair Display', serif; font-size: 5rem; color: #C8963E; opacity: 0.3; position: absolute; top: 0.5rem; left: 1.5rem; line-height: 1; pointer-events: none; }

  .input-field { width: 100%; padding: 0.75rem 1rem; border: 1.5px solid rgba(61,90,62,0.2); border-radius: 10px; font-size: 0.88rem; font-family: 'Be Vietnam Pro', sans-serif; color: #1C2B1D; background: #FEFCF8; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
  .input-field:focus { border-color: #3D5A3E; box-shadow: 0 0 0 3px rgba(61,90,62,0.1); }

  .chat-fab { animation: chatPop 0.65s cubic-bezier(0.34,1.56,0.64,1) forwards; }
  .chat-pulse { animation: pulseSoft 2.2s ease-in-out infinite; }

  .gallery-img { overflow: hidden; border-radius: 16px; position: relative; }
  .gallery-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.55s ease; display: block; }
  .gallery-img:hover img { transform: scale(1.1); }
  .gallery-img .overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(28,43,29,0.7) 0%, transparent 60%); opacity: 0; transition: opacity 0.3s; display: flex; align-items: flex-end; padding: 1rem; }
  .gallery-img:hover .overlay { opacity: 1; }

  .reveal       { opacity: 0; transform: translateY(32px);  transition: opacity 0.7s ease, transform 0.7s ease; }
  .reveal-left  { opacity: 0; transform: translateX(-32px); transition: opacity 0.7s ease, transform 0.7s ease; }
  .reveal-right { opacity: 0; transform: translateX(32px);  transition: opacity 0.7s ease, transform 0.7s ease; }
  .reveal.visible, .reveal-left.visible, .reveal-right.visible { opacity: 1; transform: none; }
  .reveal-delay1 { transition-delay: 0.1s; }
  .reveal-delay2 { transition-delay: 0.2s; }
  .reveal-delay3 { transition-delay: 0.3s; }
`;
