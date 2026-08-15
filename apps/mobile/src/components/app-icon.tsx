import { SymbolView, type SFSymbol } from "expo-symbols";
import type { ColorValue } from "react-native";

type AppIconProps = {
  name: SFSymbol;
  color: ColorValue;
  size?: number;
};

export function AppIcon({ name, color, size = 22 }: AppIconProps) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color}
      fallback={null}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
