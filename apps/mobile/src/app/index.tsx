import { resolvePublicProductName } from "@fielddoc/config";
import type { Project } from "@fielddoc/domain";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/components/app-button";
import { AppScreen } from "@/components/app-screen";
import { AppText } from "@/components/app-text";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { MetricRow } from "@/components/metric-row";
import { SectionHeader } from "@/components/section-header";
import { StatusBanner } from "@/components/status-banner";
import { spacing } from "@/design/tokens";
import { getLocalRepositories } from "@/infrastructure/local-store/repositories";

export default function HomeScreen() {
  const productName = resolvePublicProductName(
    process.env.EXPO_PUBLIC_PRODUCT_NAME,
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingMutations, setPendingMutations] = useState(0);
  const [loading, setLoading] = useState(true);
  const currentProject = projects[0];

  const refresh = useCallback(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      const repositories = await getLocalRepositories();
      const [projectRows, pending] = await Promise.all([
        repositories.projects.list({
          sortBy: "updatedAt",
          sortDirection: "desc",
        }),
        repositories.mutations.countPending(),
      ]);

      if (!mounted) return;
      setProjects(projectRows);
      setPendingMutations(pending);
      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  useFocusEffect(refresh);

  return (
    <AppScreen>
      <View>
        <AppText variant="label" muted>
          {productName}
        </AppText>
        <AppText variant="hero">Proof work faster.</AppText>
        <AppText muted>
          Capture job-site progress, keep evidence organized, and know what
          still needs attention.
        </AppText>
      </View>

      {loading ? (
        <StatusBanner
          tone="info"
          title="Loading local workspace"
          message="Reading offline SQLite data."
        />
      ) : null}

      <Card>
        <SectionHeader
          title="Continue Current Project"
          detail="Stored locally on this device."
        />
        {currentProject ? (
          <>
            <AppText variant="title">{currentProject.name}</AppText>
            <AppText muted>
              {currentProject.siteAddress ??
                currentProject.customerCompany ??
                "No site yet"}
            </AppText>
            <View style={styles.actions}>
              <Link href="/projects" asChild>
                <AppButton
                  label="Open Project"
                  icon="folder.fill"
                  accessibilityLabel="Open current project"
                />
              </Link>
              <Link href="/capture" asChild>
                <AppButton
                  label="Add Evidence"
                  icon="camera.fill"
                  variant="secondary"
                  accessibilityLabel="Add evidence to current project"
                />
              </Link>
            </View>
          </>
        ) : (
          <EmptyState
            title="No current project"
            message="Create a local project before capturing evidence."
            ctaLabel="Start New Project"
            icon="folder.badge.plus"
          />
        )}
      </Card>

      <Card>
        <SectionHeader
          title="Start New Project"
          detail="Works in airplane mode."
        />
        <Link href="/projects" asChild>
          <AppButton
            label="Create Project"
            icon="plus.circle.fill"
            accessibilityLabel="Create a project"
          />
        </Link>
      </Card>

      <Card>
        <SectionHeader title="Recent Projects" />
        {projects.length ? (
          projects
            .slice(0, 4)
            .map((project) => (
              <MetricRow
                key={project.id}
                label={project.name}
                value={project.status === "active" ? "Active" : project.status}
              />
            ))
        ) : (
          <AppText muted>No local projects yet.</AppText>
        )}
      </Card>

      <Card>
        <SectionHeader title="Reports Ready" />
        <MetricRow
          label="Projects with local evidence"
          value={projects.length ? "Review" : 0}
        />
        <MetricRow label="Draft reports on device" value={0} />
      </Card>

      <StatusBanner
        tone={pendingMutations > 0 ? "warning" : "success"}
        title="Unsynced Items"
        message={
          pendingMutations > 0
            ? `${pendingMutations} local changes are waiting for future sync.`
            : "No pending local mutations."
        }
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
  },
});
