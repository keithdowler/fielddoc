import { createReportPdfUploadPrepareHandler } from "../../report-service";
import { createReportRouteDependencies } from "../../route-dependencies";

export async function POST(request: Request) {
  return createReportPdfUploadPrepareHandler(createReportRouteDependencies())(
    request,
  );
}
