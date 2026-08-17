import { createReportPdfUploadCompleteHandler } from "../../report-service";
import { createReportRouteDependencies } from "../../route-dependencies";

export async function POST(request: Request) {
  return createReportPdfUploadCompleteHandler(createReportRouteDependencies())(
    request,
  );
}
