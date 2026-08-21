import { describe, expect, it } from "vitest";

import { buildResendEmailPayload, sendResendEmail } from "./email-delivery";

describe("email delivery operations", () => {
  it("builds a Resend payload without leaking secret values", () => {
    expect(
      buildResendEmailPayload({
        from: "FieldDoc <reports@example.com>",
        to: ["owner@example.com"],
        subject: "FieldDoc email delivery test",
        text: "No customer data.",
      }),
    ).toEqual({
      from: "FieldDoc <reports@example.com>",
      to: ["owner@example.com"],
      subject: "FieldDoc email delivery test",
      text: "No customer data.",
    });
  });

  it("posts to Resend with bearer auth and returns the provider id", async () => {
    const calls: RequestInit[] = [];
    const result = await sendResendEmail({
      apiKey: "re_secret",
      message: {
        from: "FieldDoc <reports@example.com>",
        to: ["owner@example.com"],
        subject: "Subject",
        text: "Body",
      },
      fetcher: async (_url, init) => {
        calls.push(init ?? {});
        return Response.json({ id: "email_123" });
      },
    });

    expect(result).toEqual({ id: "email_123" });
    expect(calls[0]?.headers).toMatchObject({
      Authorization: "Bearer re_secret",
      "Content-Type": "application/json",
    });
  });
});
