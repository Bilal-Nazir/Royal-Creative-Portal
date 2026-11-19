import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { uploadFile } from "@/server/services/file-service";
import type { UploadScope } from "@/server/domain/upload";

const VALID_SCOPES: UploadScope[] = ["content", "design-screenshot"];

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ ok: false, error: "Invalid upload." }, { status: 400 });

  const projectId = formData.get("projectId");
  const scope = formData.get("scope");
  const file = formData.get("file");

  if (typeof projectId !== "string" || typeof scope !== "string" || !VALID_SCOPES.includes(scope as UploadScope)) {
    return NextResponse.json({ ok: false, error: "Missing projectId or scope." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No file provided." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await uploadFile(session, {
    projectId,
    scope: scope as UploadScope,
    originalName: file.name,
    mimeType: file.type || "application/octet-stream",
    buffer,
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, file: result.data });
}
