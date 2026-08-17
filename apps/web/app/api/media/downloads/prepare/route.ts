import { createMediaDownloadPrepareHandler } from "../../media-service";
import { createMediaRouteDependencies } from "../../route-dependencies";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return createMediaDownloadPrepareHandler(createMediaRouteDependencies())(
    request,
  );
}

export async function GET(): Promise<Response> {
  return Response.json({
    name: "FieldDoc private media download preparation",
    status: "ready",
    accepts: "POST",
  });
}
