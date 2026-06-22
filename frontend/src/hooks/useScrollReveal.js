import { useEffect } from "react";

export default function useScrollReveal(trigger) {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal, .reveal-left, .reveal-right").forEach(el => {
      el.classList.remove("visible");
      obs.observe(el);
    });
    return () => obs.disconnect();
  }, [trigger]);
}
