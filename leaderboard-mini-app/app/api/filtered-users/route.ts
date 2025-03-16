import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const prisma = new PrismaClient();

  const name = req.nextUrl.searchParams.get("name") || "";
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");

  const pageSize = 10;
  const skip = (page - 1) * pageSize;

  try {
    const users = await prisma.users.findMany({
      select: {
        tg_id: true,
        name: true,
        _count: {
          select: { invited: true }, // Counts the related invites
        },
      },
      where: {
        name: {
          startsWith: name,
        },
      },
      orderBy: {
        invited: {
          _count: "desc",
        },
      },
      skip,
      take: 10, // Adjust pagination as needed
    });

    return NextResponse.json(
      JSON.stringify(users, (key, val) =>
        typeof val === "bigint" ? val.toString() : val
      )
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
