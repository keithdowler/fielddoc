import {
  evidenceCategories,
  initialProjectFormState,
  validateProjectForm,
  type EvidenceItem,
  type Project,
  type ProjectEvidenceSummary,
  type ProjectFormInput,
  type ProjectFormState,
  type ProjectSearchOptions,
  type ReportHistoryItem,
} from "@fielddoc/domain";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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
import { getLocalRepositories } from "@/infrastructure/local-store/repositories";

const formFields = [
  ["name", "Job name", "Unit 12 turnover"],
  ["customerCompany", "Customer / company", "Rivergate Properties"],
  ["siteAddress", "Site / address", "1200 Grove Ave"],
  ["workOrderReference", "Work order / reference", "WO-1042"],
  ["scheduledDate", "Scheduled date", "2026-08-13"],
  ["notes", "Notes", "Access code, scope notes, or crew instructions"],
] as const satisfies ReadonlyArray<
  readonly [keyof ProjectFormInput, string, string]
>;

type PendingProjectAction = {
  type: "archive" | "delete";
  project: Project;
} | null;

function formFromProject(project: Project): ProjectFormState {
  return {
    name: project.name,
    customerCompany: project.customerCompany ?? "",
    siteAddress: project.siteAddress ?? "",
    workOrderReference: project.workOrderReference ?? "",
    scheduledDate: project.scheduledDate ?? "",
    notes: project.notes ?? "",
    status: "idle",
  };
}

const emptySummary: ProjectEvidenceSummary = {
  beforeCount: 0,
  workCount: 0,
  afterCount: 0,
  documentCount: 0,
  otherCount: 0,
  mediaAssetCount: 0,
  missingCaptionCount: 0,
};

export default function ProjectsScreen() {
  const [form, setForm] = useState<ProjectFormState>(initialProjectFormState);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<
    string | undefined
  >();
  const [editingProjectId, setEditingProjectId] = useState<
    string | undefined
  >();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] =
    useState<ProjectSearchOptions["sortBy"]>("updatedAt");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [reportHistory, setReportHistory] = useState<ReportHistoryItem[]>([]);
  const [summary, setSummary] = useState<ProjectEvidenceSummary>(emptySummary);
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [pendingAction, setPendingAction] =
    useState<PendingProjectAction>(null);
  const [showOptionalProjectFields, setShowOptionalProjectFields] =
    useState(false);
  const validation = useMemo(() => validateProjectForm(form), [form]);
  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId,
  );

  const refresh = useCallback(() => {
    let mounted = true;

    async function load() {
      const repositories = await getLocalRepositories();
      const rows = await repositories.projects.list({
        query,
        includeArchived,
        sortBy,
        sortDirection: sortBy === "name" ? "asc" : "desc",
      });

      if (!mounted) return;
      setProjects(rows);
      const nextSelected = rows.some(
        (project) => project.id === selectedProjectId,
      )
        ? selectedProjectId
        : rows[0]?.id;
      setSelectedProjectId(nextSelected);

      if (nextSelected) {
        const [items, nextSummary, history] = await Promise.all([
          repositories.evidence.listByProject(nextSelected),
          repositories.evidence.summarizeProject(nextSelected),
          repositories.reportDrafts.listHistory({
            projectId: nextSelected,
            includeDrafts: true,
          }),
        ]);
        if (!mounted) return;
        setEvidenceItems(items);
        setSummary(nextSummary);
        setReportHistory(history);
      } else {
        setEvidenceItems([]);
        setSummary(emptySummary);
        setReportHistory([]);
      }
    }

    void load().catch((error: unknown) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load local projects.",
      );
    });

    return () => {
      mounted = false;
    };
  }, [includeArchived, query, selectedProjectId, sortBy]);

  useFocusEffect(refresh);

  async function reload(nextSelectedProjectId = selectedProjectId) {
    const repositories = await getLocalRepositories();
    const rows = await repositories.projects.list({
      query,
      includeArchived,
      sortBy,
      sortDirection: sortBy === "name" ? "asc" : "desc",
    });
    setProjects(rows);
    if (nextSelectedProjectId) {
      const [items, nextSummary, history] = await Promise.all([
        repositories.evidence.listByProject(nextSelectedProjectId),
        repositories.evidence.summarizeProject(nextSelectedProjectId),
        repositories.reportDrafts.listHistory({
          projectId: nextSelectedProjectId,
          includeDrafts: true,
        }),
      ]);
      setEvidenceItems(items);
      setSummary(nextSummary);
      setReportHistory(history);
    } else {
      setEvidenceItems([]);
      setSummary(emptySummary);
      setReportHistory([]);
    }
  }

  function updateField(field: keyof ProjectFormInput, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
      status: "idle",
      errorMessage: undefined,
    }));
    setErrorMessage(undefined);
  }

  async function saveProject() {
    const nextValidation = validateProjectForm(form);

    if (!nextValidation.valid) {
      setForm((current) => ({
        ...current,
        status: "error",
        errorMessage: nextValidation.errors.name,
      }));
      setErrorMessage(nextValidation.errors.name);
      return;
    }

    const repositories = await getLocalRepositories();
    const project = editingProjectId
      ? await repositories.projects.update(editingProjectId, form)
      : await repositories.projects.create(form);

    setSelectedProjectId(project.id);
    setEditingProjectId(undefined);
    setStatusMessage(
      editingProjectId ? "Job updated locally." : "Job created locally.",
    );
    setForm({ ...initialProjectFormState, status: "saved" });
    setShowOptionalProjectFields(false);
    await reload(project.id);
  }

  async function archiveProject(id: string) {
    const repositories = await getLocalRepositories();
    await repositories.projects.archive(id);
    setPendingAction(null);
    setStatusMessage(
      "Job archived locally. It is hidden unless archived jobs are shown.",
    );
    await reload();
  }

  async function deleteProject(id: string) {
    const repositories = await getLocalRepositories();
    await repositories.projects.delete(id);
    setPendingAction(null);
    setSelectedProjectId(undefined);
    setStatusMessage("Job deleted locally.");
    await reload(undefined);
  }

  return (
    <AppScreen>
      <View>
        <AppText variant="hero">Projects</AppText>
        <AppText muted>
          Create, find, update, archive, and delete local jobs. Everything works
          offline.
        </AppText>
      </View>

      {errorMessage ? (
        <StatusBanner
          tone="error"
          title="Local project error"
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
      {pendingAction ? (
        <StatusBanner
          tone={pendingAction.type === "delete" ? "blocked" : "warning"}
          title={
            pendingAction.type === "delete"
              ? "Delete this job?"
              : "Archive this job?"
          }
          message={
            pendingAction.type === "delete"
              ? `${pendingAction.project.name} will be removed from the active local job list on this device.`
              : `${pendingAction.project.name} will be hidden from the main local job list but can be shown again with archived jobs.`
          }
          detail={
            pendingAction.type === "delete"
              ? "Use this only when the local job is no longer needed."
              : "Archiving is safer than deleting when you may need the job later."
          }
          actionLabel={
            pendingAction.type === "delete" ? "Delete Job" : "Archive Job"
          }
          onAction={() =>
            pendingAction.type === "delete"
              ? void deleteProject(pendingAction.project.id)
              : void archiveProject(pendingAction.project.id)
          }
        />
      ) : null}

      <Card>
        <SectionHeader
          title="Find Jobs"
          detail="Search by name, customer, site, or reference."
        />
        <FormField
          label="Search"
          value={query}
          onChangeText={setQuery}
          placeholder="Name, customer, or site"
        />
        <View style={styles.inlineActions}>
          <AppButton
            label="Updated"
            variant={sortBy === "updatedAt" ? "primary" : "secondary"}
            onPress={() => setSortBy("updatedAt")}
          />
          <AppButton
            label="Name"
            variant={sortBy === "name" ? "primary" : "secondary"}
            onPress={() => setSortBy("name")}
          />
          <AppButton
            label={includeArchived ? "Hide Archived" : "Show Archived"}
            variant="secondary"
            onPress={() => setIncludeArchived((value) => !value)}
          />
        </View>
      </Card>

      <Card>
        <SectionHeader
          title={editingProjectId ? "Edit Job" : "Create Local Job"}
          detail="Only job name is required. The rest can be added later."
        />
        {formFields
          .filter(
            ([field]) =>
              field === "name" || showOptionalProjectFields || editingProjectId,
          )
          .map(([field, label, placeholder]) => (
            <FormField
              key={field}
              label={label}
              value={form[field] ?? ""}
              onChangeText={(value) => updateField(field, value)}
              placeholder={placeholder}
              multiline={field === "notes"}
              error={validation.errors[field]}
            />
          ))}
        {!showOptionalProjectFields && !editingProjectId ? (
          <AppButton
            label="Add Customer and Site Details"
            icon="list.bullet.clipboard"
            variant="secondary"
            onPress={() => setShowOptionalProjectFields(true)}
            accessibilityLabel="Show optional customer site and work order fields"
          />
        ) : null}
        <View style={styles.inlineActions}>
          <AppButton
            label={editingProjectId ? "Save Changes" : "Create Job"}
            icon="plus.circle.fill"
            onPress={saveProject}
            accessibilityLabel={
              editingProjectId ? "Save job changes" : "Create local job"
            }
          />
          {editingProjectId ? (
            <AppButton
              label="Cancel"
              variant="secondary"
              onPress={() => {
                setEditingProjectId(undefined);
                setForm(initialProjectFormState);
                setShowOptionalProjectFields(false);
              }}
            />
          ) : null}
        </View>
      </Card>

      <Card>
        <SectionHeader title="Local Jobs" />
        {projects.length ? (
          projects.map((project) => (
            <View key={project.id} style={styles.projectRow}>
              <View style={styles.projectCopy}>
                <AppText variant="label">{project.name}</AppText>
                <AppText variant="small" muted>
                  {[
                    project.customerCompany,
                    project.siteAddress,
                    project.status,
                  ]
                    .filter(Boolean)
                    .join(" / ")}
                </AppText>
              </View>
              <View style={styles.projectButtons}>
                <AppButton
                  label="Open"
                  variant="secondary"
                  onPress={() => setSelectedProjectId(project.id)}
                />
                <AppButton
                  label="Edit"
                  variant="secondary"
                  onPress={() => {
                    setSelectedProjectId(project.id);
                    setEditingProjectId(project.id);
                    setForm(formFromProject(project));
                    setShowOptionalProjectFields(true);
                  }}
                />
                <AppButton
                  label="Archive"
                  variant="secondary"
                  onPress={() => setPendingAction({ type: "archive", project })}
                />
                <AppButton
                  label="Delete"
                  variant="danger"
                  onPress={() => setPendingAction({ type: "delete", project })}
                />
              </View>
            </View>
          ))
        ) : (
          <EmptyState
            title="No jobs found"
            message="Create a local job or change your search filters."
            icon="folder"
          />
        )}
      </Card>

      <Card>
        <SectionHeader
          title="Project Screen"
          detail={
            selectedProject
              ? selectedProject.name
              : "Select or create a project."
          }
        />
        <MetricRow label="Overview" value={selectedProject?.status ?? "None"} />
        {evidenceCategories.map((category) => {
          const items = evidenceItems.filter(
            (item) => item.category === category,
          );
          const label =
            category === "BEFORE"
              ? "Before"
              : category === "WORK"
                ? "Work"
                : category === "AFTER"
                  ? "After"
                  : category === "DOCUMENT"
                    ? "Documents"
                    : "Other";

          if (!items.length) {
            return (
              <EmptyState
                key={category}
                title={`${label} empty`}
                message={getEvidenceEmptyStateMessage(category)}
                ctaLabel="Add Evidence"
                icon="tray"
              />
            );
          }

          return (
            <MetricRow key={category} label={label} value={items.length} />
          );
        })}
        <MetricRow
          label="Report"
          value={`${summary.missingCaptionCount} missing captions`}
        />
        <MetricRow
          label="Original media"
          value={summary.mediaAssetCount ?? 0}
        />
      </Card>

      <Card>
        <SectionHeader
          title="Report History"
          detail={
            selectedProject
              ? "Local drafts and generated PDFs for this project."
              : "Select a project to view local report history."
          }
        />
        {selectedProject && reportHistory.length ? (
          reportHistory.slice(0, 5).map((item) => (
            <View key={item.draftId} style={styles.projectRow}>
              <View style={styles.projectCopy}>
                <AppText variant="label">{item.title}</AppText>
                <AppText variant="small" muted>
                  {item.hasGeneratedPdf ? "Generated PDF" : "Draft"} /{" "}
                  {formatDate(item.generatedAt ?? item.updatedAt)}
                </AppText>
              </View>
              <MetricRow
                label="Status"
                value={item.status === "ready" ? "Ready" : "Draft"}
              />
            </View>
          ))
        ) : (
          <EmptyState
            title="No report history"
            message="Save a local report draft to see it here."
            icon="clock"
          />
        )}
      </Card>
    </AppScreen>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function getEvidenceEmptyStateMessage(
  category: (typeof evidenceCategories)[number],
) {
  if (category === "BEFORE") {
    return "Capture the starting condition before work begins.";
  }
  if (category === "WORK") {
    return "Add progress photos while the work is happening.";
  }
  if (category === "AFTER") {
    return "Show the finished condition clearly.";
  }
  if (category === "DOCUMENT") {
    return "Attach work orders, receipts, signed forms, or supporting files.";
  }

  return "Use this for anything that does not fit the main job stages.";
}

const styles = StyleSheet.create({
  inlineActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  projectRow: {
    gap: spacing.md,
  },
  projectCopy: {
    gap: spacing.xs,
  },
  projectButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
