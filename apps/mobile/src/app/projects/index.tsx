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
  ["name", "Project name", "Unit 12 turnover"],
  ["customerCompany", "Customer / company", "Rivergate Properties"],
  ["siteAddress", "Site / address", "1200 Grove Ave"],
  ["workOrderReference", "Work order / reference", "WO-1042"],
  ["scheduledDate", "Scheduled date", "2026-08-13"],
  ["notes", "Notes", "Access code, scope notes, or crew instructions"],
] as const satisfies ReadonlyArray<
  readonly [keyof ProjectFormInput, string, string]
>;

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
  const [summary, setSummary] = useState<ProjectEvidenceSummary>(emptySummary);
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
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
        const [items, nextSummary] = await Promise.all([
          repositories.evidence.listByProject(nextSelected),
          repositories.evidence.summarizeProject(nextSelected),
        ]);
        if (!mounted) return;
        setEvidenceItems(items);
        setSummary(nextSummary);
      } else {
        setEvidenceItems([]);
        setSummary(emptySummary);
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

  async function reload() {
    const repositories = await getLocalRepositories();
    const rows = await repositories.projects.list({
      query,
      includeArchived,
      sortBy,
      sortDirection: sortBy === "name" ? "asc" : "desc",
    });
    setProjects(rows);
    if (selectedProjectId) {
      setEvidenceItems(
        await repositories.evidence.listByProject(selectedProjectId),
      );
      setSummary(
        await repositories.evidence.summarizeProject(selectedProjectId),
      );
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
      editingProjectId
        ? "Project updated locally."
        : "Project created locally.",
    );
    setForm({ ...initialProjectFormState, status: "saved" });
    await reload();
  }

  async function archiveProject(id: string) {
    const repositories = await getLocalRepositories();
    await repositories.projects.archive(id);
    setStatusMessage("Project archived locally.");
    await reload();
  }

  async function deleteProject(id: string) {
    const repositories = await getLocalRepositories();
    await repositories.projects.delete(id);
    setSelectedProjectId(undefined);
    setStatusMessage("Project deleted locally.");
    await reload();
  }

  return (
    <AppScreen>
      <View>
        <AppText variant="hero">Projects</AppText>
        <AppText muted>
          Create, edit, archive, delete, search, and sort projects offline.
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

      <Card>
        <SectionHeader
          title="Find Projects"
          detail="Search and sort the local SQLite store."
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
          title={editingProjectId ? "Edit Project" : "Create Local Project"}
          detail="Only project name is required."
        />
        {formFields.map(([field, label, placeholder]) => (
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
        <View style={styles.inlineActions}>
          <AppButton
            label={editingProjectId ? "Save Changes" : "Create Local Project"}
            icon="plus.circle.fill"
            onPress={saveProject}
            accessibilityLabel={
              editingProjectId ? "Save project changes" : "Create local project"
            }
          />
          {editingProjectId ? (
            <AppButton
              label="Cancel"
              variant="secondary"
              onPress={() => {
                setEditingProjectId(undefined);
                setForm(initialProjectFormState);
              }}
            />
          ) : null}
        </View>
      </Card>

      <Card>
        <SectionHeader title="Local Projects" />
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
                  }}
                />
                <AppButton
                  label="Archive"
                  variant="secondary"
                  onPress={() => archiveProject(project.id)}
                />
                <AppButton
                  label="Delete"
                  variant="danger"
                  onPress={() => deleteProject(project.id)}
                />
              </View>
            </View>
          ))
        ) : (
          <EmptyState
            title="No projects found"
            message="Create a local project or change your search filters."
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
                message="No evidence metadata has been added yet."
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
      </Card>
    </AppScreen>
  );
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
