import { Tabs } from "expo-router";
import type { SFSymbol } from "expo-symbols";
import { StatusBar } from "expo-status-bar";
import type { ColorValue } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { colors } from "@/design/tokens";
import { MobileAuthProvider } from "@/infrastructure/auth/mobile-auth";
import { AutomaticCloudSyncProvider } from "@/infrastructure/sync/automatic-cloud-sync";
import { primaryNavigation } from "@/navigation/app-navigation";

function tabBarIcon(name: SFSymbol) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <AppIcon name={name} color={color} size={size} />
  );
}

export default function RootLayout() {
  return (
    <MobileAuthProvider>
      <AutomaticCloudSyncProvider>
        <Tabs
          screenOptions={{
            headerStyle: { backgroundColor: colors.light.background },
            headerTitleStyle: { color: colors.light.text, fontWeight: "800" },
            headerShadowVisible: false,
            tabBarActiveTintColor: colors.light.primary,
            tabBarInactiveTintColor: colors.light.textMuted,
            tabBarStyle: {
              backgroundColor: colors.light.surface,
              borderTopColor: colors.light.border,
              minHeight: 64,
              paddingTop: 6,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: "700",
            },
          }}
        >
          {primaryNavigation.map((item) => (
            <Tabs.Screen
              key={item.key}
              name={item.routeName}
              options={{
                title: item.title,
                tabBarAccessibilityLabel: item.accessibilityLabel,
                tabBarIcon: tabBarIcon(item.icon),
              }}
            />
          ))}
        </Tabs>
        <StatusBar style="dark" />
      </AutomaticCloudSyncProvider>
    </MobileAuthProvider>
  );
}
