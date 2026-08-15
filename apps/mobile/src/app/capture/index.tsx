import {
  evidenceCategories,
  type EvidenceCategory,
  type EvidenceItem,
  type Project,
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
import { SectionHeader } from "@/components/section-header";
import { StatusBanner } from "@/components/status-banner";
import { spacing } from "@/design/tokens";
import { getLocalRepositories } from "@/infrastructure/local-store/repositories";

const categoryLabels: Record<EvidenceCategory, string> = {
  BEFORE: "Before",
  WORK: "Work",
  AFTER: "After",
  DOCUMENT: "Document",
  OTHER: "Other",
};

export default function CaptureScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | undefined>();
  const [category, setCategory] = useState<EvidenceCategory>("BEFORE");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [notes, setNotes] = useState("");
  const [editingEvidenceId, setEditingEvidenceId] = useState<
    string | undefined
  >();
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const selectedProject = projects.find((project) => project.id === projectId);

  const refresh = useCallback(() => {
    let mounted = true;

    async function load() {
      const repositories = await getLocalRepositories();
      const rows = await repositories.projects.list({
        sortBy: "updatedAt",
        sortDirection: "desc",
      });

      if (!mounted) return;
      setProjects(rows);
      const nextProjectId = projectId ?? rows[0]?.id;
      setProjectId(nextProjectId);

      if (nextProjectId) {
        setEvidenceItems(
          await repositories.evidence.listByProject(nextProjectId),
        );
      } else {
        setEvidenceItems([]);
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
  }, [projectId]);

  useFocusEffect(refresh);

  async function saveEvidenceMetadata() {
    if (!projectId) {
      setErrorMessage("Create a project before adding evidence metadata.");
      return;
    }

    const repositories = await getLocalRepositories();
    const evidence = editingEvidenceId
      ? await repositories.evidence.update(editingEvidenceId, {
          projectId,
          category,
          title,
          caption,
          notes,
        })
      : await repositories.evidence.create({
          projectId,
          category,
          title,
          caption,
          notes,
          captureTimestamp: new Date().toISOString(),
        });

    setStatusMessage(
      `${categoryLabels[evidence.category]} evidence metadata saved locally.`,
    );
    setEvidenceItems(await repositories.evidence.listByProject(projectId));
    setEditingEvidenceId(undefined);
    setTitle("");
    setCaption("");
    setNotes("");
    setErrorMessage(undefined);
  }

  async function deleteEvidenceMetadata(id: string) {
    const repositories = await getLocalRepositories();
    await repositories.evidence.delete(id);
    if (projectId) {
      setEvidenceItems(await repositories.evidence.listByProject(projectId));
    }
    setStatusMessage("Evidence metadata deleted locally.");
  }

  function resetEvidenceForm() {
    setEditingEvidenceId(undefined);
    setTitle("");
    setCaption("");
    setNotes("");
  }

  function startEditingEvidence(evidence: EvidenceItem) {
    setEditingEvidenceId(evidence.id);
    setProjectId(evidence.projectId);
    setCategory(evidence.category);
    setTitle(evidence.title ?? "");
    setCaption(evidence.caption ?? "");
    setNotes(evidence.notes ?? "");
  }

  return (
    <AppScreen>
      <View>
        <AppText variant="hero">Capture</AppText>
        <AppText muted>
          Store evidence metadata offline now. Camera, scanner, and media files
          arrive later.
        </AppText>
      </View>

      {errorMessage ? (
        <StatusBanner
          tone="error"
          title="Evidence not saved"
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
          title="Project"
          detail="Evidence metadata is linked to a local project."
        />
        {projects.length ? (
          <View style={styles.inlineActions}>
            {projects.slice(0, 4).map((project) => (
              <AppButton
                key={project.id}
                label={project.name}
                variant={project.id === projectId ? "primary" : "secondary"}
                onPress={() => {
                  setProjectId(project.id);
                  resetEvidenceForm();
                }}
                accessibilityLabel={`Select ${project.name}`}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            title="No projects"
            message="Create a project before adding evidence metadata."
            icon="folder.badge.plus"
          />
        )}
        {selectedProject ? (
          <AppText muted>
            Selected: {selectedProject.siteAddress ?? selectedProject.name}
          </AppText>
        ) : null}
      </Card>

      <Card>
        <SectionHeader
          title="Evidence Metadata"
          detail={
            editingEvidenceId
              ? "Edit evidence metadata stored in SQLite."
              : "No media capture yet; metadata persists in SQLite."
          }
        />
        <View style={styles.inlineActions}>
          {evidenceCategories.map((nextCategory) => (
            <AppButton
              key={nextCategory}
              label={categoryLabels[nextCategory]}
              variant={nextCategory === category ? "primary" : "secondary"}
              onPress={() => setCategory(nextCategory)}
            />
          ))}
        </View>
        <FormField
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Kitchen before photos"
        />
        <FormField
          label="Caption"
          value={caption}
          onChangeText={setCaption}
          placeholder="Optional caption"
        />
        <FormField
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional evidence notes"
          multiline
        />
        <View style={styles.inlineActions}>
          <AppButton
            label={
              editingEvidenceId
                ? "Save Evidence Changes"
                : "Save Evidence Metadata"
            }
            icon="tray.and.arrow.down.fill"
            onPress={saveEvidenceMetadata}
            accessibilityLabel="Save evidence metadata locally"
          />
          {editingEvidenceId ? (
            <AppButton
              label="Cancel Edit"
              variant="secondary"
              onPress={resetEvidenceForm}
            />
          ) : null}
        </View>
      </Card>

      <Card>
        <SectionHeader
          title="Saved Evidence Metadata"
          detail={selectedProject ? selectedProject.name : "Select a project."}
        />
        {evidenceItems.length ? (
          evidenceItems.map((item) => (
            <View key={item.id} style={styles.evidenceRow}>
              <View style={styles.evidenceCopy}>
                <AppText variant="label">
                  {categoryLabels[item.category]} /{" "}
                  {item.title ?? "Untitled evidence"}
                </AppText>
                <AppText variant="small" muted>
                  {item.caption ?? "Missing caption"}
                </AppText>
              </View>
              <View style={styles.inlineActions}>
                <AppButton
                  label="Edit"
                  variant="secondary"
                  onPress={() => startEditingEvidence(item)}
                />
                <AppButton
                  label="Delete"
                  variant="danger"
                  onPress={() => deleteEvidenceMetadata(item.id)}
                />
              </View>
            </View>
          ))
        ) : (
          <EmptyState
            title="No evidence metadata"
            message="Save metadata above to populate this list."
            icon="tray"
          />
        )}
      </Card>

      <StatusBanner
        tone="info"
        title="Scanner not built yet"
        message="Sprint 2 stores project and evidence metadata only; original media files remain out of scope."
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  inlineActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  evidenceRow: {
    gap: spacing.md,
  },
  evidenceCopy: {
    gap: spacing.xs,
  },
});
