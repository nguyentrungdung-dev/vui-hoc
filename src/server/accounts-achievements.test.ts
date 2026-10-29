import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { GET, POST } from "../app/api/account/route";
import {
  GET as achievementsGET,
  POST as achievementsPOST,
} from "../app/api/achievements/route";
import { GET as documentsGET } from "../app/api/documents/[[...parts]]/route";
import {
  createAccount,
  newSession,
  currentStudent,
  logout,
  login,
  updateProfile,
  sessionKey,
} from "./accounts";
import { readRecord, writeRecord } from "./account-store";
import {
  earnAchievements,
  emptyAchievements,
  achievementView,
  achievementStats,
  rankings,
  weekStart,
  localDay,
  recordAchievements,
  acknowledgeMedals,
} from "./achievements";
import { medals } from "../lib/achievements";
import type { Student } from "../lib/account";
import {
  emptyLearningAttempt,
  type LearningQuestion,
  type LearningRun,
} from "../lib/learning";
import type { DocumentJob } from "../lib/documents";
const dir = mkdtempSync(path.join(os.tmpdir(), "vuihoc-accounts-"));
process.env.VUIHOC_DATA_DIR = dir;
after(() => fs.rm(dir, { recursive: true, force: true }));
const input = (username: string, grade = 2) => ({
  username,
  password: "test-password-2026",
  fullName: "Tên Riêng Không Công Khai",
  nickname: "Mây Nhỏ",
  grade,
  school: "Trường riêng",
  city: "Thành phố riêng",
});
function request(body?: unknown, cookie = "", origin = "http://localhost") {
  return new NextRequest("http://localhost/api/account", {
    method: body === undefined ? "GET" : "POST",
    headers: { origin, cookie, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
const q = (i = 0): LearningQuestion => ({
  id: "q" + i,
  sourceIds: [],
  sourcePages: [],
  topic: "Cộng",
  label: "Câu " + i,
  prompt: `${i} + 2 = ?`,
  passage: "",
  options: [],
  hasFigure: false,
  figureDescription: "",
  advanced: false,
  translation: "",
  grading: "exact",
  answer: String(i + 2),
  acceptedAnswers: [],
  hints: ["Gợi ý"],
  steps: [],
  explanation: "",
  englishSteps: [],
  checks: [],
  contentVersion: 2,
});
function run(userId = "student", count = 1): LearningRun {
  const questions = Array.from({ length: count }, (_, i) => q(i));
  return {
    id: randomUUID(),
    owner: userId,
    documentId: randomUUID(),
    title: "Bài học",
    packId: randomUUID(),
    mode: "weekly",
    kind: "practice",
    questions,
    attempts: Object.fromEntries(
      questions.map((q) => [
        q.id,
        {
          ...emptyLearningAttempt(),
          solved: true,
          firstCorrect: true,
          tries: 1,
        },
      ]),
    ),
    index: 0,
    finished: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    eventIds: [],
  };
}
const job = { subject: "math", mode: "weekly" } as const;
test("Registration validates mandatory fields, keeps optional fields optional, hashes passwords and prevents concurrent duplicate usernames", async () => {
  await assert.rejects(createAccount({}), /nhập|Invalid/);
  await assert.rejects(createAccount({ ...input("invalid"), grade: 0 }));
  await assert.rejects(
    createAccount({ ...input("invalid"), password: "123" }),
    /8 ký tự/,
  );
  const entries = await Promise.allSettled([
    createAccount(input("SAME_Name")),
    createAccount(input("same_name")),
  ]);
  assert.equal(entries.filter((r) => r.status === "fulfilled").length, 1);
  const user = (
    entries.find(
      (r) => r.status === "fulfilled",
    ) as PromiseFulfilledResult<Student>
  ).value;
  assert.equal(user.username, "same_name");
  assert.equal("passwordHash" in user, false);
  const saved = await readRecord<Record<string, string>>("students", user.id);
  assert.ok(saved?.passwordHash);
  assert.notEqual(saved?.passwordHash, input("").password);
  assert.equal("password" in saved!, false);
  const optional = await createAccount({
    ...input("optional"),
    school: undefined,
    city: undefined,
  });
  assert.equal(optional.school, "");
  assert.equal(optional.city, "");
});
test("Login errors, rate limiting, session hashing, expiry and logout are enforced", async () => {
  const user = await createAccount(input("login_test"));
  await assert.rejects(
    login({ username: "login_test", password: "wrong" }),
    /chưa đúng/,
  );
  assert.equal(
    (await login({ username: "LOGIN_TEST", password: input("").password })).id,
    user.id,
  );
  const token = await newSession(user);
  const req = request(undefined, `vuihoc-session=${token}`);
  assert.equal((await currentStudent(req))?.id, user.id);
  assert.equal(await readRecord("sessions", token), null);
  await logout(req);
  assert.equal(await currentStudent(req), null);
  await writeRecord("sessions", sessionKey(token), {
    accountId: user.id,
    expires: Date.now() - 1,
  });
  assert.equal(await currentStudent(req), null);
  for (let i = 0; i < 10; i++)
    await assert.rejects(
      login({ username: "missing_user", password: "wrong" }),
    );
  await assert.rejects(
    login({ username: "missing_user", password: "wrong" }),
    /15 phút/,
  );
});
test("Account APIs set HttpOnly cookies, validate malformed input and origin, update optional profile, and block anonymous functionality", async () => {
  assert.equal((await GET(request())).status, 200);
  assert.equal((await POST(request(null))).status, 400);
  assert.equal(
    (
      await POST(
        request(
          { action: "register", ...input("bad_origin") },
          "",
          "https://foreign.example",
        ),
      )
    ).status,
    403,
  );
  const response = await POST(
    request({ action: "register", ...input("api_user") }),
  );
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie")!;
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=lax/i);
  const publicBody = await response.json();
  assert.equal("passwordHash" in publicBody.user, false);
  const req = request(undefined, cookie.split(";")[0]);
  const user = (await currentStudent(req))!;
  const { id: _id, grade: _grade, username: _username, ...profile } = user;
  const updated = await updateProfile(user, {
    ...profile,
    school: "Trường mới",
    city: "Hà Nội",
  });
  assert.equal(updated.city, "Hà Nội");
  await assert.rejects(updateProfile(user, { ...profile, grade: 4 }));
  assert.equal((await achievementsGET(request())).status, 401);
  assert.equal(
    (await achievementsPOST(request({ kind: "celebrated", ids: [] }))).status,
    401,
  );
  assert.equal(
    (
      await documentsGET(request(), {
        params: Promise.resolve({ parts: ["history"] }),
      })
    ).status,
    401,
  );
  const logoutResponse = await POST(
    request({ action: "logout" }, cookie.split(";")[0]),
  );
  assert.equal(logoutResponse.status, 200);
  assert.equal(await currentStudent(req), null);
});
test("Exactly 20 unique medals unlock gradually; progress is capped and dates persist", () => {
  assert.equal(medals.length, 20);
  assert.equal(new Set(medals.map((m) => m.id)).size, 20);
  const state = emptyAchievements("student", 2);
  const r = run("student", 5);
  r.finished = true;
  earnAchievements(state, r, job, "2026-10-29T02:00:00Z");
  const view = achievementView(state);
  assert.equal(view.stats.independent, 5);
  assert.ok(view.medals.find((m) => m.id === "little-brave")?.earnedAt);
  assert.equal(
    view.medals.find((m) => m.id === "fivehundred-stars")?.earnedAt,
    undefined,
  );
  const date = state.earned["first-star"].at;
  earnAchievements(state, r, job, "2026-10-30T02:00:00Z");
  assert.equal(state.earned["first-star"].at, date);
  assert.equal(state.days.length, 1);
  assert.equal(achievementView(state).points, 50);
});
test("Repeated documents/runs and reordered options cannot farm points; improvements add only the difference", () => {
  const state = emptyAchievements("student", 2);
  const r = run();
  r.attempts.q0.firstCorrect = false;
  r.attempts.q0.tries = 2;
  earnAchievements(state, r, job);
  assert.equal(achievementView(state).points, 5);
  assert.equal(achievementStats(state).corrected, 1);
  const retry = run();
  earnAchievements(state, retry, job);
  assert.equal(achievementView(state).points, 10);
  earnAchievements(state, run(), job);
  assert.equal(achievementView(state).points, 10);
  assert.deepEqual(
    state.ledger.map((e) => e.points),
    [5, 5],
  );
  const optionRun = run();
  optionRun.questions[0].options = [
    { label: "A", text: "2" },
    { label: "B", text: "3" },
  ];
  earnAchievements(state, optionRun, job);
  optionRun.id = randomUUID();
  optionRun.questions[0].options.reverse();
  earnAchievements(state, optionRun, job);
  assert.equal(achievementView(state).points, 20);
});
test("Opening even an unanswered hint permanently excludes independent and hard achievements across new runs", () => {
  const state = emptyAchievements("student", 2);
  const hinted = run();
  hinted.questions[0].advanced = true;
  hinted.attempts.q0.solved = false;
  hinted.attempts.q0.hintOpens = 1;
  earnAchievements(state, hinted, job);
  const retry = run();
  retry.questions[0].advanced = true;
  earnAchievements(state, retry, job);
  const view = achievementView(state);
  assert.equal(view.stats.independent, 0);
  assert.equal(view.stats.hard, 0);
  assert.equal(view.points, 6);
  const wrongOwner = run("other");
  earnAchievements(state, wrongOwner, job);
  assert.equal(achievementView(state).points, 6);
});
test("TIMO, ungradable questions, guided answers and disclosed unanswered solutions do not create independent medals", () => {
  const state = emptyAchievements("student", 2);
  earnAchievements(state, run(), { ...job, mode: "timo" });
  assert.equal(achievementView(state).points, 0);
  const ungraded = run();
  ungraded.questions[0].grading = "ungraded";
  earnAchievements(state, ungraded, job);
  assert.equal(achievementView(state).points, 0);
  const revealed = run();
  revealed.finished = true;
  revealed.attempts.q0.solved = false;
  earnAchievements(state, revealed, job);
  earnAchievements(state, run(), job);
  assert.equal(achievementStats(state).independent, 0);
});
test("Streaks and weekly boundaries use Vietnam time; repeated practice without new results does not extend streak", () => {
  assert.equal(localDay("2026-10-25T17:01:00Z"), "2026-10-26");
  assert.equal(weekStart(new Date("2026-10-25T17:01:00Z")), "2026-10-26");
  assert.equal(weekStart(new Date("2026-10-25T16:59:00Z")), "2026-10-19");
  const state = emptyAchievements("student", 2);
  for (let i = 0; i < 7; i++) {
    const r = run();
    r.questions[0].prompt = `unique ${i}`;
    earnAchievements(state, r, job, `2026-10-${20 + i}T01:00:00Z`);
  }
  assert.equal(achievementStats(state).streak, 7);
  assert.ok(state.earned["streak-seven"]);
  earnAchievements(state, run(), job, "2026-10-29T01:00:00Z");
  assert.equal(achievementStats(state).streak, 7);
});
test("Rankings filter grade, subject and week, tie ranks fairly, and expose no personal profile fields", async () => {
  const a = await createAccount(input("rank_a", 2)),
    b = await createAccount(input("rank_b", 2)),
    c = await createAccount(input("rank_c", 4));
  for (const user of [a, b, c]) {
    const r = run(user.id);
    await recordAchievements(user, r, job as DocumentJob);
  }
  const ranking = await rankings(a, "math", "week");
  assert.ok(ranking.rows.some((r) => r.id === b.id));
  assert.ok(!ranking.rows.some((r) => r.id === c.id));
  assert.equal(ranking.mine?.points, 10);
  assert.equal(
    ranking.mine?.rank,
    ranking.rows.find((r) => r.id === b.id)?.rank,
  );
  const serialized = JSON.stringify(ranking);
  for (const secret of [
    a.fullName,
    a.school,
    a.city,
    "passwordHash",
    "username",
  ])
    assert.ok(!serialized.includes(secret));
  const english = await rankings(a, "english", "all");
  assert.equal(english.mine?.points, 0);
  const state = emptyAchievements(a.id, 2);
  state.ledger.push({ subject: "math", points: 80, date: "2020-01-01" });
  await writeRecord("achievements", a.id, state);
  assert.equal((await rankings(a, "math", "week")).mine?.points, 0);
  assert.equal((await rankings(a, "math", "all")).mine?.points, 80);
});
test("Concurrent award updates do not double count; notification and celebration acknowledgements persist independently", async () => {
  const user = await createAccount(input("concurrent_medals"));
  const r = run(user.id);
  await Promise.all(
    Array.from({ length: 4 }, () =>
      recordAchievements(user, r, job as DocumentJob),
    ),
  );
  const notified = await acknowledgeMedals(user, ["first-star"], "notified");
  assert.equal(notified.points, 10);
  assert.equal(
    notified.medals.find((m) => m.id === "first-star")?.notified,
    true,
  );
  assert.equal(
    notified.medals.find((m) => m.id === "first-star")?.celebrated,
    false,
  );
  const celebrated = await acknowledgeMedals(
    user,
    ["first-star"],
    "celebrated",
  );
  assert.equal(
    celebrated.medals.find((m) => m.id === "first-star")?.celebrated,
    true,
  );
  await assert.rejects(acknowledgeMedals(user, ["made-up"], "notified"));
});

test("Hard medal needs five independent hard questions and never counts a hinted one", () => {
  const state = emptyAchievements("student", 2);
  const r = run("student", 5);
  r.questions.forEach((q) => {
    q.advanced = true;
  });
  r.attempts.q0.hintOpens = 1;
  earnAchievements(state, r, job);
  assert.equal(achievementStats(state).hard, 4);
  assert.equal(state.earned["brave-warrior"], undefined);
  const sixth = run();
  sixth.questions[0].prompt = "Bài khó thứ sáu";
  sixth.questions[0].advanced = true;
  earnAchievements(state, sixth, job);
  assert.ok(state.earned["brave-warrior"]);
  assert.equal(achievementStats(state).hard, 5);
});
test("Same wording with different figures is counted as different questions", () => {
  const state = emptyAchievements("student", 2);
  const first = run();
  first.questions[0].hasFigure = true;
  first.questions[0].figureDescription = "Ba hình vuông";
  earnAchievements(state, first, job);
  const second = structuredClone(first);
  second.id = randomUUID();
  second.questions[0].figureDescription = "Bốn hình tròn";
  earnAchievements(state, second, job);
  assert.equal(achievementStats(state).solved, 2);
});
test("Ranks keep a student's own position even outside the top fifty", async () => {
  const mine = await createAccount(input("outside_top", 5));
  for (let i = 0; i < 51; i++) {
    const id = randomUUID();
    await writeRecord("students", id, { ...mine, id, nickname: "Bạn " + i });
    const state = emptyAchievements(id, 5);
    state.ledger = [
      { subject: "math", points: 100 - i, date: localDay(new Date()) },
    ];
    await writeRecord("achievements", id, state);
  }
  const result = await rankings(mine, "math", "week");
  assert.equal(result.rows.length, 50);
  assert.equal(result.mine?.rank, 52);
  assert.equal(result.mine?.mine, true);
  assert.ok(!result.rows.some((r) => r.mine));
});
