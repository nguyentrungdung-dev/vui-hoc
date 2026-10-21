"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { characters } from "@/lib/demo";

export function Character({
  index = 4,
  className = "",
}: {
  index?: number;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={characters[index]}
      className={`character ${className}`}
      style={
        {
          "--cx": `${((index % 4) * 100) / 3}%`,
          "--cy": `${(Math.floor(index / 4) * 100) / 3}%`,
        } as CSSProperties
      }
    />
  );
}
export function ButtonLink({
  href,
  children,
  secondary = false,
  className = "",
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
  className?: string;
}) {
  return (
    <Link
      className={`button ${secondary ? "secondary" : ""} ${className}`}
      href={href}
    >
      {children}
    </Link>
  );
}
export function PageTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="modal"
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Đóng">
          <X size={22} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function TopicIcon({ icon, color }: { icon: string; color: string }) {
  return <span className={`topic-icon ${color}`}>{icon}</span>;
}
export function NextArrow() {
  return <ArrowRight size={19} />;
}
