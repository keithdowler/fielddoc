import type { SFSymbol } from "expo-symbols";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 10,
  round: 999,
} as const;

export const typography = {
  hero: { fontSize: 34, lineHeight: 40, fontWeight: "800" },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "800" },
  section: { fontSize: 18, lineHeight: 24, fontWeight: "800" },
  body: { fontSize: 16, lineHeight: 23, fontWeight: "500" },
  small: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
  label: { fontSize: 13, lineHeight: 18, fontWeight: "800" },
} as const;

export const minTouchTarget = 48;

export const elevation = {
  level1: {
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  level2: {
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
} as const;

export const stateIcons = {
  info: "info.circle",
  success: "checkmark.circle.fill",
  warning: "exclamationmark.triangle.fill",
  error: "xmark.octagon.fill",
  sync: "arrow.triangle.2.circlepath",
} as const satisfies Record<string, SFSymbol>;

export const navIcons = {
  home: "house.fill",
  projects: "folder.fill",
  capture: "camera.fill",
  reports: "doc.text.fill",
  settings: "gearshape.fill",
} as const satisfies Record<string, SFSymbol>;

export type AppColorScheme = "light" | "dark";

const palette = {
  slate950: "#11181c",
  slate900: "#172126",
  slate800: "#243238",
  slate700: "#34434a",
  slate600: "#52636b",
  slate100: "#e8ecec",
  slate050: "#f7f8f6",
  paper: "#fffdf8",
  amber: "#f4b740",
  amberDark: "#8a5b00",
  blue: "#0f5b78",
  blueBright: "#4bb5d9",
  green: "#157347",
  red: "#b42318",
} as const;

export const colors = {
  light: {
    background: palette.slate050,
    surface: palette.paper,
    surfaceMuted: "#eef1ef",
    text: palette.slate950,
    textMuted: palette.slate600,
    border: "#cbd3d3",
    primary: palette.blue,
    primaryText: "#ffffff",
    accent: palette.amber,
    info: palette.blue,
    success: palette.green,
    warning: palette.amberDark,
    error: palette.red,
    shadow: "#0b1518",
  },
  dark: {
    background: "#0c1114",
    surface: palette.slate900,
    surfaceMuted: palette.slate800,
    text: "#f5f7f7",
    textMuted: "#b8c3c7",
    border: "#3b4b52",
    primary: palette.blueBright,
    primaryText: "#061014",
    accent: palette.amber,
    info: palette.blueBright,
    success: "#50d890",
    warning: "#ffd166",
    error: "#ff8a80",
    shadow: "#000000",
  },
} as const;

export type AppTheme = (typeof colors)[AppColorScheme];
