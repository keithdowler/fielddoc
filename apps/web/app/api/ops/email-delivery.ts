export type ResendEmailMessage = {
  from: string;
  to: string[];
  subject: string;
  text: string;
};

export type ResendEmailResult = {
  id: string | null;
};

type Fetcher = typeof fetch;

export function buildResendEmailPayload(message: ResendEmailMessage) {
  return {
    from: message.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
  };
}

export async function sendResendEmail(input: {
  apiKey: string;
  message: ResendEmailMessage;
  fetcher?: Fetcher;
}): Promise<ResendEmailResult> {
  const fetcher = input.fetcher ?? fetch;
  const response = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildResendEmailPayload(input.message)),
  });

  if (!response.ok) {
    throw new Error(`Resend email test failed with HTTP ${response.status}.`);
  }

  const data = (await response.json().catch(() => ({}))) as {
    id?: unknown;
  };

  return {
    id: typeof data.id === "string" ? data.id : null,
  };
}
