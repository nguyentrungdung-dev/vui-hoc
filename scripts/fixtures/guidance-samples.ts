import type { LearningQuestion } from "../../src/lib/learning";
function question(
  id: string,
  topic: string,
  prompt: string,
  answer: string,
  steps: string[],
  explanation: string,
  extra: Partial<LearningQuestion> = {},
): LearningQuestion {
  return {
    id,
    topic,
    label: topic,
    prompt,
    answer,
    steps,
    explanation,
    passage: "",
    sourceIds: [],
    sourcePages: [1],
    options: [],
    hasFigure: false,
    figureDescription: "",
    advanced: false,
    translation: "",
    grading: "exact",
    contentVersion: 2,
    acceptedAnswers: [],
    hints: ["HINT KHÔNG ĐƯỢC DÙNG LÀM KỊCH BẢN"],
    englishSteps: [],
    checks: [],
    ...extra,
  };
}
export const guidanceSamples: LearningQuestion[] = [
  question(
    "addition",
    "Cộng có nhớ",
    "Tính 46 + 38.",
    "84",
    [
      "6 + 8 = 14. Viết 4, nhớ 1 chục.",
      "4 + 3 + 1 = 8. Viết 8 ở hàng chục.",
      "46 + 38 = 84.",
    ],
    "Cộng từ hàng đơn vị. Mười bốn đơn vị gồm một chục và bốn đơn vị. Chuyển một chục sang cột chục rồi cộng với bốn chục và ba chục.",
  ),
  question(
    "subtraction",
    "Trừ có nhớ",
    "Tính 72 - 28.",
    "44",
    [
      "2 không trừ được 8; đổi 1 chục thành 10 đơn vị, được 12 đơn vị, còn 6 chục.",
      "12 - 8 = 4.",
      "6 - 2 = 4. Vậy 72 - 28 = 44.",
    ],
    "Phải đổi một chục trước khi trừ ở hàng đơn vị. Sau khi đổi, hàng chục còn sáu chục, không phải bảy chục.",
  ),
  question(
    "word-problem",
    "Toán có lời văn",
    "Lan có 12 quả cam. Mẹ cho Lan thêm 7 quả cam. Hỏi Lan có tất cả bao nhiêu quả cam?",
    "19 quả cam",
    [
      "Lan có 12 quả cam, được cho thêm 7 quả cam. Để tìm tất cả, ta cộng hai số lượng.",
      "12 + 7 = 19 (quả cam).",
      "Đáp số: 19 quả cam.",
    ],
    "Từ 'thêm' cho biết số cam tăng lên. Hai nhóm cam được gộp lại, cùng đơn vị quả cam. Không dùng phép trừ vì Lan không cho đi hay bớt cam.",
  ),
  question(
    "geometry",
    "Hình học",
    "Hình chữ nhật có chiều dài 6 cm, chiều rộng 4 cm. Tính chu vi hình chữ nhật.",
    "20 cm",
    [
      "Hình chữ nhật có hai cạnh dài bằng nhau và hai cạnh rộng bằng nhau.",
      "Chu vi = (6 + 4) × 2 = 20 (cm).",
      "Đáp số: 20 cm.",
    ],
    "Chu vi là tổng độ dài đường bao quanh hình. Cộng một chiều dài với một chiều rộng rồi lấy hai lần tổng đó, vì mỗi loại cạnh có hai cạnh.",
    {
      hasFigure: true,
      figureDescription:
        "Hình chữ nhật, hai cạnh dài 6 cm, hai cạnh rộng 4 cm.",
    },
  ),
  question(
    "reading",
    "Tiếng Việt · Đọc hiểu",
    "Vì sao Lan tưới cây?",
    "Vì trời nắng và đất đã khô.",
    [
      "Đoạn văn cho biết trời nắng và đất trong chậu đã khô.",
      "Lan thấy đất khô nên lấy bình tưới cây.",
      "Lan tưới cây vì trời nắng và đất đã khô.",
    ],
    "Câu hỏi 'vì sao' cần một nguyên nhân, không chỉ kể lại việc Lan đã làm. Dựa vào chi tiết đất khô trong đoạn văn để trả lời; không thêm lý do không có trong bài.",
    {
      passage:
        "Buổi sáng, trời nắng. Lan thấy đất trong chậu đã khô. Em lấy bình tưới cây. Những chiếc lá xanh rung rinh trong gió.",
    },
  ),
  question(
    "english",
    "Tiếng Anh · Ngữ pháp",
    "Điền is hoặc are: The cats ___ sleeping.",
    "are",
    [
      "The cats nghĩa là những con mèo, chỉ nhiều con nên là chủ ngữ số nhiều.",
      "Chủ ngữ số nhiều dùng are, không dùng is.",
      "The cats are sleeping.",
    ],
    "Nhìn danh từ cats có s để nhận ra nhiều con mèo. Chọn động từ theo chủ ngữ, không chọn theo từ sleeping. Câu hoàn chỉnh diễn tả những con mèo đang ngủ.",
  ),
  question(
    "pattern",
    "Tư duy · Quy luật",
    "Điền số còn thiếu: 2, 4, 6, __, 10.",
    "8",
    [
      "4 - 2 = 2; 6 - 4 = 2. Mỗi số tăng thêm 2.",
      "6 + 2 = 8.",
      "Kiểm tra: 8 + 2 = 10. Số còn thiếu là 8.",
    ],
    "So sánh các số liền nhau để nhận ra cùng tăng hai đơn vị. Áp dụng quy luật cho số sau sáu rồi kiểm tra với số mười đã cho.",
  ),
  question(
    "written",
    "Tự luận · Nhiều ý",
    "a) Tính 24 + 15. b) Tính 39 - 15. Em nhận xét gì?",
    "a) 39; b) 24; Cộng rồi trừ cùng một số thì trở về số ban đầu.",
    [
      "a) 24 + 15 = 39.",
      "b) 39 - 15 = 24.",
      "Nhận xét: cộng 15 rồi trừ 15 thì trở về 24, số ban đầu.",
    ],
    "Cần trả lời cả hai phép tính và nêu nhận xét. Phép trừ kiểm tra lại phép cộng: lấy tổng trừ một số hạng thì được số hạng còn lại.",
    { grading: "self_review" },
  ),
];
