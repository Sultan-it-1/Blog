// Brand data — the single source for colours, type and motion.
// It is turned into CSS custom properties by src/tokens.njk (served as /assets/css/tokens.css),
// so changing the accent or a spring here restyles the whole site. Components never hard-code these values.

// Closed-form response of a damped spring released from 0 towards 1.
// Being a pure function of time, it can be sampled at any moment — no frame-by-frame simulation.
function springResponse({ stiffness, damping, mass = 1 }) {
  const omega = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 1) {
    const omegaD = omega * Math.sqrt(1 - zeta * zeta);
    return (t) =>
      1 - Math.exp(-zeta * omega * t) * (Math.cos(omegaD * t) + ((zeta * omega) / omegaD) * Math.sin(omegaD * t));
  }
  return (t) => 1 - Math.exp(-omega * t) * (1 + omega * t);
}

// Samples the spring into a CSS linear() easing plus the duration it takes to settle within 0.1%.
function spring(config, samples = 32) {
  const value = springResponse(config);
  const step = 0.002;
  let settle = 0;
  for (let t = 0; t < 3; t += step) {
    if (Math.abs(1 - value(t)) > 0.001) settle = t + step;
  }
  const points = Array.from({ length: samples + 1 }, (_, i) => +value((i / samples) * settle).toFixed(4));
  points[samples] = 1;
  return { easing: `linear(${points.join(", ")})`, duration: Math.round(settle * 1000) };
}

export default {
  name: "sultanops",

  // Light and dark palettes share the same token names.
  colors: {
    light: {
      bg: "#F6F5F1",
      surface: "#FFFFFF",
      sunken: "#EEECE6",
      ink: "#15171B",
      muted: "#5C6270",
      faint: "#636873",
      line: "#E1DED6",
      lineStrong: "#CDC9BE",
      accent: "#0B7A5B",
      accentInk: "#FFFFFF",
      accentSoft: "#E1F1EA",
      warn: "#94590A",
      warnSoft: "#FAEFDC",
      danger: "#B4362B",
      dangerSoft: "#FBE7E4",
      hlYellow: "#FFE98F",
      hlGreen: "#BDEBC8",
      hlBlue: "#BFE0FF",
      hlPink: "#FFCFE0",
    },
    dark: {
      bg: "#0D0F12",
      surface: "#14171C",
      sunken: "#101216",
      ink: "#E8EAED",
      muted: "#9BA1AC",
      faint: "#7D838F",
      line: "#23272E",
      lineStrong: "#323843",
      accent: "#46D19F",
      accentInk: "#07150F",
      accentSoft: "#10251D",
      warn: "#E6A84B",
      warnSoft: "#2A2113",
      danger: "#F07A6E",
      dangerSoft: "#2C1513",
      hlYellow: "#5A4A12",
      hlGreen: "#17472F",
      hlBlue: "#173F66",
      hlPink: "#5E2540",
    },
  },

  // Code blocks and the hero terminal stay dark in both themes.
  code: {
    bg: "#0B0D10",
    bar: "#12151A",
    line: "#20242B",
    ink: "#D5DAE1",
    muted: "#7C8491",
    accent: "#46D19F",
    danger: "#F07A6E",
    comment: "#6B8F71",
    keyword: "#7FB4FF",
    string: "#E3B27C",
    number: "#C5A3FF",
    function: "#5FD7A7",
    variable: "#9FD3F5",
    operator: "#AAB2BF",
  },

  fonts: {
    sans: "'IBM Plex Sans Arabic', 'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
    // Plex Sans Arabic follows Plex Mono so Arabic comments in code stay joined instead of falling back to a monospaced Arabic face.
    mono: "'IBM Plex Mono', 'IBM Plex Sans Arabic', ui-monospace, 'SFMono-Regular', Consolas, monospace",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap",
  },

  radius: { sm: "6px", md: "10px", lg: "16px" },

  // Springs used by every transition. `snappy` leads, `soft` follows, `gentle` is for larger surfaces.
  motion: {
    snappy: spring({ stiffness: 380, damping: 28 }),
    soft: spring({ stiffness: 180, damping: 27 }),
    gentle: spring({ stiffness: 140, damping: 22 }),
  },
};
