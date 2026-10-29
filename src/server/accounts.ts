import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import type { NextRequest } from "next/server";
import type { Student } from "../lib/account";
import { readRecord, writeRecord } from "./account-store";
import { lock } from "./store";
import { AppError } from "./validation";
const scrypt = promisify(scryptCallback);
export const sessionCookie = "vuihoc-session";
export const sessionAge = 30 * 86400;
type Account = Student & { passwordHash: string; salt: string };
type Session = { accountId: string; expires: number };
const text = z.string().trim().min(1, "Em hãy nhập đủ thông tin bắt buộc.");
const optional = z
  .string()
  .trim()
  .max(100, "Thông tin tối đa 100 ký tự.")
  .default("");
export const registration = z.object({
  username: text
    .regex(
      /^[a-zA-Z0-9_]{3,32}$/,
      "Tên đăng nhập gồm 3–32 chữ không dấu, số hoặc dấu gạch dưới.",
    )
    .transform((s) => s.toLowerCase()),
  password: z
    .string()
    .min(8, "Mật khẩu cần ít nhất 8 ký tự.")
    .max(128, "Mật khẩu tối đa 128 ký tự.")
    .refine((value) => value.trim().length > 0, "Em hãy nhập mật khẩu."),
  fullName: text.max(80),
  nickname: text.max(32),
  grade: z.number().int().min(1).max(5),
  school: optional,
  city: optional,
});
export const profileUpdate = z
  .object({
    fullName: text.max(80),
    nickname: text.max(32),
    school: optional,
    city: optional,
    character: z.number().int().min(0).max(15),
    dailyGoal: z.number().int().min(1).max(3),
  })
  .strict();
function publicStudent(a: Account): Student {
  const { passwordHash: _p, salt: _s, ...student } = a;
  return student;
}
export async function createAccount(input: unknown) {
  const parsed = registration.safeParse(input);
  if (!parsed.success)
    throw new AppError(
      parsed.error.issues[0]?.message || "Em hãy nhập đủ thông tin.",
    );
  const data = parsed.data;
  return lock("register:" + data.username, async () => {
    if (await readRecord("usernames", data.username))
      throw new AppError(
        "Tên đăng nhập này đã có bạn sử dụng. Em chọn tên khác nhé.",
        409,
      );
    const salt = randomBytes(16).toString("hex");
    const passwordHash = (
      (await scrypt(data.password, salt, 64)) as Buffer
    ).toString("hex");
    const { password: _p, ...profile } = data;
    const account: Account = {
      ...profile,
      id: randomUUID(),
      salt,
      passwordHash,
      character: 4,
      dailyGoal: 1,
    };
    await writeRecord("students", account.id, account);
    await writeRecord("usernames", data.username, account.id);
    return publicStudent(account);
  });
}
export async function login(input: unknown) {
  const data = z
    .object({
      username: text.max(32),
      password: z.string().min(1, "Em hãy nhập mật khẩu.").max(128),
    })
    .safeParse(input);
  if (!data.success)
    throw new AppError("Em hãy nhập tên đăng nhập và mật khẩu.");
  const username = data.data.username.toLowerCase();
  const result = await lock(
    "login:" + createHash("sha256").update(username).digest("hex"),
    async () => {
      let limit = await readRecord<{ count: number; until: number }>(
        "login-limits",
        username,
      );
      if (!limit || limit.until < Date.now())
        limit = { count: 0, until: Date.now() + 15 * 60000 };
      if (limit.count >= 10)
        return {
          error: "Em đã thử nhiều lần. Hãy chờ 15 phút rồi đăng nhập lại nhé.",
          status: 429,
        };
      const id = await readRecord<string>("usernames", username);
      const account = id ? await readRecord<Account>("students", id) : null;
      const hash = (await scrypt(
        data.data.password,
        account?.salt || "missing-account-salt",
        64,
      )) as Buffer;
      if (
        !account ||
        !timingSafeEqual(hash, Buffer.from(account.passwordHash, "hex"))
      ) {
        await writeRecord("login-limits", username, {
          ...limit,
          count: limit.count + 1,
        });
        return {
          error: "Tên đăng nhập hoặc mật khẩu chưa đúng. Em kiểm tra lại nhé.",
          status: 400,
        };
      }
      await writeRecord("login-limits", username, { count: 0, until: 0 });
      return { user: publicStudent(account) };
    },
  );
  if (result.error) throw new AppError(result.error, result.status);
  return result.user!;
}
export const sessionKey = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function newSession(user: Student) {
  const token = randomBytes(32).toString("hex");
  await writeRecord("sessions", sessionKey(token), {
    accountId: user.id,
    expires: Date.now() + sessionAge * 1000,
  });
  return token;
}
export async function currentStudent(
  request: NextRequest,
): Promise<Student | null> {
  const token = request.cookies.get(sessionCookie)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await readRecord<Session>("sessions", sessionKey(token));
  if (!session || session.expires <= Date.now()) return null;
  const account = await readRecord<Account>("students", session.accountId);
  return account ? publicStudent(account) : null;
}
export async function requireStudent(request: NextRequest) {
  const user = await currentStudent(request);
  if (!user) throw new AppError("Em hãy đăng nhập để tiếp tục học nhé.", 401);
  return user;
}
export async function logout(request: NextRequest) {
  const token = request.cookies.get(sessionCookie)?.value;
  if (token)
    await writeRecord("sessions", sessionKey(token), {
      accountId: "",
      expires: 0,
    });
}
export async function updateProfile(user: Student, input: unknown) {
  const parsed = profileUpdate.safeParse(input);
  if (!parsed.success)
    throw new AppError("Em kiểm tra lại thông tin hồ sơ nhé.");
  return lock("profile:" + user.id, async () => {
    const account = await readRecord<Account>("students", user.id);
    if (!account) throw new AppError("Phiên đăng nhập đã hết hạn.", 401);
    const next = { ...account, ...parsed.data };
    await writeRecord("students", user.id, next);
    return publicStudent(next);
  });
}
export function checkOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  let valid = false;
  try {
    const url = new URL(origin || "");
    valid =
      ["https:", "http:"].includes(url.protocol) &&
      url.host === (request.headers.get("host") || new URL(request.url).host);
  } catch {}
  if (!valid)
    throw new AppError("Yêu cầu không hợp lệ. Em tải lại trang nhé.", 403);
}
export async function accountBody(request: NextRequest) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new AppError("Thông tin cần có định dạng JSON.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("Em chưa nhập thông tin.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 8192) {
        await reader.cancel();
        throw new AppError("Thông tin quá dài.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AppError("Thông tin chưa hợp lệ.");
  }
}
