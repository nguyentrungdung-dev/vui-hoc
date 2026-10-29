"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { subjects, type Subject } from "@/lib/documents";
import { medals } from "@/lib/achievements";
import { rewardMaps } from "@/lib/rewards";
import { rewardBackground } from "@/lib/reward-stories";
import { useAccount } from "./account";
import {
  ArrowRight,
  BookOpen,
  Glyph,
  MedalArtwork,
  Upload,
  FileText,
  Search,
  WelcomeScene,
} from "./icons";
import { TimoPage } from "./timo";
const examples = [
  {
    subject: "math",
    title: "Cộng, trừ thật khéo",
    description: "Tách từng bước nhỏ, tự tìm ra đáp án.",
    example: "28 + 15 = ?",
  },
  {
    subject: "english",
    title: "Mỗi ngày một từ mới",
    description: "Đọc, hiểu và tự tin với những câu đầu tiên.",
    example: "A little story. A new discovery.",
  },
  {
    subject: "vietnamese",
    title: "Vui cùng từng con chữ",
    description: "Đọc một đoạn văn, mở ra một thế giới.",
    example: "Đọc hiểu · Luyện từ · Đặt câu",
  },
  {
    subject: "self",
    title: "Điều gì làm em tò mò?",
    description: "Mang tài liệu em thích vào một buổi học riêng.",
    example: "Quan sát · Đặt câu hỏi · Tìm lời giải",
  },
];
export function GuestExplore({ path }: { path: string }) {
  const { requestAccess, openAuth } = useAccount();
  const [grade, setGrade] = useState("2");
  const [subject, setSubject] = useState<Subject>("math");
  const [query, setQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState("");
  const current = Object.entries(subjects).find(
    ([, s]) => s.path === path,
  )?.[0] as Subject | undefined;
  const uploading = path.startsWith("/tai-len") || path === "/timo";
  const isMedal = path === "/thanh-tich" || path.includes("huy-chuong");
  const isRanking = path.includes("xep-hang");
  const isRewards = path === "/phan-thuong";
  const library = path === "/thu-vien";
  const timo = path.startsWith("/luyen-tap/timo");
  const journey = path === "/hanh-trinh";
  useEffect(() => {
    const preset = path.startsWith("/tai-len/") ? path.split("/")[2] : current;
    if (preset && Object.hasOwn(subjects, preset))
      setSubject(preset as Subject);
  }, [path, current]);
  useEffect(() => {
    if (isRanking)
      requestAccess("xem bảng xếp hạng của các bạn cùng khối", path);
  }, [path]);
  const title = isMedal
    ? "Mỗi nỗ lực, một dấu ấn."
    : isRanking
      ? "Cùng bạn bè tỏa sáng."
      : isRewards
        ? "Một thế giới do em xây nên."
        : journey
          ? "Từng bước nhỏ đều đáng nhớ."
          : uploading
            ? "Biến tài liệu thành chuyến khám phá."
            : library
              ? "Một thư viện, nhiều cánh cửa."
              : current
                ? subjects[current].name
                : "Luyện một chút, hiểu thêm nhiều.";
  const activeSubject = current || subject;
  const visible = examples.filter(
    (e) =>
      (!(current || (!library && subject)) ||
        e.subject === (current || subject)) &&
      `${e.title} ${e.description}`
        .toLocaleLowerCase("vi")
        .includes(query.toLocaleLowerCase("vi")),
  );
  return (
    <div className="guest-explore">
      <header className="guest-intro">
        <div>
          <span className="eyebrow">CỨ THOẢI MÁI KHÁM PHÁ</span>
          <h1>{title}</h1>
          <p>
            {isMedal
              ? "20 huy chương, 20 câu chuyện về những lần em đã cố gắng."
              : isRanking
                ? "Bảng thi đua dành cho các bạn cùng khối. Đăng nhập để tìm đúng sân chơi của em."
                : isRewards
                  ? "Học tập, nhận sao và tự tay trang trí không gian của mình."
                  : "Chọn điều em muốn thử. Khi bắt đầu học, mình sẽ tạo một góc riêng để giữ lại tiến độ cho em."}
          </p>
        </div>
        <div className="guest-intro-art">
          {isMedal ? (
            <MedalArtwork id={medals[0].id} size={88} />
          ) : (
            <Glyph
              token={
                current
                  ? subjects[current].icon
                  : library
                    ? "library"
                    : timo
                      ? "timo"
                      : isRanking
                        ? "ranking"
                        : isRewards
                          ? "rewards"
                          : journey
                            ? "journey"
                            : uploading
                              ? "upload"
                              : path.includes("on-tong-hop")
                                ? "review-set"
                                : path.includes("on-")
                                  ? "review"
                                  : "practice"
              }
              size={88}
            />
          )}
        </div>
      </header>
      {timo ? (
        <TimoPage
          gradeId={/^\/luyen-tap\/timo\/(mam-non|lop-[1-5])$/.exec(path)?.[1]}
        />
      ) : isMedal ? (
        <>
          <div className="guest-section-heading">
            <h2>Bộ sưu tập đang chờ chủ nhân</h2>
            <span>Xem trước · Tiến trình sẽ thuộc về tài khoản của em</span>
          </div>
          <div className="medal-grid guest-medal-grid">
            {medals.map((m) => (
              <button
                className="medal-card"
                key={m.id}
                onClick={() =>
                  requestAccess(
                    "bắt đầu sưu tập huy chương của riêng em",
                    "/thanh-tich/huy-chuong",
                  )
                }
              >
                <MedalArtwork id={m.id} />
                <span className="medal-state">{m.group}</span>
                <h2>{m.name}</h2>
                <p>{m.reason}</p>
                <span className="guest-card-link">
                  Bắt đầu chinh phục <ArrowRight size={14} />
                </span>
              </button>
            ))}
          </div>
        </>
      ) : isRewards ? (
        <div className="guest-map-grid">
          {rewardMaps.map((map) => (
            <article className="card guest-map-card" key={map.id}>
              <div
                className="guest-map-cover"
                style={{ backgroundImage: `url(${rewardBackground(map.id)})` }}
              />
              <h2>{map.name}</h2>
              <p>{map.subtitle}</p>
              <button
                className="button secondary"
                onClick={() =>
                  requestAccess(
                    "lưu và trang trí bản đồ của em",
                    "/phan-thuong",
                  )
                }
              >
                Trang trí không gian <ArrowRight size={16} />
              </button>
            </article>
          ))}
        </div>
      ) : isRanking || journey ? (
        <section className="card guest-private-preview">
          <WelcomeScene />
          <div>
            <span className="eyebrow">HÀNH TRÌNH MANG TÊN EM</span>
            <h2>
              {isRanking
                ? "Thi đua đúng khối, vui cùng bạn bè."
                : "Nhìn lại những điều em đã làm được."}
            </h2>
            <p>
              {isRanking
                ? "Mỗi khối có bảng riêng. Điểm đến từ sự cố gắng và tiến bộ, không chạy đua tốc độ."
                : "Bài đang học, kết quả và các mốc tiến bộ sẽ ở cùng một nơi để em dễ dàng tiếp tục."}
            </p>
            <button
              className="button"
              onClick={() =>
                requestAccess(
                  isRanking
                    ? "xem bảng xếp hạng của khối lớp em"
                    : "xem hành trình học riêng của em",
                  path,
                )
              }
            >
              Đăng nhập để xem <ArrowRight size={18} />
            </button>
          </div>
        </section>
      ) : uploading ? (
        <section className="card guest-upload">
          <div>
            <Upload size={42} />
            <h2>Tài liệu của em, cách học của em.</h2>
            <p>
              Chọn PDF hoặc ảnh đề bài. Vui học giúp em chia nhỏ thành bài
              luyện, gợi ý và lời giải từng bước.
            </p>
            <label className="guest-file-picker">
              <input
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                onChange={(e) =>
                  setSelectedFile(e.target.files?.[0]?.name || "")
                }
              />
              <FileText size={32} />
              <strong>{selectedFile || "Chọn tài liệu để xem trước"}</strong>
              <span>PDF, JPG, PNG hoặc WebP</span>
            </label>
          </div>
          <div>
            <label className="field">
              Môn học
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as Subject)}
              >
                {Object.entries(subjects).map(([id, s]) => (
                  <option key={id} value={id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Tên buổi học
              <input placeholder="Ví dụ: Buổi học nhỏ hôm nay" />
            </label>
            <div className="guest-upload-steps">
              <p>
                <span>01</span> Gửi tài liệu em đang học
              </p>
              <p>
                <span>02</span> Chọn chủ đề muốn luyện
              </p>
              <p>
                <span>03</span> Thử sức với từng câu hỏi
              </p>
            </div>
            <button
              className="button full"
              onClick={() =>
                requestAccess("tạo tài liệu và lưu buổi học", path)
              }
            >
              Tạo buổi học <ArrowRight size={18} />
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="guest-practice-controls card">
            <label className="field">
              Khối lớp muốn khám phá
              <select value={grade} onChange={(e) => setGrade(e.target.value)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option value={n} key={n}>
                    Khối {n}
                  </option>
                ))}
              </select>
            </label>
            {!current && !library && (
              <label className="field">
                Môn học
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as Subject)}
                >
                  {Object.entries(subjects).map(([id, s]) => (
                    <option key={id} value={id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="field">
              Tìm điều em muốn học
              <div className="guest-search">
                <Search size={18} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm chủ đề…"
                />
              </div>
            </label>
            <Link
              className="button secondary"
              href={`/tai-len/${activeSubject}`}
            >
              <Upload size={17} /> Gửi bài của em
            </Link>
          </section>
          <div className="guest-section-heading">
            <h2>
              {library
                ? "Nhìn vào một buổi học nhỏ"
                : "Em muốn bắt đầu từ đâu?"}
            </h2>
            <span>Nội dung minh họa cách học</span>
          </div>
          <div className="guest-lesson-grid">
            {visible.map((e, i) => (
              <article
                className={`card guest-lesson-card guest-tone-${i}`}
                key={e.subject}
              >
                <div className="guest-lesson-top">
                  <Glyph
                    token={subjects[e.subject as Subject].icon}
                    size={42}
                  />
                  <span>
                    {subjects[e.subject as Subject].name} · Khối {grade}
                  </span>
                </div>
                <h2>{e.title}</h2>
                <p>{e.description}</p>
                <div className="guest-example">{e.example}</div>
                <button
                  className="guest-card-link"
                  onClick={() =>
                    requestAccess(
                      "bắt đầu làm bài và lưu kết quả",
                      `/${e.subject === "math" ? "toan" : e.subject === "english" ? "tieng-anh" : e.subject === "vietnamese" ? "tieng-viet" : "tu-hoc"}`,
                    )
                  }
                >
                  Bắt đầu làm bài <ArrowRight size={18} />
                </button>
              </article>
            ))}
          </div>
          {!visible.length && (
            <p className="card">
              Chưa có chủ đề minh họa phù hợp. Em thử tìm từ khác nhé.
            </p>
          )}
        </>
      )}
      <aside className="guest-bottom-invite">
        <div>
          <BookOpen size={32} />
          <span>
            <strong>Thích một điều gì ở đây?</strong>
            <small>
              Tạo tài khoản để chuyến khám phá này trở thành của em.
            </small>
          </span>
        </div>
        <button className="button" onClick={openAuth}>
          Tạo góc học của em <ArrowRight size={18} />
        </button>
      </aside>
    </div>
  );
}
