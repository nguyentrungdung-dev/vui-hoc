export const STORAGE_KEY = "vuihoc-demo-v1";
export const characters = [
  "Mèo máy Bim",
  "Chuột Nắng",
  "Cún Bầu Trời",
  "Cáo Tuyết",
  "Cún Cứu Hộ",
  "Thỏ Mây",
  "Gấu Mật",
  "Bạn Sao Xanh",
  "Mèo Cam",
  "Gấu Trúc",
  "Khủng Long",
  "Cánh Cụt",
  "Sư Tử",
  "Kỳ Lân",
  "Sóc Nâu",
  "Cú Thông Thái",
];
export const topics = [
  {
    id: "add",
    name: "Cộng, trừ thật khéo",
    icon: "＋",
    color: "blue",
    description: "Cộng, trừ trong phạm vi 100",
    example: "28 + 15 = ?",
    duration: 4,
  },
  {
    id: "story",
    name: "Toán quanh em",
    icon: "✎",
    color: "peach",
    description: "Tìm lời giải từ những câu chuyện nhỏ",
    example: "Lan có 24 viên bi…",
    duration: 4,
  },
  {
    id: "shape",
    name: "Thế giới hình học",
    icon: "△",
    color: "purple",
    description: "Nhận biết hình và tính độ dài",
    example: "Hình tam giác có mấy cạnh?",
    duration: 3,
  },
  {
    id: "logic",
    name: "Thử tài suy luận",
    icon: "✦",
    color: "green",
    description: "Khám phá quy luật và tìm số còn thiếu",
    example: "2, 4, 6, …, 10",
    duration: 4,
  },
] as const;
export type TopicId = (typeof topics)[number]["id"];
export type Mode = "weekly" | "timo";
export type Question = {
  id: string;
  topic: TopicId;
  text: string;
  english: string;
  options: number[];
  answer: number;
  unit?: string;
  hint: string;
  steps: string[];
  advanced: boolean;
  shape?: boolean;
};
export type Attempt = {
  first?: number;
  last?: number;
  tries: number;
  hintOpens: number;
  hintMs: number;
  guided: boolean;
  solved: boolean;
};
export type Run = {
  id: string;
  kind: "practice" | "original" | "similar";
  questions: Question[];
  attempts: Record<string, Attempt>;
  index: number;
  finished: boolean;
  startedAt: number;
};
export type Result = {
  id: string;
  date: number;
  name: string;
  total: number;
  firstCorrect: number;
  solved: number;
  independent: number;
  hints: number;
  score: number;
  byTopic: { id: TopicId; total: number; correct: number; hints: number }[];
};
export type Lesson = {
  name: string;
  mode: Mode;
  count: number;
  topics: TopicId[];
  startedAt: number;
  fileName: string;
  stage: number;
};
export type State = {
  version: 1;
  profile: { name: string; character: number; dailyGoal: number };
  lesson: Lesson;
  run: Run | null;
  history: Result[];
};
export const initialState: State = {
  version: 1,
  profile: { name: "Nhà thám hiểm nhỏ", character: 4, dailyGoal: 1 },
  lesson: {
    name: "Toán tuần 5 · Cùng em khám phá",
    mode: "weekly",
    count: 25,
    topics: ["add", "story", "shape", "logic"],
    startedAt: 0,
    fileName: "Toán lớp 2 — Tuần 5.pdf (mẫu)",
    stage: 4,
  },
  run: null,
  history: [],
};

// Deterministic fixtures, never inferred from an uploaded document.
export function createQuestions(
  count: number,
  selected: TopicId[],
  mode: Mode,
  seed = 0,
): Question[] {
  const pool = selected.length ? selected : ["add" as TopicId];
  return Array.from({ length: count }, (_, i) => {
    const topic = pool[Math.floor(i / 2) % pool.length];
    const n = i + seed;
    const a = 21 + (n % 18),
      b = 12 + (n % 9);
    const advanced = mode === "timo" || i >= Math.floor(count * 0.8);
    let text = "",
      english = "",
      answer = 0,
      hint = "",
      steps: string[] = [],
      unit = "";
    if (topic === "add") {
      const subtract = n % 2 === 1;
      answer = subtract ? a - b : a + b;
      text = `Em hãy tính: ${a} ${subtract ? "−" : "+"} ${b} = ?`;
      english = `Calculate: ${a} ${subtract ? "−" : "+"} ${b} = ?`;
      hint = "Tách số thành chục và đơn vị. Em hãy tính phần đơn vị trước nhé.";
      const borrow = subtract && a % 10 < b % 10;
      const aOnes = (a % 10) + (borrow ? 10 : 0);
      const aTens = Math.floor(a / 10) - (borrow ? 1 : 0);
      const ones = subtract ? aOnes - (b % 10) : (a % 10) + (b % 10);
      const tens = subtract
        ? aTens - Math.floor(b / 10)
        : Math.floor(a / 10) + Math.floor(b / 10);
      hint = borrow
        ? "Hàng đơn vị chưa đủ để trừ. Em đổi 1 chục thành 10 đơn vị nhé."
        : hint;
      steps = [
        borrow
          ? `Đổi 1 chục: ${a} gồm ${aTens} chục và ${aOnes} đơn vị.`
          : `Tách ${a} = ${Math.floor(a / 10) * 10} + ${a % 10}; ${b} = ${Math.floor(b / 10) * 10} + ${b % 10}.`,
        subtract
          ? `Hàng đơn vị: ${aOnes} − ${b % 10} = ${ones}. Hàng chục: ${aTens} − ${Math.floor(b / 10)} = ${tens}.`
          : `Cộng hàng chục được ${tens * 10}; cộng hàng đơn vị được ${ones}.`,
        `Gộp lại: ${tens * 10} + ${ones} = ${answer}. Vậy ${a} ${subtract ? "−" : "+"} ${b} = ${answer}.`,
      ];
    } else if (topic === "story") {
      const extra = advanced ? 5 : 0;
      answer = a + b - extra;
      text = `Lan có ${a} viên bi. Minh tặng Lan ${b} viên bi.${extra ? " Lan cho em 5 viên bi." : ""} Hỏi Lan có ${extra ? "còn lại" : "tất cả"} bao nhiêu viên bi?`;
      english = `Lan has ${a} marbles. Minh gives her ${b} more.${extra ? " She gives 5 to her brother." : ""} How many marbles does Lan have now?`;
      hint =
        "Được tặng thêm thì số viên bi tăng lên. Em cần dùng phép tính nào?";
      steps = [
        `Sau khi Minh tặng, Lan có: ${a} + ${b} = ${a + b} (viên bi).`,
        ...(extra
          ? [`Sau khi cho em, Lan còn: ${a + b} − 5 = ${answer} (viên bi).`]
          : []),
        `Đáp số: ${answer} viên bi.`,
      ];
      unit = "viên bi";
    } else if (topic === "shape") {
      const side = 3 + (n % 6);
      answer = advanced ? side * 3 : 3;
      text = advanced
        ? `Một hình tam giác có ba cạnh đều dài ${side} cm. Tổng độ dài ba cạnh là bao nhiêu?`
        : "Em quan sát hình bên dưới. Hình tam giác có bao nhiêu cạnh?";
      english = advanced
        ? `A triangle has three sides of ${side} cm each. What is the total length?`
        : "How many sides does this triangle have?";
      hint = advanced
        ? "Cộng độ dài của cả ba cạnh. Mỗi cạnh có cùng độ dài."
        : "Em hãy đếm từng đoạn thẳng tạo thành đường bao của hình.";
      steps = advanced
        ? [
            `Tam giác có 3 cạnh, mỗi cạnh ${side} cm.`,
            `${side} + ${side} + ${side} = ${answer} (cm).`,
            `Tổng độ dài là ${answer} cm.`,
          ]
        : [
            "Đếm cạnh thứ nhất, cạnh thứ hai và cạnh thứ ba.",
            "Hình tam giác có 3 cạnh.",
          ];
      unit = advanced ? "cm" : "cạnh";
    } else {
      const step = advanced ? 3 : 2,
        start = 2 + (n % 5);
      answer = start + step * 3;
      text = `Tìm số còn thiếu: ${start}, ${start + step}, ${start + step * 2}, …, ${start + step * 4}`;
      english = `Find the missing number: ${start}, ${start + step}, ${start + step * 2}, …, ${start + step * 4}`;
      hint = "Thử lấy số sau trừ số ngay trước. Các số cách nhau bao nhiêu?";
      steps = [
        `${start + step} − ${start} = ${step}; ${start + step * 2} − ${start + step} = ${step}.`,
        `Mỗi số sau lớn hơn số trước ${step} đơn vị.`,
        `Số cần điền: ${start + step * 2} + ${step} = ${answer}.`,
      ];
    }
    const options = [answer, answer + 2, Math.max(0, answer - 1), answer + 5];
    const rotate = n % 4;
    return {
      id: `q-${seed}-${i}`,
      topic,
      text,
      english,
      answer,
      options: [...options.slice(rotate), ...options.slice(0, rotate)],
      hint,
      steps,
      unit,
      advanced,
      shape: topic === "shape",
    };
  });
}

export function summarize(run: Run, name: string, date = Date.now()): Result {
  const firstCorrect = run.questions.filter(
    (q) => run.attempts[q.id]?.first === q.answer,
  ).length;
  const attempts = Object.values(run.attempts);
  return {
    id: run.id,
    date,
    name,
    total: run.questions.length,
    firstCorrect,
    solved: attempts.filter((a) => a.solved).length,
    independent: run.questions.filter((q) => {
      const a = run.attempts[q.id];
      return a?.first === q.answer && a.hintOpens === 0 && !a.guided;
    }).length,
    hints: attempts.reduce((sum, a) => sum + a.hintOpens, 0),
    score: Math.round((firstCorrect / run.questions.length) * 100) / 10,
    byTopic: topics
      .map((t) => {
        const qs = run.questions.filter((q) => q.topic === t.id);
        return {
          id: t.id,
          total: qs.length,
          correct: qs.filter((q) => run.attempts[q.id]?.first === q.answer)
            .length,
          hints: qs.reduce(
            (sum, q) => sum + (run.attempts[q.id]?.hintOpens ?? 0),
            0,
          ),
        };
      })
      .filter((t) => t.total > 0),
  };
}

export function newAttempt(): Attempt {
  return { tries: 0, hintOpens: 0, hintMs: 0, guided: false, solved: false };
}

export function recordAnswer(
  attempt: Attempt,
  answer: number,
  correctAnswer: number,
): Attempt {
  if (attempt.solved) return attempt;
  return {
    ...attempt,
    first: attempt.first ?? answer,
    last: answer,
    tries: attempt.tries + 1,
    solved: answer === correctAnswer,
  };
}

export const chapters = [
  {
    title: "Cùng khám phá phép cộng",
    subtitle: "Gộp hai nhóm để tìm tất cả",
    left: "24",
    right: "13",
    result: "37",
    narration:
      "Có 24 ngôi sao xanh và 13 ngôi sao vàng. Muốn biết có tất cả bao nhiêu ngôi sao, chúng mình dùng phép cộng nhé!",
  },
  {
    title: "Tách chục, tách đơn vị",
    subtitle: "Tính từng phần, thật dễ hiểu",
    left: "20 + 10",
    right: "4 + 3",
    result: "30 + 7",
    narration:
      "24 gồm 2 chục và 4 đơn vị. 13 gồm 1 chục và 3 đơn vị. Cộng hàng chục được 30, cộng hàng đơn vị được 7.",
  },
  {
    title: "Đến lượt em thử sức!",
    subtitle: "24 + 13 bằng bao nhiêu?",
    left: "24",
    right: "13",
    result: "?",
    narration:
      "Em hãy chọn đáp án bên dưới. Cứ bình tĩnh, em có thể tách chục và đơn vị để tìm kết quả.",
  },
  {
    title: "Em làm tốt lắm!",
    subtitle: "Mỗi bước nhỏ là một tiến bộ",
    left: "24",
    right: "13",
    result: "37",
    narration:
      "Chính xác! 30 cộng 7 bằng 37. Bây giờ, chúng mình cùng làm một câu tương tự để nhớ lâu hơn nhé.",
  },
];
