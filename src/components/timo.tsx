import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Trophy } from "./icons";
import { PageTitle } from "./ui";

const grades = [
  { id: "mam-non", name: "Mầm non", symbol: "MN" },
  ...Array.from({ length: 5 }, (_, index) => ({
    id: `lop-${index + 1}`,
    name: `Lớp ${index + 1}`,
    symbol: String(index + 1),
  })),
];

export function TimoPage({ gradeId }: { gradeId?: string }) {
  const grade = grades.find((item) => item.id === gradeId);
  return (
    <>
      <Link className="back-link" href={grade ? "/luyen-tap/timo" : "/#worlds"}>
        <ArrowLeft size={16} />
        {grade ? "Chọn khối khác" : "Về các không gian học"}
      </Link>
      <PageTitle eyebrow="LUYỆN ĐỀ TIMO" title="Luyện thi Toán song ngữ">
        {grade
          ? `Đề luyện dành cho ${grade.name.toLocaleLowerCase("vi-VN")}.`
          : "Chọn khối học của em để khám phá ngân hàng đề TIMO."}
      </PageTitle>
      {grade ? (
        <section className="card empty-state timo-coming-soon">
          <Trophy size={48} aria-hidden="true" />
          <span className="badge">{grade.name}</span>
          <h2>Coming soon</h2>
        </section>
      ) : (
        <section className="timo-grades" aria-labelledby="timo-grades-heading">
          <div className="section-heading">
            <div>
              <span className="eyebrow">MẦM NON ĐẾN LỚP 5</span>
              <h2 id="timo-grades-heading">Chọn khối học của em</h2>
              <p>Ngân hàng đề đang được chuẩn bị.</p>
            </div>
          </div>
          <div className="timo-grade-grid">
            {grades.map((item) => (
              <Link
                className="card timo-grade-card"
                href={`/luyen-tap/timo/${item.id}`}
                key={item.id}
                aria-label={`Chọn ${item.name.toLocaleLowerCase("vi-VN")}`}
              >
                <span className="eyebrow">
                  {item.id === "mam-non" ? "MẦM NON" : "KHỐI"}
                </span>
                <strong>{item.symbol}</strong>
                <span className="timo-grade-status">
                  <BookOpen size={16} aria-hidden="true" /> Coming soon
                </span>
                <ArrowRight
                  className="timo-grade-arrow"
                  size={20}
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
