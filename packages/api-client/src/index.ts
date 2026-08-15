import { z } from "zod";

export const apiClientConfigSchema = z.object({
  baseUrl: z.string().url(),
});

export type ApiClientConfig = z.infer<typeof apiClientConfigSchema>;

export function createApiClientConfig(input: ApiClientConfig): ApiClientConfig {
  return apiClientConfigSchema.parse(input);
}
