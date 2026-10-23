"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  Flame,
  Gift,
  Home,
  Lightbulb,
  Menu,
  Play,
  Rocket,
  Sparkles,
  Star,
  Trophy,
  Upload,
  X,
} from "lucide-react";
import {
  characters,
  createQuestions,
  initialState,
  STORAGE_KEY,
  summarize,
  topics,
  type Mode,
  type Run,
  type State,
  type TopicId,
} from "@/lib/demo";
import { ButtonLink, Character, Modal, PageTitle, TopicIcon } from "./ui";
import {
  UploadPage,
  SubjectPage,
  DocumentLibrary,
  DocumentPage,
} from "./documents";
import { subjects, type Subject } from "@/lib/documents";
import type { LearningResult } from "@/lib/learning";
import { RealPracticePage, LearningHistory } from "./learning";
import { PracticePage } from "./practice";
import { LecturePage } from "./lecture";
import { PracticeMenu } from "./practice-menu";
import { RevisionPage, RevisionSetPage } from "./revision";
import { WorldsSection } from "./worlds";
import { TimoPage } from "./timo";

export type Shared = {
  state: State;
  setState: Dispatch<SetStateAction<State>>;
  startRun: (kind?: Run["kind"], selected?: TopicId[]) => void;
};

export default function VuiHocApp({ path }: { path: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>(initialState);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [modal, setModal] = useState<"profile" | "collection" | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [learningHistory, setLearningHistory] = useState<
    LearningResult[] | null
  >(null);
  useEffect(() => {
    if (path !== "/") return;
    let active = true;
    fetch("/api/documents/history", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("history");
        return response.json() as Promise<{ runs: LearningResult[] }>;
      })
      .then((data) => {
        if (active) setLearningHistory(data.runs);
      })
      .catch(() => {
        if (active) setLearningHistory(null);
      });
    return () => {
      active = false;
    };
  }, [path]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as State;
        if (
          parsed.version === 1 &&
          parsed.profile &&
          Array.isArray(parsed.history) &&
          parsed.lesson &&
          Array.isArray(parsed.lesson.topics)
        )
          setState(parsed);
      }
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        setStorageError(true);
      }
    }
  }, [ready, state]);
  useEffect(() => {
    setMobileMenu(false);
    window.scrollTo(0, 0);
  }, [path]);
  function startRun(kind: Run["kind"] = "practice", selected?: TopicId[]) {
    const count =
      kind === "original" ? 12 : kind === "similar" ? 5 : state.lesson.count;
    const run: Run = {
      id: crypto.randomUUID(),
      kind,
      questions: createQuestions(
        count,
        selected ?? state.lesson.topics,
        state.lesson.mode,
        kind === "similar" ? 25 : 0,
      ),
      attempts: {},
      index: 0,
      finished: false,
      startedAt: Date.now(),
    };
    setState((s) => ({ ...s, run }));
    router.push("/luyen-tap");
  }
  const shared = { state, setState, startRun };
  const isHome = path === "/";
  const subject = Object.entries(subjects).find(
    ([, info]) => info.path === path,
  )?.[0] as Subject | undefined;
  const uploadSubject = path.startsWith("/tai-len/")
    ? path.split("/")[2]
    : "math";
  const isUpload =
    path === "/tai-len" ||
    path === "/timo" ||
    (path.startsWith("/tai-len/") && uploadSubject in subjects);
  const documentId = /^\/tai-lieu\/([0-9a-f-]{36})$/.exec(path)?.[1];
  const realRun = /^\/luyen-tap\/([0-9a-f-]{36})\/([0-9a-f-]{36})$/.exec(path);
  const revisionSetId = /^\/luyen-tap\/bo\/([0-9a-f-]{36})$/.exec(path)?.[1];
  const timoGradeId = /^\/luyen-tap\/timo\/(mam-non|lop-[1-5])$/.exec(
    path,
  )?.[1];
  const isTimoBank = path === "/luyen-tap/timo" || !!timoGradeId;
  const isSample = [
    "/ban-mau",
    "/buoi-hoc",
    "/bai-giang",
    "/luyen-tap",
    "/ket-qua",
  ].includes(path);
  const supported = [
    "/",
    "/toan",
    "/tai-len",
    "/timo",
    "/dang-tao",
    "/buoi-hoc",
    "/bai-giang",
    "/luyen-tap",
    "/ket-qua",
    "/hanh-trinh",
    "/sap-mo",
    "/tieng-anh",
    "/tieng-viet",
    "/tu-hoc",
    "/thu-vien",
    "/ban-mau",
  ];
  supported.push(
    "/luyen-tap/on-bai",
    "/luyen-tap/on-tong-hop",
    "/phan-thuong",
    "/luyen-tap/timo",
  );
  const totalQuestions = learningHistory?.reduce((n, h) => n + h.solved, 0);

  if (!ready)
    return (
      <main className="loading">
        <Sparkles />
        <h1>Vui học</h1>
        <p>Chuẩn bị một thế giới nhỏ cho em…</p>
      </main>
    );

  return (
    <div className={isHome ? "app home-app" : "app learning-app"}>
      <a href="#main" className="skip-link">
        Đến nội dung chính
      </a>
      <header className="site-header wrap">
        <Link href="/" className="brand">
          <span className="brand-mark">✦</span>
          <strong>Vui học</strong>
          <span className="brand-tag">VŨ TRỤ CỦA BÉ</span>
        </Link>
        <button
          className="icon-button mobile-menu"
          aria-label="Mở menu"
          aria-expanded={mobileMenu}
          onClick={() => setMobileMenu(!mobileMenu)}
        >
          {mobileMenu ? <X /> : <Menu />}
        </button>
        <nav
          aria-label="Điều hướng chính"
          className={`top-nav ${mobileMenu ? "open" : ""}`}
        >
          <Link href="/" className={isHome ? "active" : ""}>
            <Home size={18} /> Trang chủ
          </Link>
          <PracticeMenu path={path} />
          <Link href="/#worlds">
            <BookOpen size={18} /> Khám phá
          </Link>
          <Link
            href="/thu-vien"
            className={path === "/thu-vien" ? "active" : ""}
          >
            <FileText size={18} /> Thư viện
          </Link>
          <Link href="/hanh-trinh">
            <Trophy size={18} /> Hành trình
          </Link>
          <Link
            href="/phan-thuong"
            className={path === "/phan-thuong" ? "active" : ""}
          >
            <Gift size={18} /> Phần thưởng
          </Link>
          <button className="profile-chip" onClick={() => setModal("profile")}>
            <Character index={state.profile.character} />
            <span>{state.profile.name}</span>
          </button>
        </nav>
      </header>
      {isSample && (
        <div className="demo-ribbon wrap">
          <span className="status-dot" /> Khu trải nghiệm · Dữ liệu mẫu
          <span className="ribbon-separator">·</span>
          <span>Bài mẫu minh họa cách học, gợi ý và chấm điểm</span>
        </div>
      )}
      {storageError && (
        <div className="notice wrap" role="status">
          Trình duyệt chưa lưu được tiến độ. Em vẫn có thể dùng thử trong phiên
          này.
        </div>
      )}
      <main id="main" className="wrap main-content">
        {isHome && (
          <>
            <section className="home-hero">
              <div className="hero-copy">
                <p className="greeting">
                  Xin chào, {state.profile.name}! Một ngày mới thật vui nhé.
                </p>
                <span className="eyebrow">
                  MỘT THẾ GIỚI NHỎ · NGÀN ĐIỀU KHÁM PHÁ
                </span>
                <h1>
                  Học tập chưa bao giờ
                  <br />
                  <span>đơn giản và thú vị</span>
                  <br />
                  như vậy
                </h1>
                <p>
                  Chọn điều em yêu thích. Rủ người bạn đồng hành.
                  <br />
                  Cùng khám phá một điều mới mỗi ngày!
                </p>
                <div className="actions">
                  <ButtonLink href="/#worlds">
                    Cùng học thôi <Rocket size={20} />
                  </ButtonLink>
                  <button
                    className="button secondary"
                    onClick={() => setModal("profile")}
                  >
                    🎨 Góc của em
                  </button>
                </div>
                <p className="micro">
                  <span className="status-dot" /> 4 không gian học · Tài liệu
                  riêng cho từng môn
                </p>
              </div>
              <div
                className="hero-art"
                aria-label="Những người bạn hoạt hình đồng hành"
              >
                <div className="orbit">
                  <Character
                    index={state.profile.character}
                    className="main-character"
                  />
                </div>
                <Character index={0} className="floating f1" />
                <Character index={1} className="floating f2" />
                <Character index={2} className="floating f3" />
                <span className="twinkle t1">✦</span>
                <span className="twinkle t2">✧</span>
                <div className="character-label">
                  Bạn đồng hành của em
                  <br />
                  <strong>{characters[state.profile.character]}</strong>
                </div>
              </div>
            </section>
            <section className="stats-strip" aria-label="Thống kê học tập">
              <div>
                <strong>Hành trình của em</strong>
                <small>Mỗi ngày một chút, tiến bộ thật nhiều</small>
              </div>
              <div>
                <b>
                  {learningHistory?.filter((h) => h.finished).length ?? "—"}
                  <span>☀</span>
                </b>
                <small>Buổi đã hoàn thành</small>
              </div>
              <div>
                <b>
                  {totalQuestions ?? "—"}
                  <span>✎</span>
                </b>
                <small>Câu hỏi đã luyện</small>
              </div>
              <div>
                <b>
                  {learningHistory?.filter(
                    (h) => h.finished && h.score !== null && h.score >= 8,
                  ).length ?? "—"}
                  <span>✦</span>
                </b>
                <small>Ngôi sao chăm học</small>
              </div>
            </section>
            <WorldsSection />
            <section className="bottom-grid">
              <div className="card companion-card">
                <span className="eyebrow">CÓ BẠN, HỌC VUI HƠN</span>
                <h2>Một người bạn. Ngàn cảm hứng.</h2>
                <p>Chọn người bạn đồng hành của riêng em.</p>
                <div className="character-row">
                  {[0, 1, 3, 4, 7].map((i) => (
                    <button
                      key={i}
                      aria-label={`Chọn ${characters[i]}`}
                      onClick={() =>
                        setState((s) => ({
                          ...s,
                          profile: { ...s.profile, character: i },
                        }))
                      }
                      className={
                        state.profile.character === i ? "selected" : ""
                      }
                    >
                      <Character index={i} />
                    </button>
                  ))}
                </div>
                <button
                  className="text-button"
                  onClick={() => setModal("profile")}
                >
                  Khám phá 16 người bạn <ArrowRight size={17} />
                </button>
              </div>
              <div className="card goal-card">
                <div className="goal-icon">
                  <Flame size={28} />
                </div>
                <h2>Một bước nhỏ hôm nay</h2>
                <p>
                  Mục tiêu: {state.profile.dailyGoal} buổi học mỗi ngày.
                  <br />
                  Bắt đầu thật nhẹ nhàng, tiến bộ theo cách của em.
                </p>
                <ButtonLink
                  href={
                    state.run && !state.run.finished ? "/luyen-tap" : "/toan"
                  }
                  secondary
                >
                  {state.run && !state.run.finished
                    ? "Tiếp tục bài đang học"
                    : "Khám phá nhiệm vụ"}
                  <ArrowRight size={17} />
                </ButtonLink>
              </div>
            </section>
          </>
        )}
        {subject && <SubjectPage key={subject} subject={subject} />}
        {path === "/ban-mau" && <MathPage {...shared} />}
        {isUpload && (
          <UploadPage
            key={path}
            subject={uploadSubject as Subject}
            mode={path === "/timo" ? "timo" : "weekly"}
          />
        )}
        {(path === "/thu-vien" || path === "/dang-tao") && <DocumentLibrary />}
        {documentId && <DocumentPage key={documentId} id={documentId} />}
        {path === "/luyen-tap/on-bai" && (
          <RevisionPage key="documents" kind="documents" />
        )}
        {path === "/luyen-tap/on-tong-hop" && (
          <RevisionPage key="topics" kind="topics" />
        )}
        {revisionSetId && (
          <RevisionSetPage key={revisionSetId} id={revisionSetId} />
        )}
        {isTimoBank && <TimoPage gradeId={timoGradeId} />}
        {path === "/phan-thuong" && (
          <section className="card empty-state rewards-placeholder">
            <Gift size={48} />
            <PageTitle eyebrow="PHẦN THƯỞNG" title="Coming soon" />
          </section>
        )}
        {realRun && (
          <RealPracticePage
            key={realRun[2]}
            documentId={realRun[1]}
            runId={realRun[2]}
            character={state.profile.character}
          />
        )}
        {path === "/buoi-hoc" && <LessonPage {...shared} />}
        {path === "/bai-giang" && <LecturePage {...shared} />}
        {path === "/luyen-tap" && <PracticePage {...shared} />}
        {path === "/ket-qua" && <ResultsPage {...shared} />}
        {path === "/hanh-trinh" && (
          <>
            <LearningHistory />
            <details className="card source-details">
              <summary>Lịch sử khu trải nghiệm mẫu</summary>
              <HistoryPage {...shared} />
            </details>
          </>
        )}
        {path === "/sap-mo" && (
          <div className="empty-state card">
            <span className="large-emoji">🌱</span>
            <PageTitle
              eyebrow="BỐN KHÔNG GIAN HỌC"
              title="Những cánh cửa đã mở!"
            >
              Toán, Tiếng Anh, Tiếng Việt và Tự học đang chờ em khám phá.
            </PageTitle>
            <ButtonLink href="/#worlds">
              Chọn không gian học <ArrowRight size={18} />
            </ButtonLink>
          </div>
        )}
        {!supported.includes(path) &&
          !isUpload &&
          !documentId &&
          !realRun &&
          !revisionSetId &&
          !timoGradeId && (
            <div className="empty-state">
              <PageTitle
                eyebrow="LẠC ĐƯỜNG MỘT CHÚT THÔI"
                title="Cánh cửa này chưa có"
              >
                Mình quay lại thế giới học tập nhé.
              </PageTitle>
              <ButtonLink href="/">Về trang chủ</ButtonLink>
            </div>
          )}
      </main>
      <footer className="wrap site-footer">
        <Link href="/">✦ Vui học</Link>
        <span>
          Lớn lên cùng những điều kỳ diệu. Mỗi ngày một chút. Mỗi bước một niềm
          vui.
        </span>
        <span>
          {isTimoBank ? "Mầm non – Lớp 5 · Luyện đề TIMO" : "Lớp 2 · Demo MVP"}
        </span>
      </footer>
      {modal === "profile" && (
        <ProfileModal
          state={state}
          setState={setState}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "collection" && (
        <Modal title="Bộ sưu tập của em" onClose={() => setModal(null)}>
          <p>Mỗi buổi học đạt từ 8 điểm, em nhận một ngôi sao chăm học.</p>
          <div className="large-emoji">⭐</div>
        </Modal>
      )}
    </div>
  );
}

function ProfileModal({
  state,
  setState,
  onClose,
}: Pick<Shared, "state" | "setState"> & { onClose: () => void }) {
  const [name, setName] = useState(state.profile.name);
  const [character, setCharacter] = useState(state.profile.character);
  const [goal, setGoal] = useState(state.profile.dailyGoal);
  const [reset, setReset] = useState(false);
  return (
    <Modal title="Góc nhỏ của em" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setState((s) => ({
            ...s,
            profile: {
              name: name.trim() || "Nhà thám hiểm nhỏ",
              character,
              dailyGoal: goal,
            },
          }));
          onClose();
        }}
      >
        <p>Chọn một cái tên và người bạn cùng khám phá nhé.</p>
        <label className="field">
          Tên gọi của em
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            required
          />
        </label>
        <p className="field-label">Người bạn đồng hành</p>
        <div className="avatar-grid">
          {characters.map((name, i) => (
            <button
              type="button"
              key={name}
              className={character === i ? "chosen" : ""}
              aria-pressed={character === i}
              onClick={() => setCharacter(i)}
            >
              <Character index={i} />
              <span>{name}</span>
            </button>
          ))}
        </div>
        <label className="field">
          Mục tiêu mỗi ngày
          <select
            value={goal}
            onChange={(e) => setGoal(Number(e.target.value))}
          >
            <option value={1}>1 buổi học</option>
            <option value={2}>2 buổi học</option>
            <option value={3}>3 buổi học</option>
          </select>
        </label>
        <p className="micro">
          Hồ sơ và tiến độ của bản demo được lưu trên trình duyệt này.
        </p>
        <button className="button full" type="submit">
          Lưu góc của em <Check size={18} />
        </button>
        <details className="demo-controls">
          <summary>Dữ liệu bản demo</summary>
          <p>
            Khôi phục hồ sơ ban đầu và xóa tiến độ mẫu trên trình duyệt này.
          </p>
          {reset ? (
            <div className="actions">
              <button
                className="button secondary small"
                type="button"
                onClick={() => setReset(false)}
              >
                Giữ lại
              </button>
              <button
                className="button small"
                type="button"
                onClick={() => {
                  setState(initialState);
                  onClose();
                }}
              >
                Xác nhận khôi phục demo
              </button>
            </div>
          ) : (
            <button
              className="text-button"
              type="button"
              onClick={() => setReset(true)}
            >
              Khôi phục dữ liệu mẫu
            </button>
          )}
        </details>
      </form>
    </Modal>
  );
}

function MathPage({ state, startRun }: Shared) {
  return (
    <>
      <section className="math-hero">
        <div>
          <span className="eyebrow coral">
            NHIỆM VỤ MỚI · KHÁM PHÁ MỖI NGÀY
          </span>
          <h1>
            Cùng em khám phá.
            <br />
            <span>Sẵn sàng học toán!</span>
          </h1>
          <p>
            Học theo bài mẫu, luyện theo năng lực.
            <br />
            Từng gợi ý nhỏ, mở ra những điều thật lớn.
          </p>
          <div className="actions">
            <ButtonLink href="/tai-len">
              Gửi bài của em <Upload size={19} />
            </ButtonLink>
            <button className="button secondary" onClick={() => startRun()}>
              Thử nhiệm vụ mẫu <ArrowRight size={18} />
            </button>
          </div>
          <div className="hero-mini-stats">
            <span>
              <b>{state.history.length}</b> buổi đã luyện
            </span>
            <span>
              <b>25</b> câu mặc định
            </span>
          </div>
        </div>
        <div className="math-art">
          <Star className="art-star" fill="currentColor" />
          <Character index={state.profile.character} />
          <span className="speech">Sẵn sàng làm nhiệm vụ cùng em!</span>
          <strong>2 + 3 = 5　✦　8 − 4 = 4</strong>
        </div>
      </section>
      <div className="section-heading">
        <div>
          <span className="eyebrow">HỌC TỪ NHỮNG ĐIỀU QUEN THUỘC</span>
          <h2>Chọn hành trình hôm nay</h2>
        </div>
      </div>
      <div>
        <Link href="/tai-len" className="journey-card blue">
          <TopicIcon icon="↥" color="blue" />
          <div>
            <h3>Ôn bài của em</h3>
            <p>Tải bài tuần này, cùng ôn lại và luyện thêm.</p>
            <span className="text-button">
              Bắt đầu ôn tập <ArrowRight size={17} />
            </span>
          </div>
        </Link>
      </div>
      <section className="section">
        <div className="section-heading">
          <div>
            <h2>Buổi học của em</h2>
            <p>Một tài liệu nhỏ, thật nhiều điều để khám phá.</p>
          </div>
          <Link className="text-button" href="/hanh-trinh">
            Xem hành trình <ArrowRight size={17} />
          </Link>
        </div>
        <div className="card lesson-row">
          <span className="file-icon">
            <FileText size={29} />
          </span>
          <div>
            <span className="badge green">
              {state.lesson.stage >= 4
                ? "Sẵn sàng khám phá"
                : "Đang tạo · mô phỏng"}
            </span>
            <h3>{state.lesson.name}</h3>
            <p>
              {state.lesson.topics.length} chủ đề · {state.lesson.count} câu
              luyện · Dữ liệu mẫu
            </p>
          </div>
          <ButtonLink
            href={state.lesson.stage >= 4 ? "/buoi-hoc" : "/dang-tao"}
            secondary
          >
            Mở buổi học <ArrowRight size={17} />
          </ButtonLink>
        </div>
      </section>
      <div className="section-heading">
        <div>
          <h2>Thử một nhiệm vụ nhỏ</h2>
          <p>Các bài minh họa có sẵn, không cần tải file.</p>
        </div>
      </div>
      <div className="topic-grid">
        {topics.map((t) => (
          <button
            className="card topic-card"
            key={t.id}
            onClick={() => startRun("similar", [t.id])}
          >
            <TopicIcon icon={t.icon} color={t.color} />
            <h3>{t.name}</h3>
            <p>{t.description}</p>
            <span className="eyebrow">
              5 CÂU MINH HỌA <ArrowRight size={15} />
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function LessonPage({ state, startRun }: Shared) {
  const { lesson } = state;
  return (
    <>
      <Link href="/toan" className="back-link">
        <ArrowLeft size={16} /> Vui học Toán
      </Link>
      <PageTitle
        eyebrow={
          lesson.mode === "timo"
            ? "CHINH PHỤC TIMO · LỚP 2"
            : "BUỔI ÔN TẬP CỦA EM · LỚP 2"
        }
        title={lesson.name}
      >
        Em muốn khám phá điều gì trước? Chọn một chủ đề, học theo cách của em.
      </PageTitle>
      <div className="lesson-summary">
        <span>
          <FileText size={17} />
          {lesson.fileName}
        </span>
        <span>
          <BookOpen size={17} />
          {lesson.topics.length} chủ đề
        </span>
        <span>
          <Clock3 size={17} />
          Tự chọn thời lượng
        </span>
        <span className="badge">Nội dung mẫu</span>
      </div>
      <div className="lesson-callout">
        <Character index={state.profile.character} />
        <div>
          <h3>Mỗi bước nhỏ đều đáng tự hào!</h3>
          <p>
            Em có thể xem giảng trước, hoặc thử làm bài rồi mở gợi ý khi cần.
          </p>
        </div>
        <ButtonLink href="/bai-giang" secondary>
          <Play size={17} /> Xem bài giảng mẫu
        </ButtonLink>
      </div>
      {lesson.mode === "timo" && (
        <div className="card original-card">
          <div>
            <span className="eyebrow">ĐỀ GỐC MINH HỌA</span>
            <h3>TIMO lớp 2 · 12 câu mẫu</h3>
            <p>Giữ thứ tự đề mẫu. Có bản dịch và lời giải song ngữ.</p>
          </div>
          <button className="button" onClick={() => startRun("original")}>
            Làm đề mẫu <ArrowRight size={18} />
          </button>
        </div>
      )}
      <div className="topic-grid lesson-topics">
        {topics
          .filter((t) => lesson.topics.includes(t.id))
          .map((t, i) => (
            <article className="card topic-card" key={t.id}>
              <div className="card-top">
                <TopicIcon icon={t.icon} color={t.color} />
                <span className="badge">Chủ đề {i + 1}</span>
              </div>
              <h3>{t.name}</h3>
              <p>{t.description}</p>
              <div className={`example ${t.color}`}>{t.example}</div>
              <div className="topic-actions">
                <Link href="/bai-giang" className="text-button">
                  <Play size={16} /> Giảng mẫu phép cộng
                </Link>
                <button
                  className="button secondary small"
                  onClick={() => startRun("similar", [t.id])}
                >
                  Luyện 5 câu <ArrowRight size={16} />
                </button>
              </div>
            </article>
          ))}
      </div>
      <div className="practice-banner">
        <div>
          <span className="eyebrow">SẴN SÀNG THỬ SỨC?</span>
          <h2>Gom kiến thức, mở thử thách!</h2>
          <p>{lesson.count} câu luyện mới từ các chủ đề đã chọn.</p>
        </div>
        <button className="button" onClick={() => startRun()}>
          Luyện {lesson.count} câu <Rocket size={19} />
        </button>
      </div>
    </>
  );
}

function ResultsPage({ state, startRun }: Shared) {
  const result = state.run?.finished
    ? summarize(state.run, state.lesson.name)
    : state.history.at(-1);
  if (!result)
    return (
      <div className="empty-state card">
        <Trophy size={50} />
        <PageTitle eyebrow="HÀNH TRÌNH MỚI BẮT ĐẦU" title="Chưa có kết quả nào">
          Mình thử một nhiệm vụ nhỏ trước nhé.
        </PageTitle>
        <button className="button" onClick={() => startRun("similar")}>
          Luyện 5 câu mẫu
        </button>
      </div>
    );
  return (
    <>
      <PageTitle
        eyebrow="MỖI NỖ LỰC ĐỀU ĐÁNG TỰ HÀO"
        title="Em đã tiến thêm một bước!"
      >
        Cùng nhìn lại những điều em đã khám phá nhé.
      </PageTitle>
      <section className="result-hero card">
        <Character index={state.profile.character} />
        <div className="score-circle">
          <strong>{result.score.toLocaleString("vi-VN")}</strong>
          <span>/10 điểm</span>
        </div>
        <div>
          <span className="badge">Điểm lần làm đầu</span>
          <h2>
            {result.score >= 8
              ? "Thật tuyệt, nhà thám hiểm nhỏ!"
              : "Cứ từng bước, em sẽ làm được!"}
          </h2>
          <p>
            {result.firstCorrect}/{result.total} câu đúng lần đầu ·{" "}
            {result.solved}/{result.total} câu đã hoàn thành sau khi sửa.
          </p>
          <small>
            Điểm không bị trừ vì mở gợi ý. Câu bỏ qua được tính là chưa đúng.
          </small>
        </div>
      </section>
      <div className="result-stats">
        <div className="card">
          <strong>{result.independent}</strong>
          <span>Câu làm đúng độc lập</span>
        </div>
        <div className="card">
          <strong>{result.hints}</strong>
          <span>Lượt mở gợi ý</span>
        </div>
        <div className="card">
          <strong>{result.solved - result.firstCorrect}</strong>
          <span>Câu hoàn thành sau sửa</span>
        </div>
      </div>
      <section className="section card result-details">
        <h2>Em đã học như thế nào?</h2>
        <p>Gợi ý là người bạn giúp em hiểu bài, hãy dùng khi cần nhé.</p>
        {result.byTopic.map((t) => {
          const topic = topics.find((x) => x.id === t.id)!;
          return (
            <div className="topic-result" key={t.id}>
              <TopicIcon icon={topic.icon} color={topic.color} />
              <div>
                <strong>{topic.name}</strong>
                <div className="progress-track">
                  <span style={{ width: `${(t.correct / t.total) * 100}%` }} />
                </div>
              </div>
              <span>
                {t.correct}/{t.total} đúng lần đầu
                <small>{t.hints} lượt gợi ý</small>
              </span>
            </div>
          );
        })}
      </section>
      <div className="actions centered">
        <button
          className="button"
          onClick={() =>
            startRun(
              "similar",
              result.byTopic
                .filter((t) => t.correct < t.total)
                .map((t) => t.id),
            )
          }
        >
          Luyện thêm 5 câu <Rocket size={18} />
        </button>
        <ButtonLink href="/hanh-trinh" secondary>
          Xem hành trình
        </ButtonLink>
        <ButtonLink href="/buoi-hoc" secondary>
          Về menu bài học
        </ButtonLink>
      </div>
    </>
  );
}

function HistoryPage({ state, startRun }: Shared) {
  return (
    <>
      <PageTitle eyebrow="MỖI NGÀY MỘT CHÚT" title="Hành trình của em">
        Những nỗ lực nhỏ hôm nay, trở thành điều tuyệt vời ngày mai.
      </PageTitle>
      <div className="stats-strip">
        <div>
          <strong>{state.profile.name}</strong>
          <small>Nhà thám hiểm lớp 2</small>
        </div>
        <div>
          <b>{state.history.length}</b>
          <small>Buổi hoàn thành</small>
        </div>
        <div>
          <b>{state.history.reduce((n, h) => n + h.total, 0)}</b>
          <small>Câu đã luyện</small>
        </div>
        <div>
          <b>{state.history.filter((h) => h.score >= 8).length} ⭐</b>
          <small>Ngôi sao chăm học</small>
        </div>
      </div>
      {state.run && !state.run.finished && (
        <div className="notice resume-notice">
          <div>
            <strong>Em có một nhiệm vụ đang làm dở</strong>
            <p>Tiến độ đã được lưu trên trình duyệt này.</p>
          </div>
          <ButtonLink href="/luyen-tap">
            Tiếp tục học <ArrowRight size={17} />
          </ButtonLink>
        </div>
      )}
      <section className="section">
        <h2>Nhật ký khám phá</h2>
        {state.history.length === 0 ? (
          <div className="card empty-state">
            <span className="large-emoji">🌱</span>
            <h3>Trang đầu tiên đang chờ em</h3>
            <p>Hoàn thành một nhiệm vụ để lưu bước tiến đầu tiên ở đây.</p>
            <button className="button" onClick={() => startRun("similar")}>
              Thử 5 câu mẫu <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <div className="history-list">
            {state.history
              .slice()
              .reverse()
              .map((h) => (
                <article className="card history-row" key={h.id}>
                  <span className="history-trophy">
                    <Trophy size={26} />
                  </span>
                  <div>
                    <h3>{h.name}</h3>
                    <p>
                      {new Date(h.date).toLocaleDateString("vi-VN")} · {h.total}{" "}
                      câu · {h.hints} lượt gợi ý
                    </p>
                    <small>
                      {h.independent} câu đúng độc lập · {h.solved} câu hoàn
                      thành sau sửa
                    </small>
                  </div>
                  <strong>
                    {h.score.toLocaleString("vi-VN")}
                    <small>/10 lần đầu</small>
                  </strong>
                </article>
              ))}
          </div>
        )}
      </section>
    </>
  );
}
