import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vui học • Vũ trụ học tập của bé",
  description:
    "Cùng khám phá Toán lớp 2, ôn bài và luyện đề TIMO. Bản demo giao diện Vui học.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
