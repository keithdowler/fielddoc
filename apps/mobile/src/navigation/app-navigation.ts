import { navIcons } from "@/design/tokens";

export const primaryNavigation = [
  {
    key: "home",
    routeName: "index",
    title: "Home",
    icon: navIcons.home,
    accessibilityLabel: "Home tab",
  },
  {
    key: "projects",
    routeName: "projects/index",
    title: "Projects",
    icon: navIcons.projects,
    accessibilityLabel: "Projects tab",
  },
  {
    key: "capture",
    routeName: "capture/index",
    title: "Capture",
    icon: navIcons.capture,
    accessibilityLabel: "Capture tab",
  },
  {
    key: "reports",
    routeName: "reports/index",
    title: "Reports",
    icon: navIcons.reports,
    accessibilityLabel: "Reports tab",
  },
  {
    key: "settings",
    routeName: "settings/index",
    title: "Settings",
    icon: navIcons.settings,
    accessibilityLabel: "Settings tab",
  },
] as const;

export const accountSignInRoute = "/settings/sign-in" as const;

export function getPrimaryNavigationTitles(): string[] {
  return primaryNavigation.map((item) => item.title);
}
