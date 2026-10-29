"use client";
import { GuestExplore } from "./guest-explore";

import { AccountProvider, AccountModal, AuthPage, useAccount } from "./account";
import {
  AchievementMenu,
  AchievementNotice,
  MedalPage,
  RankingPage,
} from "./achievements";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  Glyph,
  BrandLogo,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  FileText,
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
} from "./icons";
import {
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
import { RewardsPage } from "./rewards";
import { HeroCompanions } from "./hero-companions";

export type Shared = {
  state: State;
  setState: Dispatch<SetStateAction<State>>;
  startRun: (kind?: Run["kind"], selected?: TopicId[]) => void;
};

export default function VuiHocApp({ path }: { path: string }) {
  return (
    <AccountProvider>
      <AccountApp path={path} />
    </AccountProvider>
  );
}
function AccountApp({ path }: { path: string }) {
  const { user, loaded } = useAccount();
  if (!loaded)
    return (
      <main className="loading">
        <Sparkles />
        <h1>Vui học</h1>
        <p>Đang mở góc học tập của em…</p>
      </main>
    );
  return <VuiHocContent key={user?.id || "guest"} path={path} />;
}
function VuiHocContent({ path }: { path: string }) {
  const { user, notify, update, openAuth, requestAccess } = useAccount();
  const router = useRouter();
  const [state, setState] = useState<State>(initialState);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [modal, setModal] = useState<"profile" | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [learningHistory, setLearningHistory] = useState<
    LearningResult[] | null
  >(null);
  useEffect(() => {
    if (path !== "/" || !user) return;
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
      const raw = localStorage.getItem(`${STORAGE_KEY}:${user?.id}`);
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
    if (user)
      setState((s) => ({
        ...s,
        profile: {
          name: user.nickname,
          character: user.character,
          dailyGoal: user.dailyGoal,
        },
      }));
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready && user) {
      try {
        localStorage.setItem(
          `${STORAGE_KEY}:${user?.id}`,
          JSON.stringify(state),
        );
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
    if (!requestAccess("bắt đầu làm bài và lưu kết quả", "/ban-mau")) return;
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
  useEffect(() => {
    if (user)
      setState((s) => ({
        ...s,
        profile: {
          name: user.nickname,
          character: user.character,
          dailyGoal: user.dailyGoal,
        },
      }));
  }, [user]);
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
    "/thanh-tich",
    "/thanh-tich/xep-hang",
    "/thanh-tich/huy-chuong",
  ];
  supported.push(
    "/luyen-tap/on-bai",
    "/luyen-tap/on-tong-hop",
    "/phan-thuong",
    "/luyen-tap/timo",
  );
  const totalQuestions = learningHistory?.reduce((n, h) => n + h.solved, 0);
  const completedLessons = learningHistory?.filter((h) => h.finished).length;
  const unfinishedLesson = learningHistory
    ?.filter((h) => !h.finished && h.total > 0 && h.solved < h.total)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

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
          <span className="brand-mark">
            <BrandLogo size={48} />
          </span>
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
          onClickCapture={(event) => {
            const link = (event.target as HTMLElement).closest("a");
            if (
              !user &&
              link?.getAttribute("href") === "/thanh-tich/xep-hang"
            ) {
              event.preventDefault();
              requestAccess(
                "xem bảng xếp hạng của các bạn cùng khối",
                "/thanh-tich/xep-hang",
              );
            }
          }}
        >
          <Link href="/" className={isHome ? "active" : ""}>
            <Home size={18} /> Trang chủ
          </Link>
          <PracticeMenu path={path} />
          <AchievementMenu path={path} />
          <Link
            href="/thu-vien"
            className={path === "/thu-vien" ? "active" : ""}
          >
            <Glyph token="library" size={18} /> Thư viện
          </Link>
          <Link href="/hanh-trinh">
            <Glyph token="journey" size={18} /> Hành trình
          </Link>
          <Link
            href="/phan-thuong"
            className={path === "/phan-thuong" ? "active" : ""}
          >
            <Gift size={18} /> Phần thưởng
          </Link>
          <button
            className="profile-chip"
            onClick={() => (user ? setModal("profile") : openAuth())}
          >
            <Character index={state.profile.character} />
            <span>{user?.nickname || "Đăng nhập / Đăng ký"}</span>
          </button>
        </nav>
      </header>
      {user && isSample && (
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
        {!user && path !== "/" ? (
          <GuestExplore path={path} />
        ) : (
          <>
            {(path === "/thanh-tich/huy-chuong" || path === "/thanh-tich") && (
              <MedalPage />
            )}
            {path === "/thanh-tich/xep-hang" && <RankingPage />}
            {isHome && (
              <div className="home-dashboard">
                <section className="home-hero">
                  <div className="hero-copy">
                    <p className="greeting">
                      {user
                        ? `Chào ${state.profile.name}!`
                        : "CHÀO MỪNG ĐẾN VỚI VUI HỌC"}
                    </p>
                    <h1>
                      Hôm nay mình
                      <br />
                      <span>học gì nào?</span>
                    </h1>
                    <p>Chọn môn em thích, cùng khám phá nhé.</p>
                    {unfinishedLesson && (
                      <div className="home-resume">
                        <span className="eyebrow">BÀI ĐANG HỌC</span>
                        <h2 title={unfinishedLesson.title}>
                          {unfinishedLesson.title}
                        </h2>
                        <div className="home-resume-bottom">
                          <span>
                            {unfinishedLesson.solved}/{unfinishedLesson.total}{" "}
                            câu đã hoàn thành
                          </span>
                          <ButtonLink
                            href={`/luyen-tap/${unfinishedLesson.documentId}/${unfinishedLesson.id}`}
                            className="small"
                          >
                            Học tiếp <ArrowRight size={17} />
                          </ButtonLink>
                        </div>
                        <progress
                          aria-label="Tiến độ bài đang học"
                          value={unfinishedLesson.solved}
                          max={unfinishedLesson.total}
                        />
                      </div>
                    )}
                    <div className="home-start-row">
                      <ButtonLink
                        href="/#worlds"
                        secondary={!!unfinishedLesson}
                      >
                        Chọn môn học <Rocket size={18} />
                      </ButtonLink>
                      <button
                        className="text-button"
                        onClick={() =>
                          user ? setModal("profile") : openAuth()
                        }
                        aria-haspopup="dialog"
                      >
                        {user ? "Đổi bạn đồng hành" : "Tạo góc học của em"}
                      </button>
                    </div>
                    <p className="home-daily-goal">
                      <Star size={14} aria-hidden="true" />{" "}
                      {user
                        ? `Mục tiêu hôm nay: ${state.profile.dailyGoal} buổi học`
                        : "Khám phá theo nhịp của mình"}
                    </p>
                  </div>
                  <HeroCompanions
                    selected={state.profile.character}
                    onSelect={async (character) => {
                      if (!user) {
                        setState((s) => ({
                          ...s,
                          profile: { ...s.profile, character },
                        }));
                        return;
                      }
                      const {
                        id: _id,
                        username: _username,
                        grade: _grade,
                        ...profile
                      } = user;
                      try {
                        await update({ ...profile, character });
                      } catch (e) {
                        notify((e as Error).message);
                      }
                    }}
                  />
                </section>
                <WorldsSection />
                <Link className="home-progress" href="/hanh-trinh">
                  <Glyph token="journey" size={18} />
                  <span>
                    {learningHistory && learningHistory.length > 0
                      ? `${completedLessons} buổi hoàn thành · ${totalQuestions} câu đã luyện`
                      : "Hành trình của em"}
                  </span>
                  <span className="home-progress-detail">Xem hành trình</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
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
            {(path === "/thu-vien" || path === "/dang-tao") && (
              <DocumentLibrary />
            )}
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
            {path === "/phan-thuong" && <RewardsPage />}
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
                <span className="large-emoji">
                  <Glyph token="🌱" size={64} />
                </span>
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
          </>
        )}
      </main>
      {user && <AchievementNotice />}
      <footer className="wrap site-footer">
        <Link href="/">
          <BrandLogo size={24} /> Vui học
        </Link>
        <span>
          Lớn lên cùng những điều kỳ diệu. Mỗi ngày một chút. Mỗi bước một niềm
          vui.
        </span>
        <span>
          {isTimoBank
            ? "Mầm non – Lớp 5 · Luyện đề TIMO"
            : user
              ? `Khối ${user.grade} · Góc học của ${user.nickname}`
              : "Cùng em tiến bộ mỗi ngày"}
        </span>
      </footer>
      {modal === "profile" && user && (
        <AccountModal onClose={() => setModal(null)} />
      )}
    </div>
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
              Thử bài mẫu <ArrowRight size={18} />
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
          <b>
            {state.history.filter((h) => h.score >= 8).length}{" "}
            <Star size={20} />
          </b>
          <small>Bài đạt từ 8 điểm</small>
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
            <span className="large-emoji">
              <Glyph token="🌱" size={64} />
            </span>
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
