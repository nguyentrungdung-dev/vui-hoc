// Conservative, template-specific editing: remove redundant phrases from Claude's text.
// Never synthesize a new fact or cut arbitrary words to meet a character count.
import { validatePlan, canonicalizeCues } from "./plan-contract.mjs";
export const compactVersion = "carry-45-38-copyedit-v1";
export function compactPlan(input) {
  const text = { ...input };
  const edits = [];
  function edit(id, pattern, replacement) {
    const before = text[id];
    text[id] = text[id].replace(pattern, replacement).trim();
    if (before !== text[id]) edits.push({ id, before, after: text[id] });
  }
  edit("intro", /^Chào các bạn nhỏ,\s*/i, "");
  edit("intro", /\s*Các bạn cùng tính nào\.?$/i, "");
  edit("regroup", /^Mười ba đơn vị gồm mười ô và ba ô lẻ\.\s*/i, "");
  edit("carry", /, và /, ", ");
  edit("tens", /^Giờ cộng hàng chục:\s*/i, "");
  edit("conclusion", /\s*Các bạn làm rất tốt, cố gắng thêm nhé!?$/i, "");
  for (const id of Object.keys(text))
    text[id] = text[id][0].toUpperCase() + text[id].slice(1);
  const specs = {
    intro: [["show_problem", "bốn mươi lăm", "45 + 38"]],
    units: [
      ["show_units_left", "năm", "5 đơn vị"],
      ["show_units_right", "tám", "8 đơn vị"],
      ["combine_units", "mười ba", "5 + 8 = 13"],
    ],
    regroup: [
      ["group_ten", "gom mười ô", "Gom 10 đơn vị"],
      ["exchange_ten", "thành một chục", "10 đơn vị = 1 chục"],
    ],
    carry: [
      ["write_units", "viết số ba", "Viết 3 ở hàng đơn vị"],
      ["carry_ten", "chuyển một chục", "Chuyển 1 chục sang cột chục"],
      ["emphasize_carry", "số nhớ một", "Số nhớ 1 là một chục"],
      ["sticker_aha", "số nhớ một", ""],
    ],
    tens: [
      ["show_tens_left", "bốn chục", "4 chục"],
      ["show_tens_right", "ba chục", "3 chục"],
      ["add_carry_ten", "một chục nhớ", "Thêm 1 chục nhớ"],
      ["sum_tens", "bằng tám chục", "4 + 3 + 1 = 8 chục"],
      ["write_tens", "viết số tám", "Viết 8 ở hàng chục"],
    ],
    conclusion: [
      ["conclude", "tám mươi ba", "45 + 38 = 83"],
      ["sticker_celebrate", "tám mươi ba", ""],
    ],
  };
  const segments = Object.keys(specs).map((id) => ({
    id,
    narration: text[id],
    learningGoal: id,
    cues: specs[id].map(([action, phrase, screenText]) => {
      const at = text[id].toLowerCase().indexOf(phrase);
      if (at < 0)
        throw Error(
          "Unsupported wording for template cue: " + id + "/" + phrase,
        );
      return {
        action,
        phrase: text[id].slice(at, at + phrase.length),
        screenText,
      };
    }),
  }));
  const plan = canonicalizeCues({ title: "Cùng tính 45 + 38 nhé!", segments });
  const validation = validatePlan(plan);
  return {
    plan,
    edits,
    version: compactVersion,
    validation,
    cueSource:
      "deterministic supported template, replaces rejected model cue drafts",
  };
}
