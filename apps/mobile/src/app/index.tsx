import { resolvePublicProductName } from "@fielddoc/config";
import {
  getFieldDocNextActions,
  getFirstRunChecklist,
  getPrimaryFieldDocNextAction,
  type FieldDocNextActionDestination,
  type Project,
  type ProjectEvidenceSummary,
  type ReportDraft,
} from "@fielddoc/domain";
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
  const [currentSummary, setCurrentSummary] =
    useState<ProjectEvidenceSummary | null>(null);
  const [currentDraft, setCurrentDraft] = useState<ReportDraft | null>(null);
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
      const firstProject = projectRows[0];
      const [summary, draft] = firstProject
        ? await Promise.all([
            repositories.evidence.summarizeProject(firstProject.id),
            repositories.reportDrafts.getLatestByProject(firstProject.id),
          ])
        : [null, null];

      if (!mounted) return;
      setProjects(projectRows);
      setPendingMutations(pending);
      setCurrentSummary(summary);
      setCurrentDraft(draft);
      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  useFocusEffect(refresh);

  const actionInput = {
    projectCount: projects.length,
    hasSelectedProject: Boolean(currentProject),
    beforeCount: currentSummary?.beforeCount ?? 0,
    workCount: currentSummary?.workCount ?? 0,
    afterCount: currentSummary?.afterCount ?? 0,
    documentCount: currentSummary?.documentCount ?? 0,
    missingCaptionCount: currentSummary?.missingCaptionCount ?? 0,
    hasReportDraft: Boolean(currentDraft),
    hasGeneratedPdf: Boolean(currentDraft?.generatedPdfUri),
    pendingLocalChangeCount: pendingMutations,
  };
  const primaryAction = getPrimaryFieldDocNextAction(actionInput);
  const nextActions = getFieldDocNextActions(actionInput)
    .filter((action) => action.status !== "complete")
    .slice(0, 4);
  const firstRunChecklist = getFirstRunChecklist(actionInput);

  return (
    <AppScreen>
      <View>
        <AppText variant="label" muted>
          {productName}
        </AppText>
        <AppText variant="hero">Proof work faster.</AppText>
        <AppText muted>
          Save job photos, notes, documents, and reports on this device first.
          Back them up when you are ready.
        </AppText>
      </View>

      {loading ? (
        <StatusBanner
          tone="info"
          title="Loading local workspace"
          message="Reading offline SQLite data."
        />
      ) : null}

      {!loading && projects.length === 0 ? (
        <Card>
          <SectionHeader
            title="Start Here"
            detail="Four simple steps for the first Proof Packet."
          />
          {firstRunChecklist.map((item) => (
            <MetricRow
              key={item.id}
              label={item.label}
              value={formatActionStatus(item.status)}
            />
          ))}
          <Link href="/projects" asChild>
            <AppButton
              label="Create First Job"
              icon="plus.circle.fill"
              accessibilityLabel="Create your first job"
            />
          </Link>
        </Card>
      ) : null}

      {!loading ? (
        <StatusBanner
          tone={getActionTone(primaryAction.status)}
          title={primaryAction.label}
          message={primaryAction.detail}
          actionLabel={primaryAction.actionLabel ?? undefined}
        />
      ) : null}

      <Card>
        <SectionHeader
          title="Continue Job"
          detail="Your most recently updated local job."
        />
        {currentProject ? (
          <>
            <AppText variant="title">{currentProject.name}</AppText>
            <AppText muted>
              {currentProject.siteAddress ??
                currentProject.customerCompany ??
                "No site yet"}
            </AppText>
            {currentSummary ? (
              <View style={styles.summaryRows}>
                <MetricRow
                  label="Before / Work / After"
                  value={`${currentSummary.beforeCount} / ${currentSummary.workCount} / ${currentSummary.afterCount}`}
                />
                <MetricRow
                  label="Captions needed"
                  value={
                    currentSummary.missingCaptionCount > 0
                      ? currentSummary.missingCaptionCount
                      : "None"
                  }
                />
              </View>
            ) : null}
            <View style={styles.actions}>
              <Link href="/projects" asChild>
                <AppButton
                  label="Open Job"
                  icon="folder.fill"
                  accessibilityLabel="Open current project"
                />
              </Link>
              <Link href="/capture" asChild>
                <AppButton
                  label="Add Photos"
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
            message="Start a local job before adding photos or documents."
            ctaLabel="Start Job"
            icon="folder.badge.plus"
          />
        )}
      </Card>

      <Card>
        <SectionHeader title="Start New Job" detail="Works in airplane mode." />
        <Link href="/projects" asChild>
          <AppButton
            label="Create Job"
            icon="plus.circle.fill"
            accessibilityLabel="Create a project"
          />
        </Link>
      </Card>

      <Card>
        <SectionHeader
          title="What Needs Attention"
          detail="Quick guidance for the next best action."
        />
        {nextActions.length ? (
          nextActions.map((action) => (
            <MetricRow
              key={action.id}
              label={action.label}
              value={getDestinationLabel(action.destination)}
            />
          ))
        ) : (
          <MetricRow label="Status" value="All clear" />
        )}
      </Card>

      <Card>
        <SectionHeader title="Recent Jobs" />
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
          <AppText muted>No local jobs yet.</AppText>
        )}
      </Card>

      <Card>
        <SectionHeader title="Reports Ready" />
        <MetricRow
          label="Jobs with local evidence"
          value={projects.length ? "Review" : 0}
        />
        <MetricRow label="Draft reports on device" value={0} />
      </Card>

      <StatusBanner
        tone={pendingMutations > 0 ? "warning" : "success"}
        title="Unsynced Items"
        message={
          pendingMutations > 0
            ? `${pendingMutations} local changes are waiting for cloud backup.`
            : "Everything local is caught up."
        }
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
  },
  summaryRows: {
    gap: spacing.sm,
  },
});

function getActionTone(status: "complete" | "action_needed" | "blocked") {
  switch (status) {
    case "complete":
      return "success";
    case "blocked":
      return "blocked";
    case "action_needed":
      return "warning";
  }
}

function formatActionStatus(status: "complete" | "action_needed" | "blocked") {
  switch (status) {
    case "complete":
      return "Done";
    case "blocked":
      return "Waiting";
    case "action_needed":
      return "Next";
  }
}

function getDestinationLabel(destination: FieldDocNextActionDestination) {
  switch (destination) {
    case "projects":
      return "Jobs";
    case "capture":
      return "Capture";
    case "reports":
      return "Reports";
    case "settings":
      return "Settings";
    case "home":
      return "Home";
  }
}
