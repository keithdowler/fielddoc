import { randomUUID } from "node:crypto";

type Fetcher = typeof fetch;

export type ParsedSentryDsn = {
  dsn: string;
  endpoint: string;
  publicKey: string;
  projectId: string;
};

export type SentryEventInput = {
  dsn: string;
  message: string;
  environment?: string;
  eventId?: string;
  now?: Date;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

export function parseSentryDsn(dsn: string): ParsedSentryDsn {
  const url = new URL(dsn);
  const publicKey = url.username;
  const pathParts = url.pathname.split("/").filter(Boolean);
  const projectId = pathParts.at(-1);

  if (!publicKey || !projectId) {
    throw new Error("Sentry DSN is missing a public key or project id.");
  }

  return {
    dsn,
    publicKey,
    projectId,
    endpoint: `${url.protocol}//${url.host}/api/${projectId}/envelope/`,
  };
}

export function createSentryEnvelope(input: SentryEventInput): {
  endpoint: string;
  body: string;
  eventId: string;
} {
  const parsed = parseSentryDsn(input.dsn);
  const eventId = (input.eventId ?? randomUUID()).replaceAll("-", "");
  const timestamp = (input.now ?? new Date()).toISOString();
  const event = {
    event_id: eventId,
    timestamp,
    platform: "javascript",
    logger: "fielddoc.web.ops",
    level: "info",
    message: input.message,
    environment: input.environment ?? "production",
    tags: input.tags ?? {},
    extra: input.extra ?? {},
  };
  const envelopeHeader = {
    event_id: eventId,
    dsn: parsed.dsn,
    sent_at: timestamp,
  };
  const itemHeader = {
    type: "event",
  };

  return {
    endpoint: parsed.endpoint,
    eventId,
    body: `${JSON.stringify(envelopeHeader)}\n${JSON.stringify(
      itemHeader,
    )}\n${JSON.stringify(event)}`,
  };
}

export async function sendSentryEvent(
  input: SentryEventInput & {
    fetcher?: Fetcher;
  },
): Promise<{ eventId: string }> {
  const fetcher = input.fetcher ?? fetch;
  const envelope = createSentryEnvelope(input);
  const response = await fetcher(envelope.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-sentry-envelope",
    },
    body: envelope.body,
  });

  if (!response.ok) {
    throw new Error(`Sentry event test failed with HTTP ${response.status}.`);
  }

  return {
    eventId: envelope.eventId,
  };
}
