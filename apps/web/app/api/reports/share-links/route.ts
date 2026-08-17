import { createReportShareLinkCreateHandler } from "../report-service";
import { createReportRouteDependencies } from "../route-dependencies";

export async function POST(request: Request) {
  return createReportShareLinkCreateHandler(createReportRouteDependencies())(
    request,
  );
}
