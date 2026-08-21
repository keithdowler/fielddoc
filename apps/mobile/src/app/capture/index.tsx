import {
  type Annotation,
  type Document,
  evidenceCategories,
  type EvidenceCategory,
  type EvidenceItem,
  type MediaAsset,
  type MediaSourceType,
  type Project,
  getProofPacketDocumentEntry,
} from "@fielddoc/domain";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
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
  captureDocumentScanBatch,
  importLocalFile,
  importLocalFiles,
  pickPhotoLibraryMedia,
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

const captionSuggestions = [
  "Pre-existing condition",
  "Damage observed",
  "Work in progress",
  "Repair completed",
  "Customer document",
  "Access issue",
];

export default function CaptureScreen() {
  const route = useLocalSearchParams<{
    projectId?: string;
    category?: string;
    missingCaptions?: string;
  }>();
  const consumedRoute = useRef<string | undefined>(undefined);
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
  const [documents, setDocuments] = useState<Document[]>([]);
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
  const captureGuide = getCaptureGuide(Boolean(selectedProject), captureCounts);

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
      const requestedProjectId = rows.some((row) => row.id === route.projectId)
        ? route.projectId
        : undefined;
      const nextProjectId = requestedProjectId ?? projectId ?? rows[0]?.id;
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
        const routeKey = `${route.projectId ?? ""}:${route.category ?? ""}:${route.missingCaptions ?? ""}`;
        if (routeKey !== consumedRoute.current) {
          consumedRoute.current = routeKey;
          if (evidenceCategories.includes(route.category as EvidenceCategory)) {
            setCategory(route.category as EvidenceCategory);
          }
          if (route.missingCaptions === "1") {
            const missingCaption = nextEvidenceItems.find(
              (item) => !item.caption?.trim(),
            );
            if (missingCaption) {
              setSelectedEvidenceId(missingCaption.id);
              setEditingEvidenceId(missingCaption.id);
              setCategory(missingCaption.category);
              setTitle(missingCaption.title ?? "");
              setCaption(missingCaption.caption ?? "");
              setNotes(missingCaption.notes ?? "");
              setIsImportant(missingCaption.isImportant);
              await reloadEvidenceDetail(missingCaption.id);
              setStatusMessage("Add a caption to finish this item.");
            }
          }
        }
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
          : "Projects could not be loaded.",
      );
    });

    return () => {
      mounted = false;
    };
  }, [
    projectId,
    route.category,
    route.missingCaptions,
    route.projectId,
    selectedEvidenceId,
  ]);

  useFocusEffect(refresh);

  async function saveEvidenceMetadata() {
    if (!projectId) {
      setErrorMessage("Create a project before adding evidence.");
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

      setStatusMessage(`${categoryLabels[evidence.category]} evidence saved.`);
      await reloadEvidence(projectId);
      resetEvidenceForm();
      setErrorMessage(undefined);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Evidence could not be saved.",
      );
    } finally {
      setBusySource(undefined);
    }
  }

  async function addMediaEvidence(sourceType: MediaSourceType) {
    if (!projectId) {
      setErrorMessage("Create a project before attaching evidence media.");
      return;
    }

    try {
      setBusySource(sourceType);
      if (sourceType === "DOCUMENT_SCAN") {
        await addDocumentScanEvidence();
        return;
      }

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
        documentCreated: boolean;
      }> = [];

      for (const [index, preparedMedia] of preparedMediaItems.entries()) {
        const evidenceCategory = isDocumentEvidence(preparedMedia)
          ? "DOCUMENT"
          : category;
        const evidenceTitle =
          title ||
          (preparedMediaItems.length > 1
            ? `${preparedMedia.displayName} ${index + 1}`
            : preparedMedia.displayName);
        const evidence = await repositories.evidence.create({
          projectId,
          category: evidenceCategory,
          title: evidenceTitle,
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
        const documentCreated = isDocumentEvidence(preparedMedia);
        if (documentCreated) {
          await repositories.documents.create({
            projectId,
            evidenceItemId: evidence.id,
            mediaAssetId: mediaAsset.id,
            title: evidenceTitle,
            notes,
            fileName: preparedMedia.displayName,
            mimeType: preparedMedia.mimeType,
            sizeBytes: preparedMedia.sizeBytes,
            sha256: preparedMedia.sha256,
            pageCount: inferDocumentPageCount(preparedMedia),
            sourceType: preparedMedia.sourceType,
          });
        }
        savedItems.push({ evidence, mediaAsset, documentCreated });
      }

      const lastSaved = savedItems.at(-1);
      const savedCategories = Array.from(
        new Set(savedItems.map(({ evidence }) => evidence.category)),
      );
      const savedCategoryLabel =
        savedCategories.length === 1
          ? categoryLabels[savedCategories[0]]
          : "Mixed";

      setStatusMessage(
        savedItems.length === 1
          ? `Saved to ${savedCategoryLabel}. Ready for the next item.`
          : `${savedItems.length} items saved from ${sourceLabels[sourceType]}. Ready for the next item.`,
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
          : "The evidence file could not be saved.",
      );
    } finally {
      setBusySource(undefined);
    }
  }

  async function addDocumentScanEvidence() {
    if (!projectId) return;

    const preparedPages = await captureDocumentScanBatch();
    if (!preparedPages.length) {
      setStatusMessage("Document scan canceled.");
      setErrorMessage(undefined);
      return;
    }

    const repositories = await getLocalRepositories();
    const pageCount = preparedPages.length;
    const evidenceTitle =
      title ||
      (pageCount === 1
        ? "Scanned document"
        : `Scanned document (${pageCount} pages)`);
    const evidence = await repositories.evidence.create({
      projectId,
      category: "DOCUMENT",
      title: evidenceTitle,
      caption,
      notes,
      isImportant,
      captureTimestamp:
        preparedPages[0]?.captureTimestamp ?? new Date().toISOString(),
    });

    const mediaAssetsForDocument: MediaAsset[] = [];
    for (const [index, page] of preparedPages.entries()) {
      const mediaAsset = await repositories.media.create({
        evidenceItemId: evidence.id,
        ...page,
        caption: caption || `${evidenceTitle} page ${index + 1}`,
        notes,
      });
      mediaAssetsForDocument.push(mediaAsset);
    }

    const sizeBytes = mediaAssetsForDocument.reduce(
      (total, mediaAsset) => total + mediaAsset.sizeBytes,
      0,
    );
    const mimeTypes = new Set(
      mediaAssetsForDocument.map((mediaAsset) => mediaAsset.mimeType),
    );

    await repositories.documents.create({
      projectId,
      evidenceItemId: evidence.id,
      mediaAssetId: mediaAssetsForDocument[0]?.id ?? null,
      title: evidenceTitle,
      notes,
      fileName:
        pageCount === 1
          ? (preparedPages[0]?.displayName ?? evidenceTitle)
          : `${evidenceTitle}.scanned-pages`,
      mimeType:
        mimeTypes.size === 1 ? (preparedPages[0]?.mimeType ?? null) : "image/*",
      sizeBytes,
      sha256: null,
      pageCount,
      sourceType: "DOCUMENT_SCAN",
    });

    setStatusMessage(
      `${pageCount} scanned document ${pageCount === 1 ? "page" : "pages"} saved as one document.`,
    );
    await reloadEvidence(projectId);
    setSelectedEvidenceId(evidence.id);
    await reloadEvidenceDetail(evidence.id, mediaAssetsForDocument[0]?.id);
    resetEvidenceForm();
    setErrorMessage(undefined);
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
    setStatusMessage("Evidence deleted.");
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

  async function reloadDocuments(evidenceId: string) {
    const repositories = await getLocalRepositories();
    setDocuments(
      await repositories.documents.listByEvidenceItem(evidenceId, {
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
      reloadDocuments(evidenceId),
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
      setStatusMessage("Photo caption saved.");
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
    setStatusMessage("Photo or file restored.");
  }

  async function replaceMediaAsset(
    mediaAsset: MediaAsset,
    sourceType: Exclude<MediaSourceType, "DOCUMENT_SCAN">,
  ) {
    if (!selectedEvidenceId || !projectId) return;

    try {
      setBusySource(sourceType);
      const preparedMedia = await pickReplacementMedia(sourceType);

      if (!preparedMedia) {
        setStatusMessage("Replacement selection canceled.");
        setErrorMessage(undefined);
        return;
      }

      const repositories = await getLocalRepositories();
      const result = await repositories.media.replace({
        replacedMediaAssetId: mediaAsset.id,
        evidenceItemId: selectedEvidenceId,
        ...preparedMedia,
        caption:
          mediaAsset.caption ??
          selectedEvidence?.caption ??
          preparedMedia.displayName,
        notes: mediaAsset.notes ?? undefined,
      });

      await reloadEvidenceDetail(selectedEvidenceId, result.replacement.id);
      await reloadEvidence(projectId);
      setStatusMessage(
        "Replacement saved. The previous original is still protected in the history.",
      );
      setErrorMessage(undefined);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Replacement was not saved.",
      );
    } finally {
      setBusySource(undefined);
    }
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
      setStatusMessage("Note saved.");
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
    setStatusMessage("Note hidden.");
  }

  async function restoreAnnotation(id: string) {
    if (!selectedEvidenceId) return;

    const repositories = await getLocalRepositories();
    await repositories.annotations.restore(id);
    await reloadAnnotations(selectedEvidenceId);
    setStatusMessage("Note restored.");
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
    setDocuments([]);
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
    sourceType: MediaSourceType,
  ): Promise<PreparedLocalMediaAsset[]> {
    if (sourceType === "CAMERA_PHOTO") return pickOne(captureCameraPhoto);
    if (sourceType === "DOCUMENT_SCAN") return captureDocumentScanBatch();
    if (sourceType === "PHOTO_LIBRARY") return pickPhotoLibraryMediaBatch();
    return importLocalFiles();
  }

  async function pickOne(
    pick: () => Promise<PreparedLocalMediaAsset | null>,
  ): Promise<PreparedLocalMediaAsset[]> {
    const media = await pick();
    return media ? [media] : [];
  }

  function pickReplacementMedia(
    sourceType: Exclude<MediaSourceType, "DOCUMENT_SCAN">,
  ): Promise<PreparedLocalMediaAsset | null> {
    if (sourceType === "CAMERA_PHOTO") return captureCameraPhoto();
    if (sourceType === "PHOTO_LIBRARY") return pickPhotoLibraryMedia();
    return importLocalFile();
  }

  function isDocumentEvidence(media: PreparedLocalMediaAsset): boolean {
    return (
      media.mediaType === "DOCUMENT" || media.sourceType === "DOCUMENT_SCAN"
    );
  }

  function inferDocumentPageCount(media: PreparedLocalMediaAsset) {
    if (media.sourceType === "DOCUMENT_SCAN") return 1;
    if (media.mimeType.startsWith("image/")) return 1;

    return null;
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
        <AppText variant="hero">Capture Job Proof</AppText>
        <AppText muted>
          Add photos, scanned pages, PDFs, and files to the right job stage.
          FieldDoc saves your work automatically and keeps working without a
          signal.
        </AppText>
      </View>

      {errorMessage ? (
        <StatusBanner
          tone="error"
          title="Capture needs attention"
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
        tone={captureGuide.tone}
        title={captureGuide.title}
        message={captureGuide.message}
        detail={captureGuide.detail}
      />

      <Card>
        <SectionHeader
          title="Job"
          detail="Choose the project these photos or files belong to."
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
            message="Create a job first so every photo and file has a clear home."
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
          title="Fast Capture"
          detail="Pick the stage once, then add photos or documents."
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
          {captionSuggestions.map((suggestion) => (
            <AppButton
              key={suggestion}
              label={suggestion}
              variant={caption === suggestion ? "primary" : "secondary"}
              onPress={() => setCaption(suggestion)}
              accessibilityLabel={`Use quick caption ${suggestion}`}
            />
          ))}
        </View>
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
            label={`Take ${categoryLabels[category]} Photo`}
            icon="camera.fill"
            onPress={() => addMediaEvidence("CAMERA_PHOTO")}
            loading={busySource === "CAMERA_PHOTO"}
            disabled={!selectedProject || Boolean(editingEvidenceId)}
            accessibilityLabel={`Take ${categoryLabels[category]} evidence photo`}
          />
          <AppButton
            label="Add Photos"
            icon="photo.on.rectangle"
            variant="secondary"
            onPress={() => addMediaEvidence("PHOTO_LIBRARY")}
            loading={busySource === "PHOTO_LIBRARY"}
            disabled={!selectedProject || Boolean(editingEvidenceId)}
            accessibilityLabel="Import one or more evidence photos"
          />
          <AppButton
            label="Scan Pages"
            icon="doc.text.magnifyingglass"
            variant="secondary"
            onPress={() => addMediaEvidence("DOCUMENT_SCAN")}
            loading={busySource === "DOCUMENT_SCAN"}
            disabled={!selectedProject || Boolean(editingEvidenceId)}
            accessibilityLabel="Scan a paper document as document evidence"
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
          title="Evidence Details"
          detail={
            editingEvidenceId
              ? "Edit saved details."
              : "Add a title, caption, notes, or importance mark."
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
            label={editingEvidenceId ? "Save Changes" : "Save Details"}
            icon="tray.and.arrow.down.fill"
            onPress={saveEvidenceMetadata}
            loading={busySource === "metadata"}
            accessibilityLabel="Save evidence details"
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
          title="Supporting File"
          detail="Import PDFs, work orders, receipts, or other files. Unsupported file types are blocked from delivery."
        />
        <View style={styles.inlineActions}>
          <AppButton
            label="Import File"
            icon="doc.badge.plus"
            onPress={() => addMediaEvidence("FILE_IMPORT")}
            loading={busySource === "FILE_IMPORT"}
            disabled={Boolean(editingEvidenceId)}
            accessibilityLabel="Import a file as evidence"
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
          title="Saved Evidence"
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
            title="No evidence yet"
            message="Take a photo, add photos, scan pages, or save details above."
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
            {documents.length ? (
              <View style={styles.documentStack}>
                {documents.map((document) => {
                  const documentEntry = getProofPacketDocumentEntry(
                    document,
                    mediaAssets.filter(
                      (mediaAsset) => mediaAsset.deletedAt === null,
                    ),
                  );
                  const pageCount =
                    documentEntry.visualPageCount ?? document.pageCount ?? null;
                  const visualMediaAssets = mediaAssets.filter((mediaAsset) =>
                    documentEntry.visualMediaAssetIds.includes(mediaAsset.id),
                  );
                  const sizeBytes =
                    document.sizeBytes ??
                    visualMediaAssets.reduce(
                      (total, mediaAsset) => total + mediaAsset.sizeBytes,
                      0,
                    );

                  return (
                    <View key={document.id} style={styles.documentSummary}>
                      <AppText variant="label">{documentEntry.label}</AppText>
                      <AppText variant="small" muted>
                        {[
                          documentEntry.previewKind.replaceAll("_", " "),
                          documentEntry.fileProfile.replaceAll("_", " "),
                          documentEntry.reviewStatus.replaceAll("_", " "),
                          pageCount
                            ? `${pageCount} ${pageCount === 1 ? "page" : "pages"}`
                            : "page count unknown",
                          sizeBytes === null ? null : formatBytes(sizeBytes),
                        ]
                          .filter(Boolean)
                          .join(" / ")}
                      </AppText>
                      <AppText variant="small" muted>
                        {documentEntry.proofSummary}
                      </AppText>
                      <AppText variant="small" muted>
                        {documentEntry.securitySummary}
                      </AppText>
                      <AppText variant="small" muted>
                        {documentEntry.detail}
                      </AppText>
                      {documentEntry.recommendedAction ? (
                        <AppText variant="small" muted>
                          {documentEntry.recommendedAction}
                        </AppText>
                      ) : null}
                      {document.sha256 ? (
                        <AppText variant="small" muted>
                          SHA {document.sha256.slice(0, 16)}
                        </AppText>
                      ) : visualMediaAssets.length ? (
                        <AppText variant="small" muted>
                          Page hashes are preserved on each original image.
                        </AppText>
                      ) : null}
                      {documentEntry.missingMetadata.length ? (
                        <AppText variant="small" muted>
                          Missing {documentEntry.missingMetadata.join(", ")}
                        </AppText>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : null}
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
                        mediaAsset.derivativeType === "REPLACEMENT"
                          ? "Replacement"
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" / ")}
                    </AppText>
                    {mediaAsset.originalAssetId ? (
                      <AppText variant="small" muted>
                        Replaces original {mediaAsset.originalAssetId}
                      </AppText>
                    ) : null}
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
                      {!mediaAsset.deletedAt ? (
                        <>
                          <AppButton
                            label="Retake"
                            icon="camera.fill"
                            variant="secondary"
                            onPress={() =>
                              replaceMediaAsset(mediaAsset, "CAMERA_PHOTO")
                            }
                            loading={busySource === "CAMERA_PHOTO"}
                          />
                          <AppButton
                            label="Replace"
                            icon="photo.on.rectangle"
                            variant="secondary"
                            onPress={() =>
                              replaceMediaAsset(mediaAsset, "PHOTO_LIBRARY")
                            }
                            loading={busySource === "PHOTO_LIBRARY"}
                          />
                        </>
                      ) : null}
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
                  detail="You can edit these details without changing the original file."
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
        title="Local document proof"
        message="Scanned pages and imported files are protected as originals and saved automatically."
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
  documentStack: {
    gap: spacing.sm,
  },
  documentSummary: {
    gap: spacing.xs,
  },
});

function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

function getCaptureGuide(
  hasProject: boolean,
  counts: Record<EvidenceCategory, number>,
): {
  tone: "info" | "success" | "warning" | "error" | "blocked";
  title: string;
  message: string;
  detail?: string;
} {
  if (!hasProject) {
    return {
      tone: "blocked",
      title: "Create a job first",
      message:
        "Every photo, scan, and file needs a project before it can be saved.",
      detail: "Go to Projects, create the job name, then come back to Capture.",
    };
  }

  if (counts.BEFORE === 0) {
    return {
      tone: "warning",
      title: "Start with Before",
      message: "Take one clear photo of the starting condition.",
      detail: "Before photos help reviewers understand what changed.",
    };
  }

  if (counts.WORK === 0) {
    return {
      tone: "warning",
      title: "Add Work evidence",
      message:
        "Show the repair, service, installation, cleanup, or inspection in progress.",
    };
  }

  if (counts.AFTER === 0) {
    return {
      tone: "warning",
      title: "Finish with After",
      message: "Take one clear final-condition photo before making the report.",
    };
  }

  return {
    tone: "success",
    title: "Core evidence is ready",
    message:
      "Before, Work, and After evidence are saved. Add captions or open Reports.",
  };
}
