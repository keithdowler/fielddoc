import {
  syncMutationUploadRequestSchema,
  syncMutationUploadResponseSchema,
  type SyncMutationUploadRequest,
  type SyncMutationUploadResponse,
} from "@fielddoc/validation";
import { z } from "zod";

export const apiClientConfigSchema = z.object({
  baseUrl: z.string().url(),
  accessToken: z.string().trim().min(1).optional(),
  fetchImpl: z
    .custom<(request: Request) => Promise<Response>>(
      (value) => value === undefined || typeof value === "function",
    )
    .optional(),
});

export type ApiClientConfig = z.infer<typeof apiClientConfigSchema>;

export type FieldDocApiClient = {
  uploadLocalMutations(
    input: SyncMutationUploadRequest,
  ): Promise<SyncMutationUploadResponse>;
};

export class FieldDocApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "FieldDocApiError";
  }
}

export function createApiClientConfig(input: ApiClientConfig): ApiClientConfig {
  return apiClientConfigSchema.parse(input);
}

export function createFieldDocApiClient(
  input: ApiClientConfig,
): FieldDocApiClient {
  const config = createApiClientConfig(input);
  const fetchImpl = config.fetchImpl ?? fetch;

  return {
    async uploadLocalMutations(requestInput) {
      const requestBody = syncMutationUploadRequestSchema.parse(requestInput);
      const response = await fetchImpl(
        new Request(new URL("/api/sync/mutations", config.baseUrl), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(config.accessToken
              ? { Authorization: `Bearer ${config.accessToken}` }
              : {}),
          },
          body: JSON.stringify(requestBody),
        }),
      );

      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const errorBody = errorResponseSchema.safeParse(body);
        throw new FieldDocApiError(
          errorBody.success
            ? errorBody.data.error.message
            : "FieldDoc API request failed.",
          response.status,
          errorBody.success ? errorBody.data.error.code : undefined,
        );
      }

      return syncMutationUploadResponseSchema.parse(body);
    },
  };
}

const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
