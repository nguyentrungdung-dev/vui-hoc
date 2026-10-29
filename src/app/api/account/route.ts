import { NextRequest, NextResponse } from "next/server";
import {
  createAccount,
  login,
  currentStudent,
  requireStudent,
  newSession,
  logout,
  updateProfile,
  checkOrigin,
  accountBody,
  sessionCookie,
  sessionAge,
} from "@/server/accounts";
import { AppError } from "@/server/validation";
export const runtime = "nodejs";
async function handler(request: NextRequest) {
  try {
    if (request.method !== "GET") checkOrigin(request);
    let response: NextResponse;
    if (request.method === "GET")
      response = NextResponse.json({ user: await currentStudent(request) });
    else {
      const input = await accountBody(request);
      if (!input || typeof input !== "object" || Array.isArray(input))
        throw new AppError("Em hãy nhập thông tin hợp lệ.");
      if (input.action === "register" || input.action === "login") {
        const user = await (input.action === "register"
          ? createAccount(input)
          : login(input));
        const token = await newSession(user);
        response = NextResponse.json({ user });
        response.cookies.set(sessionCookie, token, {
          httpOnly: true,
          sameSite: "lax",
          secure: request.nextUrl.protocol === "https:",
          path: "/",
          maxAge: sessionAge,
        });
      } else if (input.action === "logout") {
        await logout(request);
        response = NextResponse.json({ user: null });
        response.cookies.set(sessionCookie, "", { path: "/", maxAge: 0 });
      } else if (input.action === "update")
        response = NextResponse.json({
          user: await updateProfile(
            await requireStudent(request),
            input.profile,
          ),
        });
      else throw new AppError("Thao tác tài khoản chưa hợp lệ.");
    }
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof AppError
            ? error.message
            : "Chưa kết nối được tài khoản. Em thử lại nhé.",
      },
      {
        status: error instanceof AppError ? error.status : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
export const GET = handler;
export const POST = handler;
