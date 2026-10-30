import { test } from "node:test";
import assert from "node:assert/strict";
import { repairSourceLabels, resolveFigureEstimate } from "./source-repairs";
import type { ExtractedQuestion } from "./documents";
const source = (): ExtractedQuestion => ({
  id: "q",
  label: "Câu 4",
  prompt: "1 dm = ... cm",
  passage: "",
  topic: "Đổi đơn vị",
  skill: "Đổi đơn vị",
  kind: "multiple_choice",
  sourcePages: [1],
  hasFigure: false,
  figureDescription: "",
  needsReview: true,
  issues: [
    "Nhãn lựa chọn B bị lặp (B/ 1 cm và B/ 100cm), nhãn gốc giữ nguyên, không tự sửa",
  ],
  options: [
    { label: "A", text: "10 cm" },
    { label: "B", text: "1 cm" },
    { label: "B", text: "100cm" },
    { label: "C", text: "11 cm" },
  ],
});
test("Duplicate labels are normalized before solving without changing raw source or option content", () => {
  const raw = source(),
    repaired = repairSourceLabels(raw);
  assert.deepEqual(
    repaired.options.map((o) => o.label),
    ["A", "B", "C", "D"],
  );
  assert.deepEqual(
    repaired.options.map((o) => o.text),
    raw.options.map((o) => o.text),
  );
  assert.deepEqual(
    raw.options.map((o) => o.label),
    ["A", "B", "B", "C"],
  );
  assert.equal(repaired.needsReview, false);
  assert.deepEqual(repaired.issues, []);
  assert.deepEqual(repairSourceLabels(repaired), repaired);
});
test("References to option labels and unrelated uncertainty are protected", () => {
  const raw = source();
  raw.options[3].text = "Cả A và B";
  assert.equal(repairSourceLabels(raw), raw);
  const unclear = source();
  unclear.issues.push("Số đo bị mờ");
  assert.deepEqual(repairSourceLabels(unclear).issues, ["Số đo bị mờ"]);
  assert.equal(repairSourceLabels(unclear).needsReview, true);
});
test("Verified figure resolves only its obsolete localization warning", () => {
  const q = {
    needsReview: true,
    issues: [
      "Vùng hình được ước lượng từ ảnh trang gốc 1, cần kiểm tra lại khi định vị hình",
      "Nhãn đỉnh bị mờ",
    ],
  };
  resolveFigureEstimate(q);
  assert.deepEqual(q.issues, ["Nhãn đỉnh bị mờ"]);
  assert.equal(q.needsReview, true);
  const clear = {
    needsReview: true,
    issues: [
      "Vùng hình được ước lượng từ ảnh trang gốc 1, cần kiểm tra lại khi định vị hình",
    ],
  };
  resolveFigureEstimate(clear);
  assert.equal(clear.needsReview, false);
});
