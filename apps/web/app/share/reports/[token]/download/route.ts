import { createPublicReportShareRedirectHandler } from "../../../../api/reports/report-service";
import { createReportRouteDependencies } from "../../../../api/reports/route-dependencies";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  return createPublicReportShareRedirectHandler(
    createReportRouteDependencies(),
  )(token, request);
}
