import {
  getReportReadiness,
  type Project,
  type ProjectEvidenceSummary,
} from "@fielddoc/domain";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";

import { AppButton } from "@/components/app-button";
import { AppScreen } from "@/components/app-screen";
import { AppText } from "@/components/app-text";
import { Card } from "@/components/card";
import { MetricRow } from "@/components/metric-row";
import { SectionHeader } from "@/components/section-header";
import { StatusBanner } from "@/components/status-banner";
import { getLocalRepositories } from "@/infrastructure/local-store/repositories";

const emptySummary: ProjectEvidenceSummary = {
  beforeCount: 0,
  workCount: 0,
  afterCount: 0,
  documentCount: 0,
  otherCount: 0,
  missingCaptionCount: 0,
};

export default function ReportsScreen() {
  const [project, setProject] = useState<Project | null>(null);
  const [summary, setSummary] = useState<ProjectEvidenceSummary>(emptySummary);
  const readiness = getReportReadiness(summary);

  const refresh = useCallback(() => {
    let mounted = true;

    async function load() {
      const repositories = await getLocalRepositories();
      const projects = await repositories.projects.list({
        sortBy: "updatedAt",
        sortDirection: "desc",
      });
      const selectedProject = projects[0] ?? null;
      const nextSummary = selectedProject
        ? await repositories.evidence.summarizeProject(selectedProject.id)
        : emptySummary;

      if (!mounted) return;
      setProject(selectedProject);
      setSummary(nextSummary);
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
        <AppText variant="hero">Reports</AppText>
        <AppText muted>
          Report readiness is calculated from evidence metadata saved on this
          device.
        </AppText>
      </View>

      <StatusBanner
        tone={readiness.ready ? "success" : "warning"}
        title={readiness.ready ? "Ready to generate" : "Needs attention"}
        message={
          project
            ? readiness.ready
              ? `${project.name} has the minimum evidence metadata.`
              : `Missing: ${readiness.missing.join(", ")}.`
            : "Create a project before generating a report."
        }
      />

      <Card>
        <SectionHeader
          title="Report Readiness"
          detail={project?.name ?? "No project selected"}
        />
        <MetricRow label="Before evidence" value={summary.beforeCount} />
        <MetricRow label="Work evidence" value={summary.workCount} />
        <MetricRow label="After evidence" value={summary.afterCount} />
        <MetricRow label="Supporting documents" value={summary.documentCount} />
        <MetricRow label="Other evidence" value={summary.otherCount ?? 0} />
        <MetricRow
          label="Missing captions"
          value={summary.missingCaptionCount}
        />
      </Card>

      <AppButton
        label="Generate Proof Packet"
        icon="doc.richtext.fill"
        disabled={!readiness.ready}
        accessibilityLabel="Generate Proof Packet"
      />
    </AppScreen>
  );
}
