import { View } from "react-native";

import { AppText } from "./app-text";

type SectionHeaderProps = {
  title: string;
  detail?: string;
};

export function SectionHeader({ title, detail }: SectionHeaderProps) {
  return (
    <View accessible accessibilityRole="header">
      <AppText variant="section">{title}</AppText>
      {detail ? (
        <AppText variant="small" muted>
          {detail}
        </AppText>
      ) : null}
    </View>
  );
}
