import { NextRequest, NextResponse } from "next/server";
import { requireStudent, checkOrigin, accountBody } from "@/server/accounts";
import {
  readAchievements,
  achievementView,
  acknowledgeMedals,
  rankings,
} from "@/server/achievements";
import { subjects, type Subject } from "@/lib/documents";
import { AppError } from "@/server/validation";
export const runtime = "nodejs";
async function handler(request: NextRequest) {
  try {
    if (request.method !== "GET") checkOrigin(request);
    const user = await requireStudent(request);
    let data;
    if (request.method === "POST") {
      const body = await accountBody(request);
      if (!body || typeof body !== "object" || Array.isArray(body))
        throw new AppError("Thao tác chưa hợp lệ.");
      if (body.kind !== "notified" && body.kind !== "celebrated")
        throw new AppError("Thao tác chưa hợp lệ.");
      data = await acknowledgeMedals(user, body.ids, body.kind);
    } else if (request.nextUrl.searchParams.get("view") === "ranking") {
      const subject = request.nextUrl.searchParams.get("subject") || "all";
      const period = request.nextUrl.searchParams.get("period") || "week";
      if (
        (subject !== "all" && !Object.hasOwn(subjects, subject)) ||
        !["week", "all"].includes(period)
      )
        throw new AppError("Bộ lọc chưa hợp lệ.");
      data = await rankings(
        user,
        subject as Subject | "all",
        period as "week" | "all",
      );
    } else data = achievementView(await readAchievements(user));
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof AppError
            ? e.message
            : "Chưa tải được thành tích. Em thử lại nhé.",
      },
      {
        status: e instanceof AppError ? e.status : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
export const GET = handler;
export const POST = handler;
