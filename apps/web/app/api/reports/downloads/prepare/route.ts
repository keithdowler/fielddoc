import { createReportPdfDownloadPrepareHandler } from "../../report-service";
import { createReportRouteDependencies } from "../../route-dependencies";

export async function POST(request: Request) {
  return createReportPdfDownloadPrepareHandler(createReportRouteDependencies())(
    request,
  );
}
