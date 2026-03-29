/**
 * Logo.jsx - AT Mission 2026 rising bars mark
 */
export default function Logo({ size=32, showText=false }) {
  const s = size;
  const b = s * 0.18; // bar width
  const g = s * 0.04; // gap
  const r = s * 0.06; // radius
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="6" fill="#0a2342"/>
      <rect x="5" y="22" width="5" height="5" rx="1" fill="#1e90d4"/>
      <rect x="12" y="17" width="5" height="10" rx="1" fill="#1e90d4"/>
      <rect x="19" y="11" width="5" height="16" rx="1" fill="#38bdf8"/>
      <rect x="26" y="5" width="5" height="22" rx="1" fill="#7dd3fc" opacity="0.8"/>
      <line x1="5" y1="5" x2="27" y2="5" stroke="white" strokeWidth="0.5" strokeOpacity="0.15"/>
    </svg>
  );
}
