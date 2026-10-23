"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  Layers3,
  PencilLine,
  Trophy,
} from "lucide-react";

export function PracticeMenu({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const canHover = () =>
    window.matchMedia(
      "(hover: hover) and (pointer: fine) and (min-width: 761px)",
    ).matches;
  useEffect(() => {
    setOpen(false);
  }, [path]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  return (
    <div
      ref={root}
      className="practice-menu"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse" && canHover()) setOpen(true);
      }}
      onPointerLeave={(e) => {
        if (
          e.pointerType === "mouse" &&
          canHover() &&
          !root.current?.contains(document.activeElement)
        )
          setOpen(false);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className={`practice-menu-trigger ${path.startsWith("/luyen-tap/") ? "active" : ""}`}
        aria-expanded={open}
        aria-controls="practice-dropdown"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            requestAnimationFrame(() =>
              root.current?.querySelector("a")?.focus(),
            );
          }
        }}
      >
        <PencilLine size={18} /> Luyện tập <ChevronDown size={14} />
      </button>
      <div id="practice-dropdown" className="practice-dropdown" hidden={!open}>
        <Link
          href="/luyen-tap/on-bai"
          aria-current={path === "/luyen-tap/on-bai" ? "page" : undefined}
          onClick={() => setOpen(false)}
        >
          <BookOpen size={20} />
          <span>
            <strong>Ôn bài</strong>
            <small>Chọn tài liệu trong thư viện</small>
          </span>
        </Link>
        <Link
          href="/luyen-tap/on-tong-hop"
          aria-current={path === "/luyen-tap/on-tong-hop" ? "page" : undefined}
          onClick={() => setOpen(false)}
        >
          <Layers3 size={20} />
          <span>
            <strong>Ôn tổng hợp</strong>
            <small>Tìm đề tài, ôn từ tài liệu đã học</small>
          </span>
        </Link>
        <Link
          href="/luyen-tap/timo"
          aria-current={path.startsWith("/luyen-tap/timo") ? "page" : undefined}
          onClick={() => setOpen(false)}
        >
          <Trophy size={20} />
          <span>
            <strong>Luyện đề TIMO</strong>
            <small>Toán song ngữ · Mầm non đến lớp 5</small>
          </span>
        </Link>
      </div>
    </div>
  );
}
