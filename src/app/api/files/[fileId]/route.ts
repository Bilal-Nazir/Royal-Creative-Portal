import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { downloadFile } from "@/server/services/file-service";

/** The only route that serves uploaded bytes — never a public static URL. */
export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { fileId } = await params;
  const result = await downloadFile(session, fileId);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });

  const { meta, buffer } = result.data;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": meta.mimeType,
      "Content-Disposition": `attachment; filename="${meta.sanitizedName}"`,
      "Content-Length": String(meta.size),
      "Cache-Control": "private, no-store",
    },
  });
}
