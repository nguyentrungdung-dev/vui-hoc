import { createHash } from "node:crypto";
import {
  medals,
  type MedalMetric,
  type AchievementView,
  type RankingView,
} from "../lib/achievements";
import type { Student } from "../lib/account";
import type { DocumentJob, Subject } from "../lib/documents";
import { canGrade, type LearningRun } from "../lib/learning";
import { readRecord, writeRecord, listRecords } from "./account-store";
import { lock } from "./store";
import { AppError } from "./validation";
type Fact = {
  subject: Subject;
  topic: string;
  independent: boolean;
  corrected: boolean;
  hard: boolean;
  points: number;
};
type Earned = { at: string; notified: boolean; celebrated: boolean };
export type AchievementState = {
  id: string;
  grade: number;
  facts: Record<string, Fact>;
  exposed: string[];
  revealed: string[];
  lessons: string[];
  days: string[];
  ledger: { subject: Subject; points: number; date: string }[];
  earned: Record<string, Earned>;
};
export const emptyAchievements = (
  id: string,
  grade: number,
): AchievementState => ({
  id,
  grade,
  facts: {},
  exposed: [],
  revealed: [],
  lessons: [],
  days: [],
  ledger: [],
  earned: {},
});
export function localDay(date: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}
export function weekStart(now = new Date()) {
  const d = new Date(localDay(now) + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export function questionKey(
  subject: string,
  q: LearningRun["questions"][number],
) {
  return hash(
    JSON.stringify([
      subject,
      q.prompt.normalize("NFC").trim().replace(/\s+/g, " "),
      q.passage.normalize("NFC").trim(),
      q.options.map((o) => o.text.normalize("NFC").trim()).sort(),
      q.hasFigure ? q.figureDescription.normalize("NFC").trim() : "",
    ]),
  );
}
export function achievementStats(
  state: AchievementState,
): Record<MedalMetric, number> {
  const facts = Object.values(state.facts);
  const days = [...new Set(state.days)].sort();
  let streak = 0,
    best = 0,
    previous = 0;
  for (const day of days) {
    const t = Date.parse(day + "T00:00:00Z");
    streak = t - previous === 86400000 ? streak + 1 : 1;
    previous = t;
    best = Math.max(best, streak);
  }
  return {
    solved: facts.length,
    lessons: state.lessons.length,
    independent: facts.filter((f) => f.independent).length,
    days: days.length,
    corrected: facts.filter((f) => f.corrected).length,
    hard: facts.filter((f) => f.hard).length,
    topics: new Set(
      facts.filter((f) => f.independent).map((f) => f.subject + ":" + f.topic),
    ).size,
    subjects: new Set(facts.filter((f) => f.independent).map((f) => f.subject))
      .size,
    streak: best,
  };
}
export function earnAchievements(
  state: AchievementState,
  run: LearningRun,
  job: Pick<DocumentJob, "subject" | "mode">,
  now = new Date().toISOString(),
) {
  if (run.owner !== state.id || job.mode === "timo" || run.mode === "timo")
    return;
  let changed = false;
  for (const q of run.questions) {
    const a = run.attempts[q.id];
    const key = questionKey(job.subject, q);
    if (
      (a?.hintOpens ||
        a?.hintLevel ||
        a?.guided ||
        (run.finished && !a?.solved)) &&
      !state.exposed.includes(key)
    )
      state.exposed.push(key);
    if (
      (a?.guided || (run.finished && !a?.solved)) &&
      !state.revealed.includes(key)
    )
      state.revealed.push(key);
    if (
      state.revealed.includes(key) ||
      !a?.solved ||
      !canGrade(q) ||
      a.assessment?.status === "ungraded" ||
      a.guided
    )
      continue;
    const previous = state.facts[key];
    // A hint in ANY attempt at this question disqualifies that attempt from independent awards.
    const independent = !state.exposed.includes(key);
    const points =
      (q.advanced ? 2 : 1) *
      (independent ? (a.firstCorrect === false ? 5 : 10) : 3);
    const next: Fact = {
      subject: job.subject,
      topic: q.topic,
      independent: independent || !!previous?.independent,
      corrected:
        (independent && a.firstCorrect === false) || !!previous?.corrected,
      hard: (independent && q.advanced) || !!previous?.hard,
      points: Math.max(points, previous?.points || 0),
    };
    if (JSON.stringify(previous) !== JSON.stringify(next)) {
      state.facts[key] = next;
      changed = true;
    }
    const delta = next.points - (previous?.points || 0);
    if (delta > 0)
      state.ledger.push({
        subject: job.subject,
        points: delta,
        date: localDay(now),
      });
  }
  if (
    run.finished &&
    run.questions.length &&
    run.questions.every((q) => canGrade(q) && run.attempts[q.id]?.solved)
  ) {
    const key = hash(
      [...new Set(run.questions.map((q) => questionKey(job.subject, q)))]
        .sort()
        .join(":"),
    );
    if (!state.lessons.includes(key)) {
      state.lessons.push(key);
      changed = true;
    }
  }
  if (changed && !state.days.includes(localDay(now)))
    state.days.push(localDay(now));
  const stats = achievementStats(state);
  for (const medal of medals)
    if (!state.earned[medal.id] && stats[medal.metric] >= medal.target)
      state.earned[medal.id] = { at: now, notified: false, celebrated: false };
}
export function achievementView(state: AchievementState): AchievementView {
  const stats = achievementStats(state);
  return {
    stats,
    points: state.ledger.reduce((n, e) => n + e.points, 0),
    medals: medals.map((m) => ({
      ...m,
      progress: Math.min(m.target, stats[m.metric]),
      earnedAt: state.earned[m.id]?.at,
      notified: state.earned[m.id]?.notified || false,
      celebrated: state.earned[m.id]?.celebrated || false,
    })),
  };
}
export async function readAchievements(user: Student) {
  const saved = await readRecord<AchievementState>("achievements", user.id);
  return { ...emptyAchievements(user.id, user.grade), ...saved };
}
export async function recordAchievements(
  user: Student,
  run: LearningRun,
  job: DocumentJob,
) {
  return lock("achievements:" + user.id, async () => {
    const state = await readAchievements(user);
    earnAchievements(state, run, job);
    await writeRecord("achievements", user.id, state);
    return achievementView(state);
  });
}
export async function acknowledgeMedals(
  user: Student,
  ids: string[],
  kind: "notified" | "celebrated",
) {
  if (
    !Array.isArray(ids) ||
    ids.length > 20 ||
    ids.some((id) => !medals.some((m) => m.id === id))
  )
    throw new AppError("Huy chương chưa hợp lệ.");
  return lock("achievements:" + user.id, async () => {
    const state = await readAchievements(user);
    for (const id of ids)
      if (state.earned[id]) {
        state.earned[id][kind] = true;
        if (kind === "celebrated") state.earned[id].notified = true;
      }
    await writeRecord("achievements", user.id, state);
    return achievementView(state);
  });
}
export async function rankings(
  user: Student,
  subject: Subject | "all",
  period: "week" | "all",
): Promise<RankingView> {
  const [students, states] = await Promise.all([
    listRecords<Student>("students"),
    listRecords<AchievementState>("achievements"),
  ]);
  const start = weekStart();
  const byId = new Map(
    states.filter((s) => s.grade === user.grade).map((s) => [s.id, s]),
  );
  const ranked = students
    .filter((s) => s.grade === user.grade)
    .map((s) => {
      const state = byId.get(s.id);
      return {
        id: s.id,
        nickname: s.nickname,
        character: s.character,
        points:
          state?.ledger
            .filter(
              (e) =>
                (subject === "all" || e.subject === subject) &&
                (period === "all" || e.date >= start),
            )
            .reduce((n, e) => n + e.points, 0) || 0,
        medals: Object.keys(state?.earned || {}).length,
        mine: s.id === user.id,
        rank: 0,
      };
    })
    .sort((a, b) => b.points - a.points || a.id.localeCompare(b.id));
  let rank = 0;
  ranked.forEach((r, i) => {
    if (i === 0 || r.points !== ranked[i - 1].points) rank = i + 1;
    r.rank = rank;
  });
  return {
    grade: user.grade,
    rows: ranked.slice(0, 50),
    mine: ranked.find((r) => r.mine) || null,
    participants: ranked.length,
    weekStart: start,
    period,
  };
}
