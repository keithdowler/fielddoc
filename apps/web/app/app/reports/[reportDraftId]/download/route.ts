import { auth } from "@clerk/nextjs/server";

import { createReportRouteDependencies } from "../../../../api/reports/route-dependencies";
import { createWebReportDownloadRedirectHandler } from "../../report-download-route";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reportDraftId: string }> },
) {
  const { reportDraftId } = await params;
  const dependencies = createReportRouteDependencies();

  return createWebReportDownloadRedirectHandler({
    getAuthContext: async () => {
      const authContext = await auth();

      return {
        userId: authContext.userId,
        orgId: authContext.orgId ?? null,
      };
    },
    createRepository: dependencies.createRepository,
    createStorage: dependencies.createStorage,
  })(reportDraftId);
}
