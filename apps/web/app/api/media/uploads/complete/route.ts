import { createMediaUploadCompleteHandler } from "../../media-service";
import { createMediaRouteDependencies } from "../../route-dependencies";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return createMediaUploadCompleteHandler(createMediaRouteDependencies())(
    request,
  );
}

export async function GET(): Promise<Response> {
  return Response.json({
    name: "FieldDoc private media upload completion",
    status: "ready",
    accepts: "POST",
  });
}
