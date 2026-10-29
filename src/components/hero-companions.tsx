"use client";

import { useState } from "react";
import { characters } from "@/lib/demo";
import { Sparkles } from "./icons";
import { Character } from "./ui";

export function HeroCompanions({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (index: number) => void;
}) {
  const [suggestions, setSuggestions] = useState([0, 1, 2]);
  const [greeting, setGreeting] = useState(0);

  // Keep the satellites distinct even when the profile picker changes the buddy.
  const satellites = [...new Set([...suggestions, ...characters.keys()])]
    .filter((index) => index !== selected)
    .slice(0, 3);

  function chooseCompanion(index: number, slot: number) {
    // Rotate in someone new, without repeating any of the four visible buddies.
    const replacement = Array.from(
      { length: characters.length },
      (_, offset) => (index + offset + 1) % characters.length,
    ).find(
      (candidate) => candidate !== selected && !satellites.includes(candidate),
    )!;
    setSuggestions(
      satellites.map((buddy, i) => (i === slot ? replacement : buddy)),
    );
    onSelect(index);
  }

  return (
    <div className="hero-art" aria-label="Những người bạn hoạt hình đồng hành">
      <div className="orbit">
        <button
          type="button"
          className="companion-greeting"
          aria-label={`Chào ${characters[selected]}`}
          title={`Chào ${characters[selected]}!`}
          onClick={() => setGreeting((value) => value + 1)}
        >
          <Character
            key={`${selected}-${greeting}`}
            index={selected}
            className="main-character"
          />
        </button>
      </div>
      {satellites.map((index, slot) => (
        <button
          key={slot}
          type="button"
          className={`floating satellite-character f${slot + 1}`}
          aria-label={`Chọn ${characters[index]} làm bạn đồng hành`}
          title={`Đồng hành cùng ${characters[index]}`}
          onClick={() => chooseCompanion(index, slot)}
        >
          <Character key={index} index={index} />
        </button>
      ))}
      <span className="twinkle t1" aria-hidden="true">
        <Sparkles size={26} />
      </span>
      <span className="twinkle t2" aria-hidden="true">
        <Sparkles size={18} />
      </span>
      <div
        className="character-label"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        Bạn đồng hành của em
        <br />
        <strong>{characters[selected]}</strong>
      </div>
    </div>
  );
}
