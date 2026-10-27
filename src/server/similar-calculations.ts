import type { LearningQuestion } from "../lib/learning";
import type { SimilarDifficulty } from "../lib/similar";
import { similarLevel } from "../lib/similar";
import { AppError } from "./validation";

function expression(text: string) {
  const value = text.replace(/[−–]/g, "-").replace(/\s+/g, "");
  if (!/^\d+(?:[+-]\d+)+$/.test(value)) return null;
  return {
    numbers: value.split(/[+-]/).map(Number),
    operators: value.match(/[+-]/g)!,
  };
}
export function calculationBand(
  source: LearningQuestion,
  difficulty: SimilarDifficulty,
  index: number,
) {
  if (
    !/đặt tính/iu.test(source.prompt) ||
    !source.answerFields?.length ||
    !source.answerFields.every((f) => {
      const e = expression(f.label);
      return (
        e &&
        e.numbers.length === 2 &&
        e.numbers.every((n) => n >= 10 && n < 100)
      );
    })
  )
    return null;
  const level = similarLevel(difficulty, index);
  if (level === "same") return "current";
  if (level === "slightly_harder")
    return difficulty === "progressive" && index === 2
      ? "three_small"
      : "cross100";
  return level === "harder" ? "three" : "chain";
}
export function calculationDirections(
  source: LearningQuestion,
  difficulty: SimilarDifficulty,
  index: number,
) {
  const band = calculationBand(source, difficulty, index);
  return !band
    ? ""
    : {
        current:
          "Mỗi ý là phép cộng/trừ hai số có hai chữ số, có nhớ/mượn, kết quả dưới 100.",
        cross100:
          "Tăng nhẹ: mỗi ý là hai toán hạng. Cộng hai số hai chữ số cho kết quả từ 100 đến 199; trừ số 100–199 cho số hai chữ số, có mượn, kết quả không âm. Đây là cùng bước chuyển qua hàng trăm cho cả bốn ý.",
        three_small:
          "Bước tiếp: mỗi ý là cộng/trừ hai số 100–499, có nhớ/mượn, kết quả từ 0 đến 499.",
        three:
          "Mỗi ý là cộng/trừ hai số ba chữ số (100–999), có ít nhất hai lần nhớ/mượn, kết quả từ 0 đến 999.",
        chain:
          "Nâng cao: mỗi ý là một phép tính liên tiếp với đúng ba số ba chữ số (ví dụ dạng A+B+C hoặc A-B-C), có ít nhất hai lần nhớ/mượn trong cả quá trình. Mọi kết quả trung gian và kết quả cuối từ 0 đến 999. Giữ bốn ý, mỗi ý có cùng độ dài ba toán hạng, không biến thành lời văn.",
      }[band] +
        " Giữ loại cộng/trừ của từng ô theo câu nguồn. Checks phải có phép tính kiểm chứng cho từng ô. Đây là ràng buộc bắt buộc được kiểm tra bằng code, không chỉ thay số rồi gọi là khó hơn.";
}
function carries(a: number, b: number, subtract: boolean) {
  let carry = 0,
    count = 0;
  while (a > 0 || b > 0) {
    const x = a % 10,
      y = b % 10;
    carry = subtract ? Number(x - carry < y) : Math.floor((x + y + carry) / 10);
    if (carry) count++;
    a = Math.floor(a / 10);
    b = Math.floor(b / 10);
  }
  return count;
}
export function validateCalculationBand(
  source: LearningQuestion,
  q: LearningQuestion,
  difficulty: SimilarDifficulty,
  index: number,
) {
  const band = calculationBand(source, difficulty, index);
  if (!band) return;
  for (const [i, field] of (q.answerFields || []).entries()) {
    const e = expression(field.label),
      original = expression(source.answerFields![i].label)!;
    if (
      !e ||
      e.numbers.length !== (band === "chain" ? 3 : 2) ||
      e.operators.some((op) => op !== original.operators[0])
    )
      throw new AppError(
        "Giữ đúng số toán hạng và loại cộng/trừ cho từng ý.",
        502,
      );
    let value = e.numbers[0],
      count = 0;
    for (let j = 1; j < e.numbers.length; j++) {
      const sub = e.operators[j - 1] === "-";
      count += carries(value, e.numbers[j], sub);
      value = sub ? value - e.numbers[j] : value + e.numbers[j];
      if (value < 0 || value > 999)
        throw new AppError("Kết quả trung gian phải trong phạm vi 0–999.", 502);
    }
    const [a, b] = e.numbers;
    const valid =
      band === "current"
        ? e.numbers.every((n) => n >= 10 && n < 100) &&
          value < 100 &&
          count >= 1
        : band === "cross100"
          ? e.operators[0] === "+"
            ? a >= 10 &&
              a < 100 &&
              b >= 10 &&
              b < 100 &&
              value >= 100 &&
              value < 200
            : a >= 100 && a < 200 && b >= 10 && b < 100 && count >= 1
          : band === "three_small"
            ? e.numbers.every((n) => n >= 100 && n < 500) &&
              value < 500 &&
              count >= 1
            : e.numbers.every((n) => n >= 100 && n < 1000) && count >= 2;
    if (!valid)
      throw new AppError(
        `Câu chưa đạt bậc độ khó ${band}. ${calculationDirections(source, difficulty, index)}`,
        502,
      );
  }
}
