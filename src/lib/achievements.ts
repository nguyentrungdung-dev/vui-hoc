export type MedalMetric =
  | "solved"
  | "lessons"
  | "independent"
  | "days"
  | "corrected"
  | "hard"
  | "topics"
  | "streak"
  | "subjects";
export type Medal = {
  id: string;
  name: string;
  reason: string;
  icon: string;
  group: string;
  metric: MedalMetric;
  target: number;
};
export const medals: Medal[] = [
  {
    id: "first-star",
    name: "Ngôi sao đầu tiên",
    reason: "Giải đúng câu hỏi đầu tiên.",
    icon: "⭐",
    group: "Khởi đầu",
    metric: "solved",
    target: 1,
  },
  {
    id: "first-journey",
    name: "Bước chân khám phá",
    reason: "Hoàn thành buổi học đầu tiên.",
    icon: "👣",
    group: "Khởi đầu",
    metric: "lessons",
    target: 1,
  },
  {
    id: "little-brave",
    name: "Em tự làm được",
    reason: "Tự giải đúng 5 câu khác nhau, không mở hint hay lời giải.",
    icon: "🌱",
    group: "Khởi đầu",
    metric: "independent",
    target: 5,
  },
  {
    id: "twenty-stars",
    name: "Túi sao nhỏ",
    reason: "Giải đúng 20 câu hỏi khác nhau.",
    icon: "✨",
    group: "Khởi đầu",
    metric: "solved",
    target: 20,
  },
  {
    id: "try-again",
    name: "Không bỏ cuộc",
    reason:
      "Tự sửa đúng câu đầu tiên từng làm sai, không mở hint hay lời giải.",
    icon: "💪",
    group: "Tiến bộ",
    metric: "corrected",
    target: 1,
  },
  {
    id: "repair-five",
    name: "Thợ sửa lỗi tí hon",
    reason: "Tự sửa đúng 5 câu từng làm sai, không mở hint hay lời giải.",
    icon: "🛠️",
    group: "Tiến bộ",
    metric: "corrected",
    target: 5,
  },
  {
    id: "repair-twenty",
    name: "Biến sai thành hay",
    reason: "Tự sửa đúng 20 câu từng làm sai, không mở hint hay lời giải.",
    icon: "🦋",
    group: "Tiến bộ",
    metric: "corrected",
    target: 20,
  },
  {
    id: "independent-fifty",
    name: "Đôi cánh tự tin",
    reason: "Tự giải đúng 50 câu khác nhau, không mở hint hay lời giải.",
    icon: "🪽",
    group: "Tiến bộ",
    metric: "independent",
    target: 50,
  },
  {
    id: "three-days",
    name: "Hẹn nhau học nhé",
    reason: "Có kết quả học mới trong 3 ngày khác nhau.",
    icon: "📅",
    group: "Kiên trì",
    metric: "days",
    target: 3,
  },
  {
    id: "streak-three",
    name: "Ngọn lửa nhỏ",
    reason: "Có kết quả học mới 3 ngày liên tiếp.",
    icon: "🔥",
    group: "Kiên trì",
    metric: "streak",
    target: 3,
  },
  {
    id: "streak-seven",
    name: "Một tuần rực rỡ",
    reason: "Có kết quả học mới 7 ngày liên tiếp.",
    icon: "🌈",
    group: "Kiên trì",
    metric: "streak",
    target: 7,
  },
  {
    id: "streak-thirty",
    name: "Ngọn hải đăng",
    reason: "Có kết quả học mới 30 ngày liên tiếp.",
    icon: "🏮",
    group: "Kiên trì",
    metric: "streak",
    target: 30,
  },
  {
    id: "three-topics",
    name: "Nhà thám hiểm nhỏ",
    reason: "Tự giải đúng câu hỏi thuộc 3 chủ đề khác nhau.",
    icon: "🧭",
    group: "Khám phá",
    metric: "topics",
    target: 3,
  },
  {
    id: "two-subjects",
    name: "Đôi mắt tò mò",
    reason: "Tự giải đúng câu hỏi ở 2 môn học khác nhau.",
    icon: "🔭",
    group: "Khám phá",
    metric: "subjects",
    target: 2,
  },
  {
    id: "five-lessons",
    name: "Chuyến tàu tri thức",
    reason: "Hoàn thành 5 buổi học có bộ câu hỏi khác nhau.",
    icon: "🚂",
    group: "Khám phá",
    metric: "lessons",
    target: 5,
  },
  {
    id: "twentyfive-lessons",
    name: "Thuyền trưởng tri thức",
    reason: "Hoàn thành 25 buổi học có bộ câu hỏi khác nhau.",
    icon: "⛵",
    group: "Khám phá",
    metric: "lessons",
    target: 25,
  },
  {
    id: "brave-warrior",
    name: "Dũng sĩ quả cảm",
    reason: "Tự giải đúng 5 bài khó khác nhau, không mở hint hay lời giải.",
    icon: "🛡️",
    group: "Chinh phục",
    metric: "hard",
    target: 5,
  },
  {
    id: "mountain-fifteen",
    name: "Nhà leo núi",
    reason: "Tự giải đúng 15 bài khó khác nhau, không mở hint hay lời giải.",
    icon: "⛰️",
    group: "Chinh phục",
    metric: "hard",
    target: 15,
  },
  {
    id: "dragon-fifty",
    name: "Hiệp sĩ rồng vàng",
    reason: "Tự giải đúng 50 bài khó khác nhau, không mở hint hay lời giải.",
    icon: "🐉",
    group: "Chinh phục",
    metric: "hard",
    target: 50,
  },
  {
    id: "fivehundred-stars",
    name: "Huyền thoại ngân hà",
    reason: "Giải đúng 500 câu hỏi khác nhau.",
    icon: "🌌",
    group: "Chinh phục",
    metric: "solved",
    target: 500,
  },
];
export type MedalView = Medal & {
  progress: number;
  earnedAt?: string;
  notified: boolean;
  celebrated: boolean;
};
export type AchievementView = {
  medals: MedalView[];
  points: number;
  stats: Record<MedalMetric, number>;
};
export type RankingRow = {
  id: string;
  nickname: string;
  character: number;
  points: number;
  rank: number;
  medals: number;
  mine: boolean;
};
export type RankingView = {
  grade: number;
  rows: RankingRow[];
  mine: RankingRow | null;
  participants: number;
  weekStart: string;
  period: "week" | "all";
};
