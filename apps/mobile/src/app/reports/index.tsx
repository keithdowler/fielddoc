import {
  assembleProofPacketPreview,
  defaultReportSectionConfigs,
  getReportDeliveryReadiness,
  getReportDraftReadiness,
  getReportSectionEvidenceCount,
  getReportUsabilityChecklist,
  normalizeReportSections,
  parseReportDraftSections,
  type UserActionChecklistItem,
  type Project,
  type ReportDraft,
  type ProjectEvidenceSummary,
  type GeneratedProofPacket,
  type ProofPacketPreview,
  type ReportBranding,
  type ReportHistoryItem,
  type ReportSectionConfig,
} from "@fielddoc/domain";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/components/app-button";
import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { AppText } from "@/components/app-text";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { FormField } from "@/components/form-field";
import { MetricRow } from "@/components/metric-row";
import { SectionHeader } from "@/components/section-header";
import { StatusBanner } from "@/components/status-banner";
import { spacing, stateIcons } from "@/design/tokens";
import { useAppTheme } from "@/design/use-app-theme";
import { getLocalRepositories } from "@/infrastructure/local-store/repositories";
import {
  getLocalPdfState,
  openLocalPdf,
  shareLocalPdf,
} from "@/infrastructure/reporting/local-pdf-actions";
import type { LocalPdfActionState } from "@/infrastructure/reporting/local-pdf-actions-core";
import { localProofPacketRenderer } from "@/infrastructure/reporting/local-pdf-renderer";

const emptySummary: ProjectEvidenceSummary = {
  beforeCount: 0,
  workCount: 0,
  afterCount: 0,
  documentCount: 0,
  otherCount: 0,
  importantCount: 0,
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
  const [reportHistory, setReportHistory] = useState<ReportHistoryItem[]>([]);
  const [preview, setPreview] = useState<ProofPacketPreview | null>(null);
  const [branding, setBranding] = useState<ReportBranding | null>(null);
  const [generatedPacket, setGeneratedPacket] =
    useState<GeneratedProofPacket | null>(null);
  const [pdfActionState, setPdfActionState] =
    useState<LocalPdfActionState | null>(null);
  const [title, setTitle] = useState("Proof Packet Draft");
  const [notes, setNotes] = useState("");
  const [sections, setSections] = useState<ReportSectionConfig[]>(
    defaultReportSectionConfigs,
  );
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [openingPdf, setOpeningPdf] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const readiness = getReportDraftReadiness(summary, sections);
  const deliveryReadiness = getReportDeliveryReadiness({
    reportReady: readiness.ready,
    hasGeneratedPdf: Boolean(draft?.generatedPdfUri),
    reportPdfUploaded: Boolean(draft?.generatedPdfUploadedAt),
    mediaCount: preview?.totals.mediaAssets ?? summary.mediaAssetCount ?? 0,
    uploadedMediaCount: preview ? countUploadedPreviewMedia(preview) : 0,
    missingCaptionCount: summary.missingCaptionCount,
    documentCount: preview?.totals.documents ?? summary.documentCount,
    visualDocumentCount: preview?.totals.visualDocuments ?? 0,
    externalOriginalDocumentCount:
      preview?.totals.externalOriginalDocuments ?? 0,
    metadataOnlyDocumentCount: preview?.totals.metadataOnlyDocuments ?? 0,
  });
  const usabilityChecklist = getReportUsabilityChecklist({
    projectSelected: Boolean(project),
    beforeCount: summary.beforeCount,
    workCount: summary.workCount,
    afterCount: summary.afterCount,
    documentCount: summary.documentCount,
    missingCaptionCount: summary.missingCaptionCount,
    hasGeneratedPdf: Boolean(draft?.generatedPdfUri),
    reportPdfUploaded: Boolean(draft?.generatedPdfUploadedAt),
    mediaCount: preview?.totals.mediaAssets ?? summary.mediaAssetCount ?? 0,
    uploadedMediaCount: preview ? countUploadedPreviewMedia(preview) : 0,
    externalOriginalDocumentCount:
      preview?.totals.externalOriginalDocuments ?? 0,
    metadataOnlyDocumentCount: preview?.totals.metadataOnlyDocuments ?? 0,
  });
  const hasUnsavedDraftChanges =
    !!draft &&
    (title !== draft.title ||
      notes !== (draft.notes ?? "") ||
      JSON.stringify(normalizeReportSections(sections)) !== draft.sectionsJson);

  const refresh = useCallback(() => {
    let mounted = true;

    async function load() {
      const repositories = await getLocalRepositories();
      const [rows, history] = await Promise.all([
        repositories.projects.list({
          sortBy: "updatedAt",
          sortDirection: "desc",
        }),
        repositories.reportDrafts.listHistory({ includeDrafts: true }),
      ]);
      const nextBranding = await repositories.reportBranding.get();
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
      setReportHistory(history);
      setBranding(nextBranding);
      setProjectId(nextProjectId);
      setProject(selectedProject);
      setSummary(nextSummary);
      setDraft(latestDraft);
      setPreview(nextPreview);
      setGeneratedPacket(null);
      setPdfActionState(
        latestDraft
          ? await getLocalPdfState(latestDraft.generatedPdfUri, false)
          : null,
      );

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
    const [nextSummary, latestDraft, history] = await Promise.all([
      repositories.evidence.summarizeProject(nextProject.id),
      repositories.reportDrafts.getLatestByProject(nextProject.id),
      repositories.reportDrafts.listHistory({ includeDrafts: true }),
    ]);
    const nextPreview = latestDraft
      ? await assembleLocalProofPacketPreview(nextProject, latestDraft)
      : null;

    setSummary(nextSummary);
    setDraft(latestDraft);
    setReportHistory(history);
    setPreview(nextPreview);
    setPdfActionState(
      latestDraft
        ? await getLocalPdfState(latestDraft.generatedPdfUri, false)
        : null,
    );
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
      const history = await repositories.reportDrafts.listHistory({
        includeDrafts: true,
      });

      setDraft(savedDraft);
      setSummary(nextSummary);
      setReportHistory(history);
      setTitle(savedDraft.title);
      setNotes(savedDraft.notes ?? "");
      setSections(parseReportDraftSections(savedDraft.sectionsJson));
      setPreview(nextPreview);
      setGeneratedPacket(null);
      setPdfActionState(await getLocalPdfState(null, false));
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
      const repositories = await getLocalRepositories();
      const nextBranding = await repositories.reportBranding.get();
      const output = await localProofPacketRenderer.render(preview, {
        branding: nextBranding,
      });
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
      const history = await repositories.reportDrafts.listHistory({
        includeDrafts: true,
      });

      setDraft(updatedDraft);
      setBranding(nextBranding);
      setPreview(nextPreview);
      setReportHistory(history);
      setGeneratedPacket(output);
      setPdfActionState(await getLocalPdfState(output.localUri, false));
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

  async function handleOpenLocalPdf() {
    if (!draft?.generatedPdfUri) {
      setErrorMessage("Generate a local PDF before opening it.");
      return;
    }

    setOpeningPdf(true);
    setStatusMessage(undefined);
    setErrorMessage(undefined);

    try {
      const state = await getLocalPdfState(
        draft.generatedPdfUri,
        hasUnsavedDraftChanges,
      );
      setPdfActionState(state);

      if (!state.canOpen) {
        setErrorMessage(state.reason ?? "Local PDF cannot be opened.");
        return;
      }

      await openLocalPdf(draft.generatedPdfUri);
      setStatusMessage("Opened local PDF.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Local PDF could not be opened.",
      );
    } finally {
      setOpeningPdf(false);
    }
  }

  async function handleShareLocalPdf() {
    if (!draft?.generatedPdfUri) {
      setErrorMessage("Generate a local PDF before sharing it.");
      return;
    }

    setSharingPdf(true);
    setStatusMessage(undefined);
    setErrorMessage(undefined);

    try {
      const state = await getLocalPdfState(
        draft.generatedPdfUri,
        hasUnsavedDraftChanges,
      );
      setPdfActionState(state);

      if (!state.canShare) {
        setErrorMessage(state.reason ?? "Local PDF cannot be shared.");
        return;
      }

      await shareLocalPdf(draft.generatedPdfUri);
      setStatusMessage("Share sheet opened for local PDF.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Local PDF could not be shared.",
      );
    } finally {
      setSharingPdf(false);
    }
  }

  async function loadReportHistoryItem(item: ReportHistoryItem) {
    setStatusMessage(undefined);
    setErrorMessage(undefined);
    setGeneratedPacket(null);

    try {
      const repositories = await getLocalRepositories();
      const [nextProject, nextDraft] = await Promise.all([
        repositories.projects.getById(item.projectId),
        repositories.reportDrafts.getById(item.draftId),
      ]);

      if (!nextProject || !nextDraft) {
        setErrorMessage("That local report is no longer available.");
        return;
      }

      const [nextSummary, history] = await Promise.all([
        repositories.evidence.summarizeProject(nextProject.id),
        repositories.reportDrafts.listHistory({ includeDrafts: true }),
      ]);
      const nextPreview = await assembleLocalProofPacketPreview(
        nextProject,
        nextDraft,
      );

      setProjectId(nextProject.id);
      setProject(nextProject);
      setSummary(nextSummary);
      setDraft(nextDraft);
      setReportHistory(history);
      setPreview(nextPreview);
      setTitle(nextDraft.title);
      setNotes(nextDraft.notes ?? "");
      setSections(parseReportDraftSections(nextDraft.sectionsJson));
      setPdfActionState(
        await getLocalPdfState(nextDraft.generatedPdfUri, false),
      );
      setStatusMessage(`Loaded ${nextDraft.title}.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Local report history could not be loaded.",
      );
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
          Build a customer-ready Proof Packet from evidence saved on this
          device.
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

      <StatusBanner
        tone={deliveryReadiness.ready ? "success" : "warning"}
        title={deliveryReadiness.label}
        message={
          deliveryReadiness.ready
            ? deliveryReadiness.detail
            : (deliveryReadiness.blockers[0] ?? deliveryReadiness.detail)
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
          detail={project?.name ?? "Choose a project to start."}
        />
        <MetricRow label="Before evidence" value={summary.beforeCount} />
        <MetricRow label="Work evidence" value={summary.workCount} />
        <MetricRow label="After evidence" value={summary.afterCount} />
        <MetricRow label="Supporting documents" value={summary.documentCount} />
        <MetricRow label="Other evidence" value={summary.otherCount ?? 0} />
        <MetricRow
          label="Important evidence"
          value={summary.importantCount ?? 0}
        />
        <MetricRow
          label="Original media files"
          value={summary.mediaAssetCount ?? 0}
        />
        <MetricRow
          label="Missing captions"
          value={summary.missingCaptionCount}
        />
        {summary.documentCount > 0 ? (
          <AppText variant="small" muted>
            Supporting documents are included as a document appendix. Image
            documents can render visually; imported PDFs and other non-image
            files are preserved as original hash-backed evidence.
          </AppText>
        ) : null}
      </Card>

      <Card>
        <SectionHeader
          title="What Needs Attention"
          detail="A plain-language checklist for a customer-ready report."
        />
        <View style={styles.previewStack}>
          {usabilityChecklist.map((item) => (
            <ChecklistRow key={item.id} item={item} />
          ))}
        </View>
      </Card>

      <Card>
        <SectionHeader
          title="Report Branding"
          detail="Managed in Settings and applied when a local PDF is generated."
        />
        <MetricRow
          label="Company"
          value={branding?.companyName ?? "Default product name"}
        />
        <MetricRow
          label="Prepared by"
          value={branding?.preparedBy ?? "Not set"}
        />
        <MetricRow label="Footer" value={branding?.footerText ?? "Standard"} />
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
            <MetricRow label="Documents" value={preview.totals.documents} />
            <MetricRow
              label="Visual documents"
              value={preview.totals.visualDocuments}
            />
            <MetricRow
              label="Metadata-only documents"
              value={preview.totals.metadataOnlyDocuments}
            />
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
                        media | {entry.documentCount} documents |{" "}
                        {entry.annotationCount} notes
                      </AppText>
                      {entry.isImportant ? (
                        <AppText variant="small">Important evidence</AppText>
                      ) : null}
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
                      {entry.documents.length ? (
                        <View style={styles.previewStack}>
                          {entry.documents.map((documentEntry) => (
                            <AppText
                              key={documentEntry.document.id}
                              variant="small"
                              muted
                            >
                              {documentEntry.document.title}:{" "}
                              {documentEntry.label}
                            </AppText>
                          ))}
                        </View>
                      ) : null}
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
        label="Save Report"
        icon="doc.richtext.fill"
        disabled={!project}
        onPress={saveDraft}
        accessibilityLabel="Save local report draft"
      />
      <AppButton
        label="Make Report PDF"
        icon="doc.fill"
        disabled={!preview || hasUnsavedDraftChanges}
        loading={generatingPdf}
        onPress={generateLocalPdf}
        accessibilityLabel="Generate local Proof Packet PDF"
      />
      <Card>
        <SectionHeader
          title="Report PDF"
          detail="Saved on this device until you back it up."
        />
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
            {pdfActionState?.reason ? (
              <StatusBanner
                tone={pdfActionState.canOpen ? "info" : "warning"}
                title="PDF action"
                message={pdfActionState.reason}
              />
            ) : null}
            <AppText variant="small" muted>
              {draft.generatedPdfUri}
            </AppText>
            <View style={styles.sectionActions}>
              <AppButton
                label="Open"
                icon="doc.text.magnifyingglass"
                variant="secondary"
                loading={openingPdf}
                disabled={!pdfActionState?.canOpen || hasUnsavedDraftChanges}
                onPress={handleOpenLocalPdf}
                accessibilityLabel="Open local PDF"
              />
              <AppButton
                label="Share"
                icon="square.and.arrow.up"
                variant="secondary"
                loading={sharingPdf}
                disabled={!pdfActionState?.canShare || hasUnsavedDraftChanges}
                onPress={handleShareLocalPdf}
                accessibilityLabel="Share local PDF"
              />
            </View>
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
      <Card>
        <SectionHeader
          title="Report Archive"
          detail="Local drafts and generated PDFs, newest first."
        />
        {reportHistory.length ? (
          <View style={styles.previewStack}>
            {reportHistory.slice(0, 10).map((item) => (
              <View
                key={item.draftId}
                style={[styles.previewSection, { borderColor: theme.border }]}
              >
                <View style={styles.previewHeader}>
                  <View style={styles.sectionCopy}>
                    <AppText variant="label">{item.title}</AppText>
                    <AppText variant="small" muted>
                      {item.projectName} |{" "}
                      {item.hasGeneratedPdf ? "Generated PDF" : "Draft"} |{" "}
                      {formatDate(item.generatedAt ?? item.updatedAt)}
                    </AppText>
                  </View>
                  <AppText variant="small" muted>
                    {item.status === "ready" ? "Ready" : "Draft"}
                  </AppText>
                </View>
                <View style={styles.sectionActions}>
                  <AppButton
                    label="Load"
                    variant="secondary"
                    onPress={() => loadReportHistoryItem(item)}
                    accessibilityLabel={`Load report ${item.title}`}
                  />
                  {item.hasGeneratedPdf ? (
                    <AppText variant="small" muted>
                      PDF available locally
                    </AppText>
                  ) : (
                    <AppText variant="small" muted>
                      Save and generate to create a PDF
                    </AppText>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            title="No report history"
            message="Save a report draft or generate a local PDF to add it here."
            icon="clock"
          />
        )}
      </Card>
      <StatusBanner
        tone="info"
        title="Safe sharing path"
        message="Make the PDF locally first. Then use Settings to back up the report and originals before sharing from the web."
      />
    </AppScreen>
  );
}

function ChecklistRow({ item }: { item: UserActionChecklistItem }) {
  const theme = useAppTheme();
  const tone =
    item.status === "complete"
      ? "success"
      : item.status === "blocked"
        ? "error"
        : "warning";
  const statusLabel =
    item.status === "complete"
      ? "Complete"
      : item.status === "blocked"
        ? "Blocked"
        : "Needs attention";

  return (
    <View style={[styles.checklistRow, { borderColor: theme.border }]}>
      <AppIcon name={stateIcons[tone]} color={theme[tone]} size={24} />
      <View style={styles.checklistCopy}>
        <AppText variant="label">{item.label}</AppText>
        <AppText variant="body" muted>
          {item.detail}
        </AppText>
        <AppText variant="small" style={{ color: theme[tone] }}>
          {statusLabel}
          {item.actionLabel ? ` / ${item.actionLabel}` : ""}
        </AppText>
      </View>
    </View>
  );
}

async function assembleLocalProofPacketPreview(
  project: Project,
  draft: ReportDraft,
): Promise<ProofPacketPreview> {
  const repositories = await getLocalRepositories();
  const evidenceItems = await repositories.evidence.listByProject(project.id);
  const evidenceIds = evidenceItems.map((evidence) => evidence.id);
  const [mediaAssets, annotations, documents] = await Promise.all([
    repositories.media.listByEvidenceIds(evidenceIds),
    repositories.annotations.listByEvidenceIds(evidenceIds),
    repositories.documents.listByProject(project.id),
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
    documentsByEvidenceId: groupByEvidenceId(
      documents.filter((document) => document.evidenceItemId),
      (document) => document.evidenceItemId ?? "",
    ),
  });
}

function countUploadedPreviewMedia(preview: ProofPacketPreview): number {
  return preview.sections.reduce(
    (sectionCount, section) =>
      sectionCount +
      section.evidenceItems.reduce(
        (entryCount, entry) =>
          entryCount +
          entry.mediaAssets.filter((media) => media.uploadedAt).length,
        0,
      ),
    0,
  );
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
  checklistRow: {
    alignItems: "flex-start",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  checklistCopy: {
    flex: 1,
    gap: spacing.xs,
  },
});
