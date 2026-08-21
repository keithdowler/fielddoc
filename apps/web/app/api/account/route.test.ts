import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteFieldDocAccount: vi.fn(),
}));

vi.mock("./account-deletion", () => ({
  AccountDeletionError: class AccountDeletionError extends Error {},
  deleteFieldDocAccount: mocks.deleteFieldDocAccount,
}));

import { DELETE } from "./route";

describe("DELETE /api/account", () => {
  beforeEach(() => {
    mocks.deleteFieldDocAccount.mockReset();
  });

  it("deletes the authenticated FieldDoc account", async () => {
    mocks.deleteFieldDocAccount.mockResolvedValue(undefined);
    const request = new Request("https://fielddoc.example/api/account", {
      method: "DELETE",
      headers: { authorization: "Bearer token" },
    });

    const response = await DELETE(request);

    expect(mocks.deleteFieldDocAccount).toHaveBeenCalledWith(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "deleted" });
  });

  it("returns a privacy-safe response for an unexpected deletion failure", async () => {
    mocks.deleteFieldDocAccount.mockRejectedValue(new Error("provider detail"));

    const response = await DELETE(
      new Request("https://fielddoc.example/api/account", {
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "ACCOUNT_DELETION_FAILED",
        message:
          "FieldDoc could not delete the account. Please contact support.",
      },
    });
  });
});
