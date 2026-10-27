"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import {
  clampRewardPosition,
  defaultRewardPosition,
  rewardItemLayout,
  type RewardPosition,
  type RewardPositions,
} from "@/lib/reward-layout";
import { rewardItems } from "@/lib/rewards";

type Editor = {
  editing: boolean;
  disabled: boolean;
  positions: RewardPositions;
  onSave: (itemId: string, position: RewardPosition) => Promise<void>;
  onDrag: (active: boolean) => void;
};
const EditorContext = createContext<Editor>({
  editing: false,
  disabled: false,
  positions: {},
  onSave: async () => {},
  onDrag: () => {},
});
export const RewardLayoutProvider = EditorContext.Provider;
export const useRewardEditor = () => useContext(EditorContext);

export function MovableRewardItem({
  itemId,
  preview = false,
  children,
}: {
  itemId: string;
  preview?: boolean;
  children: ReactNode;
}) {
  const editor = useRewardEditor();
  const element = useRef<SVGGElement>(null);
  const layout = rewardItemLayout(itemId);
  const saved = editor.positions[itemId] ?? defaultRewardPosition(itemId);
  const [draft, setDraft] = useState<RewardPosition | null>(null);
  const [targetSize, setTargetSize] = useState({
    width: layout.width,
    height: layout.height,
  });
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origin: RewardPosition;
    next: RewardPosition;
    moved: boolean;
  } | null>(null);
  const position = draft ?? saved;
  const enabled = editor.editing && !preview;
  useEffect(() => {
    const svg = element.current?.ownerSVGElement;
    if (!svg || !enabled) return;
    const resize = () => {
      const matrix = svg.getScreenCTM();
      if (matrix)
        setTargetSize({
          width: Math.max(layout.width, 44 / Math.hypot(matrix.a, matrix.b)),
          height: Math.max(layout.height, 44 / Math.hypot(matrix.c, matrix.d)),
        });
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [enabled, layout.width, layout.height]);
  const item = rewardItems.find((entry) => entry.id === itemId)!;
  const point = (event: PointerEvent<SVGGElement>) => {
    const matrix = event.currentTarget.ownerSVGElement?.getScreenCTM();
    return matrix
      ? new DOMPoint(event.clientX, event.clientY).matrixTransform(
          matrix.inverse(),
        )
      : null;
  };
  function cancel() {
    if (!drag.current) return;
    drag.current = null;
    setDraft(null);
    editor.onDrag(false);
  }
  async function commit(next: RewardPosition) {
    setDraft(next);
    try {
      await editor.onSave(itemId, next);
    } catch {
      /* The page reports the save failure; revert to persisted coordinates. */
    } finally {
      setDraft(null);
    }
  }
  function down(event: PointerEvent<SVGGElement>) {
    if (
      !enabled ||
      editor.disabled ||
      !event.isPrimary ||
      event.button !== 0 ||
      drag.current
    )
      return;
    const start = point(event);
    if (!start) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      startX: start.x,
      startY: start.y,
      origin: saved,
      next: saved,
      moved: false,
    };
    editor.onDrag(true);
  }
  function move(event: PointerEvent<SVGGElement>) {
    const current = drag.current;
    if (!current || event.pointerId !== current.pointerId) return;
    const now = point(event);
    if (!now) return;
    event.preventDefault();
    const dx = now.x - current.startX,
      dy = now.y - current.startY;
    if (!current.moved && Math.hypot(dx, dy) < 4) return;
    current.moved = true;
    current.next = clampRewardPosition(itemId, {
      x: current.origin.x + dx / 720,
      y: current.origin.y + dy / 510,
    });
    setDraft(current.next);
  }
  function up(event: PointerEvent<SVGGElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null;
    editor.onDrag(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (current.moved) void commit(current.next);
    else setDraft(null);
  }
  function key(event: KeyboardEvent<SVGGElement>) {
    if (event.key === "Escape") {
      cancel();
      return;
    }
    if (!enabled || editor.disabled || drag.current) return;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (!delta[event.key]) return;
    event.preventDefault();
    const [dx, dy] = delta[event.key],
      step = event.shiftKey ? 25 : 8;
    void commit(
      clampRewardPosition(itemId, {
        x: saved.x + (dx * step) / 720,
        y: saved.y + (dy * step) / 510,
      }),
    );
  }
  return (
    <g
      ref={element}
      transform={`translate(${position.x * 720 - layout.x} ${position.y * 510 - layout.y})`}
      className={`${preview ? "room-preview" : ""} ${enabled ? "reward-movable" : ""} ${drag.current ? "is-dragging" : ""}`}
      role={enabled ? "button" : undefined}
      tabIndex={enabled ? 0 : undefined}
      aria-label={
        enabled
          ? `Di chuyển ${item.name}. Kéo thả hoặc dùng phím mũi tên.`
          : undefined
      }
      aria-disabled={enabled ? editor.disabled : undefined}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
      onKeyDown={key}
    >
      {children}
      {enabled && (
        <rect
          className="reward-move-target"
          x={layout.x - targetSize.width / 2}
          y={layout.y - targetSize.height / 2}
          width={targetSize.width}
          height={targetSize.height}
          rx="9"
          fill="transparent"
          stroke="currentColor"
          strokeDasharray="5 5"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </g>
  );
}
