"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

const worlds = [
  {
    color: "blue",
    icon: "＋",
    label: "THẾ GIỚI CON SỐ",
    title: "Vui học Toán",
    description:
      "Giải mã con số, chinh phục thử thách và khám phá toán quanh em.",
    href: "/toan",
    badge: "Lớp 2",
  },
  {
    color: "peach",
    icon: "Aa",
    label: "HELLO, WORLD!",
    title: "Vui học Tiếng Anh",
    description: "Gặp những từ mới và tự tin khám phá một thế giới rộng lớn.",
    href: "/tieng-anh",
    badge: "Lớp 2",
  },
  {
    color: "purple",
    icon: "✎",
    label: "YÊU TỪNG CON CHỮ",
    title: "Vui học Tiếng Việt",
    description: "Luyện chính tả, mở rộng vốn từ và nâng niu tiếng Việt.",
    href: "/tieng-viet",
    badge: "Lớp 2",
  },
  {
    color: "green",
    icon: "✦",
    label: "HỌC THEO CÁCH CỦA EM",
    title: "Thiết kế tự học",
    description: "Tạo hành trình riêng từ những điều em muốn tìm hiểu.",
    href: "/tu-hoc",
    badge: "Lớp 2",
  },
  {
    color: "gold",
    icon: "🏆",
    label: "CHINH PHỤC TIMO",
    title: "Luyện thi Toán song ngữ",
    description: "Khám phá khu luyện đề TIMO theo khối học của em.",
    href: "/luyen-tap/timo",
    badge: "Mầm non – Lớp 5",
  },
];

export function WorldsSection() {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const update = () =>
      setEdges({
        start: element.scrollLeft <= 2,
        end:
          element.scrollLeft + element.clientWidth >= element.scrollWidth - 2,
      });
    const resize = new ResizeObserver(update);
    resize.observe(element);
    element.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      resize.disconnect();
      element.removeEventListener("scroll", update);
    };
  }, []);
  function scroll(direction: number) {
    const element = track.current;
    const card = element?.firstElementChild;
    if (!element || !card) return;
    const gap = parseFloat(getComputedStyle(element).columnGap) || 0;
    element.scrollBy({
      left: direction * (card.getBoundingClientRect().width + gap),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  return (
    <section id="worlds" className="section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">CHỌN MỘT CÁNH CỬA NHỎ</span>
          <h2>Hôm nay, em muốn khám phá gì?</h2>
          <p>Học từ tài liệu của em, khám phá thêm cùng đề Toán song ngữ.</p>
        </div>
        <div
          className="world-scroll-controls"
          aria-label="Cuộn các không gian học"
        >
          <button
            type="button"
            className="icon-button"
            aria-label="Xem mục trước"
            aria-controls="world-scroll"
            disabled={edges.start}
            onClick={() => scroll(-1)}
          >
            <ArrowLeft size={20} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Xem mục tiếp theo"
            aria-controls="world-scroll"
            disabled={edges.end}
            onClick={() => scroll(1)}
          >
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
      <div
        id="world-scroll"
        className="world-grid"
        ref={track}
        role="region"
        aria-label="Các không gian học tập, cuộn ngang để xem thêm"
        tabIndex={0}
      >
        {worlds.map((world) => (
          <Link
            key={world.href}
            className={`world-card ${world.color}`}
            href={world.href}
          >
            <div className="world-top">
              <span className="world-symbol" aria-hidden="true">
                {world.icon}
              </span>
              <span className="badge">{world.badge}</span>
            </div>
            <span className="eyebrow">{world.label}</span>
            <h3>{world.title}</h3>
            <p>{world.description}</p>
            <span className="world-bottom">
              {world.color === "gold" ? "Chọn khối học" : "Bắt đầu hành trình"}
              <ArrowRight size={20} />
            </span>
          </Link>
        ))}
      </div>
      <p className="world-scroll-hint">
        Vuốt hoặc cuộn ngang để xem thêm{" "}
        <ArrowRight size={14} aria-hidden="true" />
      </p>
    </section>
  );
}
