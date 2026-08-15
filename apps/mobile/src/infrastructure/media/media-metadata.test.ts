import { describe, expect, it } from "vitest";

import {
  bytesToHex,
  extensionFromSource,
  inferMediaType,
} from "./media-metadata";

describe("media metadata helpers", () => {
  it("classifies media type from MIME type", () => {
    expect(inferMediaType("image/jpeg")).toBe("IMAGE");
    expect(inferMediaType("video/mp4")).toBe("VIDEO");
    expect(inferMediaType("application/pdf")).toBe("DOCUMENT");
    expect(inferMediaType("text/plain")).toBe("DOCUMENT");
    expect(inferMediaType("application/octet-stream")).toBe("OTHER");
  });

  it("chooses stable file extensions from names, URIs, and MIME types", () => {
    expect(
      extensionFromSource(
        "file:///cache/ignored.tmp",
        "image/jpeg",
        "front.JPG",
      ),
    ).toBe("jpg");
    expect(extensionFromSource("file:///cache/report.pdf", "image/jpeg")).toBe(
      "pdf",
    );
    expect(extensionFromSource("content://asset/1", "image/png")).toBe("png");
    expect(extensionFromSource("content://asset/1", "application/custom")).toBe(
      "bin",
    );
  });

  it("serializes digest bytes to lowercase hexadecimal", () => {
    expect(bytesToHex(new Uint8Array([0, 15, 16, 255]))).toBe("000f10ff");
  });
});
