import { useColorScheme } from "react-native";

import { colors, type AppTheme } from "./tokens";

export function useAppTheme(): AppTheme {
  return colors[useColorScheme() === "dark" ? "dark" : "light"];
}
