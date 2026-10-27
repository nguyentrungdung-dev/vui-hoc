"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Gift,
  History,
  LoaderCircle,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import {
  rewardItems,
  rewardMaps,
  type RewardAction,
  type RewardMapId,
  type RewardItem,
  type RewardItemId,
  type RewardView,
} from "@/lib/rewards";
import {
  MovableRewardItem,
  RewardLayoutProvider,
  useRewardEditor,
} from "./reward-layout-editor";
import type { RewardPosition } from "@/lib/reward-layout";
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

function StudyRoom({
  placed,
  preview,
}: {
  placed: RewardItemId[];
  preview?: RewardItem;
}) {
  const uid = useId().replace(/:/g, "");
  const has = (id: RewardItemId) => placed.includes(id) || preview?.id === id;
  const editor = useRewardEditor();
  const studyArt = {
    picture: (
      <>
        <rect x="294" y="72" width="101" height="107" rx="6" fill="#bc8f68" />
        <rect x="302" y="80" width="85" height="91" fill="#fcf7e8" />
        <circle cx="358" cy="107" r="12" fill="#e5bb65" />
        <path d="M310 157L337 118L354 144L369 126L380 157Z" fill="#97b4a0" />
      </>
    ),
    books: (
      <>
        <rect x="465" y="143" width="15" height="49" rx="3" fill="#cc8c76" />
        <rect x="483" y="132" width="16" height="60" rx="3" fill="#90a8b9" />
        <path d="M506 143L520 139L535 189L521 193Z" fill="#d9bd7c" />
        <path d="M469 155H477M487 145H495" stroke="#fff4dc" strokeWidth="3" />
      </>
    ),
    bear: (
      <>
        <ellipse cx="594" cy="170" rx="22" ry="23" fill="#c39470" />
        <circle cx="579" cy="129" r="10" fill="#c39470" />
        <circle cx="609" cy="129" r="10" fill="#c39470" />
        <circle cx="594" cy="146" r="22" fill="#d7b08c" />
        <ellipse cx="594" cy="154" rx="10" ry="8" fill="#f3dcc4" />
        <path d="M592 151L596 151L594 154Z" fill="#654e45" />
        <circle cx="586" cy="142" r="2" fill="#654e45" />
        <circle cx="602" cy="142" r="2" fill="#654e45" />
        <ellipse cx="594" cy="175" rx="12" ry="14" fill="#f3dcc4" />
      </>
    ),
    pencils: (
      <>
        <path
          d="M256 284L250 250M265 284V246M273 284L282 254"
          stroke="#d5a061"
          strokeWidth="6"
        />
        <path d="M246 277H282L277 319H252Z" fill="#9aa8bf" />
        <path
          d="M254 287V309M263 287V309M272 287V309"
          stroke="#c3ccda"
          strokeWidth="2"
        />
      </>
    ),
    plant: (
      <>
        <path d="M211 283V251" stroke="#62856a" strokeWidth="4" />
        <ellipse
          cx="200"
          cy="256"
          rx="9"
          ry="18"
          transform="rotate(-40 200 256)"
          fill="#88ab7e"
        />
        <ellipse
          cx="220"
          cy="245"
          rx="9"
          ry="18"
          transform="rotate(34 220 245)"
          fill="#70966a"
        />
        <path d="M191 280H231L224 318H198Z" fill="#d69a7b" />
        <rect x="189" y="278" width="44" height="8" rx="3" fill="#e4ac8d" />
      </>
    ),
    lamp: (
      <>
        <path
          d="M483 311L471 263L494 239"
          fill="none"
          stroke="#a99c6c"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path d="M478 234Q493 215 508 235L520 255H474Z" fill="#e2c778" />
        <ellipse cx="483" cy="316" rx="23" ry="5" fill="#c4b16f" />
        <path d="M482 258L463 310H529L510 258Z" fill="#f7d98a" opacity=".13" />
      </>
    ),
    desk: (
      <>
        <rect
          x="172"
          y="320"
          width="375"
          height="19"
          rx="7"
          fill={has("desk") ? "#80a8a1" : "#bd9570"}
        />
        <rect
          x="187"
          y="339"
          width="16"
          height="104"
          rx="4"
          fill={has("desk") ? "#638f89" : "#ab8260"}
        />
        <rect
          x="513"
          y="339"
          width="16"
          height="104"
          rx="4"
          fill={has("desk") ? "#638f89" : "#ab8260"}
        />
        <rect
          x="433"
          y="342"
          width="70"
          height="40"
          rx="5"
          fill={has("desk") ? "#a1c1b6" : "#d5b48f"}
        />
        <circle cx="468" cy="361" r="3" fill="#786c59" />
        <path d="M286 308L340 304L366 315L310 318Z" fill="#fffdf2" />
        <path d="M340 304L384 306L406 318L366 315Z" fill="#e6eadf" />
      </>
    ),
    chair: (
      <>
        <path
          d="M310 415L303 471M392 415L400 471"
          stroke="#a78367"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <rect
          x="297"
          y="404"
          width="110"
          height="17"
          rx="7"
          fill={has("chair") ? "#a897c5" : "#cba889"}
        />
        <rect x="305" y="354" width="9" height="56" rx="4" fill="#b49273" />
        <rect x="389" y="354" width="9" height="56" rx="4" fill="#b49273" />
        <rect
          x="295"
          y="342"
          width="113"
          height="51"
          rx="18"
          fill={has("chair") ? "#b6a6ce" : "#dfc3a7"}
        />
        <path
          d="M321 355H382"
          stroke={has("chair") ? "#cdbfe0" : "#ecd7c0"}
          strokeWidth="4"
          strokeLinecap="round"
        />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 720 510"
      className={`study-room ${editor.editing ? "is-editing" : ""}`}
      role={editor.editing ? "group" : "img"}
      aria-label={`Góc học tập có bàn, ghế, kệ${rewardItems
        .filter((i) => i.map === "study" && has(i.id))
        .map((i) => `, ${i.name}`)
        .join("")}${preview ? `. Đang xem thử ${preview.name}` : ""}`}
    >
      <defs>
        <linearGradient id={`${uid}-wall`} x2="0" y2="1">
          <stop stopColor="#f4eee6" />
          <stop offset="1" stopColor="#fffaf2" />
        </linearGradient>
        <linearGradient id={`${uid}-glass`} x2="0" y2="1">
          <stop stopColor="#b7dce9" />
          <stop offset="1" stopColor="#e5f3ee" />
        </linearGradient>
      </defs>
      <rect width="720" height="510" rx="26" fill={`url(#${uid}-wall)`} />
      <path d="M0 397H720V484Q720 510 694 510H26Q0 510 0 484Z" fill="#e4d4c0" />
      <path
        d="M0 400H720M0 455H720M150 400L85 510M360 400V510M570 400L635 510"
        stroke="#d2bfaa"
        strokeWidth="2"
      />
      <rect x="68" y="69" width="157" height="191" rx="53" fill="#decbb7" />
      <rect
        x="76"
        y="77"
        width="141"
        height="174"
        rx="46"
        fill={`url(#${uid}-glass)`}
      />
      <circle cx="176" cy="118" r="20" fill="#fff4be" />
      <path
        d="M77 221Q111 176 148 216Q184 176 216 218V251H77Z"
        fill="#a2c5b4"
      />
      <path d="M148 79V252M77 166H217" stroke="#fff9ee" strokeWidth="8" />
      <path
        d="M56 70Q40 157 60 264L85 262Q70 164 87 70M209 70Q227 165 210 263L236 265Q251 156 237 70"
        fill="#c4c4dd"
      />
      <rect x="450" y="192" width="199" height="12" rx="5" fill="#bd9775" />
      <path d="M468 204V221M630 204V221" stroke="#a98063" strokeWidth="6" />

      <ellipse
        cx="362"
        cy="458"
        rx="213"
        ry="24"
        fill="#bba68e"
        opacity=".24"
      />
      {!has("desk") && studyArt.desk}

      {!has("chair") && studyArt.chair}
      <text
        x="607"
        y="366"
        fontSize="12"
        fill="#a99b88"
        fontFamily="inherit"
        textAnchor="middle"
      >
        góc nhỏ của con
      </text>
      {[
        ...placed.filter((id) => id in studyArt),
        ...(preview && !placed.includes(preview.id) ? [preview.id] : []),
      ].map(
        (id) =>
          id in studyArt && (
            <MovableRewardItem
              key={id}
              itemId={id}
              preview={preview?.id === id && !placed.includes(id)}
            >
              {studyArt[id as keyof typeof studyArt]}
            </MovableRewardItem>
          ),
      )}
    </svg>
  );
}

export function RewardsPage() {
  const [view, setView] = useState<RewardView | null>(null);
  const [tab, setTab] = useState<"shop" | "owned">("shop");
  const [selected, setSelected] = useState<RewardItem | null>(null);
  const [history, setHistory] = useState(false);
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
          : `${item.name} đã được đặt vào ${rewardMaps.find((map) => map.id === item.map)!.name.toLowerCase()}!`,
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
    if (window.matchMedia("(max-width: 1000px)").matches)
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
  const owned = selected && view?.owned.includes(selected.id);
  const placed = selected && view?.placed.includes(selected.id);
  const enough = selected && view && view.balance >= selected.price;
  return (
    <div className="rewards-page">
      <header className="rewards-heading">
        <div>
          <span className="eyebrow">PHẦN THƯỞNG · THẾ GIỚI CỦA CON</span>
          <h1>
            Góc của con<span className="reward-title-spark">✦</span>
          </h1>
          <p>Mỗi điều học được, thêm một chút riêng con.</p>
        </div>
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
          <span>sao của con</span>
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
                <h2>Hôm nay, con muốn đến đâu?</h2>
              </div>
              <p>Đổi bản đồ miễn phí · Dùng chung sao</p>
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
                  <span
                    className="reward-map-icon"
                    aria-hidden="true"
                    style={{ background: map.color }}
                  >
                    {map.icon}
                  </span>
                  <span>
                    <strong>{map.name}</strong>
                    <small>{map.subtitle}</small>
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
                      <span className="status-dot" /> {activeMap.name}
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
                  {activeMap.id === "study" ? (
                    <StudyRoom
                      placed={view.placed}
                      preview={selected && !placed ? selected : undefined}
                    />
                  ) : (
                    <RewardMapScene
                      mapId={activeMap.id}
                      placed={view.placed}
                      preview={selected && !placed ? selected : undefined}
                    />
                  )}
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
                      <span
                        className="reward-selection-icon"
                        aria-hidden="true"
                      >
                        {selected.icon}
                      </span>
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
                  <div className="reward-room-invitation">
                    <span aria-hidden="true">🌱</span>
                    <div>
                      <strong>Cứ học theo nhịp của con</strong>
                      <p>
                        Sao được giữ qua các buổi học. Nghỉ một hôm cũng không
                        mất sao.
                      </p>
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
                  <span className="eyebrow">MỘT CHÚT SÁNG TẠO</span>
                  <h2>Thêm điều con thích</h2>
                  <p>Vật phẩm dành cho {activeMap.name.toLowerCase()}.</p>
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
                    <span aria-hidden="true">🎁</span>
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
                              <span aria-hidden="true">{item.icon}</span>
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
                <span>📖</span>
                <strong>Hoàn thành bài học</strong>
                <p>Làm hết các câu trong một bài.</p>
                <b>+2 ⭐</b>
              </div>
              <div>
                <span>🌱</span>
                <strong>Tự sửa đúng 3 câu sai</strong>
                <p>Tự trả lời lại sau khi xem gợi ý.</p>
                <b>+1 ⭐</b>
              </div>
              <div>
                <span>🔎</span>
                <strong>Hoàn thành lượt ôn tập</strong>
                <p>Làm hết một bộ ôn được tạo.</p>
                <b>+2 ⭐</b>
              </div>
              <div>
                <span>🚩</span>
                <strong>Chặng 3 bài khác nhau</strong>
                <p>
                  Đã hoàn thành {view.lessonProgress}/3 bài trong chặng tiếp
                  theo.
                </p>
                <b>Thêm 2 ⭐</b>
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
      {history && view && (
        <Modal title="Những ngôi sao của con" onClose={() => setHistory(false)}>
          <p className="reward-history-balance">
            Con đang có <strong>{view.balance} ⭐</strong>
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
                  <b>+{event.stars} ⭐</b>
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
            {event.message} <strong>+{event.stars} ⭐</strong>
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
