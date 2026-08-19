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
      <AppText variant="body" style={styles.label}>
        {label}
      </AppText>
      <AppText variant="section" style={styles.value}>
        {String(value)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    minHeight: 44,
    gap: spacing.md,
  },
  label: {
    flexShrink: 1,
  },
  value: {
    flexShrink: 1,
    textAlign: "right",
  },
});
