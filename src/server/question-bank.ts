import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { LearningQuestion } from "../lib/learning";
import { databaseEnabled, query, databaseLock } from "./database";
import { dataRoot, lock } from "./store";
import { AppError } from "./validation";
import {
  BANK_POLICY,
  bankContentKey,
  bankHash,
  type BankProfile,
} from "./question-bank-profile";

export const BANK_TAKE_SQL = `WITH existing AS (
          SELECT b.content_key,b.data,b.policy,b.audit FROM vuihoc_question_bank_allocations a
          JOIN vuihoc_question_bank b ON b.content_key=a.content_key
          WHERE a.owner=$3 AND a.slot_key=$5 AND a.profile_key=$1
          AND b.policy=$2 AND b.status='active' AND NOT (b.content_key=ANY($4::text[]))
        ), candidate AS (
          SELECT b.content_key,b.data,b.policy,b.audit
          FROM (SELECT content_key FROM vuihoc_question_bank_profiles
                WHERE profile_key=$1 ORDER BY content_key OFFSET 0) p
          CROSS JOIN LATERAL (
            SELECT b.content_key,b.data,b.policy,b.audit FROM vuihoc_question_bank b
            WHERE b.content_key=p.content_key AND b.policy=$2 AND b.status='active'
            AND NOT (b.content_key=ANY($4::text[]))
            AND NOT EXISTS(SELECT 1 FROM vuihoc_question_bank_seen s WHERE s.owner=$3 AND s.content_key=b.content_key)
            OFFSET 0
          ) b
          WHERE NOT EXISTS(SELECT 1 FROM existing)
          ORDER BY p.content_key LIMIT 1
        ), chosen AS (SELECT * FROM existing UNION ALL SELECT * FROM candidate),
        delivered AS (
          INSERT INTO vuihoc_question_bank_seen(owner,content_key) SELECT $3,content_key FROM chosen ON CONFLICT DO NOTHING
        ), bound AS (
          INSERT INTO vuihoc_question_bank_allocations(owner,slot_key,profile_key,content_key)
          SELECT $3,$5,$1,content_key FROM chosen
          ON CONFLICT(owner,slot_key) DO UPDATE SET profile_key=EXCLUDED.profile_key,content_key=EXCLUDED.content_key
        ) SELECT * FROM chosen`;

export type BankAudit = {
  pipeline: "similar" | "practice";
  model: string;
  at: string;
  independentlySolved: true;
  consistent: true;
};
type Entry = {
  contentKey: string;
  policy: string;
  status: "active" | "quarantined";
  question: LearningQuestion;
  audit: BankAudit;
  reason?: string;
};
type Allocation = { contentKey: string; profileKey: string };
const root = () => path.join(dataRoot(), "question-bank");
const file = (...parts: string[]) => path.join(root(), ...parts) + ".json";
async function read<T>(target: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(target, "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}
async function write(target: string, value: unknown) {
  await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const temp = target + "." + randomUUID() + ".tmp";
  await fs.writeFile(temp, JSON.stringify(value), { mode: 0o600 });
  await fs.rename(temp, target);
}
const actor = (owner: string) => bankHash(owner);
const slotKey = (slot: string) => bankHash(slot);
const ownerLock = <T>(owner: string, fn: () => Promise<T>) =>
  databaseEnabled()
    ? databaseLock(`question-bank-owner:${actor(owner)}`, fn)
    : lock(`question-bank-owner:${actor(owner)}`, fn);
function attach(entry: Entry, profile: BankProfile): LearningQuestion {
  return {
    ...structuredClone(entry.question),
    bank: {
      contentKey: entry.contentKey,
      profileKey: profile.key,
      policy: profile.policy,
      reused: true,
    },
  };
}
async function allocation(
  owner: string,
  slot: string,
): Promise<Allocation | null> {
  if (databaseEnabled())
    return (
      (
        await query<{ content_key: string; profile_key: string }>(
          "SELECT content_key, profile_key FROM vuihoc_question_bank_allocations WHERE owner=$1 AND slot_key=$2",
          [owner, slotKey(slot)],
        )
      ).rows.map((r) => ({
        contentKey: r.content_key,
        profileKey: r.profile_key,
      }))[0] || null
    );
  return read(file("allocations", actor(owner), slotKey(slot)));
}
async function entry(contentKey: string): Promise<Entry | null> {
  if (databaseEnabled()) {
    const row = (
      await query<{
        data: LearningQuestion;
        policy: string;
        status: Entry["status"];
        audit: BankAudit;
      }>(
        "SELECT data, policy, status, audit FROM vuihoc_question_bank WHERE content_key=$1",
        [contentKey],
      )
    ).rows[0];
    return row
      ? {
          contentKey,
          question: row.data,
          policy: row.policy,
          status: row.status,
          audit: row.audit,
        }
      : null;
  }
  return read(file("items", contentKey));
}
async function seen(owner: string, contentKey: string) {
  if (databaseEnabled())
    return !!(
      await query(
        "SELECT 1 FROM vuihoc_question_bank_seen WHERE owner=$1 AND content_key=$2",
        [owner, contentKey],
      )
    ).rowCount;
  return !!(await read(file("seen", actor(owner), contentKey)));
}
async function assign(
  owner: string,
  slot: string,
  profile: BankProfile,
  item: Entry,
) {
  if (databaseEnabled()) {
    await query(
      "INSERT INTO vuihoc_question_bank_seen(owner,content_key) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [owner, item.contentKey],
    );
    await query(
      `INSERT INTO vuihoc_question_bank_allocations(owner,slot_key,profile_key,content_key) VALUES($1,$2,$3,$4)
      ON CONFLICT(owner,slot_key) DO UPDATE SET profile_key=EXCLUDED.profile_key,content_key=EXCLUDED.content_key`,
      [owner, slotKey(slot), profile.key, item.contentKey],
    );
  } else {
    await write(file("seen", actor(owner), item.contentKey), {
      at: new Date().toISOString(),
    });
    await write(file("allocations", actor(owner), slotKey(slot)), {
      profileKey: profile.key,
      contentKey: item.contentKey,
    });
  }
}

/** Exact indexed bucket + indexed anti-join, no whole-bank scan or AI search. */
export async function takeBankQuestion(
  profile: BankProfile,
  owner: string,
  slot: string,
  exclude: string[] = [],
) {
  if (!owner || profile.policy !== BANK_POLICY) return null;
  return ownerLock(owner, async () => {
    if (databaseEnabled()) {
      const row = (
        await query<{
          content_key: string;
          data: LearningQuestion;
          policy: string;
          audit: BankAudit;
        }>(BANK_TAKE_SQL, [
          profile.key,
          profile.policy,
          owner,
          exclude,
          slotKey(slot),
        ])
      ).rows[0];
      return row
        ? attach(
            {
              contentKey: row.content_key,
              policy: row.policy,
              audit: row.audit,
              question: row.data,
              status: "active",
            },
            profile,
          )
        : null;
    }
    const assigned = await allocation(owner, slot);
    if (
      assigned?.profileKey === profile.key &&
      !exclude.includes(assigned.contentKey)
    ) {
      const item = await entry(assigned.contentKey);
      if (item?.status === "active" && item.policy === profile.policy)
        return attach(item, profile);
    }
    const dir = path.join(root(), "profiles", profile.key);
    const iterator = await fs.opendir(dir).catch((e) => {
      if (e.code === "ENOENT") return null;
      throw e;
    });
    if (!iterator) return null;
    // Local development also reads just one exact profile, never the complete catalog.
    for await (const ref of iterator) {
      if (!ref.name.endsWith(".json")) continue;
      const key = ref.name.slice(0, -5);
      if (exclude.includes(key) || (await seen(owner, key))) continue;
      const item = await entry(key);
      if (item?.status !== "active" || item.policy !== profile.policy) continue;
      await assign(owner, slot, profile, item);
      return attach(item, profile);
    }
    return null;
  });
}

/** Called only after both independent and consistency checks have succeeded. */
export async function publishBankQuestion(
  profile: BankProfile,
  question: LearningQuestion,
  owner: string,
  slot: string,
  audit: BankAudit,
) {
  if (
    profile.policy !== BANK_POLICY ||
    audit.pipeline !== profile.kind ||
    !audit.independentlySolved ||
    !audit.consistent ||
    question.grading === "ungraded" ||
    question.contentVersion !== 2 ||
    question.hasFigure ||
    question.figureIssue ||
    question.hints.length !== 3 ||
    question.steps.length < 2 ||
    !question.answer.trim()
  )
    throw new AppError(
      "BANK_APPROVAL: Chỉ lưu câu tự đủ dữ kiện đã được giải và kiểm định.",
      502,
    );
  const contentKey = bankContentKey(profile.subject, profile.mode, question);
  const {
    bank: _bank,
    generationApproval: _approval,
    ...body
  } = structuredClone(question);
  const payload: LearningQuestion = {
    ...body,
    id: `bank-${contentKey.slice(0, 24)}`,
    label: "",
    sourceIds: [],
    sourcePages: [1],
    warnings: [],
    figureRegions: [],
  };
  const item: Entry = {
    contentKey,
    policy: profile.policy,
    status: "active",
    question: payload,
    audit,
  };
  if (databaseEnabled()) {
    await query(
      `INSERT INTO vuihoc_question_bank(content_key,policy,data,audit) VALUES($1,$2,$3::jsonb,$4::jsonb)
      ON CONFLICT(content_key) DO UPDATE SET policy=EXCLUDED.policy,data=EXCLUDED.data,audit=EXCLUDED.audit
      WHERE vuihoc_question_bank.status='active' AND vuihoc_question_bank.policy<>EXCLUDED.policy`,
      [
        contentKey,
        profile.policy,
        JSON.stringify(payload),
        JSON.stringify(audit),
      ],
    );
    await query(
      "INSERT INTO vuihoc_question_bank_profiles(profile_key,content_key) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [profile.key, contentKey],
    );
  } else
    await lock(`question-bank-item:${contentKey}`, async () => {
      const current = await entry(contentKey);
      if (
        !current ||
        (current.status === "active" && current.policy !== profile.policy)
      )
        await write(file("items", contentKey), item);
      await write(file("profiles", profile.key, contentKey), true);
    });
  const canonical = await entry(contentKey);
  const resultKey = (q: LearningQuestion) => {
    const value = Array.isArray(q.options)
      ? q.options.find((o) => o.label === q.answer)?.text
      : undefined;
    return typeof value === "string"
      ? bankHash(
          value.normalize("NFC").replace(/\s+/gu, " ").trim().toLowerCase(),
        )
      : null;
  };
  if (
    canonical?.status === "active" &&
    question.grading === "choice" &&
    resultKey(canonical.question) !== resultKey(question)
  ) {
    await quarantineBankQuestion(
      contentKey,
      "Hai hồ sơ kiểm định có đáp án đóng mâu thuẫn cho cùng nội dung.",
    );
    throw new AppError(
      "BANK_ANSWER_CONFLICT: Cùng nội dung có đáp án mâu thuẫn; đã ngừng sử dụng, cần câu khác.",
      502,
    );
  }
  return ownerLock(owner, async () => {
    const current = await entry(contentKey);
    if (current?.status !== "active" || current.policy !== profile.policy)
      throw new AppError(
        "BANK_QUARANTINED: Nội dung này đã bị ngừng sử dụng; cần một câu khác.",
        502,
      );
    const assigned = await allocation(owner, slot);
    if ((await seen(owner, contentKey)) && assigned?.contentKey !== contentKey)
      throw new AppError(
        "BANK_REPEAT: Học sinh đã được giao câu này. Hãy đổi dữ kiện và tạo câu khác.",
        502,
      );
    await assign(owner, slot, profile, current);
    return {
      ...question,
      bank: { contentKey, profileKey: profile.key, policy: profile.policy },
    };
  });
}

export async function quarantineBankQuestion(
  contentKey: string,
  reason: string,
) {
  if (!/^[a-f0-9]{64}$/.test(contentKey) || !reason.trim())
    throw new AppError("Thiếu mã câu hoặc lý do kiểm tra.");
  if (databaseEnabled())
    await query(
      "UPDATE vuihoc_question_bank SET status='quarantined', audit=audit || $2::jsonb WHERE content_key=$1",
      [
        contentKey,
        JSON.stringify({
          quarantineReason: reason.slice(0, 1500),
          quarantinedAt: new Date().toISOString(),
        }),
      ],
    );
  else
    await lock(`question-bank-item:${contentKey}`, async () => {
      const item = await entry(contentKey);
      if (item)
        await write(file("items", contentKey), {
          ...item,
          status: "quarantined",
          reason: reason.slice(0, 1500),
        });
    });
}

/** When a different student opens an existing pack, record delivery for that student. */
export async function markBankQuestionsSeen(
  owner: string,
  questions: LearningQuestion[],
) {
  const keys = [
    ...new Set(questions.flatMap((q) => (q.bank ? [q.bank.contentKey] : []))),
  ];
  if (!keys.length || !owner) return;
  return ownerLock(owner, async () => {
    if (databaseEnabled())
      await query(
        "INSERT INTO vuihoc_question_bank_seen(owner,content_key) SELECT $1,unnest($2::text[]) ON CONFLICT DO NOTHING",
        [owner, keys],
      );
    else
      for (const key of keys)
        await write(file("seen", actor(owner), key), {
          at: new Date().toISOString(),
        });
  });
}

async function claimFill(profile: string, holder: string) {
  if (databaseEnabled())
    return !!(
      await query(
        `INSERT INTO vuihoc_question_bank_fills(profile_key,holder,expires_at) VALUES($1,$2,now()+interval '5 minutes')
    ON CONFLICT(profile_key) DO UPDATE SET holder=EXCLUDED.holder,expires_at=EXCLUDED.expires_at
    WHERE vuihoc_question_bank_fills.expires_at<now() OR vuihoc_question_bank_fills.holder=EXCLUDED.holder RETURNING profile_key`,
        [profile, holder],
      )
    ).rowCount;
  return lock(`question-bank-fill:${profile}`, async () => {
    const current = await read<{ holder: string; until: number }>(
      file("fills", profile),
    );
    if (current && current.holder !== holder && current.until > Date.now())
      return false;
    await write(file("fills", profile), { holder, until: Date.now() + 300000 });
    return true;
  });
}
async function releaseFill(profile: string, holder: string) {
  if (databaseEnabled())
    await query(
      "DELETE FROM vuihoc_question_bank_fills WHERE profile_key=$1 AND holder=$2",
      [profile, holder],
    );
  else
    await lock(`question-bank-fill:${profile}`, async () => {
      const target = file("fills", profile);
      if ((await read<{ holder: string }>(target))?.holder === holder)
        await fs.unlink(target);
    });
}
/** Short database transactions claim expiring leases; never keep a transaction open across AI calls. */
export async function acquireBankFills(
  profiles: BankProfile[],
  signal?: AbortSignal,
) {
  const holder = randomUUID(),
    claimed: string[] = [],
    deadline = Date.now() + 240000;
  try {
    for (const key of [...new Set(profiles.map((p) => p.key))].sort()) {
      while (!(await claimFill(key, holder))) {
        signal?.throwIfAborted();
        if (Date.now() > deadline)
          throw new AppError(
            "Kho đang bổ sung câu cùng dạng. Hãy thử lại phần chưa xong.",
            503,
          );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      claimed.push(key);
    }
  } catch (e) {
    for (const key of claimed) await releaseFill(key, holder);
    throw e;
  }
  return async () => {
    for (const key of claimed) await releaseFill(key, holder);
  };
}

export async function reportGeneratedQuestion(
  docId: string,
  runId: string,
  viewer: string,
  input: unknown,
) {
  const body = input as { questionId?: unknown; reason?: unknown } | null;
  if (
    !body ||
    typeof body.questionId !== "string" ||
    typeof body.reason !== "string" ||
    !body.reason.trim() ||
    body.reason.length > 1500
  )
    throw new AppError("Nhập lý do cần kiểm tra câu hỏi (tối đa 1.500 ký tự).");
  const { readRun } = await import("./learning-runs");
  const { writeRecord } = await import("./account-store");
  const run = await readRun(docId, runId, viewer);
  const q = run.questions.find((q) => q.id === body.questionId);
  if (!q || run.kind === "original")
    throw new AppError("Không tìm thấy câu luyện tập.", 404);
  if (q.bank) await quarantineBankQuestion(q.bank.contentKey, body.reason);
  await writeRecord(
    "question-reports",
    bankHash([viewer, docId, runId, q.id]),
    {
      owner: viewer,
      documentId: docId,
      runId,
      questionId: q.id,
      contentKey: q.bank?.contentKey,
      reason: body.reason.trim(),
      at: new Date().toISOString(),
    },
  );
  return { received: true };
}

/** Keep a quarantined cached question out of newly opened runs as well. */
export async function assertBankQuestionsActive(questions: LearningQuestion[]) {
  const keys = [
    ...new Set(questions.flatMap((q) => (q.bank ? [q.bank.contentKey] : []))),
  ];
  if (!keys.length) return;
  if (questions.some((q) => q.bank && q.bank.policy !== BANK_POLICY))
    throw new AppError(
      "Bộ luyện cần được kiểm định theo phiên bản mới. Hãy tạo bộ mới trước khi bắt đầu.",
      409,
    );
  let active: Set<string>;
  if (databaseEnabled())
    active = new Set(
      (
        await query<{ content_key: string }>(
          "SELECT content_key FROM vuihoc_question_bank WHERE content_key=ANY($1::text[]) AND status='active' AND policy=$2",
          [keys, BANK_POLICY],
        )
      ).rows.map((r) => r.content_key),
    );
  else
    active = new Set(
      (
        await Promise.all(
          keys.map(async (key) => {
            const item = await entry(key);
            return item?.status === "active" && item.policy === BANK_POLICY
              ? key
              : null;
          }),
        )
      ).filter((key): key is string => !!key),
    );
  if (keys.some((key) => !active.has(key)))
    throw new AppError(
      "Bộ luyện có câu cần kiểm tra lại. Hãy tạo bộ mới trước khi bắt đầu một lượt làm mới.",
      409,
    );
}
