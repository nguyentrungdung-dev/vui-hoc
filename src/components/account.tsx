"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  LogIn,
  UserRound,
  X,
  AlertCircle,
  WelcomeScene,
  Award,
  Sprout,
  Trophy,
  ArrowRight,
  BookOpen,
} from "./icons";
import type { Student } from "@/lib/account";
import { characters } from "@/lib/demo";
import { Character, Modal } from "./ui";
type Toast = { text: string; success: boolean };
type AccountContext = {
  user: Student | null;
  loaded: boolean;
  notify: (text: string, success?: boolean) => void;
  update: (
    profile: Omit<Student, "id" | "username" | "grade">,
  ) => Promise<void>;
  logout: () => Promise<void>;
  authenticate: (data: Record<string, unknown>) => Promise<void>;
  openAuth: () => void;
  requestAccess: (reason?: string, destination?: string) => boolean;
};
const Context = createContext<AccountContext>(null!);
export const useAccount = () => useContext(Context);
export async function accountRequest(body?: unknown) {
  const response = await fetch("/api/account", {
    cache: "no-store",
    ...(body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Chưa kết nối được tài khoản.");
  return result as { user: Student | null };
}
export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Student | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [access, setAccess] = useState<{
    reason: string;
    destination?: string;
  } | null>(null);
  const [destination, setDestination] = useState<string | undefined>();
  const openAuth = () => {
    setDestination(access?.destination);
    setAccess(null);
    setAuthOpen(true);
  };
  function requestAccess(reason = "lưu hành trình học của em", next?: string) {
    if (user) return true;
    setDestination(next);
    setAccess({ reason, destination: next });
    return false;
  }
  const notify = useCallback(
    (text: string, success = false) => setToast({ text, success }),
    [],
  );
  useEffect(() => {
    accountRequest()
      .then((r) => {
        setUser(r.user);
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
        notify("Chưa kết nối được tài khoản. Em tải lại trang để thử lại nhé.");
      });
  }, [notify]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const sync = () => {
      accountRequest()
        .then((r) => setUser(r.user))
        .catch(() => {});
    };
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  }, []);
  async function authenticate(data: Record<string, unknown>) {
    const result = await accountRequest(data);
    setUser(result.user);
    setAuthOpen(false);
    setAccess(null);
    if (destination) {
      router.push(destination);
      setDestination(undefined);
    }
    notify(
      data.action === "register"
        ? "Đăng ký thành công! Chào mừng em đến với Vui học."
        : "Đăng nhập thành công! Mình cùng học nhé.",
      true,
    );
  }
  async function update(profile: Omit<Student, "id" | "username" | "grade">) {
    const result = await accountRequest({ action: "update", profile });
    setUser(result.user);
    notify("Đã lưu góc nhỏ của em!", true);
  }
  async function logout() {
    await accountRequest({ action: "logout" });
    setUser(null);
    router.push("/");
    notify("Đã đăng xuất tài khoản.", true);
  }
  return (
    <Context.Provider
      value={{
        user,
        loaded,
        notify,
        authenticate,
        update,
        logout,
        openAuth,
        requestAccess,
      }}
    >
      {children}
      {access && !user && (
        <Modal
          title="Cất giữ hành trình của riêng em"
          className="access-dialog"
          onClose={() => setAccess(null)}
        >
          <div className="access-art">
            <BookOpen size={56} />
            <Award size={40} />
          </div>
          <p>
            Đăng nhập để {access.reason}. Mình sẽ lưu bài làm, tiến độ và những
            thành tích em đạt được.
          </p>
          <button className="button full" onClick={openAuth}>
            Đăng nhập / Đăng ký <ArrowRight size={18} />
          </button>
          <button className="access-continue" onClick={() => setAccess(null)}>
            Mình tham quan thêm một chút
          </button>
        </Modal>
      )}
      {authOpen && !user && (
        <Modal
          title="Một hành trình mới đang chờ"
          className="auth-dialog"
          onClose={() => setAuthOpen(false)}
        >
          <AuthPage />
        </Modal>
      )}
      {toast && (
        <div
          className={`account-toast ${toast.success ? "success" : "error"}`}
          role={toast.success ? "status" : "alert"}
        >
          {toast.success ? <CheckCircle2 /> : <AlertCircle />}
          <span>{toast.text}</span>
          <button
            className="icon-button"
            aria-label="Đóng thông báo"
            onClick={() => setToast(null)}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export function AuthPage() {
  const { authenticate, notify } = useAccount();
  const [mode, setMode] = useState<"welcome" | "login" | "register">("welcome");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const fields = new FormData(e.currentTarget);
    const data = Object.fromEntries(fields.entries());
    if (
      !data.username ||
      !data.password ||
      (mode === "register" && (!data.fullName || !data.nickname || !data.grade))
    ) {
      notify("Em hãy nhập đủ các thông tin bắt buộc nhé.");
      return;
    }
    if (mode === "register" && data.password !== data.confirmPassword) {
      notify("Hai lần nhập mật khẩu chưa giống nhau.");
      return;
    }
    setBusy(true);
    try {
      await authenticate({ ...data, action: mode, grade: Number(data.grade) });
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-layout">
      <div className="auth-intro">
        <span className="auth-kicker">VUI HỌC · VŨ TRỤ CỦA EM</span>
        <WelcomeScene />
        <h1>
          Những điều lớn lao
          <br />
          bắt đầu từ <em>tò mò.</em>
        </h1>
        <p>
          Một câu hỏi nhỏ. Một khám phá mới.
          <br />
          Cùng viết nên hành trình mang tên em.
        </p>
        <div className="auth-benefits">
          <span>
            <Award size={22} /> Huy chương của riêng em
          </span>
          <span>
            <Sprout size={22} /> Tiến bộ từng chút một
          </span>
          <span>
            <Trophy size={22} /> Cùng bạn bè tỏa sáng
          </span>
        </div>
        <span className="auth-scene-caption">KHÁM PHÁ · THỬ SỨC · LỚN LÊN</span>
      </div>
      <div className="card auth-card">
        {mode === "welcome" ? (
          <>
            <div className="auth-welcome-mark">
              <BookOpen size={34} />
              <span>CHÀO NHÀ THÁM HIỂM NHỎ</span>
            </div>
            <h2>
              Góc nhỏ này,
              <br />
              dành riêng cho em.
            </h2>
            <p>
              Lưu những lần cố gắng, những câu đã hiểu và cả những huy chương
              đầu tiên.
            </p>
            <button className="button full" onClick={() => setMode("login")}>
              <LogIn size={20} /> Em đã có tài khoản <ArrowRight size={18} />
            </button>
            <button
              className="button secondary full"
              onClick={() => setMode("register")}
            >
              <UserRound size={20} /> Tạo tài khoản mới
            </button>
            <p className="auth-small-note">
              Một tài khoản nhỏ, cả thế giới để khám phá.
            </p>
          </>
        ) : (
          <>
            <div className="auth-tabs">
              <button
                className={mode === "login" ? "selected" : ""}
                onClick={() => setMode("login")}
              >
                Đăng nhập
              </button>
              <button
                className={mode === "register" ? "selected" : ""}
                onClick={() => setMode("register")}
              >
                Đăng ký
              </button>
            </div>
            <h2>
              {mode === "login"
                ? "Mừng em quay lại!"
                : "Tạo góc học tập của em"}
            </h2>
            <p>
              {mode === "login"
                ? "Hành trình của em đang chờ được tiếp nối."
                : "Dấu * là thông tin bắt buộc. Nhờ ba mẹ giúp em nếu cần nhé."}
            </p>
            <form noValidate onSubmit={submit} key={mode}>
              <label className="field">
                Tên đăng nhập *
                <input
                  name="username"
                  autoComplete="username"
                  maxLength={32}
                  required
                  placeholder="Ví dụ: bongmay_02"
                />
              </label>
              <label className="field">
                Mật khẩu *
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                  maxLength={128}
                  required
                  placeholder={
                    mode === "register" ? "Ít nhất 8 ký tự" : "Mật khẩu của em"
                  }
                />
              </label>
              <label className="password-toggle">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                />{" "}
                Hiện mật khẩu
              </label>
              {mode === "register" && (
                <>
                  <label className="field">
                    Nhập lại mật khẩu *
                    <input
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      maxLength={128}
                    />
                  </label>
                  <div className="account-fields">
                    <label className="field">
                      Họ và tên *
                      <input
                        name="fullName"
                        autoComplete="name"
                        required
                        maxLength={80}
                      />
                    </label>
                    <label className="field">
                      Nickname *
                      <input
                        name="nickname"
                        required
                        maxLength={32}
                        placeholder="Tên hiện trên bảng xếp hạng"
                      />
                    </label>
                  </div>
                  <label className="field">
                    Khối lớp *
                    <select name="grade" required defaultValue="">
                      <option value="" disabled>
                        Chọn khối lớp của em
                      </option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option value={n} key={n}>
                          Khối {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="account-fields">
                    <label className="field">
                      Tên trường <small>(không bắt buộc)</small>
                      <input name="school" maxLength={100} />
                    </label>
                    <label className="field">
                      Thành phố sinh sống <small>(không bắt buộc)</small>
                      <input
                        name="city"
                        autoComplete="address-level1"
                        maxLength={100}
                      />
                    </label>
                  </div>
                  <p className="micro">
                    Bảng thi đua chỉ hiển thị nickname và bạn đồng hành của em.
                    Trường và thành phố có thể bổ sung sau.
                  </p>
                </>
              )}
              <button className="button full" disabled={busy}>
                {busy
                  ? "Đang kết nối…"
                  : mode === "login"
                    ? "Đăng nhập và học thôi"
                    : "Đăng ký tài khoản"}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
export function AccountModal({ onClose }: { onClose: () => void }) {
  const { user, update, logout, notify } = useAccount();
  const [busy, setBusy] = useState(false);
  const [character, setCharacter] = useState(user?.character || 0);
  if (!user) return null;
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !user) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await update({
        fullName: String(f.get("fullName")),
        nickname: String(f.get("nickname")),
        school: String(f.get("school")),
        city: String(f.get("city")),
        character,
        dailyGoal: Number(f.get("dailyGoal")),
      });
      onClose();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Góc nhỏ của em" onClose={onClose}>
      <p className="micro">
        @{user.username} · Khối {user.grade}
      </p>
      <form noValidate onSubmit={submit}>
        <div className="account-fields">
          <label className="field">
            Họ và tên *
            <input
              name="fullName"
              defaultValue={user.fullName}
              maxLength={80}
            />
          </label>
          <label className="field">
            Nickname *
            <input
              name="nickname"
              defaultValue={user.nickname}
              maxLength={32}
            />
          </label>
          <label className="field">
            Tên trường <small>(không bắt buộc)</small>
            <input name="school" defaultValue={user.school} maxLength={100} />
          </label>
          <label className="field">
            Thành phố <small>(không bắt buộc)</small>
            <input name="city" defaultValue={user.city} maxLength={100} />
          </label>
        </div>
        <p className="field-label">Bạn đồng hành của em</p>
        <div className="avatar-grid">
          {characters.map((name, i) => (
            <button
              key={name}
              type="button"
              aria-pressed={character === i}
              className={character === i ? "chosen" : ""}
              onClick={() => setCharacter(i)}
            >
              <Character index={i} />
              <span>{name}</span>
            </button>
          ))}
        </div>
        <label className="field">
          Mục tiêu mỗi ngày
          <select name="dailyGoal" defaultValue={user.dailyGoal}>
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n} buổi học
              </option>
            ))}
          </select>
        </label>
        <p className="micro">
          Khối lớp được giữ theo đăng ký để bảng thi đua công bằng.
        </p>
        <button className="button full" disabled={busy}>
          {busy ? "Đang lưu…" : "Lưu thông tin"}
        </button>
      </form>
      <button
        className="text-button account-logout"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await logout();
            onClose();
          } catch (e) {
            notify((e as Error).message);
            setBusy(false);
          }
        }}
      >
        Đăng xuất tài khoản
      </button>
    </Modal>
  );
}
