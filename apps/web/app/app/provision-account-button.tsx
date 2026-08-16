"use client";

import { useState } from "react";

type ProvisionState =
  | { status: "idle"; message: string }
  | { status: "loading"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export function ProvisionAccountButton() {
  const [state, setState] = useState<ProvisionState>({
    status: "idle",
    message: "Creates the Neon tenant bridge for this Clerk organization.",
  });

  async function provisionAccount() {
    setState({
      status: "loading",
      message: "Connecting Clerk identity to Neon...",
    });

    const response = await fetch("/api/account/provision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      setState({
        status: "error",
        message:
          readErrorMessage(body) ??
          "Account bridge could not be created. Check server configuration.",
      });
      return;
    }

    setState({
      status: "success",
      message: "Cloud account bridge is ready for sync receipt.",
    });
  }

  return (
    <div className="provisionBox">
      <button
        className="primaryButton"
        type="button"
        onClick={provisionAccount}
        disabled={state.status === "loading"}
      >
        {state.status === "loading" ? "Connecting..." : "Connect Cloud Account"}
      </button>
      <p className={`statusText ${state.status}`}>{state.message}</p>
    </div>
  );
}

function readErrorMessage(body: unknown): string | null {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "object" &&
    body.error !== null &&
    "message" in body.error &&
    typeof body.error.message === "string"
  ) {
    return body.error.message;
  }

  return null;
}
