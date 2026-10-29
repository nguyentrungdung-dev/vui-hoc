// Draw countable objects only for a verified, bounded arithmetic relation.
export function equationDiagram(text: string) {
  const match =
    /(?<![\d.,−\-])(\d+)\s*([+−\-×*÷/])\s*(\d+)\s*=\s*(\d+)(?!\d|[.,]\d)/.exec(
      text,
    );
  if (!match) return null;
  const a = Number(match[1]),
    b = Number(match[3]),
    c = Number(match[4]),
    op = match[2];
  const result =
    op === "+"
      ? a + b
      : op === "-" || op === "−"
        ? a - b
        : op === "×" || op === "*"
          ? a * b
          : b
            ? a / b
            : NaN;
  const total = op === "+" ? a + b : op === "×" || op === "*" ? a * b : a;
  if (result !== c || Math.max(a, b, c, total) > 24 || total < 1 || b < 1)
    return null;
  return {
    a,
    b,
    c,
    op,
    total,
    expression: match[0],
    suffix: text.slice(match.index + match[0].length).replace(/^[.\s]+/, ""),
  };
}

export function countableLabel(text: string): number | null {
  const match = /^(\d{1,2})(?:\s+[\p{L}]+){0,3}$/u.exec(text.trim());
  if (!match || Number(match[1]) > 24) return null;
  const words = text.toLowerCase().split(/\s+/);
  if (
    words.some((w) =>
      [
        "không",
        "trừ",
        "cộng",
        "được",
        "thành",
        "bằng",
        "vậy",
        "còn",
        "nên",
        "hỏi",
        "là",
        "có",
        "với",
        "is",
        "are",
        "from",
        "to",
      ].includes(w),
    )
  )
    return null;
  return Number(match[1]);
}
