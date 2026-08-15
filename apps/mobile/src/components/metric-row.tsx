import { StyleSheet, View } from "react-native";

import { spacing } from "@/design/tokens";
import { AppText } from "./app-text";

type MetricRowProps = {
  label: string;
  value: string | number;
};

export function MetricRow({ label, value }: MetricRowProps) {
  return (
    <View style={styles.row}>
      <AppText variant="body">{label}</AppText>
      <AppText variant="section">{String(value)}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    gap: spacing.md,
  },
});
