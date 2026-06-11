import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("name") ?? "";
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) {
    return NextResponse.json({ exists: false });
  }

  const slugified = name.toLowerCase().replace(/\s+/g, "-");
  const org = await prisma.organization.findFirst({
    where: {
      OR: [
        { name: { equals: name, mode: "insensitive" } },
        { slug: slugified },
      ],
    },
    select: { slug: true },
  });

  return NextResponse.json(
    org ? { exists: true, slug: org.slug } : { exists: false }
  );
}
