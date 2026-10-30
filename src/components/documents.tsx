"use client";

import { useEffect, useId, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Glyph,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  FileText,
  ChevronDown,
  Info,
  Search,
  Upload,
  X,
  RefreshCw,
  CheckCircle2,
  BookOpen,
  LoaderCircle,
} from "./icons";
import {
  MAX_BYTES,
  MAX_PAGES,
  statusNames,
  subjects,
  type PublicDocument,
  type Subject,
} from "@/lib/documents";
import { ButtonLink, Character, Modal, PageTitle } from "./ui";

import { LearningPanel } from "./learning";
import {
  useQuickPractice,
  QuickPracticeDialog,
  QuickPracticeProgress,
} from "./quick-practice";
import { LibraryStatusFilter } from "./library-status-filter";

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
    <div className={`subject-hub subject-${subject}`}>
      <header className="subject-heading">
        <div>
          <PageTitle
            eyebrow="CÙNG EM KHÁM PHÁ · LỚP 2"
            title={
              <>
                <Glyph token={info.icon} size={38} />{" "}
                {subject === "self" ? "Góc tự học" : info.name}
              </>
            }
          >
            <span>{info.description}</span>
          </PageTitle>
        </div>
        <div className="subject-heading-actions">
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
          <ButtonLink href={`/tai-len/${subject}`}>
            <Upload size={18} /> Gửi bài mới
          </ButtonLink>
        </div>
      </header>
      <DocumentLibrary subject={subject} />
    </div>
  );
}

export function DocumentLibrary({ subject }: { subject?: Subject }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [infoOpen, setInfoOpen] = useState(false);
  const [documents, setDocuments] = useState<PublicDocument[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState("");
  const tooltipId = useId();
  useEffect(() => {
    let active = true;
    let fetching = false;
    async function refresh(manual = false) {
      if (fetching) return;
      fetching = true;
      try {
        const data = await api<{ documents: PublicDocument[] }>("");
        if (active) {
          setDocuments(data.documents);
          setError("");
          if (manual) setRefreshMessage("Thư viện đã được cập nhật.");
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        fetching = false;
        if (active) {
          setLoading(false);
          if (manual) setRefreshing(false);
        }
      }
    }
    void refresh(version > 0);
    const timer = setInterval(() => void refresh(), 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [version]);
  const matchingSubject = documents.filter(
    (d) => !subject || d.subject === subject,
  );
  const visible = matchingSubject.filter(
    (d) =>
      `${d.title} ${d.files.map((f) => f.name).join(" ")}`
        .toLocaleLowerCase("vi")
        .includes(query.trim().toLocaleLowerCase("vi")) &&
      (filter === "all" ||
        (filter === "ready"
          ? d.status === "complete"
          : filter === "working"
            ? ["uploading", "queued", "preparing", "analyzing"].includes(
                d.status,
              )
            : ["partial", "failed", "waiting_config"].includes(d.status))),
  );
  return (
    <section className="section compact-library">
      <div className="library-heading">
        <h2>
          {subject ? "Bài đã gửi" : "Thư viện"}
          <span>{matchingSubject.length}</span>
        </h2>
        <div>
          {!subject && (
            <Link
              href="/tai-len/math"
              className="button secondary"
              aria-label="Gửi bài mới"
            >
              <Upload size={17} />{" "}
              <span className="library-upload-label">Gửi bài mới</span>
            </Link>
          )}
          <span className="library-tool">
            <button
              type="button"
              className="icon-button"
              aria-label="Hướng dẫn thư viện"
              aria-describedby={`${tooltipId}-help`}
              aria-haspopup="dialog"
              onClick={(event) => {
                event.currentTarget.focus();
                setInfoOpen(true);
              }}
            >
              <Info size={19} />
            </button>
            <span
              id={`${tooltipId}-help`}
              role="tooltip"
              className="library-tooltip"
            >
              Hướng dẫn thư viện
            </span>
          </span>
          <span className="library-tool">
            <button
              type="button"
              className="icon-button"
              aria-label={
                refreshing ? "Đang làm mới thư viện" : "Làm mới thư viện"
              }
              aria-describedby={`${tooltipId}-refresh`}
              disabled={refreshing}
              aria-busy={refreshing}
              onClick={() => {
                setRefreshMessage("");
                setRefreshing(true);
                setVersion((v) => v + 1);
              }}
            >
              {refreshing ? (
                <LoaderCircle size={19} className="spin" />
              ) : (
                <RefreshCw size={19} />
              )}
            </button>
            <span
              id={`${tooltipId}-refresh`}
              role="tooltip"
              className="library-tooltip"
            >
              {refreshing ? "Đang cập nhật…" : "Làm mới thư viện"}
            </span>
          </span>
        </div>
      </div>
      {!!matchingSubject.length && (
        <div className="library-filters">
          <label className="topic-search">
            <Search size={18} />
            <input
              type="search"
              aria-label="Tìm bài đã gửi"
              placeholder="Tìm tên bài hoặc tài liệu…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <LibraryStatusFilter value={filter} onChange={setFilter} />
        </div>
      )}
      {refreshMessage && (
        <p className="library-refresh-message" role="status">
          <CheckCircle2 size={16} />
          {refreshMessage}
        </p>
      )}
      {infoOpen && (
        <Modal title="Hướng dẫn thư viện" onClose={() => setInfoOpen(false)}>
          <p>
            Chọn tài liệu để xem nội dung và bắt đầu học. Em có thể tìm theo tên
            hoặc lọc các bài sẵn sàng, đang xử lý hay cần kiểm tra.
          </p>
          <p>
            Nút “Gửi bài mới” giúp em thêm tài liệu. Nút “Làm mới thư viện” tải
            lại danh sách và trạng thái mới nhất; thư viện cũng tự cập nhật định
            kỳ.
          </p>
          <p>
            Tài liệu trong thư viện được dùng chung. Chỉ người tải lên được quản
            lý tài liệu của mình; bài làm, điểm số và tiến độ học được lưu riêng
            theo tài khoản.
          </p>
        </Modal>
      )}
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
          <h3>
            {matchingSubject.length
              ? "Chưa tìm thấy bài phù hợp"
              : "Bắt đầu với bài của em"}
          </h3>
          <p>
            {matchingSubject.length
              ? "Thử tên khác hoặc đổi bộ lọc nhé."
              : "Chọn PDF hoặc ảnh chụp để tạo bài học."}
          </p>
          {matchingSubject.length ? (
            <button
              className="text-button"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Xóa bộ lọc
            </button>
          ) : (
            <ButtonLink href={`/tai-len/${subject || "math"}`}>
              Gửi bài đầu tiên <ArrowRight size={18} />
            </ButtonLink>
          )}
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
              <h3 title={d.title}>{d.title}</h3>
              <p className="document-card-meta">
                {!subject && `${subjects[d.subject].name} · `}
                {d.mode === "timo" ? "TIMO · " : ""}
                {new Date(d.createdAt).toLocaleDateString("vi-VN")}
                {!d.canManage && " · Dùng chung"}
              </p>
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
  const [helpOpen, setHelpOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [subject, setSubject] = useState<Subject>(initialSubject);
  const [title, setTitle] = useState("");
  const count = 25;
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
    <div className={`compact-upload subject-${subject}`}>
      <Link className="back-link" href={subjects[subject].path}>
        <ArrowLeft size={16} /> {subjects[subject].name}
      </Link>
      <PageTitle
        eyebrow={
          mode === "timo" ? "CHINH PHỤC TIMO · LỚP 2" : "TỪ TÀI LIỆU CỦA EM"
        }
        title={
          mode === "timo"
            ? "Gửi đề TIMO"
            : `Gửi bài · ${subjects[subject].name}`
        }
      />
      <ConfigNotice config={config} />
      <div className="upload-intro">
        <span>Chọn tài liệu, mình chuẩn bị bài học cho em.</span>
        <button
          className="text-button"
          type="button"
          aria-haspopup="dialog"
          onClick={(event) => {
            event.currentTarget.focus();
            setHelpOpen(true);
          }}
        >
          <Info size={16} /> Cách gửi bài
        </button>
      </div>
      {helpOpen && (
        <Modal title="Gửi bài như thế nào?" onClose={() => setHelpOpen(false)}>
          <p>
            Chọn một PDF hoặc nhiều ảnh theo thứ tự trang, chụp đủ đề và hình
            minh họa. Em có thể sắp xếp ảnh trước khi gửi.
          </p>
          <p>
            Mình sẽ đọc chữ, câu hỏi, hình minh họa và chuẩn bị đáp án, lời
            giải, gợi ý. Phần thiếu dữ kiện được đánh dấu để kiểm tra.
          </p>
          <p>
            Tài liệu được gửi đến OpenRouter để phân tích và xuất hiện trong thư
            viện dùng chung của bản demo. Tránh gửi kèm thông tin cá nhân không
            cần thiết.
          </p>
        </Modal>
      )}
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="upload-layout upload-fieldset">
          <div className="upload-main">
            <section className="card upload-card">
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
                <h3>
                  {files.length ? "Thêm tài liệu" : "Chọn tài liệu của em"}
                </h3>
                <p>Kéo thả tệp vào đây hoặc chọn từ thiết bị</p>
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
                      <div className="file-controls">
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
                    </div>
                  ))}
                </div>
              )}
            </section>
            <details className="card upload-card document-form">
              <summary>
                <strong>Thông tin bài học</strong>
                <small>
                  {subjects[subject].name} ·{" "}
                  {range ? `Trang ${pages || "tự chọn"}` : "Tất cả trang"}
                </small>
                <ChevronDown size={17} />
              </summary>
              <div className="upload-options">
                <label>
                  Tên buổi học
                  <input
                    value={title}
                    maxLength={160}
                    placeholder={`Ví dụ: ${subjects[subject].name} tuần 5`}
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
                        {s.name}
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
              </div>
            </details>
          </div>
          <div className="upload-submit">
            <p>Tài liệu sẽ xuất hiện trong thư viện dùng chung.</p>
            <button
              className="button"
              type="submit"
              disabled={!files.length || config?.storageConfigured === false}
            >
              <Upload size={18} /> Gửi bài
            </button>
          </div>
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
    </div>
  );
}

export function DocumentPage({ id }: { id: string }) {
  const quickPractice = useQuickPractice(id);
  const [document, setDocument] = useState<PublicDocument | null>(null);
  const [error, setError] = useState("");
  const [topic, setTopic] = useState("");
  const [popup, setPopup] = useState<
    "topics" | "status" | "source" | "quick-practice" | null
  >(null);
  const [topicSearch, setTopicSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const config = useConfig();
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
  const pending = ["queued", "preparing", "analyzing"].includes(doc.status);
  const retryable =
    ["waiting_config", "failed"].includes(doc.status) ||
    (doc.status === "partial" &&
      doc.completedPages.length < doc.selectedPages.length);
  return (
    <div className="document-study-page">
      <Link className="back-link" href={subjects[doc.subject].path}>
        <ArrowLeft size={16} /> {subjects[doc.subject].name}
      </Link>
      <PageTitle
        eyebrow={`${subjects[doc.subject].name.toUpperCase()} · LỚP 2${doc.mode === "timo" ? " · TIMO" : ""}`}
        title={doc.title}
      />
      <p className="document-summary">
        {doc.questions.length} câu hỏi · {topics.length} chủ đề
        {doc.selectedPages.length > 0
          ? ` · ${doc.selectedPages.length} trang`
          : ""}
      </p>
      <ConfigNotice config={config} />
      <div className="document-tools">
        {doc.pages.length > 0 && (
          <button
            className="button secondary topic-picker"
            onClick={() => {
              setTopicSearch("");
              setPopup("topics");
            }}
            aria-haspopup="dialog"
          >
            <span>{topic || "Tất cả chủ đề"}</span>
            <ChevronDown size={17} />
          </button>
        )}
        <button
          className="document-tool"
          onClick={() => setPopup("source")}
          aria-haspopup="dialog"
        >
          <FileText size={17} /> Tài liệu gốc
        </button>
        {doc.canManage && (
          <button
            className="document-tool"
            onClick={() => setPopup("status")}
            aria-haspopup="dialog"
          >
            {pending ? (
              <LoaderCircle size={17} className="spin" />
            ) : (
              <Info size={17} />
            )}
            {pending ? "Đang xử lý" : retryable ? "Cần kiểm tra" : "Thông tin"}
          </button>
        )}
      </div>
      {(pending || retryable || doc.status === "uploading") && (
        <div className="document-status-inline" role="status">
          <span>{doc.message}</span>
          {doc.canManage && (
            <button className="text-button" onClick={() => setPopup("status")}>
              Xem chi tiết
            </button>
          )}
          {pending && (
            <progress
              max={doc.selectedPages.length || 1}
              value={doc.completedPages.length}
            />
          )}
        </div>
      )}
      <QuickPracticeProgress
        sets={quickPractice.sets}
        busy={quickPractice.busy}
        retry={(retryId) => {
          void quickPractice.send({ retryId });
        }}
      />
      {quickPractice.error && popup !== "quick-practice" && (
        <p className="notice error" role="alert">
          {quickPractice.error}
        </p>
      )}
      {popup === "quick-practice" && (
        <QuickPracticeDialog
          busy={quickPractice.busy}
          error={quickPractice.error}
          onClose={() => setPopup(null)}
          onCreate={quickPractice.send}
        />
      )}
      {popup === "status" && doc.canManage && (
        <Modal title="Tình trạng tài liệu" onClose={() => setPopup(null)}>
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
                  {doc.completedPages.length}/{doc.selectedPages.length} trang
                  đã nhận diện · {doc.questions.length} câu hỏi ·{" "}
                  {topics.length} chủ đề
                </p>
              </>
            )}
            {pending && (
              <p className="micro">
                Em có thể rời trang này và quay lại từ thư viện. Tài liệu vẫn
                được xử lý khi máy chủ đang chạy.
              </p>
            )}
            <div className="actions">
              {doc.canManage && retryable && (
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => retry()}
                >
                  <RefreshCw size={18} />{" "}
                  {doc.status === "waiting_config"
                    ? "Thử lại sau khi cấu hình"
                    : "Thử lại phần chưa xong"}
                </button>
              )}
              {doc.canManage &&
                doc.status === "uploading" &&
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
        </Modal>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {popup === "source" && (
        <Modal title="Tài liệu gốc" onClose={() => setPopup(null)}>
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
        </Modal>
      )}

      {doc.pages.length > 0 && (
        <>
          {popup === "topics" && (
            <Modal title="Chọn chủ đề" onClose={() => setPopup(null)}>
              <label className="topic-search">
                <Search size={18} />
                <input
                  autoFocus
                  type="search"
                  placeholder="Tìm chủ đề…"
                  aria-label="Tìm chủ đề"
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                />
              </label>
              <div className="topic-filters">
                <button
                  className={`topic-filter ${!topic ? "selected" : ""}`}
                  aria-pressed={!topic}
                  onClick={() => {
                    setTopic("");
                    setPopup(null);
                  }}
                >
                  Tất cả · {doc.questions.length}
                </button>
                {topics
                  .filter((t) =>
                    t
                      .toLocaleLowerCase("vi")
                      .includes(topicSearch.toLocaleLowerCase("vi")),
                  )
                  .map((t) => (
                    <button
                      key={t}
                      className={`topic-filter ${topic === t ? "selected" : ""}`}
                      aria-pressed={topic === t}
                      onClick={() => {
                        setTopic(t);
                        setPopup(null);
                      }}
                    >
                      {t}{" "}
                      <small>
                        {doc.questions.filter((q) => q.topic === t).length ||
                          "Bài học"}
                      </small>
                    </button>
                  ))}
              </div>
              {topics.every(
                (t) =>
                  !t
                    .toLocaleLowerCase("vi")
                    .includes(topicSearch.toLocaleLowerCase("vi")),
              ) && <p role="status">Chưa tìm thấy chủ đề phù hợp.</p>}
            </Modal>
          )}
          <LearningPanel key={doc.id} document={doc} topic={topic} />
        </>
      )}
      <div className="document-bottom-links">
        {!doc.revision && (
          <button
            type="button"
            className="quick-practice-trigger"
            aria-haspopup="dialog"
            onClick={() => setPopup("quick-practice")}
          >
            <Glyph token="practice" size={16} /> Tạo đề luyện
          </button>
        )}
        <Link href="/thu-vien">
          <BookOpen size={16} /> Thư viện
        </Link>
        <Link href={`/tai-len/${doc.subject}`}>
          <Upload size={16} /> Gửi tài liệu khác
        </Link>
      </div>
    </div>
  );
}
