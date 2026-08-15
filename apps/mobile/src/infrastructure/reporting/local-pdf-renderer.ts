import {
  renderProofPacketHtml,
  type GeneratedProofPacket,
  type ProofPacketPreview,
  type ProofPacketRenderOptions,
  type ProofPacketRenderer,
} from "@fielddoc/domain";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";

const proofPacketDirectoryName = "proof-packets";

export class ExpoProofPacketPdfRenderer implements ProofPacketRenderer {
  async render(
    preview: ProofPacketPreview,
    options: ProofPacketRenderOptions = {},
  ): Promise<GeneratedProofPacket> {
    const generatedAt = options.generatedAt ?? new Date().toISOString();
    const html = renderProofPacketHtml(preview, {
      generatedAt,
      productName: "Proof Packet",
    });
    const printed = await Print.printToFileAsync({
      html,
      width: 612,
      height: 792,
      margins: {
        top: 36,
        right: 36,
        bottom: 36,
        left: 36,
      },
      base64: false,
    });
    const outputDirectory = getProofPacketDirectory();
    const fileName = createProofPacketFileName(preview.title, generatedAt);
    const localUri = `${outputDirectory}${fileName}`;

    await FileSystem.makeDirectoryAsync(outputDirectory, {
      intermediates: true,
    });
    await FileSystem.moveAsync({
      from: printed.uri,
      to: localUri,
    });

    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (!fileInfo.exists) {
      throw new Error("Generated PDF could not be saved locally.");
    }

    return {
      draftId: preview.draft.id,
      projectId: preview.project.id,
      localUri,
      fileName,
      generatedAt,
      sizeBytes: fileInfo.size ?? 0,
      pageCount: printed.numberOfPages ?? null,
    };
  }
}

export const localProofPacketRenderer = new ExpoProofPacketPdfRenderer();

function getProofPacketDirectory(): string {
  if (!FileSystem.documentDirectory) {
    throw new Error("Local document storage is not available on this device.");
  }

  return `${FileSystem.documentDirectory}${proofPacketDirectoryName}/`;
}

function createProofPacketFileName(title: string, generatedAt: string): string {
  const safeTitle =
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "proof-packet";
  const safeTimestamp = generatedAt.replace(/[^0-9]/g, "").slice(0, 14);

  return `${safeTitle}-${safeTimestamp}.pdf`;
}
