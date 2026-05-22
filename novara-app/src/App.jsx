import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const COLORS = {
  ivory: "#F5F1EA",
  moonBeige: "#E8DDD0",
  lavender: "#C8BEDB",
  gold: "#D6C2A1",
  charcoal: "#2B2B2B",
  deepPurple: "#3D3553",
  mutedRose: "#D4A9B0",
  softGreen: "#A8B8A0",
};

const FONTS = {
  serif: "'Cormorant Garamond', 'Georgia', serif",
  sans: "'Montserrat', system-ui, sans-serif",
};

// 22 Major Arcana — each card has number, name, symbol, meaning, reflection prompt
const TAROT_DECK = [
  { n: 0,  name: "The Fool",            symbol: "◯",  meaning: "Beginnings, leap of faith, innocence.",       prompt: "What invitation are you afraid to accept?" },
  { n: 1,  name: "The Magician",        symbol: "✦",  meaning: "Manifestation, focused will, power.",         prompt: "What do you already have that you keep overlooking?" },
  { n: 2,  name: "The High Priestess",  symbol: "☽",  meaning: "Intuition, mystery, inner knowing.",          prompt: "What does your body know that your mind hasn't accepted?" },
  { n: 3,  name: "The Empress",         symbol: "❀",  meaning: "Abundance, nurture, creative fertility.",     prompt: "Where in your life are you starving what wants to grow?" },
  { n: 4,  name: "The Emperor",         symbol: "♛",  meaning: "Structure, authority, grounded order.",       prompt: "Where do you need to set a boundary today?" },
  { n: 5,  name: "The Hierophant",      symbol: "⚜",  meaning: "Tradition, teaching, spiritual wisdom.",      prompt: "Whose voice in your head is not your own?" },
  { n: 6,  name: "The Lovers",          symbol: "♥",  meaning: "Union, alignment, conscious choice.",         prompt: "What are you saying yes to by saying no to something else?" },
  { n: 7,  name: "The Chariot",         symbol: "⟶",  meaning: "Willpower, momentum, controlled drive.",      prompt: "What needs your full attention this week?" },
  { n: 8,  name: "Strength",            symbol: "∞",  meaning: "Courage, soft power, inner steadiness.",      prompt: "Where can you be gentler with yourself today?" },
  { n: 9,  name: "The Hermit",          symbol: "⛯",  meaning: "Solitude, inner light, wise withdrawal.",     prompt: "What would silence tell you if you let it speak?" },
  { n: 10, name: "Wheel of Fortune",    symbol: "☉",  meaning: "Cycles, turning, fated motion.",              prompt: "What cycle are you ready to step out of?" },
  { n: 11, name: "Justice",             symbol: "⚖",  meaning: "Truth, balance, honest accounting.",          prompt: "Where in your life is the truth uncomfortable but necessary?" },
  { n: 12, name: "The Hanged Man",      symbol: "⊥",  meaning: "Surrender, pause, new perspective.",          prompt: "What are you holding on to that's holding you still?" },
  { n: 13, name: "Death",               symbol: "✕",  meaning: "Transformation, ending, release.",            prompt: "What part of your old self is asking to be laid down?" },
  { n: 14, name: "Temperance",          symbol: "⚯",  meaning: "Alchemy, blending, patient integration.",     prompt: "What two parts of yourself are still at war?" },
  { n: 15, name: "The Devil",           symbol: "⛧",  meaning: "Shadow, attachment, the chain you choose.",   prompt: "What are you pretending not to know?" },
  { n: 16, name: "The Tower",           symbol: "⚡",  meaning: "Disruption, sudden truth, liberating shock.", prompt: "What structure in your life is no longer worth defending?" },
  { n: 17, name: "The Star",            symbol: "★",  meaning: "Hope, healing, quiet faith returning.",       prompt: "What small light are you not letting yourself trust yet?" },
  { n: 18, name: "The Moon",            symbol: "☾",  meaning: "Illusion, dream, the deep unconscious.",      prompt: "What fear is dressed up as a fact today?" },
  { n: 19, name: "The Sun",             symbol: "☀",  meaning: "Joy, vitality, uncomplicated being.",         prompt: "What did you love before you learned to be afraid?" },
  { n: 20, name: "Judgement",           symbol: "◬",  meaning: "Awakening, calling, honest reckoning.",       prompt: "What is calling you that you've been pretending not to hear?" },
  { n: 21, name: "The World",           symbol: "⊕",  meaning: "Wholeness, completion, integration.",         prompt: "What chapter of your life is quietly closing well?" },
];

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────

// Real moon phase calculation (0=new, 0.5=full)
const getMoonPhase = (date = new Date()) => {
  const synodic = 29.53058867;
  const ref = new Date("2000-01-06T18:14:00Z").getTime();
  const days = (date.getTime() - ref) / 86400000;
  return ((days % synodic) + synodic) % synodic / synodic;
};

const getMoonPhaseName = (p) => {
  if (p < 0.03 || p > 0.97) return "New Moon";
  if (p < 0.22) return "Waxing Crescent";
  if (p < 0.28) return "First Quarter";
  if (p < 0.47) return "Waxing Gibbous";
  if (p < 0.53) return "Full Moon";
  if (p < 0.72) return "Waning Gibbous";
  if (p < 0.78) return "Last Quarter";
  return "Waning Crescent";
};

// Deterministic daily tarot card — same card all day, changes at midnight
const getDailyTarotCard = (date = new Date()) => {
  const seed = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  return TAROT_DECK[Math.abs(hash) % TAROT_DECK.length];
};

// Time-of-day gradient — black anchors so the nebula clouds pop on top
const getTimeGradient = (hour = new Date().getHours()) => {
  if (hour >= 5 && hour < 8)  return "linear-gradient(165deg, #1a0f24 0%, #08050f 40%, #000000 100%)"; // dawn
  if (hour >= 8 && hour < 17) return "linear-gradient(165deg, #14101e 0%, #060309 40%, #000000 100%)"; // day
  if (hour >= 17 && hour < 21) return "linear-gradient(165deg, #1f1428 0%, #0a050d 40%, #000000 100%)"; // dusk
  return "linear-gradient(165deg, #0a0612 0%, #050309 45%, #000000 100%)"; // night
};

// ─────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────

// Vibrate on supported devices
const useHaptic = () => useCallback((ms = 8) => {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ms);
}, []);

// Soft chime via Web Audio — used on screen transitions
const useChime = () => {
  const ctxRef = useRef(null);
  return useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      [880, 1318.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.05);
        osc.stop(ctx.currentTime + 1.5);
      });
    } catch (e) { /* silent */ }
  }, []);
};

// Ambient soundscape — slow drone with two sine pads, low-pass filtered
const useAmbient = () => {
  const ctxRef = useRef(null);
  const nodesRef = useRef([]);
  const [playing, setPlaying] = useState(false);

  const stop = useCallback(() => {
    nodesRef.current.forEach(n => { try { n.stop?.(); n.disconnect?.(); } catch {} });
    nodesRef.current = [];
    setPlaying(false);
  }, []);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 800;
      filter.Q.value = 1.5;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 1.5);
      filter.connect(masterGain).connect(ctx.destination);

      [110, 165, 220].forEach((freq) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        oscGain.gain.value = 0.3;
        // slow LFO modulation for movement
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.08 + Math.random() * 0.1;
        lfoGain.gain.value = 2;
        lfo.connect(lfoGain).connect(osc.frequency);
        lfo.start();
        osc.connect(oscGain).connect(filter);
        osc.start();
        nodesRef.current.push(osc, lfo, oscGain);
      });
      nodesRef.current.push(filter, masterGain);
      setPlaying(true);
    } catch (e) { /* silent */ }
  }, []);

  const toggle = useCallback(() => playing ? stop() : start(), [playing, start, stop]);
  useEffect(() => () => stop(), [stop]);
  return { playing, toggle };
};

// Track scroll position for parallax
const useScrollY = (ref) => {
  const [y, setY] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = () => setY(el.scrollTop);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, [ref]);
  return y;
};

// ─────────────────────────────────────────────────────────────
// LOGO
// ─────────────────────────────────────────────────────────────
const NovaraLogo = ({ size = 72 }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
    <defs>
      <linearGradient id="novara-bg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#D4CAE3" />
        <stop offset="100%" stopColor="#B8ACD0" />
      </linearGradient>
      <linearGradient id="novara-moon" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#F5F1EA" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="200" height="200" rx="44" ry="44" fill="url(#novara-bg)" />
    <mask id="novara-crescent">
      <rect width="200" height="200" fill="black" />
      <circle cx="78" cy="100" r="62" fill="white" />
      <circle cx="102" cy="92" r="58" fill="black" />
    </mask>
    <rect width="200" height="200" fill="url(#novara-moon)" mask="url(#novara-crescent)" />
    <text x="108" y="128" textAnchor="middle"
      fontFamily="'Cormorant Garamond', 'Times New Roman', serif"
      fontSize="92" fontWeight="500" fill="#F5F1EA"
      style={{ letterSpacing: "-0.02em" }}>N</text>
    <g transform="translate(155, 58)" fill="#F5E9C8" opacity="0.95">
      <path d="M 0,-14 L 2.5,-2.5 L 14,0 L 2.5,2.5 L 0,14 L -2.5,2.5 L -14,0 L -2.5,-2.5 Z" />
    </g>
    <circle cx="168" cy="78" r="2"   fill="#F5E9C8" opacity="0.8" />
    <circle cx="172" cy="88" r="1.5" fill="#F5E9C8" opacity="0.7" />
    <circle cx="166" cy="95" r="1.2" fill="#F5E9C8" opacity="0.6" />
    <circle cx="170" cy="104" r="1.8" fill="#F5E9C8" opacity="0.7" />
  </svg>
);

const GrainOverlay = () => (
  <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04, pointerEvents: "none", zIndex: 10 }}>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#grain)" />
  </svg>
);

// ─────────────────────────────────────────────────────────────
// SCENE BACKGROUND — black sky + crescent moon + sparkle + purple cloudbank
// Matches the reference: night sky transitioning to lavender clouds at bottom
// ─────────────────────────────────────────────────────────────
const SceneCrescentMoon = ({ size = 140 }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" style={{ animation: "moonFloat 8s ease-in-out infinite" }}>
    <defs>
      <radialGradient id="sceneMoonGlow" cx="50%" cy="50%">
        <stop offset="40%" stopColor="#fef3d8" stopOpacity="0.45" />
        <stop offset="70%" stopColor="#fef3d8" stopOpacity="0.12" />
        <stop offset="100%" stopColor="#fef3d8" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="sceneMoonBody" cx="35%" cy="40%">
        <stop offset="0%"  stopColor="#fffaee" />
        <stop offset="55%" stopColor="#f4e3bf" />
        <stop offset="100%" stopColor="#c9ab78" />
      </radialGradient>
      <mask id="sceneCrescentMask">
        <rect width="200" height="200" fill="black" />
        <circle cx="100" cy="100" r="68" fill="white" />
        <circle cx="125" cy="88" r="62" fill="black" />
      </mask>
    </defs>
    <circle cx="100" cy="100" r="100" fill="url(#sceneMoonGlow)" />
    <circle cx="100" cy="100" r="68" fill="url(#sceneMoonBody)" mask="url(#sceneCrescentMask)" />
    {/* Crater texture */}
    <g mask="url(#sceneCrescentMask)" opacity="0.18">
      <circle cx="78" cy="86"  r="5" fill="#9a8460" />
      <circle cx="62" cy="108" r="3.5" fill="#9a8460" />
      <circle cx="88" cy="125" r="4" fill="#9a8460" />
      <circle cx="72" cy="138" r="2.5" fill="#9a8460" />
      <circle cx="55" cy="92"  r="2" fill="#9a8460" />
    </g>
  </svg>
);

const SceneSparkle = ({ size = 80 }) => (
  <svg width={size} height={size} viewBox="-40 -40 80 80" style={{ animation: "sparkleTwinkle 3.5s ease-in-out infinite" }}>
    <defs>
      <radialGradient id="sparkleHalo">
        <stop offset="0%"   stopColor="#fff5d6" stopOpacity="0.9" />
        <stop offset="20%"  stopColor="#fff5d6" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#fff5d6" stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle r="38" fill="url(#sparkleHalo)" />
    {/* Big 4-point star */}
    <path d="M 0,-30 L 3.5,-3.5 L 30,0 L 3.5,3.5 L 0,30 L -3.5,3.5 L -30,0 L -3.5,-3.5 Z" fill="#fff5d6" opacity="0.85" />
    {/* Inner bright star */}
    <path d="M 0,-16 L 1.8,-1.8 L 16,0 L 1.8,1.8 L 0,16 L -1.8,1.8 L -16,0 L -1.8,-1.8 Z" fill="#ffffff" />
    {/* Cross rays */}
    <line x1="-36" y1="0" x2="36" y2="0" stroke="#fff5d6" strokeWidth="0.4" opacity="0.6" />
    <line x1="0" y1="-36" x2="0" y2="36" stroke="#fff5d6" strokeWidth="0.4" opacity="0.6" />
  </svg>
);

const SceneCloudBank = () => (
  <svg
    width="100%"
    viewBox="0 0 400 280"
    preserveAspectRatio="xMidYEnd slice"
    style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "45%" }}
  >
    <defs>
      {/* Soft pink-cream highlight gradient — top of clouds catches "moonlight" */}
      <radialGradient id="cloudTop" cx="50%" cy="15%" r="70%">
        <stop offset="0%"  stopColor="#f4cab8" stopOpacity="0.85" />
        <stop offset="35%" stopColor="#b890a8" stopOpacity="0.75" />
        <stop offset="75%" stopColor="#5a3a70" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#2a1a40" stopOpacity="0" />
      </radialGradient>
      {/* Deeper purple body */}
      <radialGradient id="cloudBody" cx="50%" cy="30%" r="80%">
        <stop offset="0%"  stopColor="#9070a0" stopOpacity="0.7" />
        <stop offset="50%" stopColor="#553870" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#2a1a40" stopOpacity="0" />
      </radialGradient>
      {/* Ambient purple haze rising up */}
      <linearGradient id="cloudHaze" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%"  stopColor="#5a3a70" stopOpacity="0.55" />
        <stop offset="50%" stopColor="#3d2a55" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#3d2a55" stopOpacity="0" />
      </linearGradient>
      <filter id="cloudSoftBlur">
        <feGaussianBlur stdDeviation="3.5" />
      </filter>
    </defs>

    {/* Ambient haze rising from the bottom */}
    <rect x="0" y="0" width="400" height="280" fill="url(#cloudHaze)" />

    {/* Deeper cloud body — back layer */}
    <g filter="url(#cloudSoftBlur)" fill="url(#cloudBody)">
      <ellipse cx="30"  cy="230" rx="100" ry="60" />
      <ellipse cx="110" cy="210" rx="85"  ry="55" />
      <ellipse cx="295" cy="215" rx="90"  ry="58" />
      <ellipse cx="370" cy="230" rx="85"  ry="60" />
    </g>

    {/* Highlighted top layer — left cluster */}
    <g filter="url(#cloudSoftBlur)" fill="url(#cloudTop)">
      <ellipse cx="35"  cy="245" rx="75" ry="48" />
      <ellipse cx="95"  cy="220" rx="65" ry="42" />
      <ellipse cx="155" cy="240" rx="55" ry="35" />
      <ellipse cx="195" cy="260" rx="38" ry="22" />
    </g>

    {/* Highlighted top layer — right cluster */}
    <g filter="url(#cloudSoftBlur)" fill="url(#cloudTop)">
      <ellipse cx="240" cy="255" rx="42" ry="24" />
      <ellipse cx="285" cy="225" rx="65" ry="42" />
      <ellipse cx="340" cy="210" rx="72" ry="48" />
      <ellipse cx="385" cy="240" rx="60" ry="38" />
    </g>

    {/* Bright peach edge highlights — tops of forward clouds */}
    <g opacity="0.75" filter="url(#cloudSoftBlur)">
      <ellipse cx="100" cy="200" rx="38" ry="14" fill="#f5d2c0" opacity="0.4" />
      <ellipse cx="345" cy="190" rx="42" ry="15" fill="#f5d2c0" opacity="0.4" />
    </g>
  </svg>
);

const SceneBackground = () => (
  <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
    {/* Sky gradient — black top, deep purple middle, lavender bottom */}
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(180deg, #000000 0%, #050309 10%, #0a0518 22%, #160a28 36%, #2a1645 52%, #432565 66%, #6a4385 80%, #9c6e92 92%, #c89aa6 100%)",
    }} />

    {/* Crescent moon — top center */}
    <div style={{
      position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)",
      filter: "drop-shadow(0 0 40px rgba(254,243,216,0.35))",
    }}>
      <SceneCrescentMoon size={140} />
    </div>

    {/* Central sparkle — between moon and clouds */}
    <div style={{
      position: "absolute", top: "52%", left: "50%", transform: "translate(-50%, -50%)",
      filter: "drop-shadow(0 0 30px rgba(255,245,214,0.6))",
    }}>
      <SceneSparkle size={70} />
    </div>

    {/* Purple-pink cloudbank at the bottom */}
    <SceneCloudBank />
  </div>
);

// ─────────────────────────────────────────────────────────────
// PARALLAX STAR FIELD — three layers scrolling at different speeds
// ─────────────────────────────────────────────────────────────
const StarField = ({ scrollY = 0 }) => {
  const layersRef = useRef(null);
  if (!layersRef.current) {
    layersRef.current = [
      { stars: Array.from({ length: 30 }, () => ({ x: Math.random() * 100, y: Math.random() * 100, r: Math.random() * 0.8 + 0.3, o: 0.15 + Math.random() * 0.25, delay: Math.random() * 3 })), speed: 0.15 },
      { stars: Array.from({ length: 25 }, () => ({ x: Math.random() * 100, y: Math.random() * 100, r: Math.random() * 1   + 0.5, o: 0.25 + Math.random() * 0.3,  delay: Math.random() * 3 })), speed: 0.35 },
      { stars: Array.from({ length: 15 }, () => ({ x: Math.random() * 100, y: Math.random() * 100, r: Math.random() * 1.4 + 0.7, o: 0.4  + Math.random() * 0.3,  delay: Math.random() * 3 })), speed: 0.6  },
    ];
  }
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {layersRef.current.map((layer, li) => (
        <svg key={li} style={{
          position: "absolute", inset: 0, width: "100%", height: "120%",
          transform: `translateY(${-scrollY * layer.speed}px)`,
          willChange: "transform",
        }}>
          {layer.stars.map((s, i) => (
            <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill={COLORS.gold} opacity={s.o}
              style={{ animation: `twinkle ${2 + s.delay}s ease-in-out infinite alternate`, animationDelay: `${s.delay}s` }} />
          ))}
        </svg>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// REAL MOON PHASE — accurate phase from today's date
// ─────────────────────────────────────────────────────────────
const RealMoonPhase = ({ size = 64, phase = null, glow = true }) => {
  const p = phase ?? getMoonPhase();
  const r = size / 2 - 2;
  const cx = size / 2, cy = size / 2;
  // shadow offset: at phase 0 (new) shadow covers everything; at 0.5 (full) no shadow; at 0.75 (last quarter) shadow on right half
  const illumination = 1 - Math.abs(Math.cos(p * Math.PI * 2));
  const waxing = p < 0.5;
  const shadowOffset = waxing ? -2 * r * (1 - illumination) : 2 * r * (1 - illumination);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id={`moonGlow-${size}`} cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor={COLORS.moonBeige} stopOpacity="0.3" />
          <stop offset="100%" stopColor={COLORS.moonBeige} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`moonBody-${size}`} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor={COLORS.moonBeige} />
        </radialGradient>
        <mask id={`phaseMask-${size}`}>
          <rect width={size} height={size} fill="white" />
          <circle cx={cx + shadowOffset} cy={cy} r={r} fill="black" />
        </mask>
      </defs>
      {glow && <circle cx={cx} cy={cy} r={r * 1.4} fill={`url(#moonGlow-${size})`} />}
      <circle cx={cx} cy={cy} r={r} fill="#1a1628" opacity="0.95" />
      <circle cx={cx} cy={cy} r={r} fill={`url(#moonBody-${size})`} mask={`url(#phaseMask-${size})`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={COLORS.gold} strokeWidth="0.5" opacity="0.3" />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// ANIMATED NATAL CHART — planets drift, aspect lines breathe
// ─────────────────────────────────────────────────────────────
const NatalChart = ({ size = 200 }) => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let raf;
    const loop = () => { setTick(t => t + 0.002); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const basePlanets = [
    { name: "☀", angle: 45,  r: 0.65, color: COLORS.gold,      drift: 0.6 },
    { name: "☽", angle: 120, r: 0.72, color: COLORS.lavender,  drift: 1.2 },
    { name: "↑", angle: 180, r: 0.58, color: COLORS.mutedRose, drift: 0.4 },
    { name: "♀", angle: 290, r: 0.68, color: COLORS.softGreen, drift: 0.9 },
    { name: "♂", angle: 230, r: 0.75, color: COLORS.mutedRose, drift: 0.7 },
    { name: "♃", angle: 330, r: 0.62, color: COLORS.gold,      drift: 1.1 },
    { name: "♄", angle: 70,  r: 0.78, color: COLORS.lavender,  drift: 0.5 },
  ];

  const planets = basePlanets.map(p => ({
    ...p,
    currentAngle: p.angle + Math.sin(tick * p.drift) * 4,
    pulse: 0.85 + Math.sin(tick * 2 + p.angle) * 0.15,
  }));

  const cx = size / 2, cy = size / 2;
  const maxR = size * 0.42;

  // Aspect lines between key planets
  const aspects = [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5]];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[1, 0.82, 0.64, 0.46].map((scale, i) => (
        <circle key={i} cx={cx} cy={cy} r={maxR * scale}
          fill="none" stroke={COLORS.gold} strokeWidth="0.5" opacity={0.2 + i * 0.05} />
      ))}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 - 90) * Math.PI / 180;
        return (
          <line key={i}
            x1={cx + maxR * 0.46 * Math.cos(a)} y1={cy + maxR * 0.46 * Math.sin(a)}
            x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)}
            stroke={COLORS.gold} strokeWidth="0.5" opacity="0.15" />
        );
      })}
      {/* Animated aspect lines */}
      {aspects.map(([a, b], i) => {
        const pa = planets[a], pb = planets[b];
        const aa = (pa.currentAngle - 90) * Math.PI / 180;
        const ab = (pb.currentAngle - 90) * Math.PI / 180;
        const opacity = 0.15 + Math.sin(tick * 0.8 + i) * 0.1;
        return (
          <line key={`aspect-${i}`}
            x1={cx + maxR * pa.r * Math.cos(aa)} y1={cy + maxR * pa.r * Math.sin(aa)}
            x2={cx + maxR * pb.r * Math.cos(ab)} y2={cy + maxR * pb.r * Math.sin(ab)}
            stroke={COLORS.lavender} strokeWidth="0.6" opacity={opacity} strokeDasharray="2 3" />
        );
      })}
      {planets.map((p, i) => {
        const a = (p.currentAngle - 90) * Math.PI / 180;
        const x = cx + maxR * p.r * Math.cos(a);
        const y = cy + maxR * p.r * Math.sin(a);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={10 * p.pulse} fill={p.color} opacity="0.18" />
            <circle cx={x} cy={y} r={3 * p.pulse} fill={p.color} opacity="0.5" />
            <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
              fontSize="10" fill={p.color} opacity="0.95">{p.name}</text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r="4" fill={COLORS.gold} opacity="0.5" />
      <circle cx={cx} cy={cy} r="8" fill="none" stroke={COLORS.gold} strokeWidth="0.5" opacity={0.2 + Math.sin(tick * 1.5) * 0.15} />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// TAROT CARD — flip-to-reveal with swipe / tap
// ─────────────────────────────────────────────────────────────
const TarotCard = ({ card, revealed, onReveal, size = 240 }) => {
  const [dragY, setDragY] = useState(0);
  const startY = useRef(null);

  const onTouchStart = (e) => { startY.current = e.touches[0].clientY; };
  const onTouchMove = (e) => {
    if (startY.current == null) return;
    const dy = startY.current - e.touches[0].clientY;
    if (dy > 0) setDragY(Math.min(dy, 80));
  };
  const onTouchEnd = () => {
    if (dragY > 40) onReveal();
    setDragY(0);
    startY.current = null;
  };

  return (
    <div
      onClick={revealed ? undefined : onReveal}
      onTouchStart={revealed ? undefined : onTouchStart}
      onTouchMove={revealed ? undefined : onTouchMove}
      onTouchEnd={revealed ? undefined : onTouchEnd}
      style={{
        width: size, height: size * 1.5,
        perspective: 1200, cursor: revealed ? "default" : "pointer",
        transform: `translateY(${-dragY * 0.5}px)`,
        transition: dragY === 0 ? "transform 0.3s ease" : "none",
      }}
    >
      <div style={{
        position: "relative", width: "100%", height: "100%",
        transformStyle: "preserve-3d",
        transform: revealed ? "rotateY(180deg)" : "rotateY(0)",
        transition: "transform 1.2s cubic-bezier(0.4, 0.0, 0.2, 1)",
      }}>
        {/* CARD BACK */}
        <div style={{
          position: "absolute", inset: 0, backfaceVisibility: "hidden",
          background: `linear-gradient(160deg, #2a1f3d 0%, #1a1428 100%)`,
          borderRadius: 16, border: `1.5px solid ${COLORS.gold}`,
          padding: 16, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 12,
          boxShadow: `0 12px 40px rgba(0,0,0,0.5), inset 0 0 24px rgba(214,194,161,0.08)`,
        }}>
          <div style={{
            position: "absolute", inset: 8, border: `0.5px solid ${COLORS.gold}55`,
            borderRadius: 12, pointerEvents: "none",
          }} />
          {/* Stars cluster */}
          <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.4 }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <circle key={i} cx={`${Math.random() * 100}%`} cy={`${Math.random() * 100}%`}
                r={Math.random() * 1.2 + 0.3} fill={COLORS.gold} opacity={0.3 + Math.random() * 0.5} />
            ))}
          </svg>
          {/* Central monogram */}
          <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
            <div style={{ marginBottom: 12, animation: "float 4s ease-in-out infinite" }}>
              <NovaraLogo size={64} />
            </div>
            <div style={{
              fontFamily: FONTS.serif, fontSize: 18, color: COLORS.gold,
              letterSpacing: "0.3em", marginTop: 12,
            }}>NOVARA</div>
            <div style={{
              fontFamily: FONTS.sans, fontSize: 10, color: COLORS.moonBeige,
              opacity: 0.5, letterSpacing: "0.2em", marginTop: 4,
            }}>MAJOR ARCANA</div>
          </div>
        </div>

        {/* CARD FRONT */}
        <div style={{
          position: "absolute", inset: 0, backfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          background: `linear-gradient(160deg, #F5F1EA 0%, #E8DDD0 100%)`,
          borderRadius: 16, border: `1.5px solid ${COLORS.gold}`,
          padding: 20, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "space-between",
          boxShadow: `0 12px 40px rgba(0,0,0,0.5), inset 0 0 24px rgba(214,194,161,0.2)`,
        }}>
          <div style={{
            position: "absolute", inset: 10, border: `0.5px solid ${COLORS.gold}77`,
            borderRadius: 12, pointerEvents: "none",
          }} />
          {/* Roman numeral top */}
          <div style={{
            fontFamily: FONTS.serif, fontSize: 16, color: COLORS.deepPurple,
            opacity: 0.7, letterSpacing: "0.2em",
          }}>{toRoman(card.n)}</div>
          {/* Central symbol */}
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: 88, color: COLORS.deepPurple, lineHeight: 1,
              marginBottom: 12, textShadow: `0 4px 12px rgba(61,53,83,0.2)`,
            }}>{card.symbol}</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: COLORS.gold }}>✦</span>
              <span style={{ fontSize: 12, color: COLORS.gold }}>✦</span>
              <span style={{ fontSize: 12, color: COLORS.gold }}>✦</span>
            </div>
          </div>
          {/* Card name */}
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: FONTS.serif, fontSize: 22, color: COLORS.deepPurple,
              fontWeight: 500, letterSpacing: "0.04em",
            }}>{card.name}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const toRoman = (num) => {
  const map = [["X",10],["IX",9],["V",5],["IV",4],["I",1]];
  if (num === 0) return "0";
  let r = "", n = num;
  for (const [s, v] of map) { while (n >= v) { r += s; n -= v; } }
  return r;
};

// ─────────────────────────────────────────────────────────────
// AMBIENT TOGGLE — floating sound switch
// ─────────────────────────────────────────────────────────────
const AmbientToggle = ({ playing, onToggle }) => (
  <button onClick={onToggle} style={{
    position: "fixed", top: 16, right: 16, zIndex: 200,
    width: 40, height: 40, borderRadius: "50%",
    background: playing ? `rgba(214,194,161,0.2)` : "rgba(255,255,255,0.06)",
    border: playing ? `1px solid ${COLORS.gold}` : `1px solid rgba(214,194,161,0.2)`,
    backdropFilter: "blur(12px)", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: playing ? COLORS.gold : COLORS.moonBeige,
    fontSize: 16, transition: "all 0.3s ease",
  }} title={playing ? "Ambient on" : "Ambient off"}>
    {playing ? "♪" : "♩"}
  </button>
);

// ─────────────────────────────────────────────────────────────
// SCREENS
// ─────────────────────────────────────────────────────────────

const OnboardingScreen = ({ onNext }) => {
  const [step, setStep] = useState(0);
  const [dob, setDob] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const haptic = useHaptic();

  const steps = [
    { title: "A softer way to understand yourself.", subtitle: "Novara weaves astrology, lunar rhythms, and AI reflection into your daily emotional landscape.", action: "Begin your journey" },
    { title: "When were you born?", subtitle: "Your birth moment is the map from which everything unfolds.", action: "Continue" },
    { title: "Where did you arrive?", subtitle: "The stars look different from every corner of the world.", action: "Generate my chart" },
  ];

  const handleNext = () => { haptic(12); step < steps.length - 1 ? setStep(s => s + 1) : onNext(); };

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(170deg, #1a1628 0%, #2B2535 40%, #1e1a2e 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "60px 28px", position: "relative", overflow: "hidden",
    }}>
      <GrainOverlay />
      <div style={{ textAlign: "center", zIndex: 1, marginBottom: 34, animation: "fadeIn 0.6s ease" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.35em", color: COLORS.gold, opacity: 0.75, marginBottom: 14, fontFamily: FONTS.sans, textTransform: "uppercase", fontWeight: 500 }}>NOVARA</div>
        <div style={{ animation: "float 4s ease-in-out infinite", display: "inline-block", filter: "drop-shadow(0 8px 24px rgba(200,190,219,0.25))" }}>
          <NovaraLogo size={72} />
        </div>
      </div>
      <div style={{ textAlign: "center", zIndex: 1, width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 18 }}>
        <h1 style={{ fontFamily: FONTS.serif, fontSize: 31, fontWeight: 400, color: COLORS.ivory, lineHeight: 1.24, margin: 0, letterSpacing: "-0.02em", animation: "fadeSlideUp 0.7s ease" }}>{steps[step].title}</h1>
        <p style={{ fontFamily: FONTS.sans, fontSize: 15, color: COLORS.moonBeige, opacity: 0.78, lineHeight: 1.7, margin: 0, animation: "fadeSlideUp 0.7s ease" }}>{steps[step].subtitle}</p>
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={inputStyle} />
            <input type="time" value={birthTime} onChange={e => setBirthTime(e.target.value)} style={inputStyle} />
          </div>
        )}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            <input value={birthPlace} onChange={e => setBirthPlace(e.target.value)} style={inputStyle} placeholder="City of birth" />
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 12 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 22 : 6, height: 6, borderRadius: 999,
              background: i === step ? COLORS.gold : COLORS.moonBeige,
              opacity: i === step ? 1 : 0.28, transition: "all 0.3s ease",
            }} />
          ))}
        </div>
        <button onClick={handleNext} style={{
          ...primaryBtnStyle, marginTop: 16, width: "100%", height: 58,
          borderRadius: 20, fontSize: 16, fontWeight: 600,
          boxShadow: "0 12px 32px rgba(214,194,161,0.16)",
        }}>{steps[step].action}</button>
      </div>
    </div>
  );
};

const inputStyle = {
  background: "rgba(255,255,255,0.07)", border: `1px solid rgba(214,194,161,0.25)`,
  borderRadius: 12, padding: "14px 16px", color: COLORS.ivory, fontSize: 15,
  fontFamily: FONTS.sans, outline: "none", width: "100%", boxSizing: "border-box",
  backdropFilter: "blur(8px)",
};

const primaryBtnStyle = {
  background: `linear-gradient(135deg, ${COLORS.gold} 0%, #c4a882 100%)`,
  border: "none", borderRadius: 16, padding: "16px 24px",
  color: COLORS.charcoal, fontSize: 15, fontWeight: 600, fontFamily: FONTS.sans,
  cursor: "pointer", width: "100%", letterSpacing: "0.02em",
};

const HomeScreen = ({ onNavigate, gradient }) => {
  const moods = ["Reflective", "Tender", "Expansive", "Grounded"];
  const [selectedMood, setSelectedMood] = useState(null);
  const haptic = useHaptic();
  const [time] = useState(() => {
    const h = new Date().getHours();
    if (h < 6) return "night";
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    return "evening";
  });
  const dailyCard = getDailyTarotCard();
  const moonPhase = getMoonPhase();
  const moonName = getMoonPhaseName(moonPhase);

  const greetings = { morning: "Good morning,", afternoon: "Good afternoon,", evening: "Good evening,", night: "The night holds you," };

  const insights = [
    { icon: "☀", label: "Solar Energy", value: "Reflective", color: COLORS.gold, desc: "Your thoughts today carry weight. Pause before speaking." },
    { icon: "☽", label: "Moon in Pisces", value: "Dreamy", color: COLORS.lavender, desc: "Boundaries feel soft. Protect your emotional space." },
    { icon: "↑", label: "Rising Influence", value: "Gentle", color: COLORS.mutedRose, desc: "Others see your warmth before your strength today." },
  ];

  const onMood = (m) => { haptic(8); setSelectedMood(m); };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <GrainOverlay />

      <div style={{ position: "relative", zIndex: 1, padding: "52px 24px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <NovaraLogo size={36} />
            <div>
              <p style={{ fontFamily: FONTS.sans, fontSize: 13, color: COLORS.moonBeige, opacity: 0.65, margin: "0 0 4px", letterSpacing: "0.05em" }}>{greetings[time]}</p>
              <h2 style={{ fontFamily: FONTS.serif, fontSize: 26, color: COLORS.ivory, margin: 0, fontWeight: 400 }}>Luna</h2>
            </div>
          </div>
          <button onClick={() => onNavigate("profile")} style={{
            width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.1)",
            border: `1px solid rgba(214,194,161,0.25)`, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: FONTS.sans, fontSize: 16, color: COLORS.ivory,
          }}>L</button>
        </div>

        {/* Cosmic Weather */}
        <div style={{
          background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)",
          border: `1px solid rgba(214,194,161,0.2)`, borderRadius: 20, padding: 20, marginBottom: 16,
          boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, flexShrink: 0 }}>
              <RealMoonPhase size={28} phase={moonPhase} glow={false} />
            </div>
            <span style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.gold, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600, opacity: 0.9 }}>Today's Cosmic Weather</span>
          </div>
          <p style={{
            fontFamily: FONTS.serif, fontSize: 17, color: COLORS.ivory, lineHeight: 1.75,
            margin: "0 0 14px", fontWeight: 400, borderLeft: `2px solid ${COLORS.gold}`,
            paddingLeft: 14, opacity: 0.95,
          }}>"The {moonName.toLowerCase()} in Pisces softens your edges today. Let beauty in, not noise."</p>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: "Relationships", color: COLORS.mutedRose },
              { label: "Rest", color: COLORS.lavender },
              { label: "Creativity", color: COLORS.gold },
            ].map(tag => (
              <span key={tag.label} style={{
                fontFamily: FONTS.sans, fontSize: 11, fontWeight: 500, color: tag.color,
                background: tag.color + "18", border: `1px solid ${tag.color}50`,
                borderRadius: 20, padding: "5px 12px", letterSpacing: "0.03em",
              }}>{tag.label}</span>
            ))}
          </div>
        </div>

        {/* Daily Card preview — links to tarot screen */}
        <button onClick={() => onNavigate("tarot")} style={{
          width: "100%", textAlign: "left", cursor: "pointer",
          background: `linear-gradient(135deg, rgba(200,190,219,0.12), rgba(214,194,161,0.08))`,
          backdropFilter: "blur(20px)", border: `1px solid rgba(214,194,161,0.25)`,
          borderRadius: 20, padding: 16, marginBottom: 20,
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{
            width: 52, height: 78, borderRadius: 8,
            background: `linear-gradient(160deg, #2a1f3d, #1a1428)`,
            border: `1px solid ${COLORS.gold}66`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: COLORS.gold, fontSize: 22, flexShrink: 0,
          }}>✦</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONTS.sans, fontSize: 10, color: COLORS.gold, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600, marginBottom: 4, opacity: 0.85 }}>Daily Card</div>
            <div style={{ fontFamily: FONTS.serif, fontSize: 16, color: COLORS.ivory, fontWeight: 400 }}>Tap to draw your card</div>
            <div style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.moonBeige, opacity: 0.55, marginTop: 2 }}>Refreshes at midnight</div>
          </div>
          <span style={{ color: COLORS.gold, fontSize: 18 }}>→</span>
        </button>
      </div>

      <div style={{ position: "relative", zIndex: 1, padding: "0 24px", flex: 1 }}>
        <p style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.gold, opacity: 0.7, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12, fontWeight: 500 }}>How are you feeling?</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
          {moods.map(m => (
            <button key={m} onClick={() => onMood(m)} style={{
              fontFamily: FONTS.sans, fontSize: 12, padding: "8px 16px", borderRadius: 20,
              border: selectedMood === m ? `1.5px solid ${COLORS.gold}` : `1px solid rgba(214,194,161,0.2)`,
              background: selectedMood === m ? `rgba(214,194,161,0.15)` : "rgba(255,255,255,0.04)",
              color: selectedMood === m ? COLORS.gold : COLORS.moonBeige,
              opacity: selectedMood === m ? 1 : 0.6, cursor: "pointer",
              transition: "all 0.2s ease", fontWeight: 500,
            }}>{m}</button>
          ))}
        </div>

        <p style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.gold, opacity: 0.7, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12, fontWeight: 500 }}>Planetary Insights</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {insights.map((ins, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.05)", borderRadius: 16, padding: "14px 16px",
              border: `1px solid rgba(255,255,255,0.08)`, display: "flex", gap: 14, alignItems: "flex-start",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%", background: ins.color + "20",
                border: `1px solid ${ins.color}40`, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 16, flexShrink: 0,
              }}>{ins.icon}</div>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.ivory, fontWeight: 600 }}>{ins.label}</span>
                  <span style={{ fontFamily: FONTS.sans, fontSize: 10, color: ins.color, padding: "2px 8px", borderRadius: 10, background: ins.color + "18", fontWeight: 500 }}>{ins.value}</span>
                </div>
                <p style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.moonBeige, opacity: 0.65, margin: 0, lineHeight: 1.55 }}>{ins.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => onNavigate("chat")} style={{
          width: "100%", background: `linear-gradient(135deg, ${COLORS.gold} 0%, #c4a882 100%)`,
          border: "none", borderRadius: 16, padding: "16px 24px", color: "#1a1628",
          fontFamily: FONTS.sans, fontSize: 14, fontWeight: 600, cursor: "pointer",
          letterSpacing: "0.03em", marginBottom: 24,
        }}>✦ Ask Novara anything</button>
      </div>
    </div>
  );
};

const ChartScreen = () => {
  const placements = [
    { planet: "Sun",     sign: "Scorpio", house: "8th",  symbol: "☀", color: COLORS.gold },
    { planet: "Moon",    sign: "Pisces",  house: "12th", symbol: "☽", color: COLORS.lavender },
    { planet: "Rising",  sign: "Libra",   house: "1st",  symbol: "↑", color: COLORS.mutedRose },
    { planet: "Venus",   sign: "Virgo",   house: "6th",  symbol: "♀", color: COLORS.softGreen },
    { planet: "Mars",    sign: "Gemini",  house: "3rd",  symbol: "♂", color: COLORS.mutedRose },
    { planet: "Mercury", sign: "Scorpio", house: "8th",  symbol: "☿", color: COLORS.lavender },
  ];

  return (
    <div style={{ minHeight: "100vh", padding: "52px 24px 90px", position: "relative" }}>
      <GrainOverlay />
      <div style={{ position: "relative", zIndex: 1 }}>
        <h2 style={{ fontFamily: FONTS.serif, fontSize: 28, color: COLORS.ivory, margin: "0 0 4px", fontWeight: 400 }}>Your Natal Chart</h2>
        <p style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.moonBeige, opacity: 0.5, margin: "0 0 28px", letterSpacing: "0.04em" }}>Born Nov 12 · 3:45 AM · Mumbai, India</p>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <div style={{
            width: 220, height: 220, borderRadius: "50%",
            background: `radial-gradient(circle, #2a1f3d 0%, #1e1a2e 60%, #12101e 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `1px solid rgba(214,194,161,0.15)`,
            boxShadow: `0 0 60px rgba(200,190,219,0.1)`,
          }}>
            <NatalChart size={200} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
          {[
            { label: "Sun", value: "Scorpio", color: COLORS.gold },
            { label: "Moon", value: "Pisces", color: COLORS.lavender },
            { label: "Rising", value: "Libra", color: COLORS.mutedRose },
          ].map(item => (
            <div key={item.label} style={{
              flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: "12px 14px",
              border: `1px solid rgba(255,255,255,0.08)`, textAlign: "center",
            }}>
              <div style={{ fontFamily: FONTS.sans, fontSize: 10, color: item.color, opacity: 0.8, marginBottom: 5, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 500 }}>{item.label}</div>
              <div style={{ fontFamily: FONTS.serif, fontSize: 17, color: COLORS.ivory, fontWeight: 400 }}>{item.value}</div>
            </div>
          ))}
        </div>

        <p style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.gold, opacity: 0.7, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12, fontWeight: 500 }}>Full Placements</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {placements.map((p, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.04)", padding: "13px 16px", borderRadius: 12,
              border: `1px solid rgba(255,255,255,0.06)`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 16, width: 24, textAlign: "center", color: p.color }}>{p.symbol}</span>
                <span style={{ fontFamily: FONTS.sans, fontSize: 13, color: COLORS.moonBeige, opacity: 0.75 }}>{p.planet}</span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontFamily: FONTS.serif, fontSize: 15, color: COLORS.ivory }}>{p.sign}</span>
                <span style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.gold, opacity: 0.45 }}>{p.house}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// TAROT SCREEN
// ─────────────────────────────────────────────────────────────
const TarotScreen = ({ onReflect }) => {
  const [revealed, setRevealed] = useState(false);
  const card = getDailyTarotCard();
  const haptic = useHaptic();
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const onReveal = () => {
    haptic(20);
    setRevealed(true);
  };

  return (
    <div style={{ minHeight: "100vh", padding: "52px 24px 90px", position: "relative" }}>
      <GrainOverlay />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.gold, letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 6px", opacity: 0.7, fontWeight: 500 }}>Daily Card</p>
          <h2 style={{ fontFamily: FONTS.serif, fontSize: 28, color: COLORS.ivory, margin: 0, fontWeight: 400 }}>Draw for {today.split(",")[0]}</h2>
          <p style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.moonBeige, opacity: 0.5, margin: "6px 0 0", letterSpacing: "0.04em" }}>{today}</p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <TarotCard card={card} revealed={revealed} onReveal={onReveal} size={220} />
        </div>

        {!revealed && (
          <div style={{ textAlign: "center", animation: "pulse 2.5s ease-in-out infinite" }}>
            <p style={{ fontFamily: FONTS.serif, fontStyle: "italic", fontSize: 15, color: COLORS.lavender, opacity: 0.85, margin: 0 }}>Tap the card or swipe up to reveal</p>
            <div style={{ marginTop: 8, color: COLORS.gold, fontSize: 16, opacity: 0.6 }}>↑</div>
          </div>
        )}

        {revealed && (
          <div style={{ animation: "fadeSlideUp 0.8s ease 0.6s both" }}>
            <div style={{
              background: "rgba(255,255,255,0.05)", borderRadius: 18, padding: 20,
              border: `1px solid rgba(214,194,161,0.18)`, marginBottom: 14,
            }}>
              <div style={{ fontFamily: FONTS.sans, fontSize: 10, color: COLORS.gold, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, marginBottom: 6, opacity: 0.8 }}>Meaning</div>
              <p style={{ fontFamily: FONTS.serif, fontSize: 17, color: COLORS.ivory, margin: 0, lineHeight: 1.55, fontWeight: 400 }}>{card.meaning}</p>
            </div>
            <div style={{
              background: `linear-gradient(135deg, rgba(200,190,219,0.12), rgba(214,194,161,0.06))`,
              borderRadius: 18, padding: 20,
              border: `1px solid rgba(200,190,219,0.22)`, marginBottom: 20,
            }}>
              <div style={{ fontFamily: FONTS.sans, fontSize: 10, color: COLORS.lavender, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, marginBottom: 6, opacity: 0.85 }}>Reflection</div>
              <p style={{ fontFamily: FONTS.serif, fontStyle: "italic", fontSize: 18, color: COLORS.ivory, margin: 0, lineHeight: 1.6, fontWeight: 400, borderLeft: `2px solid ${COLORS.lavender}`, paddingLeft: 14 }}>"{card.prompt}"</p>
            </div>
            <button onClick={() => onReflect(card)} style={{
              width: "100%", background: `linear-gradient(135deg, ${COLORS.gold} 0%, #c4a882 100%)`,
              border: "none", borderRadius: 16, padding: "16px 24px", color: "#1a1628",
              fontFamily: FONTS.sans, fontSize: 14, fontWeight: 600, cursor: "pointer",
              letterSpacing: "0.03em",
            }}>✦ Reflect with Novara</button>
          </div>
        )}
      </div>
    </div>
  );
};

const ChatScreen = ({ seed }) => {
  const [messages, setMessages] = useState(() => seed ? [
    { role: "assistant", text: `You drew ${seed.name} today. ${seed.meaning} A question to sit with: "${seed.prompt}"` }
  ] : [
    { role: "assistant", text: "I'm here with you. With your Sun in Scorpio and Moon in Pisces, your emotional world runs very deep. What's on your mind today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const haptic = useHaptic();

  const suggestions = ["Why do I feel so emotional today?", "What energy surrounds me?", "How should I approach this relationship?"];

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText) return;
    haptic(8);
    setInput("");
    setMessages(m => [...m, { role: "user", text: userText }]);
    setLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: `You are Novara, a soft, emotionally intelligent AI wellness companion deeply rooted in astrology. The user has Sun in Scorpio, Moon in Pisces, and Libra Rising.
Your voice is:
- Poetic but not purple
- Warm but not saccharine
- Grounded in astrological symbolism
- Psychologically aware and gentle
- Brief and impactful (2-4 sentences max)
Weave astrological insight with emotional reflection. Reference their chart placements naturally. Never be clinical, never be cheesy. Speak as if you hold ancient wisdom in a modern heart.`,
          messages: apiMessages,
        }),
      });
      const data = await response.json();
      const reply = data.reply || "The stars are quiet for a moment. Take a breath.";
      setMessages(m => [...m, { role: "assistant", text: "Something in the cosmos paused our connection. Try again in a moment." }]);
    }
    setLoading(false);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>
      <div style={{ padding: "52px 24px 16px", background: `linear-gradient(160deg, #2a1f3d 0%, #1e1a2e 100%)`, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ animation: "float 4s ease-in-out infinite" }}><NovaraLogo size={36} /></div>
          <div>
            <h2 style={{ fontFamily: FONTS.serif, fontSize: 22, color: COLORS.ivory, margin: 0, fontWeight: 400 }}>Reflect with Novara</h2>
            <p style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.moonBeige, opacity: 0.55, margin: 0 }}>Powered by your natal chart</p>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: "16px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, position: "relative", zIndex: 1 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", animation: "fadeSlideUp 0.4s ease", animationFillMode: "both" }}>
            <div style={{
              maxWidth: "82%", padding: "12px 16px",
              borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: msg.role === "user" ? `linear-gradient(135deg, ${COLORS.gold}, #c4a882)` : "rgba(255,255,255,0.07)",
              border: msg.role === "assistant" ? `1px solid rgba(255,255,255,0.1)` : "none",
              backdropFilter: msg.role === "assistant" ? "blur(10px)" : "none",
            }}>
              <p style={{
                fontFamily: msg.role === "assistant" ? FONTS.serif : FONTS.sans,
                fontSize: msg.role === "assistant" ? 16 : 14,
                lineHeight: 1.65, color: msg.role === "user" ? "#1a1628" : COLORS.ivory,
                margin: 0, fontWeight: msg.role === "user" ? 500 : 400,
              }}>{msg.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 4, padding: "12px 16px", background: "rgba(255,255,255,0.07)", borderRadius: 18, width: 64, border: `1px solid rgba(255,255,255,0.1)` }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: "50%", background: COLORS.lavender,
                animation: `twinkle 1s ease-in-out infinite alternate`, animationDelay: `${i * 0.2}s`,
              }} />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length === 1 && !seed && (
        <div style={{ padding: "0 24px 12px", display: "flex", flexDirection: "column", gap: 8, position: "relative", zIndex: 1 }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => sendMessage(s)} style={{
              background: "rgba(200,190,219,0.08)", border: `1px solid rgba(200,190,219,0.2)`,
              borderRadius: 12, padding: "10px 14px", textAlign: "left",
              fontFamily: FONTS.sans, fontSize: 13, color: COLORS.lavender,
              cursor: "pointer", fontWeight: 400,
            }}>{s}</button>
          ))}
        </div>
      )}

      <div style={{ padding: "12px 24px 24px", borderTop: `1px solid rgba(255,255,255,0.07)`, background: "rgba(18,16,30,0.95)", backdropFilter: "blur(20px)", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="Ask anything..."
            style={{
              flex: 1, background: "rgba(255,255,255,0.07)", border: `1px solid rgba(255,255,255,0.1)`,
              borderRadius: 14, padding: "12px 16px", fontFamily: FONTS.sans, fontSize: 14,
              color: COLORS.ivory, outline: "none",
            }}
          />
          <button onClick={() => sendMessage()} style={{
            width: 44, height: 44, borderRadius: "50%",
            background: `linear-gradient(135deg, ${COLORS.gold}, #c4a882)`, border: "none",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, color: "#1a1628", flexShrink: 0, fontWeight: 700,
          }}>↑</button>
        </div>
      </div>
    </div>
  );
};

const MoonScreen = () => {
  const phase = getMoonPhase();
  const phaseName = getMoonPhaseName(phase);
  const illumPct = Math.round((1 - Math.abs(Math.cos(phase * Math.PI * 2))) * 100);
  const emotions = ["Tender", "Expansive", "Grounded", "Restless", "Clear", "Heavy"];
  const [tracked, setTracked] = useState({});
  const haptic = useHaptic();

  const phases = [
    { name: "New Moon", date: "May 26", desc: "Set intentions. Begin in silence." },
    { name: "Waxing Crescent", date: "Jun 1", desc: "Nurture what you've seeded." },
    { name: "First Quarter", date: "Jun 3", desc: "Take decisive action." },
    { name: "Waxing Gibbous", date: "Jun 8", desc: "Refine and adjust." },
    { name: "Full Moon", date: "Jun 11", desc: "Release, illuminate, celebrate." },
    { name: "Waning Gibbous", date: "Jun 15", desc: "Gratitude and reflection." },
  ].map(p => ({ ...p, active: p.name === phaseName }));

  return (
    <div style={{ minHeight: "100vh", padding: "52px 24px 90px", position: "relative" }}>
      <GrainOverlay />
      <div style={{ position: "relative", zIndex: 1 }}>
        <h2 style={{ fontFamily: FONTS.serif, fontSize: 28, color: COLORS.ivory, margin: "0 0 4px", fontWeight: 400 }}>Moon Cycle</h2>
        <p style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.moonBeige, opacity: 0.5, margin: "0 0 28px", letterSpacing: "0.04em" }}>{phaseName} · {illumPct}% illuminated</p>

        <div style={{
          background: `linear-gradient(160deg, #2a1f3d, #1e1a2e)`,
          border: `1px solid rgba(214,194,161,0.15)`,
          borderRadius: 20, padding: 24, marginBottom: 24, position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ animation: "pulse 3s ease-in-out infinite" }}>
              <RealMoonPhase size={80} phase={phase} />
            </div>
            <div>
              <p style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.gold, letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 6px", opacity: 0.8, fontWeight: 500 }}>Tonight</p>
              <h3 style={{ fontFamily: FONTS.serif, fontSize: 22, color: COLORS.ivory, margin: "0 0 6px", fontWeight: 400 }}>{phaseName}</h3>
              <p style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.moonBeige, opacity: 0.65, margin: 0, lineHeight: 1.5 }}>{illumPct}% of the moon is illuminated tonight.</p>
            </div>
          </div>
        </div>

        <p style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.gold, opacity: 0.7, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12, fontWeight: 500 }}>How do you feel today?</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
          {emotions.map(e => (
            <button key={e} onClick={() => { haptic(8); setTracked(t => ({ ...t, today: e })); }} style={{
              fontFamily: FONTS.sans, fontSize: 12, padding: "7px 14px", borderRadius: 20,
              border: tracked.today === e ? `1.5px solid ${COLORS.lavender}` : `1px solid rgba(214,194,161,0.18)`,
              background: tracked.today === e ? `rgba(200,190,219,0.15)` : "rgba(255,255,255,0.04)",
              color: tracked.today === e ? COLORS.lavender : COLORS.moonBeige,
              opacity: tracked.today === e ? 1 : 0.6, cursor: "pointer", fontWeight: 500,
            }}>{e}</button>
          ))}
        </div>

        <p style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.gold, opacity: 0.7, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12, fontWeight: 500 }}>Lunar Cycle</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {phases.map((p, i) => (
            <div key={i} style={{
              background: p.active ? `linear-gradient(135deg, rgba(214,194,161,0.15), rgba(200,190,219,0.1))` : "rgba(255,255,255,0.04)",
              borderRadius: 14, padding: "13px 16px",
              border: p.active ? `1px solid rgba(214,194,161,0.35)` : `1px solid rgba(255,255,255,0.06)`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontFamily: FONTS.sans, fontSize: 13, fontWeight: 600, color: p.active ? COLORS.gold : COLORS.ivory, marginBottom: 2, opacity: p.active ? 1 : 0.75 }}>{p.name}</div>
                <div style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.moonBeige, opacity: 0.55 }}>{p.desc}</div>
              </div>
              <div style={{ fontFamily: FONTS.sans, fontSize: 11, color: p.active ? COLORS.gold : COLORS.moonBeige, opacity: p.active ? 1 : 0.4, flexShrink: 0, marginLeft: 12, fontWeight: 500 }}>{p.date}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ProfileScreen = () => (
  <div style={{ minHeight: "100vh", padding: "52px 24px 90px", position: "relative" }}>
    <GrainOverlay />
    <div style={{ position: "relative", zIndex: 1 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{
          width: 76, height: 76, borderRadius: "50%",
          background: `linear-gradient(135deg, ${COLORS.lavender}50, ${COLORS.gold}50)`,
          border: `2px solid rgba(214,194,161,0.3)`, margin: "0 auto 16px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: FONTS.serif, fontSize: 30, color: COLORS.ivory,
        }}>L</div>
        <h2 style={{ fontFamily: FONTS.serif, fontSize: 26, color: COLORS.ivory, margin: "0 0 6px", fontWeight: 400 }}>Luna</h2>
        <p style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.gold, opacity: 0.75, margin: 0, letterSpacing: "0.06em" }}>☀ Scorpio · ☽ Pisces · ↑ Libra</p>
      </div>
      {[
        { label: "Subscription", value: "Novara Pro", highlight: true },
        { label: "Birth Data", value: "Nov 12, 1995 · 3:45 AM" },
        { label: "Birth Place", value: "Mumbai, India" },
        { label: "Notifications", value: "Daily at sunrise" },
        { label: "Theme", value: "Cosmic Night" },
      ].map((item, i) => (
        <div key={i} style={{
          background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "14px 16px", marginBottom: 8,
          border: `1px solid rgba(255,255,255,0.07)`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontFamily: FONTS.sans, fontSize: 13, color: COLORS.moonBeige, opacity: 0.65 }}>{item.label}</span>
          <span style={{
            fontFamily: FONTS.sans, fontSize: 13,
            color: item.highlight ? COLORS.gold : COLORS.ivory,
            opacity: item.highlight ? 1 : 0.5,
            fontWeight: item.highlight ? 600 : 400,
          }}>{item.value}</span>
        </div>
      ))}
      <div style={{
        marginTop: 24, background: `linear-gradient(135deg, #2a1f3d, #1e1a2e)`,
        border: `1px solid rgba(214,194,161,0.2)`,
        borderRadius: 20, padding: 20, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 16 }}>
          <NovaraLogo size={48} />
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.gold, letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 6px", opacity: 0.9, fontWeight: 600 }}>Novara Pro</p>
            <p style={{ fontFamily: FONTS.serif, fontSize: 15, color: COLORS.ivory, margin: "0 0 10px", fontWeight: 400, lineHeight: 1.55 }}>Unlock full AI chat, compatibility insights, and personalized moon rituals.</p>
            <div style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.gold, fontWeight: 500 }}>₹799 / month · Cancel anytime</div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "home",  icon: "◎", label: "Today"   },
  { id: "chart", icon: "✦", label: "Chart"   },
  { id: "tarot", icon: "✧", label: "Tarot"   },
  { id: "chat",  icon: "◌", label: "Reflect" },
  { id: "moon",  icon: "☽", label: "Moon"    },
];

export default function App() {
  const [screen, setScreen] = useState("onboarding");
  const [chatSeed, setChatSeed] = useState(null);
  const scrollRef = useRef(null);
  const scrollY = useScrollY(scrollRef);
  const chime = useChime();
  const ambient = useAmbient();
  const [gradient, setGradient] = useState(() => getTimeGradient());

  // Update time-of-day gradient every minute
  useEffect(() => {
    const update = () => setGradient(getTimeGradient());
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  const navigateTo = useCallback((id) => {
    if (id !== screen) chime();
    setScreen(id);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [screen, chime]);

  const handleReflectOnCard = (card) => {
    setChatSeed(card);
    navigateTo("chat");
    setTimeout(() => setChatSeed(null), 100); // consumed after first render
  };

  return (
    <div style={{
      width: "100%", minHeight: "100vh",
      background: gradient,
      fontFamily: FONTS.sans, position: "relative",
      transition: "background 2s ease",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Montserrat:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #12101e !important; }
        input { color-scheme: dark; }
        ::-webkit-scrollbar { width: 0px; }
        @keyframes twinkle { from { opacity: 0.1; } to { opacity: 0.7; } }
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse { 0%,100% { transform: scale(1); opacity: 0.85; } 50% { transform: scale(1.04); opacity: 1; } }
        @keyframes drift1 { 0%,100% { transform: translate(0,0) scale(1); }    50% { transform: translate(50px, 40px) scale(1.12); } }
        @keyframes drift2 { 0%,100% { transform: translate(0,0) scale(1); }    50% { transform: translate(-60px, 50px) scale(1.18); } }
        @keyframes drift3 { 0%,100% { transform: translate(0,0) scale(1); }    50% { transform: translate(40px, -40px) scale(1.1); } }
        @keyframes drift4 { 0%,100% { transform: translate(0,0) scale(1) rotate(0deg); } 50% { transform: translate(-40px, -30px) scale(1.15) rotate(10deg); } }
        @keyframes drift5 { 0%,100% { transform: translate(0,0) scale(1); }    50% { transform: translate(30px, -50px) scale(1.2); } }
        @keyframes moonFloat { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes sparkleTwinkle { 0%,100% { transform: scale(1) rotate(0deg); opacity: 0.85; } 50% { transform: scale(1.15) rotate(15deg); opacity: 1; } }
      `}</style>

      <SceneBackground />
      <StarField scrollY={scrollY} />
      {screen !== "onboarding" && <AmbientToggle playing={ambient.playing} onToggle={ambient.toggle} />}

      <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", position: "relative", zIndex: 1 }}>
        {screen === "onboarding" ? (
          <OnboardingScreen onNext={() => navigateTo("home")} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", paddingBottom: 70 }}>
              {screen === "home"    && <HomeScreen onNavigate={navigateTo} gradient={gradient} />}
              {screen === "chart"   && <ChartScreen />}
              {screen === "tarot"   && <TarotScreen onReflect={handleReflectOnCard} />}
              {screen === "chat"    && <ChatScreen seed={chatSeed} />}
              {screen === "moon"    && <MoonScreen />}
              {screen === "profile" && <ProfileScreen />}
            </div>

            <nav style={{
              position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
              width: "100%", maxWidth: 430,
              background: "rgba(18,16,30,0.95)", backdropFilter: "blur(20px)",
              borderTop: `1px solid rgba(214,194,161,0.12)`,
              display: "flex", padding: "10px 0 20px", zIndex: 100,
            }}>
              {NAV_ITEMS.map(item => (
                <button key={item.id} onClick={() => navigateTo(item.id)} style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  background: "none", border: "none", cursor: "pointer", padding: "4px 0",
                }}>
                  <span style={{
                    fontSize: screen === item.id ? 19 : 17,
                    color: screen === item.id ? COLORS.gold : COLORS.moonBeige,
                    opacity: screen === item.id ? 1 : 0.35, transition: "all 0.2s ease",
                  }}>{item.icon}</span>
                  <span style={{
                    fontFamily: FONTS.sans, fontSize: 9, letterSpacing: "0.1em",
                    color: screen === item.id ? COLORS.gold : COLORS.moonBeige,
                    opacity: screen === item.id ? 0.9 : 0.35,
                    textTransform: "uppercase", fontWeight: 500, transition: "all 0.2s ease",
                  }}>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
