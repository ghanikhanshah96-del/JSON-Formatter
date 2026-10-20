import { NextResponse, type NextRequest } from "next/server";
import { savePostPayload } from "@/app/admin/posts/actions";
import { hasAllowedMutationOrigin } from "@/lib/request-security";

export async function POST(request: NextRequest) {
  if (!hasAllowedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 500_000) return NextResponse.json({ error: "Post payload is too large." }, { status: 413 });
  try {
    const result = await savePostPayload(await request.json(), "draft");
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Autosave failed." }, { status: 401 });
  }
}
