import { describe, expect, it } from "vitest";

import {
  createSentryEnvelope,
  parseSentryDsn,
  sendSentryEvent,
} from "./error-reporting";

describe("error reporting operations", () => {
  const dsn = "https://public123@example.sentry.io/987654";

  it("parses Sentry DSNs into envelope endpoints", () => {
    expect(parseSentryDsn(dsn)).toMatchObject({
      publicKey: "public123",
      projectId: "987654",
      endpoint: "https://example.sentry.io/api/987654/envelope/",
    });
  });

  it("builds a privacy-safe Sentry envelope", () => {
    const envelope = createSentryEnvelope({
      dsn,
      message: "Readiness test",
      eventId: "00000000-0000-4000-8000-000000000000",
      now: new Date("2026-08-20T12:00:00.000Z"),
      tags: { check: "readiness" },
      extra: { organizationId: "org_123" },
    });

    expect(envelope.eventId).toBe("00000000000040008000000000000000");
    expect(envelope.body).toContain('"message":"Readiness test"');
    expect(envelope.body).toContain('"check":"readiness"');
    expect(envelope.body).not.toContain("secret");
  });

  it("posts the envelope to Sentry", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const result = await sendSentryEvent({
      dsn,
      message: "Readiness test",
      eventId: "11111111-1111-4111-8111-111111111111",
      fetcher: async (url, init) => {
        calls.push({ url: String(url), init: init ?? {} });
        return new Response("", { status: 200 });
      },
    });

    expect(result.eventId).toBe("11111111111141118111111111111111");
    expect(calls[0]?.url).toBe(
      "https://example.sentry.io/api/987654/envelope/",
    );
    expect(calls[0]?.init.headers).toMatchObject({
      "Content-Type": "application/x-sentry-envelope",
    });
  });
});
