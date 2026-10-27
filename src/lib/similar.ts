export const similarDifficulties = [
  {
    value: "same",
    label: "Ngang câu hiện tại",
    description: "Cùng mức với bài em đang làm.",
  },
  {
    value: "harder",
    label: "Khó hơn",
    description: "Thêm thử thách trong dạng bài này.",
  },
  {
    value: "slightly_harder",
    label: "Khó hơn chút",
    description: "Tăng nhẹ, để em thử sức từng chút.",
  },
  {
    value: "progressive",
    label: "Tăng dần",
    description: "Bắt đầu ngang bài này, rồi tăng dần qua 5 câu.",
  },
  {
    value: "advanced",
    label: "Nâng cao",
    description: "Vận dụng sâu hơn, vẫn phù hợp chương trình của em.",
  },
] as const;
export type SimilarDifficulty = (typeof similarDifficulties)[number]["value"];
export function similarLevel(difficulty: SimilarDifficulty, index: number) {
  return difficulty === "progressive"
    ? ["same", "slightly_harder", "slightly_harder", "harder", "advanced"][
        index
      ]
    : difficulty;
}
