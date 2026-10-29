"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Sprout,
  Search,
  Flag,
  Check,
  Gift,
  History,
  LoaderCircle,
  Sparkles,
  Star,
  X,
} from "./icons";
import {
  rewardItems,
  rewardMaps,
  type RewardAction,
  type RewardMapId,
  type RewardItem,
  type RewardView,
} from "@/lib/rewards";
import { RewardLayoutProvider } from "./reward-layout-editor";
import type { RewardPosition } from "@/lib/reward-layout";
import {
  rewardBackground,
  rewardSticker,
  rewardStories,
  rewardStoryStage,
} from "@/lib/reward-stories";
import { RewardMapScene } from "./reward-maps";
import { ButtonLink, Modal } from "./ui";

async function requestRewards(
  body?: RewardAction,
  runId?: string,
): Promise<RewardView> {
  const response = await fetch(
    `/api/documents/rewards${runId ? `?runId=${encodeURIComponent(runId)}` : ""}`,
    {
      cache: "no-store",
      ...(body
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    },
  );
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error || "Chưa tải được góc học tập. Con thử lại nhé.",
    );
  return data;
}

export function RewardsPage() {
  const [view, setView] = useState<RewardView | null>(null);
  const [tab, setTab] = useState<"shop" | "owned">("shop");
  const [selected, setSelected] = useState<RewardItem | null>(null);
  const [history, setHistory] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const savingLayout = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const room = useRef<HTMLDivElement>(null);
  async function load() {
    setError("");
    try {
      setView(await requestRewards());
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function act(action: "buy" | "place" | "store", item: RewardItem) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setView(await requestRewards({ action, itemId: item.id }));
      setSelected(null);
      setNotice(
        action === "store"
          ? `Đã cất ${item.name.toLowerCase()}. Con có thể đặt lại bất cứ lúc nào.`
          : `${item.name} đã được đặt vào bản đồ. ${rewardStories[item.map].thanks}`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function switchMap(mapId: RewardMapId) {
    if (busy || view?.activeMap === mapId) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next = await requestRewards({ action: "map", mapId });
      setView(next);
      setSelected(null);
      setEditing(false);
      setNotice(
        `Đã mở ${rewardMaps.find((map) => map.id === mapId)!.name.toLowerCase()}. Đồ trang trí ở các bản đồ khác vẫn được giữ nguyên.`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveLayout(itemId: string, position: RewardPosition) {
    if (savingLayout.current) throw new Error("Đang lưu vị trí");
    savingLayout.current = true;
    setBusy(true);
    setError("");
    try {
      setView(await requestRewards({ action: "move", itemId, position }));
      setNotice("Đã lưu vị trí mới. Con có thể tiếp tục sắp xếp!");
    } catch (error) {
      setError(
        "Chưa lưu được vị trí mới. Vật phẩm đã trở về chỗ cũ; con thử kéo lại nhé.",
      );
      throw error;
    } finally {
      savingLayout.current = false;
      setBusy(false);
    }
  }
  async function resetLayout() {
    if (busy || dragging || !view) return;
    setBusy(true);
    setError("");
    try {
      setView(
        await requestRewards({ action: "reset_layout", mapId: view.activeMap }),
      );
      setNotice("Đã đưa vật phẩm trên bản đồ này về vị trí ban đầu.");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function preview(item: RewardItem) {
    setEditing(false);
    setSelected(item);
    setNotice("");
    room.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  }
  const activeMap =
    rewardMaps.find((map) => map.id === view?.activeMap) ?? rewardMaps[0];
  const mapItems = rewardItems.filter((item) => item.map === activeMap.id);
  const mapOwned = mapItems.filter((item) => view?.owned.includes(item.id));
  const mapPlaced = mapItems.filter((item) => view?.placed.includes(item.id));
  const story = rewardStories[activeMap.id];
  const guide = rewardItems.find((item) => item.id === story.guideItem)!;
  const storyStage = rewardStoryStage(mapOwned.length);
  const owned = selected && view?.owned.includes(selected.id);
  const placed = selected && view?.placed.includes(selected.id);
  const enough = selected && view && view.balance >= selected.price;
  return (
    <div className="rewards-page">
      <header className={`rewards-heading story-hero theme-${activeMap.id}`}>
        <div>
          <span className="eyebrow">SỔ PHIÊU LƯU CỦA CON</span>
          <h1>
            Học điều mới.
            <br />
            <span>Vẽ thế giới riêng.</span>
          </h1>
          <p>
            Mỗi ngôi sao là một điều con đã học được.
            <br />
            Mang sao về, chọn một người bạn, kể tiếp câu chuyện của mình.
          </p>
        </div>
        <img
          className="story-hero-guide"
          src={rewardSticker(guide)}
          alt=""
          width="180"
          height="180"
        />
        <button
          className="reward-wallet"
          onClick={() => setHistory(true)}
          disabled={!view}
          aria-label={
            view
              ? `${view.balance} sao. Xem lịch sử nhận sao`
              : "Đang tải số sao"
          }
        >
          <Star fill="currentColor" size={24} />
          <strong>{view?.balance ?? "—"}</strong>
          <span>ngôi sao của con</span>
          <History size={17} />
        </button>
      </header>
      {error && (
        <div className="notice reward-error" role="alert">
          {error}{" "}
          {!view && (
            <button className="text-button" onClick={load}>
              Thử lại
            </button>
          )}
        </div>
      )}
      {!view ? (
        <div className="card reward-loading" role="status">
          <LoaderCircle size={24} /> Đang mở góc nhỏ của con…
        </div>
      ) : (
        <>
          <section className="reward-map-picker" aria-label="Chọn bản đồ">
            <div className="reward-map-picker-heading">
              <div>
                <span className="eyebrow">ĐIỂM ĐẾN CỦA TRÍ TƯỞNG TƯỢNG</span>
                <h2>Năm cánh cửa, năm câu chuyện</h2>
              </div>
              <p>Con có thể ghé thăm bất cứ nơi nào.</p>
            </div>
            <div className="reward-map-options">
              {rewardMaps.map((map) => (
                <button
                  key={map.id}
                  disabled={busy || dragging}
                  aria-pressed={map.id === activeMap.id}
                  onClick={() => switchMap(map.id)}
                  className={`reward-map-option map-${map.id}`}
                >
                  <span className="story-map-cover">
                    <img
                      src={rewardBackground(map.id)}
                      alt=""
                      width="240"
                      height="160"
                      loading="lazy"
                    />
                    <span className="story-map-chapter">
                      CHƯƠNG {rewardStories[map.id].chapter}
                    </span>
                  </span>
                  <span>
                    <strong>{rewardStories[map.id].shortTitle}</strong>
                    <small>{rewardStories[map.id].title}</small>
                    <span className="reward-map-count">
                      {
                        rewardItems.filter(
                          (item) =>
                            item.map === map.id && view.owned.includes(item.id),
                        ).length
                      }
                      /8 vật phẩm
                    </span>
                  </span>
                  {map.id === activeMap.id && (
                    <Check size={16} className="reward-map-check" />
                  )}
                </button>
              ))}
            </div>
          </section>
          <section
            className={`story-letter theme-${activeMap.id}`}
            aria-label="Lời mời vào câu chuyện"
          >
            <div className="story-guide-portrait">
              <img
                src={rewardSticker(guide)}
                alt={story.guide}
                width="120"
                height="130"
              />
            </div>
            <div className="story-letter-copy">
              <span className="eyebrow">
                LÁ THƯ TỪ {story.guide.toLocaleUpperCase("vi-VN")}
              </span>
              <h2>{story.title}</h2>
              <p>{story.invitation}</p>
              <button
                className="text-button"
                onClick={() => setStoryOpen(true)}
              >
                Đọc câu chuyện <ArrowRight size={16} />
              </button>
            </div>
            <div className="story-mission">
              <span>CHÚNG MÌNH CÙNG…</span>
              <strong>{story.mission}</strong>
              <p>Không cần vội. Câu chuyện luôn chờ con.</p>
            </div>
          </section>
          <RewardLayoutProvider
            value={{
              editing,
              disabled: busy || dragging,
              positions: view.positions,
              onSave: saveLayout,
              onDrag: setDragging,
            }}
          >
            <div className="rewards-layout">
              <div className="reward-room-column" ref={room}>
                <section
                  className="reward-room-card"
                  aria-label={activeMap.name}
                >
                  <div className="reward-room-label">
                    <span>
                      <span className="status-dot" /> {story.shortTitle}
                    </span>
                    <small role="status">
                      {busy
                        ? "Đang lưu…"
                        : editing
                          ? "Đang sắp xếp"
                          : selected
                            ? "Đang xem thử"
                            : "Tự động lưu"}
                    </small>
                  </div>
                  <div className="reward-editor-toolbar">
                    <button
                      className="reward-edit-toggle"
                      disabled={busy || dragging || !mapPlaced.length}
                      aria-pressed={editing}
                      onClick={() => {
                        setSelected(null);
                        setEditing(!editing);
                        setNotice("");
                      }}
                    >
                      {editing ? "✓ Xong" : "↔ Sắp xếp vật phẩm"}
                    </button>
                    {editing && (
                      <button
                        className="text-button"
                        disabled={busy || dragging}
                        onClick={resetLayout}
                      >
                        Về vị trí ban đầu
                      </button>
                    )}
                  </div>
                  <p className="reward-editor-help">
                    {editing
                      ? "Kéo vật phẩm đến nơi con thích. Vuốt bên ngoài bản đồ để cuộn trang. Dùng phím mũi tên nếu có bàn phím."
                      : mapPlaced.length
                        ? "Chọn Sắp xếp để di chuyển đồ bằng chuột hoặc ngón tay."
                        : "Đổi và đặt một vật phẩm để bắt đầu tự sắp xếp nhé!"}
                  </p>
                  <RewardMapScene
                    mapId={activeMap.id}
                    placed={view.placed}
                    preview={selected && !placed ? selected : undefined}
                  />
                  <div className="reward-room-caption">
                    <Sparkles size={17} />
                    <span>
                      {selected
                        ? `Đang xem thử: ${selected.name.toLowerCase()}`
                        : mapPlaced.length
                          ? `${activeMap.name} mang dấu ấn của con.`
                          : mapOwned.length
                            ? "Chọn một món trong Đồ của con để đặt lại nhé!"
                            : activeMap.welcome}
                    </span>
                  </div>
                </section>
                {selected ? (
                  <section
                    className="reward-selection"
                    aria-label="Vật phẩm đang chọn"
                  >
                    <div className="reward-selection-top">
                      <img
                        className="reward-selection-sticker"
                        src={rewardSticker(selected)}
                        alt=""
                        width="76"
                        height="76"
                      />
                      <div>
                        <h2>{selected.name}</h2>
                        <p>{selected.description}</p>
                      </div>
                      <button
                        className="icon-button"
                        onClick={() => setSelected(null)}
                        disabled={busy}
                        aria-label="Đóng xem thử"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    {!owned && (
                      <p className="reward-selection-hint">
                        {enough
                          ? `Con có ${view.balance} sao · Sau khi đổi còn ${view.balance - selected.price} sao`
                          : `Con có ${view.balance} sao · Cần thêm ${selected.price - view.balance} sao để đổi món này`}
                      </p>
                    )}
                    <button
                      className="button full"
                      disabled={busy || (!owned && !enough)}
                      onClick={() =>
                        act(
                          owned ? (placed ? "store" : "place") : "buy",
                          selected,
                        )
                      }
                    >
                      {busy ? (
                        <>
                          <LoaderCircle size={18} /> Đang lưu…
                        </>
                      ) : owned ? (
                        placed ? (
                          "Cất đi"
                        ) : (
                          "Đặt vào góc"
                        )
                      ) : (
                        <>
                          <Star size={18} /> Đổi {selected.price} sao và đặt vào
                          góc
                        </>
                      )}
                    </button>
                    <p className="micro">
                      {owned
                        ? "Cất và đặt lại miễn phí, bất cứ lúc nào."
                        : "Đổi một lần, giữ mãi trong đồ của con."}
                    </p>
                  </section>
                ) : (
                  <div
                    className="story-progress"
                    aria-label="Tiến triển câu chuyện"
                  >
                    <div>
                      <span className="eyebrow">
                        TRANG TRUYỆN {storyStage + 1}/4
                      </span>
                      <span>{mapOwned.length}/8 mảnh ghép đã sưu tầm</span>
                    </div>
                    <h3>{story.stages[storyStage]}</h3>
                    <p>{story.discoveries[storyStage]}</p>
                    <div className="story-progress-track" aria-hidden="true">
                      {[0, 1, 2, 3].map((stage) => (
                        <span
                          key={stage}
                          className={stage <= storyStage ? "reached" : ""}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div className="reward-live" role="status" aria-live="polite">
                  {notice && (
                    <>
                      <Check size={18} /> {notice}
                    </>
                  )}
                </div>
              </div>
              <section
                className="reward-catalog"
                aria-label="Vật phẩm trang trí"
              >
                <div className="reward-catalog-heading">
                  <span className="eyebrow">
                    BỘ SƯU TẬP · CHƯƠNG {story.chapter}
                  </span>
                  <h2>Những mảnh ghép nhỏ</h2>
                  <p>Chọn một món, thêm một điều vào câu chuyện.</p>
                </div>
                <div
                  className="reward-tabs"
                  role="group"
                  aria-label="Chọn danh sách vật phẩm"
                >
                  <button
                    aria-pressed={tab === "shop"}
                    onClick={() => setTab("shop")}
                  >
                    Chọn đồ <Gift size={16} />
                  </button>
                  <button
                    aria-pressed={tab === "owned"}
                    onClick={() => setTab("owned")}
                  >
                    Đồ của con <span>{mapOwned.length}</span>
                  </button>
                </div>
                {tab === "owned" && !mapOwned.length ? (
                  <div className="reward-empty">
                    <img
                      src={rewardSticker(guide)}
                      alt=""
                      width="100"
                      height="100"
                    />
                    <h3>Món đầu tiên đang chờ con</h3>
                    <p>
                      Hoàn thành mục tiêu học để nhận sao, rồi tự chọn một món
                      yêu thích.
                    </p>
                    <button
                      className="text-button"
                      onClick={() => setTab("shop")}
                    >
                      Khám phá vật phẩm <ArrowRight size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="reward-item-grid">
                    {mapItems
                      .filter(
                        (i) => tab === "shop" || view.owned.includes(i.id),
                      )
                      .map((item) => {
                        const isOwned = view.owned.includes(item.id),
                          isPlaced = view.placed.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            className={`reward-item ${selected?.id === item.id ? "selected" : ""}`}
                            aria-pressed={selected?.id === item.id}
                            onClick={() => preview(item)}
                            disabled={busy}
                            aria-label={`${item.name}, ${isOwned ? (isPlaced ? "đang đặt" : "đã sở hữu") : `${item.price} sao`}. Xem thử`}
                          >
                            <span
                              className={`reward-item-art art-${item.id} map-art-${item.map}`}
                            >
                              <img
                                className="reward-sticker"
                                src={rewardSticker(item)}
                                alt=""
                                width="160"
                                height="160"
                                loading="lazy"
                              />
                              {isOwned && (
                                <span className="reward-owned-mark">
                                  <Check size={13} />{" "}
                                  {isPlaced ? "Đang đặt" : "Đã có"}
                                </span>
                              )}
                            </span>
                            <strong>{item.name}</strong>
                            <span className="reward-item-price">
                              {isOwned ? (
                                <>
                                  <Check size={14} /> Đã sở hữu
                                </>
                              ) : (
                                <>
                                  <Star size={15} fill="currentColor" />{" "}
                                  {item.price} sao
                                </>
                              )}
                            </span>
                            <span className="reward-item-action">
                              {isOwned
                                ? isPlaced
                                  ? "Xem / cất đi"
                                  : "Đặt vào góc"
                                : view.balance >= item.price
                                  ? "Xem thử"
                                  : `Cần thêm ${item.price - view.balance} sao`}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                )}
              </section>
            </div>
          </RewardLayoutProvider>
          <section className="reward-goals card" aria-label="Mục tiêu nhận sao">
            <div>
              <span className="eyebrow">SAO ĐẾN TỪ ĐÂU?</span>
              <h2>Từng bước nhỏ, thêm niềm vui</h2>
              <p>Không cần điểm tuyệt đối, không cần học mỗi ngày.</p>
            </div>
            <div className="reward-goal-grid">
              <div>
                <BookOpen size={26} />
                <strong>Hoàn thành bài học</strong>
                <p>Làm hết các câu trong một bài.</p>
                <b>+2 sao</b>
              </div>
              <div>
                <Sprout size={26} />
                <strong>Tự sửa đúng 3 câu sai</strong>
                <p>Tự trả lời lại sau khi xem gợi ý.</p>
                <b>+1 sao</b>
              </div>
              <div>
                <Search size={26} />
                <strong>Hoàn thành lượt ôn tập</strong>
                <p>Làm hết một bộ ôn được tạo.</p>
                <b>+2 sao</b>
              </div>
              <div>
                <Flag size={26} />
                <strong>Chặng 3 bài khác nhau</strong>
                <p>
                  Đã hoàn thành {view.lessonProgress}/3 bài trong chặng tiếp
                  theo.
                </p>
                <b>Thêm 2 sao</b>
              </div>
            </div>
            <p className="micro">
              Mỗi bài hoặc bộ ôn chỉ thưởng hoàn thành một lần, kể cả khi làm
              lại. Bài ôn nhận 2 sao ôn tập; không cộng thêm 2 sao bài học. Câu
              đã mở lời giải không tính là tự sửa.
            </p>
            <Link href="/toan" className="text-button">
              Cùng học để nhận sao <ArrowRight size={17} />
            </Link>
          </section>
        </>
      )}
      {storyOpen && (
        <Modal title={story.title} onClose={() => setStoryOpen(false)}>
          <div className="story-reading">
            <img
              src={rewardBackground(activeMap.id)}
              alt=""
              width="600"
              height="425"
            />
            <div className="story-reading-guide">
              <img src={rewardSticker(guide)} alt="" width="80" height="80" />
              <span>
                <strong>{story.guide}</strong>
                <small>{story.role}</small>
              </span>
            </div>
            {story.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <button className="button full" onClick={() => setStoryOpen(false)}>
              Cùng viết tiếp câu chuyện <ArrowRight size={17} />
            </button>
          </div>
        </Modal>
      )}
      {history && view && (
        <Modal title="Những ngôi sao của con" onClose={() => setHistory(false)}>
          <p className="reward-history-balance">
            Con đang có <strong>{view.balance} sao</strong>
          </p>
          <p className="micro">Sao nhận được từ những điều con đã làm được.</p>
          {!view.events.length ? (
            <p className="reward-history-empty">
              Chưa có sao được nhận. Góc nhỏ đang chờ thành quả đầu tiên của
              con!
            </p>
          ) : (
            <ol className="reward-history">
              {[...view.events].reverse().map((event) => (
                <li key={event.id}>
                  <span>
                    <strong>{event.message}</strong>
                    <small>
                      {new Date(event.date).toLocaleDateString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                    </small>
                  </span>
                  <b>+{event.stars} sao</b>
                </li>
              ))}
            </ol>
          )}
        </Modal>
      )}
    </div>
  );
}

export function RewardCelebration({ runId }: { runId: string }) {
  const [view, setView] = useState<RewardView | null>(null);
  const [error, setError] = useState(false);
  async function load() {
    setError(false);
    try {
      setView(await requestRewards(undefined, runId));
    } catch {
      setError(true);
    }
  }
  useEffect(() => {
    void load();
  }, [runId]);
  if (error)
    return (
      <div className="notice" role="status">
        Chưa tải được thông tin sao.{" "}
        <button className="text-button" onClick={load}>
          Thử lại
        </button>
      </div>
    );
  if (!view)
    return (
      <p role="status" className="micro">
        Đang tải thành quả của con…
      </p>
    );
  const receipt = view.receipt ?? [];
  return (
    <section className="reward-celebration card">
      <div className="reward-celebration-icon">
        <Star size={32} fill="currentColor" />
      </div>
      <div>
        <span className="eyebrow">TỪNG BƯỚC ĐỀU ĐÁNG NHỚ</span>
        <h2>
          {receipt.length ? "Con làm được rồi!" : "Cùng tiếp tục khám phá nhé!"}
        </h2>
        {receipt.map((event) => (
          <p key={event.id}>
            {event.message} <strong>+{event.stars} sao</strong>
          </p>
        ))}
        {!receipt.length && (
          <p>
            Bài đã nhận thưởng sẽ không cộng sao lại. Hãy làm hết các câu trong
            một bài mới để nhận sao.
          </p>
        )}
        <p className="micro">
          Con đang có {view.balance} sao · Sao luôn được giữ cho lần học sau.
        </p>
        <div className="actions">
          <ButtonLink href="/toan">
            Tiếp tục học <ArrowRight size={17} />
          </ButtonLink>
          <ButtonLink href="/phan-thuong" secondary>
            Xem góc học tập
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
