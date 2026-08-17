import {
  type Annotation,
  evidenceCategories,
  type EvidenceCategory,
  type EvidenceItem,
  type MediaAsset,
  type MediaSourceType,
  type Project,
} from "@fielddoc/domain";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Image, StyleSheet, View } from "react-native";

import { AppButton } from "@/components/app-button";
import { AppScreen } from "@/components/app-screen";
import { AppText } from "@/components/app-text";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { FormField } from "@/components/form-field";
import { SectionHeader } from "@/components/section-header";
import { StatusBanner } from "@/components/status-banner";
import { spacing } from "@/design/tokens";
import {
  captureCameraPhoto,
  importLocalFile,
  pickPhotoLibraryMediaBatch,
  type PreparedLocalMediaAsset,
} from "@/infrastructure/media/local-media";
import { getLocalRepositories } from "@/infrastructure/local-store/repositories";

const categoryLabels: Record<EvidenceCategory, string> = {
  BEFORE: "Before",
  WORK: "Work",
  AFTER: "After",
  DOCUMENT: "Document",
  OTHER: "Other",
};

const sourceLabels: Record<MediaSourceType, string> = {
  CAMERA_PHOTO: "camera photo",
  PHOTO_LIBRARY: "photo library item",
  DOCUMENT_SCAN: "document scan",
  FILE_IMPORT: "file import",
};

const fieldCaptureStages: EvidenceCategory[] = ["BEFORE", "WORK", "AFTER"];

export default function CaptureScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | undefined>();
  const [category, setCategory] = useState<EvidenceCategory>("BEFORE");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [notes, setNotes] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [editingEvidenceId, setEditingEvidenceId] = useState<
    string | undefined
  >();
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [mediaCounts, setMediaCounts] = useState<Record<string, number>>({});
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>();
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [editingMediaId, setEditingMediaId] = useState<string>();
  const [mediaCaption, setMediaCaption] = useState("");
  const [mediaNotes, setMediaNotes] = useState("");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationBody, setAnnotationBody] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [busySource, setBusySource] = useState<MediaSourceType | "metadata">();
  const selectedProject = projects.find((project) => project.id === projectId);
  const selectedEvidence = evidenceItems.find(
    (item) => item.id === selectedEvidenceId,
  );
  const editingMedia = mediaAssets.find((item) => item.id === editingMediaId);
  const captureCounts = evidenceItems.reduce<Record<EvidenceCategory, number>>(
    (counts, item) => ({
      ...counts,
      [item.category]: counts[item.category] + 1,
    }),
    { BEFORE: 0, WORK: 0, AFTER: 0, DOCUMENT: 0, OTHER: 0 },
  );

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
        const nextEvidenceItems =
          await repositories.evidence.listByProject(nextProjectId);
        setEvidenceItems(nextEvidenceItems);
        setMediaCounts(
          await repositories.media.countByEvidenceIds(
            nextEvidenceItems.map((item) => item.id),
          ),
        );
        if (selectedEvidenceId) {
          if (
            nextEvidenceItems.some((item) => item.id === selectedEvidenceId)
          ) {
            await reloadEvidenceDetail(selectedEvidenceId);
          } else {
            clearEvidenceDetail();
          }
        }
      } else {
        setEvidenceItems([]);
        setMediaCounts({});
        clearEvidenceDetail();
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
  }, [projectId, selectedEvidenceId]);

  useFocusEffect(refresh);

  async function saveEvidenceMetadata() {
    if (!projectId) {
      setErrorMessage("Create a project before adding evidence metadata.");
      return;
    }

    try {
      setBusySource("metadata");
      const repositories = await getLocalRepositories();
      const evidence = editingEvidenceId
        ? await repositories.evidence.update(editingEvidenceId, {
            projectId,
            category,
            title,
            caption,
            notes,
            isImportant,
          })
        : await repositories.evidence.create({
            projectId,
            category,
            title,
            caption,
            notes,
            isImportant,
            captureTimestamp: new Date().toISOString(),
          });

      setStatusMessage(
        `${categoryLabels[evidence.category]} evidence metadata saved locally.`,
      );
      await reloadEvidence(projectId);
      resetEvidenceForm();
      setErrorMessage(undefined);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Evidence metadata failed.",
      );
    } finally {
      setBusySource(undefined);
    }
  }

  async function addMediaEvidence(
    sourceType: Exclude<MediaSourceType, "DOCUMENT_SCAN">,
  ) {
    if (!projectId) {
      setErrorMessage("Create a project before attaching evidence media.");
      return;
    }

    try {
      setBusySource(sourceType);
      const preparedMediaItems = await pickMedia(sourceType);
      if (!preparedMediaItems.length) {
        setStatusMessage("Media selection canceled.");
        setErrorMessage(undefined);
        return;
      }

      const repositories = await getLocalRepositories();
      const savedItems: Array<{
        evidence: EvidenceItem;
        mediaAsset: MediaAsset;
      }> = [];

      for (const [index, preparedMedia] of preparedMediaItems.entries()) {
        const evidence = await repositories.evidence.create({
          projectId,
          category,
          title:
            title ||
            (preparedMediaItems.length > 1
              ? `${preparedMedia.displayName} ${index + 1}`
              : preparedMedia.displayName),
          caption,
          notes,
          isImportant,
          captureTimestamp: preparedMedia.captureTimestamp,
        });
        const mediaAsset = await repositories.media.create({
          evidenceItemId: evidence.id,
          ...preparedMedia,
          caption,
          notes,
        });
        savedItems.push({ evidence, mediaAsset });
      }

      const lastSaved = savedItems.at(-1);

      setStatusMessage(
        `${savedItems.length} ${categoryLabels[category].toLowerCase()} evidence ${
          savedItems.length === 1 ? "item" : "items"
        } saved from ${sourceLabels[sourceType]}.`,
      );
      await reloadEvidence(projectId);
      if (lastSaved) {
        setSelectedEvidenceId(lastSaved.evidence.id);
        await reloadEvidenceDetail(
          lastSaved.evidence.id,
          lastSaved.mediaAsset.id,
        );
      }
      resetEvidenceForm();
      setErrorMessage(undefined);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Evidence media could not be saved locally.",
      );
    } finally {
      setBusySource(undefined);
    }
  }

  async function deleteEvidenceMetadata(id: string) {
    const repositories = await getLocalRepositories();
    await repositories.evidence.delete(id);
    if (projectId) {
      await reloadEvidence(projectId);
    }
    if (selectedEvidenceId === id) {
      clearEvidenceDetail();
    }
    setStatusMessage("Evidence metadata deleted locally.");
  }

  async function reloadEvidence(nextProjectId: string) {
    const repositories = await getLocalRepositories();
    const nextEvidenceItems =
      await repositories.evidence.listByProject(nextProjectId);
    setEvidenceItems(nextEvidenceItems);
    setMediaCounts(
      await repositories.media.countByEvidenceIds(
        nextEvidenceItems.map((item) => item.id),
      ),
    );
  }

  async function reloadMedia(evidenceId: string, preferredMediaId?: string) {
    const repositories = await getLocalRepositories();
    const rows = await repositories.media.listByEvidenceItem(evidenceId, {
      includeDeleted: true,
    });
    setMediaAssets(rows);

    const nextEditingMedia =
      rows.find((item) => item.id === (preferredMediaId ?? editingMediaId)) ??
      rows.find((item) => !item.deletedAt);

    if (nextEditingMedia) {
      setEditingMediaId(nextEditingMedia.id);
      setMediaCaption(nextEditingMedia.caption ?? "");
      setMediaNotes(nextEditingMedia.notes ?? "");
    } else {
      resetMediaForm();
    }
  }

  async function reloadAnnotations(evidenceId: string) {
    const repositories = await getLocalRepositories();
    setAnnotations(
      await repositories.annotations.listByEvidenceItem(evidenceId, {
        includeDeleted: true,
      }),
    );
  }

  async function reloadEvidenceDetail(
    evidenceId: string,
    preferredMediaId?: string,
  ) {
    await Promise.all([
      reloadMedia(evidenceId, preferredMediaId),
      reloadAnnotations(evidenceId),
    ]);
  }

  async function openEvidenceDetail(evidence: EvidenceItem) {
    setSelectedEvidenceId(evidence.id);
    resetMediaForm();
    await reloadEvidenceDetail(evidence.id);
  }

  async function saveMediaMetadata() {
    if (!editingMediaId || !selectedEvidenceId || !projectId) return;

    try {
      const repositories = await getLocalRepositories();
      await repositories.media.updateMetadata(editingMediaId, {
        caption: mediaCaption,
        notes: mediaNotes,
      });
      await reloadEvidenceDetail(selectedEvidenceId, editingMediaId);
      await reloadEvidence(projectId);
      setStatusMessage("Media caption saved locally.");
      setErrorMessage(undefined);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Media caption was not saved.",
      );
    }
  }

  async function deleteMediaAsset(id: string) {
    if (!selectedEvidenceId || !projectId) return;

    const repositories = await getLocalRepositories();
    await repositories.media.delete(id);
    await reloadEvidenceDetail(selectedEvidenceId);
    await reloadEvidence(projectId);
    setStatusMessage("Media asset removed from the active gallery.");
  }

  async function restoreMediaAsset(id: string) {
    if (!selectedEvidenceId || !projectId) return;

    const repositories = await getLocalRepositories();
    await repositories.media.restore(id);
    await reloadEvidenceDetail(selectedEvidenceId, id);
    await reloadEvidence(projectId);
    setStatusMessage("Media asset restored locally.");
  }

  async function saveAnnotation() {
    if (!selectedEvidenceId) return;

    try {
      const repositories = await getLocalRepositories();
      await repositories.annotations.create({
        evidenceItemId: selectedEvidenceId,
        mediaAssetId: editingMediaId ?? null,
        body: annotationBody,
      });
      await reloadAnnotations(selectedEvidenceId);
      setAnnotationBody("");
      setStatusMessage("Annotation saved locally.");
      setErrorMessage(undefined);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Annotation was not saved.",
      );
    }
  }

  async function deleteAnnotation(id: string) {
    if (!selectedEvidenceId) return;

    const repositories = await getLocalRepositories();
    await repositories.annotations.delete(id);
    await reloadAnnotations(selectedEvidenceId);
    setStatusMessage("Annotation hidden locally.");
  }

  async function restoreAnnotation(id: string) {
    if (!selectedEvidenceId) return;

    const repositories = await getLocalRepositories();
    await repositories.annotations.restore(id);
    await reloadAnnotations(selectedEvidenceId);
    setStatusMessage("Annotation restored locally.");
  }

  function resetEvidenceForm() {
    setEditingEvidenceId(undefined);
    setTitle("");
    setCaption("");
    setNotes("");
    setIsImportant(false);
  }

  function resetMediaForm() {
    setEditingMediaId(undefined);
    setMediaCaption("");
    setMediaNotes("");
  }

  function clearEvidenceDetail() {
    setSelectedEvidenceId(undefined);
    setMediaAssets([]);
    setAnnotations([]);
    setAnnotationBody("");
    resetMediaForm();
  }

  function startEditingEvidence(evidence: EvidenceItem) {
    setEditingEvidenceId(evidence.id);
    setProjectId(evidence.projectId);
    setCategory(evidence.category);
    setTitle(evidence.title ?? "");
    setCaption(evidence.caption ?? "");
    setNotes(evidence.notes ?? "");
    setIsImportant(evidence.isImportant);
  }

  function pickMedia(
    sourceType: Exclude<MediaSourceType, "DOCUMENT_SCAN">,
  ): Promise<PreparedLocalMediaAsset[]> {
    if (sourceType === "CAMERA_PHOTO") return pickOne(captureCameraPhoto);
    if (sourceType === "PHOTO_LIBRARY") return pickPhotoLibraryMediaBatch();
    return pickOne(importLocalFile);
  }

  async function pickOne(
    pick: () => Promise<PreparedLocalMediaAsset | null>,
  ): Promise<PreparedLocalMediaAsset[]> {
    const media = await pick();
    return media ? [media] : [];
  }

  function advanceFieldStage() {
    const currentIndex = fieldCaptureStages.indexOf(category);
    const nextIndex =
      currentIndex === -1
        ? 0
        : Math.min(currentIndex + 1, fieldCaptureStages.length - 1);
    setCategory(fieldCaptureStages[nextIndex] ?? "BEFORE");
  }

  function startEditingMedia(mediaAsset: MediaAsset) {
    setEditingMediaId(mediaAsset.id);
    setMediaCaption(mediaAsset.caption ?? "");
    setMediaNotes(mediaAsset.notes ?? "");
  }

  return (
    <AppScreen>
      <View>
        <AppText variant="hero">Capture</AppText>
        <AppText muted>
          Capture photos or import files into local immutable evidence storage.
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
          title="Field Capture"
          detail="Sticky stage controls for fast one-handed evidence capture."
        />
        <View style={styles.captureStats}>
          {fieldCaptureStages.map((stage) => (
            <View key={stage} style={styles.captureStat}>
              <AppText variant="small" muted>
                {categoryLabels[stage]}
              </AppText>
              <AppText variant="label">{captureCounts[stage]}</AppText>
            </View>
          ))}
        </View>
        <View style={styles.inlineActions}>
          {fieldCaptureStages.map((nextCategory) => (
            <AppButton
              key={nextCategory}
              label={categoryLabels[nextCategory]}
              variant={nextCategory === category ? "primary" : "secondary"}
              onPress={() => setCategory(nextCategory)}
              accessibilityLabel={`Set capture stage to ${categoryLabels[nextCategory]}`}
            />
          ))}
        </View>
        <FormField
          label="Quick Caption"
          value={caption}
          onChangeText={setCaption}
          placeholder="North wall before repair"
        />
        <View style={styles.inlineActions}>
          <AppButton
            label={isImportant ? "Important" : "Mark Important"}
            icon={isImportant ? "star.fill" : "star"}
            variant={isImportant ? "primary" : "secondary"}
            onPress={() => setIsImportant((current) => !current)}
            accessibilityLabel={
              isImportant
                ? "Remove important evidence mark"
                : "Mark next evidence as important"
            }
          />
        </View>
        <View style={styles.inlineActions}>
          <AppButton
            label="Take Photo"
            icon="camera.fill"
            onPress={() => addMediaEvidence("CAMERA_PHOTO")}
            loading={busySource === "CAMERA_PHOTO"}
            disabled={!selectedProject || Boolean(editingEvidenceId)}
            accessibilityLabel={`Take ${categoryLabels[category]} evidence photo`}
          />
          <AppButton
            label="Import Batch"
            icon="photo.on.rectangle"
            variant="secondary"
            onPress={() => addMediaEvidence("PHOTO_LIBRARY")}
            loading={busySource === "PHOTO_LIBRARY"}
            disabled={!selectedProject || Boolean(editingEvidenceId)}
            accessibilityLabel="Import one or more evidence photos"
          />
          <AppButton
            label="Next Stage"
            icon="arrow.right"
            variant="secondary"
            onPress={advanceFieldStage}
            accessibilityLabel="Move to the next field capture stage"
          />
        </View>
      </Card>

      <Card>
        <SectionHeader
          title="Evidence Metadata"
          detail={
            editingEvidenceId
              ? "Edit evidence metadata stored in SQLite."
              : "Save metadata alone or attach an original media file."
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
            label={isImportant ? "Important" : "Mark Important"}
            icon={isImportant ? "star.fill" : "star"}
            variant={isImportant ? "primary" : "secondary"}
            onPress={() => setIsImportant((current) => !current)}
            accessibilityLabel={
              isImportant
                ? "Remove important evidence mark"
                : "Mark evidence as important"
            }
          />
        </View>
        <View style={styles.inlineActions}>
          <AppButton
            label={
              editingEvidenceId
                ? "Save Evidence Changes"
                : "Save Evidence Metadata"
            }
            icon="tray.and.arrow.down.fill"
            onPress={saveEvidenceMetadata}
            loading={busySource === "metadata"}
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
          title="Attach Original"
          detail="Original media is copied into app storage and recorded with SHA-256 metadata."
        />
        <View style={styles.inlineActions}>
          <AppButton
            label="Take Photo"
            icon="camera.fill"
            onPress={() => addMediaEvidence("CAMERA_PHOTO")}
            loading={busySource === "CAMERA_PHOTO"}
            disabled={Boolean(editingEvidenceId)}
            accessibilityLabel="Capture a camera photo as evidence"
          />
          <AppButton
            label="Choose Photo"
            icon="photo.on.rectangle"
            variant="secondary"
            onPress={() => addMediaEvidence("PHOTO_LIBRARY")}
            loading={busySource === "PHOTO_LIBRARY"}
            disabled={Boolean(editingEvidenceId)}
            accessibilityLabel="Choose a photo from the library as evidence"
          />
          <AppButton
            label="Import File"
            icon="doc.badge.plus"
            variant="secondary"
            onPress={() => addMediaEvidence("FILE_IMPORT")}
            loading={busySource === "FILE_IMPORT"}
            disabled={Boolean(editingEvidenceId)}
            accessibilityLabel="Import a local file as evidence"
          />
        </View>
        {editingEvidenceId ? (
          <AppText variant="small" muted>
            Finish or cancel the edit before attaching a new original.
          </AppText>
        ) : null}
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
                  {item.isImportant ? "Important / " : ""}
                  {categoryLabels[item.category]} /{" "}
                  {item.title ?? "Untitled evidence"}
                </AppText>
                <AppText variant="small" muted>
                  {[
                    item.caption ?? "Missing caption",
                    `${mediaCounts[item.id] ?? 0} original file${
                      (mediaCounts[item.id] ?? 0) === 1 ? "" : "s"
                    }`,
                  ].join(" / ")}
                </AppText>
              </View>
              <View style={styles.inlineActions}>
                <AppButton
                  label="Details"
                  variant={
                    item.id === selectedEvidenceId ? "primary" : "secondary"
                  }
                  onPress={() => openEvidenceDetail(item)}
                />
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

      <Card>
        <SectionHeader
          title="Evidence Detail"
          detail={
            selectedEvidence
              ? `${categoryLabels[selectedEvidence.category]} / ${
                  selectedEvidence.title ?? "Untitled evidence"
                }`
              : "Select Details on an evidence item."
          }
        />
        {selectedEvidence ? (
          <View style={styles.detailStack}>
            <AppText muted>
              {selectedEvidence.caption ?? "Evidence caption is missing."}
            </AppText>
            {mediaAssets.length ? (
              mediaAssets.map((mediaAsset) => (
                <View
                  key={mediaAsset.id}
                  style={[
                    styles.mediaRow,
                    mediaAsset.deletedAt ? styles.deletedMediaRow : null,
                  ]}
                >
                  {mediaAsset.mediaType === "IMAGE" && !mediaAsset.deletedAt ? (
                    <Image
                      source={{ uri: mediaAsset.localUri }}
                      style={styles.mediaPreview}
                      accessibilityLabel={
                        mediaAsset.caption ?? "Evidence image preview"
                      }
                    />
                  ) : (
                    <View style={styles.mediaPlaceholder}>
                      <AppText variant="label">{mediaAsset.mediaType}</AppText>
                    </View>
                  )}
                  <View style={styles.mediaCopy}>
                    <AppText variant="label">
                      {mediaAsset.caption ??
                        (mediaAsset.deletedAt
                          ? "Deleted original"
                          : "Missing media caption")}
                    </AppText>
                    <AppText variant="small" muted>
                      {[
                        mediaAsset.mimeType,
                        `${Math.round(mediaAsset.sizeBytes / 1024)} KB`,
                        `SHA ${mediaAsset.sha256.slice(0, 10)}`,
                      ].join(" / ")}
                    </AppText>
                    {mediaAsset.notes ? (
                      <AppText variant="small" muted>
                        {mediaAsset.notes}
                      </AppText>
                    ) : null}
                    <View style={styles.inlineActions}>
                      <AppButton
                        label="Edit Caption"
                        variant={
                          mediaAsset.id === editingMediaId
                            ? "primary"
                            : "secondary"
                        }
                        onPress={() => startEditingMedia(mediaAsset)}
                      />
                      {mediaAsset.deletedAt ? (
                        <AppButton
                          label="Restore"
                          variant="secondary"
                          onPress={() => restoreMediaAsset(mediaAsset.id)}
                        />
                      ) : (
                        <AppButton
                          label="Remove"
                          variant="danger"
                          onPress={() => deleteMediaAsset(mediaAsset.id)}
                        />
                      )}
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <EmptyState
                title="No original files"
                message="Attach a photo or file to build this evidence gallery."
                icon="photo.on.rectangle"
              />
            )}

            {editingMedia ? (
              <View style={styles.mediaEditor}>
                <SectionHeader
                  title="Media Caption"
                  detail="Stored as editable metadata; original file bytes remain unchanged."
                />
                <FormField
                  label="Caption"
                  value={mediaCaption}
                  onChangeText={setMediaCaption}
                  placeholder="North wall before repair"
                />
                <FormField
                  label="Notes"
                  value={mediaNotes}
                  onChangeText={setMediaNotes}
                  placeholder="Optional media-specific notes"
                  multiline
                />
                <View style={styles.inlineActions}>
                  <AppButton
                    label="Save Media Caption"
                    icon="tray.and.arrow.down.fill"
                    onPress={saveMediaMetadata}
                  />
                  <AppButton
                    label="Cancel"
                    variant="secondary"
                    onPress={resetMediaForm}
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.mediaEditor}>
              <SectionHeader
                title="Annotations"
                detail={
                  editingMedia
                    ? "Annotation will reference the selected original."
                    : "Annotation will reference the evidence item."
                }
              />
              {annotations.length ? (
                annotations.map((annotation) => {
                  const linkedMedia = mediaAssets.find(
                    (mediaAsset) => mediaAsset.id === annotation.mediaAssetId,
                  );

                  return (
                    <View
                      key={annotation.id}
                      style={[
                        styles.annotationRow,
                        annotation.deletedAt ? styles.deletedMediaRow : null,
                      ]}
                    >
                      <View style={styles.mediaCopy}>
                        <AppText variant="label">{annotation.body}</AppText>
                        <AppText variant="small" muted>
                          {linkedMedia
                            ? `Linked to ${
                                linkedMedia.caption ?? linkedMedia.mediaType
                              }`
                            : "Linked to evidence item"}
                        </AppText>
                      </View>
                      {annotation.deletedAt ? (
                        <AppButton
                          label="Restore"
                          variant="secondary"
                          onPress={() => restoreAnnotation(annotation.id)}
                        />
                      ) : (
                        <AppButton
                          label="Remove"
                          variant="danger"
                          onPress={() => deleteAnnotation(annotation.id)}
                        />
                      )}
                    </View>
                  );
                })
              ) : (
                <EmptyState
                  title="No annotations"
                  message="Add context without changing original files."
                  icon="pencil.and.outline"
                />
              )}
              <FormField
                label="New annotation"
                value={annotationBody}
                onChangeText={setAnnotationBody}
                placeholder="Door jamb damage visible before work"
                multiline
              />
              <AppButton
                label="Save Annotation"
                icon="pencil.and.outline"
                onPress={saveAnnotation}
              />
            </View>
          </View>
        ) : (
          <EmptyState
            title="No evidence selected"
            message="Open an evidence item to review originals and captions."
            icon="doc.text.magnifyingglass"
          />
        )}
      </Card>

      <StatusBanner
        tone="info"
        title="Document scanner not built yet"
        message="Sprint 3 supports camera photos, photo-library import, and file import only. Cloud upload and document scanning remain out of scope."
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
  captureStats: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  captureStat: {
    flex: 1,
    gap: spacing.xs,
    minHeight: 56,
  },
  evidenceRow: {
    gap: spacing.md,
  },
  evidenceCopy: {
    gap: spacing.xs,
  },
  detailStack: {
    gap: spacing.lg,
  },
  mediaRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
  },
  deletedMediaRow: {
    opacity: 0.62,
  },
  mediaPreview: {
    borderRadius: 6,
    height: 88,
    width: 88,
  },
  mediaPlaceholder: {
    alignItems: "center",
    borderRadius: 6,
    height: 88,
    justifyContent: "center",
    width: 88,
  },
  mediaCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  mediaEditor: {
    gap: spacing.md,
  },
  annotationRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
  },
});
