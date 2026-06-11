import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guard";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const guard = await requireUser();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    select: { status: true, errorMessage: true, orgId: true },
  });
  // בידוד ארגוני: שיעור של ארגון אחר נראה כלא-קיים
  if (!lesson || lesson.orgId !== guard.user.orgId) {
    return NextResponse.json({ error: "השיעור לא נמצא" }, { status: 404 });
  }

  return NextResponse.json({
    status: lesson.status,
    errorMessage: lesson.errorMessage,
  });
}
