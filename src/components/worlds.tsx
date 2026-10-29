"use client";

import Link from "next/link";
import { subjects } from "@/lib/documents";
import { ArrowRight, Glyph } from "./icons";

const worlds = [
  {
    color: "blue",
    icon: subjects.math.icon,
    title: "Toán",
    description: "Khám phá những con số",
    href: "/toan",
  },
  {
    color: "peach",
    icon: subjects.english.icon,
    title: "Tiếng Anh",
    description: "Thêm từ mới mỗi ngày",
    href: "/tieng-anh",
  },
  {
    color: "purple",
    icon: subjects.vietnamese.icon,
    title: "Tiếng Việt",
    description: "Vui cùng từng con chữ",
    href: "/tieng-viet",
  },
  {
    color: "green",
    icon: subjects.self.icon,
    title: "Tự học",
    description: "Học điều em tò mò",
    href: "/tu-hoc",
  },
  {
    color: "gold",
    icon: "timo",
    title: "TIMO",
    description: "Thử sức Toán song ngữ",
    href: "/luyen-tap/timo",
  },
];

export function WorldsSection() {
  return (
    <section
      id="worlds"
      className="home-worlds"
      aria-labelledby="home-worlds-title"
    >
      <div className="home-worlds-heading">
        <h2 id="home-worlds-title">Chọn môn em thích</h2>
        <Link href="/thu-vien">
          Thư viện <ArrowRight size={16} />
        </Link>
      </div>
      <div className="world-grid">
        {worlds.map((world) => (
          <Link
            key={world.href}
            href={world.href}
            className={`world-card ${world.color}`}
          >
            <span className="world-symbol" aria-hidden="true">
              <Glyph token={world.icon} size={42} />
            </span>
            <div className="world-copy">
              <h3>{world.title}</h3>
              <p>{world.description}</p>
            </div>
            <span className="world-bottom">
              <span>{world.color === "gold" ? "Chọn khối" : "Vào học"}</span>
              <ArrowRight size={18} aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
