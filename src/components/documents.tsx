"use client";

import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  FileText,
  Upload,
  X,
  RefreshCw,
  CheckCircle2,
  BookOpen,
  LoaderCircle,
} from "lucide-react";
import {
  MAX_BYTES,
  MAX_PAGES,
  statusNames,
  subjects,
  type PublicDocument,
  type Subject,
} from "@/lib/documents";
import { ButtonLink, Character, PageTitle } from "./ui";

import { LearningPanel } from "./learning";

type Config = {
  configured: boolean;
  storage: "local" | "blob";
  storageConfigured: boolean;
  model: string;
};
async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/documents${path}`, {
    ...options,
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      data?.error || "Chưa kết nối được máy chủ. Hãy thử lại nhé.",
    );
  return data as T;
}
function useConfig() {
  const [config, setConfig] = useState<Config | null>(null);
  useEffect(() => {
    let active = true;
    api<Config>("/config")
      .then((c) => {
        if (active) setConfig(c);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return config;
}
function ConfigNotice({ config }: { config: Config | null }) {
  if (!config) return null;
  return (
    <>
      {!config.configured && (
        <div className="notice">
          AI đang chờ cấu hình. Em vẫn có thể gửi tài liệu; nội dung sẽ được
          nhận diện sau khi người lớn kết nối OpenRouter.
        </div>
      )}
      {!config.storageConfigured && (
        <div className="notice" role="status">
          Kho tài liệu đang chờ kết nối. Người lớn cần hoàn tất cấu hình trước
          khi gửi tài liệu.
        </div>
      )}
    </>
  );
}
export function SubjectPage({ subject }: { subject: Subject }) {
  const info = subjects[subject];
  return (
    <>
      <PageTitle
        eyebrow="KHÁM PHÁ MỖI NGÀY · LỚP 2"
        title={`${info.icon} ${subject === "self" ? "Góc tự học của em" : `Vui học ${info.name}`}`}
      >
        {info.description}
      </PageTitle>
      <section className="card document-hero">
        <div>
          <span className="eyebrow">BẮT ĐẦU TỪ BÀI CỦA EM</span>
          <h2>Mang một bài học đến đây nhé!</h2>
          <p>
            Gửi PDF hoặc ảnh chụp. Mình sẽ đọc tài liệu, tìm câu hỏi và sắp xếp
            các dạng bài để em chọn học.
          </p>
          <div className="actions">
            <ButtonLink href={`/tai-len/${subject}`}>
              <Upload size={19} /> Gửi tài liệu
            </ButtonLink>
            {subject === "math" && (
              <ButtonLink href="/timo" secondary>
                Thử sức TIMO <ArrowRight size={18} />
              </ButtonLink>
            )}
          </div>
        </div>
        <Character
          index={
            subject === "english"
              ? 1
              : subject === "vietnamese"
                ? 3
                : subject === "self"
                  ? 7
                  : 4
          }
        />
      </section>
      <DocumentLibrary subject={subject} />
      {subject === "math" && (
        <p className="sample-note">
          Muốn xem trước cách làm bài, gợi ý và chấm điểm?{" "}
          <Link href="/ban-mau">Mở khu trải nghiệm bằng dữ liệu mẫu →</Link>
        </p>
      )}
    </>
  );
}
export function DocumentLibrary({ subject }: { subject?: Subject }) {
  const [documents, setDocuments] = useState<PublicDocument[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const data = await api<{ documents: PublicDocument[] }>("");
        if (active) {
          setDocuments(data.documents);
          setError("");
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    }
    void refresh();
    const timer = setInterval(refresh, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [version]);
  const visible = documents.filter((d) => !subject || d.subject === subject);
  return (
    <section className="section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">TÀI LIỆU CỦA EM</span>
          <h2>
            {subject
              ? `Bài ${subjects[subject].name} đã gửi`
              : "Thư viện của em"}
          </h2>
          <p>Tài liệu được giữ trên máy chủ và gắn với trình duyệt này.</p>
        </div>
        <button
          className="icon-button"
          aria-label="Làm mới thư viện"
          onClick={() => setVersion((v) => v + 1)}
        >
          <RefreshCw size={20} />
        </button>
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Đang mở thư viện…</p>
      ) : !visible.length ? (
        <div className="card empty-state">
          <BookOpen size={36} />
          <h3>Một trang mới đang chờ em</h3>
          <p>Gửi tài liệu đầu tiên để bắt đầu nhé.</p>
          <ButtonLink href={`/tai-len/${subject || "math"}`}>
            Chọn PDF hoặc ảnh <ArrowRight size={18} />
          </ButtonLink>
        </div>
      ) : (
        <div className="document-grid">
          {visible.map((d) => (
            <Link
              className="card document-card"
              key={d.id}
              href={`/tai-lieu/${d.id}`}
            >
              <span className={`badge status-${d.status}`}>
                {statusNames[d.status]}
              </span>
              <h3>{d.title}</h3>
              <p>
                {subjects[d.subject].icon} {subjects[d.subject].name}
                {d.mode === "timo" ? " · TIMO" : ""}
              </p>
              <small>
                {d.files.length === 1
                  ? d.files[0].name
                  : `${d.files.length} ảnh`}{" "}
                · {new Date(d.createdAt).toLocaleDateString("vi-VN")}
              </small>
              <div className="world-bottom">
                {d.questions.length
                  ? `${d.questions.length} câu đã nhận diện`
                  : "Xem tài liệu"}
                <ArrowRight size={18} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
function mimeFor(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return (
    (
      {
        pdf: "application/pdf",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
      } as Record<string, string>
    )[extension || ""] || file.type
  );
}
async function uploadFile(
  storage: PublicDocument["storage"],
  id: string,
  index: number,
  file: File,
  onProgress: (n: number) => void,
) {
  if (storage === "blob") {
    const endpoint = `/${id}/files/${index}`;
    try {
      await upload(`documents/${id}/source-${index}`, file, {
        access: "private",
        handleUploadUrl: `/api/documents${endpoint}/token`,
        contentType: mimeFor(file),
        multipart: true,
        onUploadProgress: ({ loaded }) => onProgress(loaded),
      });
    } catch (error) {
      // Recover an upload that finished in Blob but lost its browser acknowledgement.
      try {
        await api(`${endpoint}/complete`, { method: "POST" });
        return;
      } catch {
        throw error;
      }
    }
    await api(`${endpoint}/complete`, { method: "POST" });
    return;
  }
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `/api/documents/${id}/files/${index}`);
    xhr.timeout = 300000;
    xhr.setRequestHeader("Content-Type", mimeFor(file));
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else {
        let message = "Tải tệp chưa thành công. Hãy thử lại.";
        try {
          message = JSON.parse(xhr.responseText).error || message;
        } catch {}
        reject(new Error(message));
      }
    };
    xhr.onerror = () =>
      reject(new Error("Kết nối bị ngắt khi tải tệp. Hãy thử lại."));
    xhr.ontimeout = () =>
      reject(new Error("Tải tệp quá 5 phút. Hãy kiểm tra kết nối và thử lại."));
    xhr.send(file);
  });
}
export function UploadPage({
  subject: initialSubject = "math",
  mode = "weekly",
}: {
  subject?: Subject;
  mode?: "weekly" | "timo";
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const config = useConfig();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [subject, setSubject] = useState<Subject>(initialSubject);
  const [title, setTitle] = useState("");
  const [count, setCount] = useState(25);
  const [range, setRange] = useState("");
  const [pages, setPages] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const draftId = useRef<string | null>(null);
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);
  function changed() {
    draftId.current = null;
    setError("");
  }
  function accept(incoming: File[]) {
    if (busy || !incoming.length) return;
    if (
      incoming.some(
        (f) =>
          ![
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
          ].includes(mimeFor(f)),
      )
    ) {
      setError(
        "Mình nhận PDF, JPG, PNG và WebP. Ảnh HEIC trên iPhone cần xuất sang JPG trước nhé.",
      );
      return;
    }
    const merged = [...files, ...incoming];
    if (
      merged.some((f) => !f.size) ||
      merged.reduce((s, f) => s + f.size, 0) > MAX_BYTES
    ) {
      setError("Tệp phải có nội dung; tổng dung lượng tối đa 100 MB.");
      return;
    }
    if (
      merged.some((f) => mimeFor(f) === "application/pdf") &&
      merged.length > 1
    ) {
      setError("Chọn một PDF hoặc nhiều ảnh cho mỗi buổi học nhé.");
      return;
    }
    if (merged.length > MAX_PAGES) {
      setError(`Mỗi lượt tối đa ${MAX_PAGES} ảnh.`);
      return;
    }
    setFiles(merged);
    if (!title) setTitle(incoming[0].name.replace(/\.[^.]+$/, ""));
    changed();
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!files.length) {
      setError("Chọn PDF hoặc ảnh chụp trước nhé.");
      return;
    }
    if (
      range &&
      !/^\d+(?:\s*-\s*\d+)?(?:\s*,\s*\d+(?:\s*-\s*\d+)?)*$/.test(pages.trim())
    ) {
      setError("Nhập trang theo dạng 1-3, 5 nhé.");
      return;
    }
    setBusy(true);
    setError("");
    setProgress(0);
    try {
      setStatus("Chuẩn bị tải tài liệu…");
      let job = draftId.current
        ? await api<PublicDocument>(`/${draftId.current}`)
        : await api<PublicDocument>("", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: title.trim() || "Buổi học của em",
              subject,
              mode,
              practiceCount: count,
              pageRange: range ? pages : "",
              files: files.map((f) => ({
                name: f.name,
                size: f.size,
                mime: mimeFor(f),
              })),
            }),
          });
      draftId.current = job.id;
      if (job.status !== "uploading") {
        router.push(`/tai-lieu/${job.id}`);
        return;
      }
      const total = files.reduce((n, f) => n + f.size, 0);
      let done = 0;
      for (let i = 0; i < files.length; i++) {
        setStatus(`Đang tải ${files[i].name} (${i + 1}/${files.length})…`);
        const before = done;
        if (!job.files[i].uploaded)
          await uploadFile(job.storage, job.id, i, files[i], (n) =>
            setProgress(Math.round(((before + n) / total) * 100)),
          );
        done += files[i].size;
        setProgress(Math.round((done / total) * 100));
      }
      setStatus("Đã tải xong. Đưa vào hàng chờ nhận diện…");
      job = await api<PublicDocument>(`/${job.id}/start`, { method: "POST" });
      router.push(`/tai-lieu/${job.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="back-link" href={subjects[subject].path}>
        <ArrowLeft size={16} /> {subjects[subject].name}
      </Link>
      <PageTitle
        eyebrow={
          mode === "timo" ? "CHINH PHỤC TIMO · LỚP 2" : "TỪ TÀI LIỆU CỦA EM"
        }
        title={mode === "timo" ? "Gửi đề, mở thử thách" : "Gửi bài tập của em"}
      >
        Mình cùng đọc tài liệu và khám phá các dạng bài nhé!
      </PageTitle>
      <ConfigNotice config={config} />
      <div className="stepper">
        <span className="current">
          <b>1</b> Gửi tài liệu
        </span>
        <i />
        <span>
          <b>2</b> Nhận diện
        </span>
        <i />
        <span>
          <b>3</b> Chọn bài học
        </span>
      </div>
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="upload-layout upload-fieldset">
          <div className="upload-main">
            <section className="card upload-card">
              <h2>
                <span className="number-label">1</span> Tài liệu của em
              </h2>
              <div
                className={`dropzone ${dragging ? "dragging" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  accept(Array.from(e.dataTransfer.files));
                }}
              >
                <span className="upload-illustration">
                  <Upload size={32} />
                </span>
                <h3>Kéo tài liệu vào đây</h3>
                <p>hoặc chọn file từ thiết bị của em</p>
                <input
                  ref={input}
                  className="sr-only"
                  aria-label="Chọn tài liệu học tập"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  multiple
                  onChange={(e) => {
                    accept(Array.from(e.target.files || []));
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  className="button"
                  onClick={() => input.current?.click()}
                >
                  <Upload size={18} /> Chọn PDF hoặc ảnh
                </button>
                <small>
                  PDF, JPG, PNG, WebP · Tối đa 100 MB / {MAX_PAGES} trang
                </small>
              </div>
              {!!files.length && (
                <div className="file-list">
                  {files.map((f, i) => (
                    <div className="file-preview" key={`${f.name}-${i}`}>
                      {mimeFor(f).startsWith("image/") ? (
                        <img src={previews[i]} alt={`Xem trước ${f.name}`} />
                      ) : (
                        <FileText size={30} />
                      )}
                      <div>
                        <strong>
                          {i + 1}. {f.name}
                        </strong>
                        <small>{(f.size / 1024 / 1024).toFixed(2)} MB</small>
                        <a
                          href={previews[i]}
                          target="_blank"
                          rel="noreferrer"
                          className="text-button"
                        >
                          Xem trước ↗
                        </a>
                      </div>
                      {files.length > 1 && (
                        <>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={`Đưa ảnh ${i + 1} lên`}
                            disabled={i === 0}
                            onClick={() => {
                              setFiles((fs) => {
                                const n = [...fs];
                                [n[i - 1], n[i]] = [n[i], n[i - 1]];
                                return n;
                              });
                              changed();
                            }}
                          >
                            <ArrowUp size={17} />
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={`Đưa ảnh ${i + 1} xuống`}
                            disabled={i === files.length - 1}
                            onClick={() => {
                              setFiles((fs) => {
                                const n = [...fs];
                                [n[i + 1], n[i]] = [n[i], n[i + 1]];
                                return n;
                              });
                              changed();
                            }}
                          >
                            <ArrowDown size={17} />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Bỏ ${f.name}`}
                        onClick={() => {
                          setFiles((fs) => fs.filter((_, n) => n !== i));
                          changed();
                        }}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="micro">
                Một PDF hoặc nhiều ảnh theo thứ tự trang. Với ảnh chụp, số trang
                là vị trí ảnh trong danh sách. Hãy chụp đủ đề và hình minh họa.
              </p>
            </section>
            <section className="card upload-card document-form">
              <h2>
                <span className="number-label">2</span> Buổi học của em
              </h2>
              <label>
                Tên buổi học
                <input
                  value={title}
                  maxLength={160}
                  placeholder="Ví dụ: Toán tuần 5"
                  onChange={(e) => {
                    setTitle(e.target.value);
                    changed();
                  }}
                />
              </label>
              <label>
                Môn học
                <select
                  value={subject}
                  disabled={busy || mode === "timo"}
                  onChange={(e) => {
                    setSubject(e.target.value as Subject);
                    changed();
                  }}
                >
                  {Object.entries(subjects).map(([key, s]) => (
                    <option key={key} value={key}>
                      {s.icon} {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Phần muốn đọc
                <select
                  value={range}
                  onChange={(e) => {
                    setRange(e.target.value);
                    changed();
                  }}
                >
                  <option value="">Tất cả các trang</option>
                  <option value="pages">Chọn một số trang</option>
                </select>
              </label>
              {range && (
                <label>
                  Số trang
                  <input
                    value={pages}
                    placeholder="Ví dụ: 1-3, 5"
                    onChange={(e) => {
                      setPages(e.target.value);
                      changed();
                    }}
                  />
                </label>
              )}
              <label>
                Số câu luyện tập mong muốn
                <select
                  value={count}
                  onChange={(e) => {
                    setCount(Number(e.target.value));
                    changed();
                  }}
                >
                  {[5, 10, 15, 20, 25, 30, 40, 50].map((n) => (
                    <option key={n} value={n}>
                      {n} câu
                    </option>
                  ))}
                </select>
                <small>
                  Lưu lựa chọn cho bộ luyện. Nhận diện giữ nguyên số câu có
                  trong tài liệu.
                </small>
              </label>
            </section>
          </div>
          <aside className="card upload-summary">
            <span className="eyebrow">SẴN SÀNG KHÁM PHÁ</span>
            <h2>Mình sẽ đọc những gì?</h2>
            <ul className="document-benefits">
              <li>Đọc chữ, câu hỏi và các lựa chọn</li>
              <li>Nhận diện dạng bài, chủ đề</li>
              <li>Giữ trang gốc để đối chiếu</li>
              <li>Đánh dấu phần cần kiểm tra</li>
            </ul>
            <p>Em có thể chọn bất kỳ chủ đề nào sau khi nhận diện xong.</p>
            <p className="micro">
              Tài liệu được gửi đến OpenRouter để phân tích. Tránh chụp kèm
              thông tin cá nhân không cần thiết.
            </p>
            <button className="button full" type="submit">
              <Upload size={18} /> Gửi và nhận diện
            </button>
            <p className="micro">
              Nhận diện xong, em có thể tạo lời giải và bộ luyện từ tài liệu.
            </p>
          </aside>
        </fieldset>
        {busy && (
          <div className="card upload-progress" role="status">
            <LoaderCircle className="spin" size={20} />
            <span>{status}</span>
            <progress max={100} value={progress} />
            <b>{progress}%</b>
            <small>
              Giữ trang này mở đến khi tải xong. Sau đó, nhận diện tiếp tục chạy
              nền.
            </small>
          </div>
        )}
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
      </form>
    </>
  );
}

export function DocumentPage({ id }: { id: string }) {
  const [document, setDocument] = useState<PublicDocument | null>(null);
  const [error, setError] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answersReady, setAnswersReady] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const config = useConfig();
  useEffect(() => {
    setAnswersReady(false);
    setAnswers({});
    try {
      const raw = localStorage.getItem(`vuihoc-responses-${id}`);
      const value = raw ? JSON.parse(raw) : {};
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.values(value).every((v) => typeof v === "string")
      )
        setAnswers(value);
    } catch {
      setSaveError(true);
    }
    setAnswersReady(true);
  }, [id]);
  useEffect(() => {
    if (answersReady)
      try {
        localStorage.setItem(`vuihoc-responses-${id}`, JSON.stringify(answers));
      } catch {
        setSaveError(true);
      }
  }, [answers, answersReady, id]);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const data = await api<PublicDocument>(`/${id}`);
        if (!active) return;
        setDocument(data);
        setError("");
        if (["queued", "preparing", "analyzing"].includes(data.status))
          timer = setTimeout(refresh, 2500);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    }
    void refresh();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id, version]);
  async function retry(action = "retry") {
    setBusy(true);
    setError("");
    try {
      await api(`/${id}/${action}`, { method: "POST" });
      setVersion((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function sourceUrl(page: number) {
    const pdf = document?.files[0].mime === "application/pdf";
    return `/api/documents/${id}/files/${pdf ? 0 : page - 1}${pdf ? `#page=${page}` : ""}`;
  }
  if (!document)
    return (
      <>
        <Link href="/thu-vien" className="back-link">
          <ArrowLeft size={16} /> Thư viện
        </Link>
        {error ? (
          <div className="notice error" role="alert">
            {error}
            <button
              className="text-button"
              onClick={() => setVersion((v) => v + 1)}
            >
              Thử lại
            </button>
          </div>
        ) : (
          <p role="status">Đang mở tài liệu của em…</p>
        )}
      </>
    );
  const doc = document;
  const topics = [
    ...new Set([
      ...doc.questions.map((q) => q.topic),
      ...doc.pages.flatMap((p) => p.topics),
    ]),
  ];
  const questions = doc.questions.filter((q) => !topic || q.topic === topic);
  const pending = ["queued", "preparing", "analyzing"].includes(doc.status);
  const retryable = ["waiting_config", "partial", "failed"].includes(
    doc.status,
  );
  return (
    <>
      <Link className="back-link" href={subjects[doc.subject].path}>
        <ArrowLeft size={16} /> {subjects[doc.subject].name}
      </Link>
      <PageTitle
        eyebrow={`${subjects[doc.subject].name.toUpperCase()} · LỚP 2${doc.mode === "timo" ? " · TIMO" : ""}`}
        title={doc.title}
      >
        Từ tài liệu của em, học theo nhịp của em.
      </PageTitle>
      <ConfigNotice config={config} />
      <section className="card analysis-status" aria-live="polite">
        <div>
          {pending ? (
            <LoaderCircle className="spin" size={26} />
          ) : (
            <FileText size={26} />
          )}
          <div>
            <span className={`badge status-${doc.status}`}>
              {statusNames[doc.status]}
            </span>
            <h2>{doc.message}</h2>
          </div>
        </div>
        {doc.selectedPages.length > 0 && (
          <>
            <progress
              max={doc.selectedPages.length}
              value={doc.completedPages.length}
            />
            <p>
              {doc.completedPages.length}/{doc.selectedPages.length} trang đã
              nhận diện · {doc.questions.length} câu hỏi · {topics.length} chủ
              đề
            </p>
          </>
        )}
        {pending && (
          <p className="micro">
            Em có thể rời trang này và quay lại từ thư viện. Tài liệu vẫn được
            xử lý khi máy chủ đang chạy.
          </p>
        )}
        <div className="actions">
          {retryable && (
            <button className="button" disabled={busy} onClick={() => retry()}>
              <RefreshCw size={18} />{" "}
              {doc.status === "waiting_config"
                ? "Thử lại sau khi cấu hình"
                : "Thử lại phần chưa xong"}
            </button>
          )}
          {doc.status === "uploading" &&
            (doc.files.every((f) => f.uploaded) ? (
              <button
                className="button"
                disabled={busy}
                onClick={() => retry("start")}
              >
                Bắt đầu nhận diện
              </button>
            ) : (
              <ButtonLink href={`/tai-len/${doc.subject}`}>
                Chọn lại tài liệu để tải đủ
              </ButtonLink>
            ))}
          <button
            className="text-button"
            onClick={() => setVersion((v) => v + 1)}
          >
            Cập nhật trạng thái
          </button>
        </div>
      </section>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {!!doc.failures.length && (
        <div className="notice">
          <strong>Phần chưa đọc được</strong>
          {doc.failures.map((f) => (
            <p key={f.pages.join(",")}>
              Trang {f.pages.join(", ")}: {f.message}
            </p>
          ))}
        </div>
      )}
      <details className="card source-details">
        <summary>
          <FileText size={19} /> Tài liệu gốc ·{" "}
          {doc.files.length === 1
            ? doc.files[0].name
            : `${doc.files.length} ảnh`}
        </summary>
        <div className="source-links">
          {doc.files.map(
            (f, i) =>
              f.uploaded && (
                <a
                  key={i}
                  href={`/api/documents/${id}/files/${i}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {i + 1}. {f.name} ↗
                </a>
              ),
          )}
        </div>
        {doc.selectedPages.length > 0 && (
          <p>Trang đã chọn: {doc.selectedPages.join(", ")}</p>
        )}
      </details>
      {doc.pages.length > 0 && <LearningPanel key={doc.id} document={doc} />}
      {doc.pages.length > 0 && (
        <>
          <section className="section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">EM MUỐN HỌC GÌ HÔM NAY?</span>
                <h2>Chọn một chủ đề nhỏ</h2>
                <p>
                  Câu hỏi dưới đây được đọc từ tài liệu em gửi. Em có thể ghi
                  lại câu trả lời để tự học.
                </p>
              </div>
            </div>
            <div className="topic-filters">
              <button
                className={`topic-filter ${!topic ? "selected" : ""}`}
                aria-pressed={!topic}
                onClick={() => setTopic("")}
              >
                Tất cả · {doc.questions.length}
              </button>
              {topics.map((t) => (
                <button
                  key={t}
                  className={`topic-filter ${topic === t ? "selected" : ""}`}
                  aria-pressed={topic === t}
                  onClick={() => setTopic(t)}
                >
                  {t}{" "}
                  <small>
                    {doc.questions.filter((q) => q.topic === t).length ||
                      "Bài học"}
                  </small>
                </button>
              ))}
            </div>
            <p className="notice">
              Nhận diện AI có thể có sai sót; em hãy đối chiếu trang gốc khi
              cần. Câu trả lời được lưu ở trình duyệt này, chưa chấm điểm. Để
              làm bài có gợi ý và lời giải, hãy mở bộ học ở phía trên.
            </p>
            {saveError && (
              <p className="notice error" role="alert">
                Trình duyệt chưa lưu được câu trả lời. Hãy giữ trang này mở hoặc
                ghi lại bài làm.
              </p>
            )}
            <div className="extracted-questions">
              {questions.map((q, index) => (
                <article className="card extracted-question" key={q.id}>
                  <div className="question-topline">
                    <span className="badge">
                      {q.label || `Câu ${index + 1}`}
                    </span>
                    <span>{q.topic}</span>
                    <div>
                      {q.sourcePages.map((p) => (
                        <a
                          href={sourceUrl(p)}
                          target="_blank"
                          rel="noreferrer"
                          key={p}
                        >
                          Trang {p} ↗
                        </a>
                      ))}
                    </div>
                  </div>
                  {q.needsReview && (
                    <div className="notice">
                      Cần đối chiếu:{" "}
                      {q.issues.join(" ") || "Nội dung chưa đọc rõ."} Em có thể
                      bỏ qua câu này.
                    </div>
                  )}
                  {q.passage && (
                    <blockquote className="source-passage">
                      {q.passage}
                    </blockquote>
                  )}
                  <h3 className="question-text">
                    {q.prompt || "Câu hỏi chưa đọc rõ — hãy mở trang gốc."}
                  </h3>
                  {q.hasFigure && (
                    <div className="figure-notice">
                      <p>
                        🖼 Câu này có hình/bảng:{" "}
                        {q.figureDescription ||
                          "Xem hình trong tài liệu gốc để làm bài."}
                      </p>
                      {doc.files[0].mime.startsWith("image/") &&
                        q.sourcePages.map((p) => (
                          <a
                            key={p}
                            href={sourceUrl(p)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <img
                              src={sourceUrl(p)}
                              alt={`Trang ${p} chứa hình minh họa của câu hỏi`}
                              loading="lazy"
                            />
                          </a>
                        ))}
                      <a
                        href={sourceUrl(q.sourcePages[0])}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Mở trang gốc có hình ↗
                      </a>
                    </div>
                  )}
                  {q.options.length > 0 && (
                    <div className="extracted-options">
                      {q.options.map((o, i) => (
                        <div key={i}>
                          <b>{o.label}</b>
                          <span>{o.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {q.skill && <p className="micro">Cùng luyện: {q.skill}</p>}
                  <label className="answer-label">
                    Câu trả lời của em
                    <textarea
                      rows={2}
                      maxLength={4000}
                      disabled={!answersReady}
                      value={answers[q.id] || ""}
                      placeholder="Em ghi câu trả lời hoặc cách làm ở đây…"
                      onChange={(e) =>
                        setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                      }
                    />
                  </label>
                  <small>
                    {answers[q.id]
                      ? "✎ Đã ghi câu trả lời · Chưa chấm điểm"
                      : "Em có thể làm bài trên giấy rồi ghi lại kết quả."}
                  </small>
                </article>
              ))}
            </div>
            {!questions.length && (
              <div className="card empty-state">
                <h3>
                  {doc.questions.length
                    ? "Chủ đề này là nội dung bài học"
                    : "Tài liệu này chưa có câu hỏi nhận diện được"}
                </h3>
                <p>
                  Em có thể đọc nội dung theo trang ở bên dưới. Hệ thống không
                  tự thêm câu hỏi vào đề gốc.
                </p>
              </div>
            )}
          </section>
          <section className="section">
            <h2>Nội dung đã đọc theo trang</h2>
            {doc.pages
              .filter(
                (p) =>
                  !topic ||
                  p.topics.includes(topic) ||
                  doc.questions.some(
                    (q) => q.topic === topic && q.sourcePages.includes(p.page),
                  ),
              )
              .map((p) => (
                <details className="card source-details" key={p.page}>
                  <summary>
                    Trang {p.page} {p.issues.length ? "· Cần kiểm tra" : ""}
                  </summary>
                  {p.issues.length > 0 && (
                    <p className="notice">{p.issues.join(" ")}</p>
                  )}
                  <p className="source-text">
                    {p.text || "Trang này không có chữ đọc được."}
                  </p>
                  <a href={sourceUrl(p.page)} target="_blank" rel="noreferrer">
                    Đối chiếu trang gốc ↗
                  </a>
                </details>
              ))}
          </section>
        </>
      )}
      <div className="actions">
        <ButtonLink href={`/tai-len/${doc.subject}`} secondary>
          Gửi tài liệu khác <Upload size={18} />
        </ButtonLink>
        <ButtonLink href="/thu-vien" secondary>
          Về thư viện <BookOpen size={18} />
        </ButtonLink>
      </div>
    </>
  );
}
