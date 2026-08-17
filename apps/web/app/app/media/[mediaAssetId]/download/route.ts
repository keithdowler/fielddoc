import { auth } from "@clerk/nextjs/server";

import { createMediaRouteDependencies } from "../../../../api/media/route-dependencies";
import { createWebMediaDownloadRedirectHandler } from "../../media-download-route";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mediaAssetId: string }> },
) {
  const { mediaAssetId } = await params;
  const dependencies = createMediaRouteDependencies();

  return createWebMediaDownloadRedirectHandler({
    getAuthContext: async () => {
      const authContext = await auth();

      return {
        userId: authContext.userId,
        orgId: authContext.orgId ?? null,
      };
    },
    createRepository: dependencies.createRepository,
    createStorage: dependencies.createStorage,
  })(mediaAssetId);
}
