import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const pageSize = 10;
  const name = req.nextUrl.searchParams.get("name") || "";
  const prisma = new PrismaClient();

  try {
    const totalCount = await prisma.users.count({
      where: {
        name: {
          startsWith: name,
        },
      },
    });

    return NextResponse.json({ totalPages: Math.ceil(totalCount / pageSize) });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch page count" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
