import type { ExtractedQuestion } from "./documents";

export const SOURCE_REPAIR_RULES = `Được chuẩn hóa nhãn lựa chọn trùng thành A/B/C/D theo đúng thứ tự trước khi giải; giữ nguyên nội dung, thứ tự và số lựa chọn. Không đổi nhãn nếu đề/đoạn đọc/lựa chọn tham chiếu nhãn (ví dụ cả A và B), vì có thể đổi nghĩa. Không sửa số liệu hay đoán dữ kiện. Với hình học, dùng đúng hình nguồn đã cắt đủ nét, đỉnh, nhãn và số đo; không vẽ lại. Tọa độ ước lượng hoặc các đường ghép/chồng không tự chúng là lỗi. Tự giải và đếm cả các hình ghép hợp lệ; chỉ bác khi chỉ ra dữ kiện/nét/nhãn cụ thể thực sự thiếu hoặc không đọc rõ. Không đưa đáp án hay chẩn đoán nội bộ vào cảnh báo trước khi học sinh làm bài.`;

/** Normalize before solving, never relabel an answer that is already bound to labels. */
export function repairSourceLabels<T extends ExtractedQuestion>(source: T): T {
  const labels = source.options.map((o) =>
    o.label.normalize("NFC").trim().toUpperCase(),
  );
  if (
    source.kind !== "multiple_choice" ||
    labels.length < 2 ||
    labels.length > 26 ||
    new Set(labels).size === labels.length
  )
    return source;
  const text = [
    source.prompt,
    source.passage,
    ...source.options.map((o) => o.text),
  ].join(" ");
  // Conservative: any standalone label reference prevents automatic relabeling.
  if (/(?<![\p{L}\p{N}])[A-Z](?![\p{L}\p{N}])/u.test(text)) return source;
  const issues = source.issues.filter(
    (issue) =>
      !/^Nhãn (?:lựa chọn|đáp án) [A-Z] bị lặp[^;]*(?:nhãn gốc giữ nguyên, không tự sửa)?[.]?$/iu.test(
        issue,
      ),
  );
  return {
    ...source,
    options: source.options.map((o, i) => ({
      ...o,
      label: String.fromCharCode(65 + i),
    })),
    issues,
    needsReview:
      issues.length > 0 || (source.needsReview && source.issues.length === 0),
  };
}

/** Only a completed visual review can resolve the old localization-only warning. */
export function resolveFigureEstimate<
  T extends { issues: string[]; needsReview: boolean },
>(q: T) {
  const issues = q.issues.filter(
    (issue) =>
      !/^Vùng hình được ước lượng từ ảnh trang gốc \d+, cần kiểm tra lại khi định vị hình[.]?$/iu.test(
        issue.trim(),
      ),
  );
  q.needsReview = issues.length > 0 || (q.needsReview && q.issues.length === 0);
  q.issues = issues;
}
