"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CheckCircle2, ChevronDown } from "./icons";

const options = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "ready", label: "Sẵn sàng" },
  { value: "working", label: "Đang xử lý" },
  { value: "review", label: "Cần kiểm tra" },
];

export function LibraryStatusFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const selected = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const focusOption = (index: number) =>
    requestAnimationFrame(() => {
      root.current
        ?.querySelectorAll<HTMLButtonElement>('[role="option"]')
        [index]?.focus();
    });
  const show = (index = selected) => {
    setOpen(true);
    focusOption(index);
  };
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <div
      ref={root}
      className="library-status-filter"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="library-status-trigger"
        aria-label={`Lọc trạng thái tài liệu: ${options[selected].label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            show(event.key === "ArrowUp" ? options.length - 1 : selected);
          }
        }}
      >
        <span
          className={`library-status-dot status-${value}`}
          aria-hidden="true"
        />
        <span>{options[selected].label}</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div
          id={menuId}
          role="listbox"
          aria-label="Trạng thái tài liệu"
          className="library-status-options"
          onKeyDown={(event) => {
            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                '[role="option"]',
              ),
            );
            const current = items.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            let next;
            if (event.key === "ArrowDown")
              next = (current + 1) % options.length;
            if (event.key === "ArrowUp")
              next = (current + options.length - 1) % options.length;
            if (event.key === "Home") next = 0;
            if (event.key === "End") next = options.length - 1;
            if (next !== undefined) {
              event.preventDefault();
              items[next]?.focus();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
              trigger.current?.focus();
            }
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={value === option.value}
              className="library-status-option"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              <span
                className={`library-status-dot status-${option.value}`}
                aria-hidden="true"
              />
              <span>{option.label}</span>
              {value === option.value && <CheckCircle2 size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
