export const kinds = [
  "show_problem",
  "show_units_left",
  "show_units_right",
  "combine_units",
  "group_ten",
  "exchange_ten",
  "write_units",
  "carry_ten",
  "show_tens_left",
  "show_tens_right",
  "add_carry_ten",
  "sum_tens",
  "write_tens",
  "conclude",
  "emphasize_carry",
  "sticker_aha",
  "sticker_celebrate",
];
export const contractVersion = "lesson-motion-v2-50s";
export function canonicalizeCues(plan) {
  return {
    ...plan,
    segments: plan.segments.map((segment) => ({
      ...segment,
      cues: [...segment.cues].sort(
        (a, b) =>
          segment.narration.indexOf(a.phrase) -
          segment.narration.indexOf(b.phrase),
      ),
    })),
  };
}
export function validatePlan(plan) {
  const actions = plan.segments.flatMap((s) => s.cues.map((c) => c.action));
  for (const a of kinds.filter((a) => !a.startsWith("sticker")))
    if (actions.filter((x) => x === a).length !== 1)
      throw Error("Expected exactly one " + a);
  let last = -1;
  for (const a of kinds.filter(
    (a) => !a.startsWith("sticker") && a !== "emphasize_carry",
  )) {
    const i = actions.indexOf(a);
    if (i < last) throw Error("Teaching action out of order: " + a);
    last = i;
  }
  if (actions.indexOf("emphasize_carry") < actions.indexOf("carry_ten"))
    throw Error("Cannot emphasize a carry that has not been introduced");
  for (const segment of plan.segments) {
    let last = -1;
    for (const cue of segment.cues) {
      const at = segment.narration.indexOf(cue.phrase);
      if (at < 0) throw Error("Phrase missing: " + cue.phrase);
      if (segment.narration.indexOf(cue.phrase, at + 1) >= 0)
        throw Error("Ambiguous phrase: " + cue.phrase);
      if (at < last) throw Error("Cue out of spoken order: " + cue.phrase);
      last = at;
      if (!kinds.includes(cue.action)) throw Error("Unsupported action");
    }
  }
  const text = plan.segments.map((s) => s.narration).join(" "),
    count = text.trim().split(/\s+/).length;
  if (count < 85 || count > 105)
    throw Error(
      "Narration must have 85–105 space-separated Vietnamese syllables, got " +
        count,
    );
  if (/\d/.test(text))
    throw Error("Use spoken number words in narration, not digits");
  if (actions.filter((a) => a.startsWith("sticker")).length > 2)
    throw Error("At most two sticker reactions");
  return {
    spokenSyllables: count,
    actions: actions.length,
    segments: plan.segments.length,
  };
}
