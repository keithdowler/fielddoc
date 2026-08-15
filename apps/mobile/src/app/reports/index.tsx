import {
  assembleProofPacketPreview,
  defaultReportSectionConfigs,
  getReportDraftReadiness,
  getReportSectionEvidenceCount,
  normalizeReportSections,
  parseReportDraftSections,
  type Project,
  type ReportDraft,
  type ProjectEvidenceSummary,
  type GeneratedProofPacket,
  type ProofPacketPreview,
  type ReportSectionConfig,
} from "@fielddoc/domain";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/components/app-button";
import { AppScreen } from "@/components/app-screen";
import { AppText } from "@/components/app-text";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { FormField } from "@/components/form-field";
import { MetricRow } from "@/components/metric-row";
import { SectionHeader } from "@/components/section-header";
import { StatusBanner } from "@/components/status-banner";
import { spacing } from "@/design/tokens";
import { useAppTheme } from "@/design/use-app-theme";
import { getLocalRepositories } from "@/infrastructure/local-store/repositories";
import { localProofPacketRenderer } from "@/infrastructure/reporting/local-pdf-renderer";

const emptySummary: ProjectEvidenceSummary = {
  beforeCount: 0,
  workCount: 0,
  afterCount: 0,
  documentCount: 0,
  otherCount: 0,
  mediaAssetCount: 0,
  missingCaptionCount: 0,
};

export default function ReportsScreen() {
  const theme = useAppTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>();
  const [project, setProject] = useState<Project | null>(null);
  const [summary, setSummary] = useState<ProjectEvidenceSummary>(emptySummary);
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [preview, setPreview] = useState<ProofPacketPreview | null>(null);
  const [generatedPacket, setGeneratedPacket] =
    useState<GeneratedProofPacket | null>(null);
  const [title, setTitle] = useState("Proof Packet Draft");
  const [notes, setNotes] = useState("");
  const [sections, setSections] = useState<ReportSectionConfig[]>(
    defaultReportSectionConfigs,
  );
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const readiness = getReportDraftReadiness(summary, sections);
  const hasUnsavedDraftChanges =
    !!draft &&
    (title !== draft.title ||
      notes !== (draft.notes ?? "") ||
      JSON.stringify(normalizeReportSections(sections)) !== draft.sectionsJson);

  const refresh = useCallback(() => {
    let mounted = true;

    async function load() {
      const repositories = await getLocalRepositories();
      const rows = await repositories.projects.list({
        sortBy: "updatedAt",
        sortDirection: "desc",
      });
      const selectedProject =
        rows.find((row) => row.id === projectId) ?? rows[0] ?? null;
      const nextProjectId = selectedProject?.id;
      let nextSummary = emptySummary;
      let latestDraft: ReportDraft | null = null;
      let nextPreview: ProofPacketPreview | null = null;

      if (selectedProject) {
        [nextSummary, latestDraft] = await Promise.all([
          repositories.evidence.summarizeProject(selectedProject.id),
          repositories.reportDrafts.getLatestByProject(selectedProject.id),
        ]);
        nextPreview = latestDraft
          ? await assembleLocalProofPacketPreview(selectedProject, latestDraft)
          : null;
      }

      if (!mounted) return;
      setProjects(rows);
      setProjectId(nextProjectId);
      setProject(selectedProject);
      setSummary(nextSummary);
      setDraft(latestDraft);
      setPreview(nextPreview);
      setGeneratedPacket(null);

      if (latestDraft) {
        setTitle(latestDraft.title);
        setNotes(latestDraft.notes ?? "");
        setSections(parseReportDraftSections(latestDraft.sectionsJson));
      } else if (selectedProject) {
        setTitle(`${selectedProject.name} Proof Packet`);
        setNotes("");
        setSections(defaultReportSectionConfigs);
      } else {
        setTitle("Proof Packet Draft");
        setNotes("");
        setSections(defaultReportSectionConfigs);
      }
    }

    void load().catch((error: unknown) => {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load report draft.",
      );
    });

    return () => {
      mounted = false;
    };
  }, [projectId]);

  useFocusEffect(refresh);

  async function selectProject(nextProject: Project) {
    setProjectId(nextProject.id);
    setProject(nextProject);
    setStatusMessage(undefined);
    setErrorMessage(undefined);
    setGeneratedPacket(null);

    const repositories = await getLocalRepositories();
    const [nextSummary, latestDraft] = await Promise.all([
      repositories.evidence.summarizeProject(nextProject.id),
      repositories.reportDrafts.getLatestByProject(nextProject.id),
    ]);
    const nextPreview = latestDraft
      ? await assembleLocalProofPacketPreview(nextProject, latestDraft)
      : null;

    setSummary(nextSummary);
    setDraft(latestDraft);
    setPreview(nextPreview);
    if (latestDraft) {
      setTitle(latestDraft.title);
      setNotes(latestDraft.notes ?? "");
      setSections(parseReportDraftSections(latestDraft.sectionsJson));
    } else {
      setTitle(`${nextProject.name} Proof Packet`);
      setNotes("");
      setSections(defaultReportSectionConfigs);
    }
  }

  async function saveDraft() {
    if (!project) {
      setErrorMessage("Create a project before saving a report draft.");
      return;
    }

    try {
      const repositories = await getLocalRepositories();
      const savedDraft = await repositories.reportDrafts.save({
        id: draft?.id,
        projectId: project.id,
        title,
        notes,
        sections,
      });
      const nextSummary = await repositories.evidence.summarizeProject(
        project.id,
      );
      const nextPreview = await assembleLocalProofPacketPreview(
        project,
        savedDraft,
      );

      setDraft(savedDraft);
      setSummary(nextSummary);
      setTitle(savedDraft.title);
      setNotes(savedDraft.notes ?? "");
      setSections(parseReportDraftSections(savedDraft.sectionsJson));
      setPreview(nextPreview);
      setGeneratedPacket(null);
      setStatusMessage("Report draft saved locally.");
      setErrorMessage(undefined);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Report draft was not saved.",
      );
    }
  }

  async function generateLocalPdf() {
    if (!draft || !preview) {
      setErrorMessage("Save a local report draft before generating a PDF.");
      return;
    }

    if (hasUnsavedDraftChanges) {
      setErrorMessage("Save draft changes before generating a PDF.");
      return;
    }

    setGeneratingPdf(true);
    setStatusMessage(undefined);
    setErrorMessage(undefined);

    try {
      const output = await localProofPacketRenderer.render(preview);
      const repositories = await getLocalRepositories();
      const updatedDraft = await repositories.reportDrafts.markGeneratedPdf(
        draft.id,
        {
          localUri: output.localUri,
          generatedAt: output.generatedAt,
        },
      );
      const nextPreview = project
        ? await assembleLocalProofPacketPreview(project, updatedDraft)
        : preview;

      setDraft(updatedDraft);
      setPreview(nextPreview);
      setGeneratedPacket(output);
      setStatusMessage(`Local PDF generated: ${output.fileName}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Local PDF could not be generated.",
      );
    } finally {
      setGeneratingPdf(false);
    }
  }

  function toggleSection(category: ReportSectionConfig["category"]) {
    setSections((current) =>
      normalizeReportSections(current).map((section) =>
        section.category === category
          ? { ...section, included: !section.included }
          : section,
      ),
    );
  }

  function moveSection(
    category: ReportSectionConfig["category"],
    delta: number,
  ) {
    setSections((current) => {
      const ordered = normalizeReportSections(current);
      const fromIndex = ordered.findIndex(
        (section) => section.category === category,
      );
      const toIndex = fromIndex + delta;

      if (fromIndex < 0 || toIndex < 0 || toIndex >= ordered.length) {
        return ordered;
      }

      const next = [...ordered];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return ordered;
      next.splice(toIndex, 0, moved);
      return next.map((section, index) => ({ ...section, sortOrder: index }));
    });
  }

  return (
    <AppScreen>
      <View>
        <AppText variant="hero">Reports</AppText>
        <AppText muted>
          Compose a local Proof Packet draft from evidence saved on this device.
        </AppText>
      </View>

      {errorMessage ? (
        <StatusBanner
          tone="error"
          title="Report draft error"
          message={errorMessage}
        />
      ) : null}
      {statusMessage ? (
        <StatusBanner
          tone="success"
          title="Saved on device"
          message={statusMessage}
        />
      ) : null}

      <StatusBanner
        tone={readiness.ready ? "success" : "warning"}
        title={readiness.ready ? "Draft looks ready" : "Draft needs attention"}
        message={
          project
            ? readiness.ready
              ? `${project.name} has the minimum local evidence for a draft.`
              : `Missing: ${readiness.missing.join(", ")}.`
            : "Create a project before composing a report draft."
        }
      />

      <Card>
        <SectionHeader
          title="Project"
          detail="Drafts are saved locally per project."
        />
        {projects.length ? (
          <View style={styles.inlineActions}>
            {projects.slice(0, 5).map((nextProject) => (
              <AppButton
                key={nextProject.id}
                label={nextProject.name}
                variant={
                  nextProject.id === project?.id ? "primary" : "secondary"
                }
                onPress={() => selectProject(nextProject)}
                accessibilityLabel={`Compose report for ${nextProject.name}`}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            title="No projects"
            message="Create a local project before composing a report draft."
            icon="folder.badge.plus"
          />
        )}
      </Card>

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
          label="Original media files"
          value={summary.mediaAssetCount ?? 0}
        />
        <MetricRow
          label="Missing captions"
          value={summary.missingCaptionCount}
        />
      </Card>

      <Card>
        <SectionHeader
          title="Draft Details"
          detail={
            draft
              ? `Last saved ${new Date(draft.updatedAt).toLocaleString()}`
              : "Not saved yet"
          }
        />
        <FormField
          label="Draft title"
          value={title}
          onChangeText={setTitle}
          placeholder="Unit 12 Proof Packet"
        />
        <FormField
          label="Draft notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional internal report notes"
          multiline
        />
      </Card>

      <Card>
        <SectionHeader
          title="Sections"
          detail="Choose what the future Proof Packet should include."
        />
        {normalizeReportSections(sections).map((section, index, ordered) => (
          <View key={section.category} style={styles.sectionRow}>
            <View style={styles.sectionCopy}>
              <AppText variant="label">{section.label}</AppText>
              <AppText variant="small" muted>
                {getReportSectionEvidenceCount(summary, section.category)}{" "}
                evidence items
              </AppText>
            </View>
            <View style={styles.sectionActions}>
              <AppButton
                label={section.included ? "Included" : "Excluded"}
                variant={section.included ? "primary" : "secondary"}
                onPress={() => toggleSection(section.category)}
              />
              <AppButton
                label="Up"
                variant="secondary"
                disabled={index === 0}
                onPress={() => moveSection(section.category, -1)}
              />
              <AppButton
                label="Down"
                variant="secondary"
                disabled={index === ordered.length - 1}
                onPress={() => moveSection(section.category, 1)}
              />
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <SectionHeader
          title="Packet Assembly Preview"
          detail="Read-only structure from saved local metadata."
        />
        {preview ? (
          <View style={styles.previewStack}>
            <MetricRow label="Sections" value={preview.totals.sections} />
            <MetricRow
              label="Evidence items"
              value={preview.totals.evidenceItems}
            />
            <MetricRow
              label="Original media"
              value={preview.totals.mediaAssets}
            />
            <MetricRow label="Annotations" value={preview.totals.annotations} />
            {preview.sections.map((section, sectionIndex) => (
              <View
                key={section.category}
                style={[styles.previewSection, { borderColor: theme.border }]}
              >
                <View style={styles.previewHeader}>
                  <AppText variant="label">
                    {sectionIndex + 1}. {section.label}
                  </AppText>
                  <AppText variant="small" muted>
                    {section.evidenceCount} items
                  </AppText>
                </View>
                {section.evidenceItems.length ? (
                  section.evidenceItems.map((entry, entryIndex) => (
                    <View key={entry.evidence.id} style={styles.previewEntry}>
                      <AppText variant="label">
                        {sectionIndex + 1}.{entryIndex + 1}{" "}
                        {entry.evidence.title ?? "Untitled evidence"}
                      </AppText>
                      <AppText variant="small" muted>
                        {formatDate(entry.capturedAt)} | {entry.mediaCount}{" "}
                        media | {entry.annotationCount} notes
                      </AppText>
                      <AppText
                        variant="small"
                        style={
                          entry.missingCaption
                            ? { color: theme.warning }
                            : undefined
                        }
                      >
                        {entry.caption ?? "Caption needed"}
                      </AppText>
                    </View>
                  ))
                ) : (
                  <AppText variant="small" muted>
                    No evidence in this section yet.
                  </AppText>
                )}
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            title="No saved preview"
            message="Save a local report draft to assemble a read-only packet preview."
            icon="doc.text"
          />
        )}
      </Card>

      <AppButton
        label="Save Report Draft"
        icon="doc.richtext.fill"
        disabled={!project}
        onPress={saveDraft}
        accessibilityLabel="Save local report draft"
      />
      <AppButton
        label="Generate Local PDF"
        icon="doc.fill"
        disabled={!preview || hasUnsavedDraftChanges}
        loading={generatingPdf}
        onPress={generateLocalPdf}
        accessibilityLabel="Generate local Proof Packet PDF"
      />
      <Card>
        <SectionHeader title="Local PDF" detail="Saved on this device only." />
        {draft?.generatedPdfUri ? (
          <View style={styles.previewStack}>
            <MetricRow
              label="Status"
              value={draft.status === "ready" ? "Ready" : "Draft"}
            />
            <MetricRow
              label="Generated"
              value={
                draft.generatedAt ? formatDate(draft.generatedAt) : "Unknown"
              }
            />
            {generatedPacket ? (
              <>
                <MetricRow label="File" value={generatedPacket.fileName} />
                <MetricRow
                  label="Size"
                  value={formatBytes(generatedPacket.sizeBytes)}
                />
                <MetricRow
                  label="Pages"
                  value={generatedPacket.pageCount ?? "Unknown"}
                />
              </>
            ) : null}
            <AppText variant="small" muted>
              {draft.generatedPdfUri}
            </AppText>
          </View>
        ) : (
          <EmptyState
            title="No local PDF"
            message={
              hasUnsavedDraftChanges
                ? "Save draft changes before generating a local PDF."
                : "Generate a PDF after saving a local draft preview."
            }
            icon="doc"
          />
        )}
      </Card>
      <StatusBanner
        tone="info"
        title="Local PDF only"
        message="Sprint 7 saves a PDF on this device only. Share links, upload, sync, and Vercel Workflows remain out of scope."
      />
    </AppScreen>
  );
}

async function assembleLocalProofPacketPreview(
  project: Project,
  draft: ReportDraft,
): Promise<ProofPacketPreview> {
  const repositories = await getLocalRepositories();
  const evidenceItems = await repositories.evidence.listByProject(project.id);
  const evidenceIds = evidenceItems.map((evidence) => evidence.id);
  const [mediaAssets, annotations] = await Promise.all([
    repositories.media.listByEvidenceIds(evidenceIds),
    repositories.annotations.listByEvidenceIds(evidenceIds),
  ]);

  return assembleProofPacketPreview({
    project,
    draft,
    evidenceItems,
    mediaAssetsByEvidenceId: groupByEvidenceId(
      mediaAssets,
      (media) => media.evidenceItemId,
    ),
    annotationsByEvidenceId: groupByEvidenceId(
      annotations,
      (annotation) => annotation.evidenceItemId,
    ),
  });
}

function groupByEvidenceId<T>(
  items: T[],
  getEvidenceItemId: (item: T) => string,
): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    const evidenceItemId = getEvidenceItemId(item);
    groups[evidenceItemId] = [...(groups[evidenceItemId] ?? []), item];
    return groups;
  }, {});
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  inlineActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  sectionRow: {
    gap: spacing.md,
  },
  sectionCopy: {
    gap: spacing.xs,
  },
  sectionActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  previewStack: {
    gap: spacing.md,
  },
  previewSection: {
    borderTopWidth: 1,
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  previewEntry: {
    gap: spacing.xs,
  },
});
