import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { quickCreateProject } from "@/server/services/project-service";

const bodySchema = z.object({
  name: z.string().min(1),
  assigneeId: z.string().min(1),
  boardColumnId: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Give the project a title and an assignee." }, { status: 400 });

  const result = await quickCreateProject(session, parsed.data);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, project: result.data });
}
