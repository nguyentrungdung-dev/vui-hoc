"use client";
import { equationDiagram, countableLabel } from "@/lib/guidance-diagram";
import type { GuidanceMotion, StoryVisual } from "@/lib/guidance";

const ease = (n: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, n)), 3);
const reactions = {
  hello: "Cùng khám phá nhé!",
  think: "Nhìn kỹ chỗ này nhé",
  aha: "À, ra là vậy!",
  check: "Mình kiểm tra lại nhé",
  celebrate: "Mình đã tìm ra rồi!",
};
function Label({
  x,
  y,
  width = 600,
  text,
  size = 30,
  color = "#263752",
}: {
  x: number;
  y: number;
  width?: number;
  text: string;
  size?: number;
  color?: string;
}) {
  return (
    <foreignObject x={x} y={y} width={width} height={110}>
      <div
        style={{
          fontSize: size,
          fontWeight: 650,
          lineHeight: 1.4,
          color,
          overflowWrap: "anywhere",
          fontFamily: "inherit",
        }}
      >
        {text}
      </div>
    </foreignObject>
  );
}
export function GuidanceStoryStage({
  motion,
  time,
}: {
  motion: GuidanceMotion;
  time: number;
}) {
  const index = Math.max(
    0,
    motion.clips.findIndex(
      (c, i) => time < c.end || i === motion.clips.length - 1,
    ),
  );
  const rawScene = motion.visuals?.[index];
  if (!rawScene) return null;
  const scene =
    ["groups", "compare"].includes(rawScene.kind) &&
    rawScene.items.some((text) => countableLabel(text) === null)
      ? { ...rawScene, kind: "sequence" as const }
      : rawScene;
  const local = time - motion.clips[index].start;
  const times = scene.items.map(
    (_, i) =>
      motion.events.find((e) => e.action === `item-${index}-${i}`)?.time ??
      motion.clips[index].end,
  );
  const visible = times.map((t) => time >= t);
  const active = visible.lastIndexOf(true);
  const enter = ease(local / 0.45);
  const pulse = active < 0 ? 0 : Math.max(0, 1 - (time - times[active]) / 1.1);
  const color =
    Number(motion.sticker?.src.slice(12, 14) || 0) % 2 ? "#4e79ba" : "#8171ba";
  const itemStyle = (i: number) => ({
    opacity: visible[i] ? 1 : 0,
    transform: `translateY(${(1 - ease((time - times[i]) / 0.45)) * 12}px)`,
  });
  return (
    <div
      className="story-stage"
      data-story-kind={scene.kind}
      data-story-index={index}
    >
      <svg
        viewBox="0 0 960 540"
        role="img"
        aria-label={`${scene.heading}. ${scene.items.filter((_, i) => visible[i]).join(". ")}`}
      >
        <defs>
          <pattern
            id="story-dots"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1.2" fill="#e1e8f5" />
          </pattern>
        </defs>
        <rect width="960" height="540" rx="28" fill="#faf9f6" />
        <rect width="960" height="540" fill="url(#story-dots)" opacity=".55" />
        <circle cx="930" cy="510" r="175" fill="#eee9fa" />
        <text x="38" y="42" fill={color} fontSize="20" fontWeight="750">
          Vui Học · Cùng hiểu cách giải
        </text>
        <text x="920" y="42" textAnchor="end" fill="#6c7990" fontSize="19">
          {index + 1} / {motion.clips.length}
        </text>
        <g style={{ opacity: enter }}>
          <Label x={38} y={65} width={860} text={scene.heading} size={35} />
        </g>
        <g>
          {scene.kind === "equation" && equationDiagram(scene.items[0]) ? (
            <ArithmeticObjects
              scene={scene}
              elapsed={time - times[0]}
              local={local}
              color={color}
              time={time}
              times={times}
            />
          ) : scene.kind === "groups" ? (
            scene.items.map((text, i) => {
              const n = Number(text.match(/^\d+/)?.[0] ?? 0),
                x = 45 + i * (690 / scene.items.length),
                width = 650 / scene.items.length;
              return (
                <g key={i} style={itemStyle(i)} data-story-item={i}>
                  <rect
                    x={x}
                    y="165"
                    width={width}
                    height="210"
                    rx="24"
                    fill={i === active ? "#e5effc" : "#f0edf8"}
                    stroke={color}
                    strokeWidth={i === active ? 3 : 1}
                  />
                  {Array.from({ length: n }, (_, j) => (
                    <circle
                      key={j}
                      cx={x + 23 + ((j % 6) * (width - 40)) / 6}
                      cy={198 + Math.floor(j / 6) * 43}
                      r={Math.min(13, (width - 40) / 14)}
                      fill={i % 2 ? "#a691c8" : color}
                      style={{
                        opacity: ease((time - times[i] - 0.025 * j) / 0.3),
                      }}
                    />
                  ))}
                  <Label
                    x={x + 12}
                    y={390}
                    width={width}
                    text={text}
                    size={29}
                  />
                </g>
              );
            })
          ) : scene.kind === "compare" ? (
            <Compare
              scene={scene}
              time={time}
              times={times}
              visible={visible}
              color={color}
            />
          ) : scene.kind === "shape" ? (
            <g>
              {scene.shape === "triangle" ? (
                <path
                  d="M170 355 L340 155 L510 355 Z"
                  fill="#e6eefb"
                  stroke={color}
                  strokeWidth="7"
                  pathLength="1"
                  strokeDasharray="1"
                  strokeDashoffset={1 - ease(local / 1.2)}
                />
              ) : scene.shape === "rectangle" ? (
                <rect
                  x="150"
                  y="175"
                  width="410"
                  height="205"
                  rx="8"
                  fill="#e6eefb"
                  stroke={color}
                  strokeWidth="7"
                  pathLength="1"
                  strokeDasharray="1"
                  strokeDashoffset={1 - ease(local / 1.2)}
                />
              ) : (
                <circle
                  cx="340"
                  cy="270"
                  r="116"
                  fill="#e6eefb"
                  stroke={color}
                  strokeWidth="7"
                />
              )}
              {scene.items.map((text, i) => (
                <g key={i} style={itemStyle(i)} data-story-item={i}>
                  <Label
                    x={50 + i * 220}
                    y={410}
                    width={205}
                    text={text}
                    size={25}
                  />
                </g>
              ))}
            </g>
          ) : (
            scene.items.map((text, i) => {
              const y = 150 + i * 110;
              return (
                <g key={i} data-story-item={i} style={itemStyle(i)}>
                  {scene.kind === "evidence" ? (
                    <>
                      <rect
                        x="42"
                        y={y - 7}
                        width="660"
                        height="85"
                        rx="16"
                        fill={i === active ? "#fff0ce" : "#f0edf8"}
                      />
                      <rect
                        x="42"
                        y={y - 7}
                        width="5"
                        height="85"
                        rx="2"
                        fill={color}
                      />
                    </>
                  ) : scene.kind === "sequence" ? (
                    <>
                      <circle cx="66" cy={y + 23} r="20" fill={color} />
                      <text
                        x="66"
                        y={y + 31}
                        textAnchor="middle"
                        fill="white"
                        fontSize="23"
                      >
                        {i + 1}
                      </text>
                      {i < scene.items.length - 1 && (
                        <path
                          d={`M66 ${y + 49} v28 m-6 -6 l6 6 6 -6`}
                          stroke={color}
                          strokeWidth="3"
                          fill="none"
                        />
                      )}
                    </>
                  ) : (
                    <path
                      d={`M50 ${y + 66} H688`}
                      stroke={i === active ? color : "#dee5f2"}
                      strokeWidth={i === active ? 4 : 2}
                    />
                  )}
                  <Label
                    x={scene.kind === "sequence" ? 104 : 62}
                    y={y}
                    width={scene.kind === "sequence" ? 575 : 620}
                    text={text}
                    size={
                      scene.kind === "equation"
                        ? Math.min(48, 800 / Math.max(18, text.length))
                        : scene.kind === "evidence"
                          ? 27
                          : text.length > 80
                            ? 24
                            : 30
                    }
                    color={i === active ? "#2f568f" : "#536580"}
                  />
                </g>
              );
            })
          )}
        </g>
        <g transform={`translate(0,${-Math.sin(pulse * Math.PI) * 12})`}>
          {motion.sticker && (
            <image
              href={motion.sticker.src}
              x="735"
              y="280"
              width="208"
              height="208"
            />
          )}
          <rect
            x="729"
            y="204"
            width="204"
            height="62"
            rx="22"
            fill={color}
            opacity={enter}
          />
          <Label
            x={744}
            y={218}
            width={180}
            text={reactions[scene.reaction]}
            size={21}
            color="white"
          />
        </g>
        <text x="42" y="506" fill="#6c7990" fontSize="19">
          {scene.kind === "evidence"
            ? "Tìm bằng chứng · Hiểu ý nghĩa"
            : "Nhìn từng bước · Hiểu cách làm"}
        </text>
        <rect x="38" y="522" width="884" height="5" rx="3" fill="#e3e8f2" />
        <rect
          x="38"
          y="522"
          width={884 * Math.min(1, time / motion.duration)}
          height="5"
          rx="3"
          fill={color}
        />
      </svg>
    </div>
  );
}
function Compare({
  scene,
  time,
  times,
  visible,
  color,
}: {
  scene: StoryVisual;
  time: number;
  times: number[];
  visible: boolean[];
  color: string;
}) {
  const nums = scene.items.map((s) => Number(s.match(/^\d+/)?.[0] ?? 0));
  const max = Math.max(1, ...nums);
  return (
    <>
      {scene.items.map((s, i) => (
        <g key={i} opacity={visible[i] ? 1 : 0} data-story-item={i}>
          <Label x={48} y={150 + i * 105} width={220} text={s} size={29} />
          <rect
            x="275"
            y={158 + i * 105}
            width={((380 * nums[i]) / max) * ease((time - times[i]) / 0.7)}
            height="45"
            rx="12"
            fill={i % 2 ? "#a691c8" : color}
          />
        </g>
      ))}
    </>
  );
}

function ArithmeticObjects({
  scene,
  elapsed,
  local,
  color,
  time,
  times,
}: {
  scene: StoryVisual;
  elapsed: number;
  local: number;
  color: string;
  time: number;
  times: number[];
}) {
  const math = equationDiagram(scene.items[0])!;
  const t = ease(elapsed / 1.1),
    entered = ease(local / 0.45);
  const subtract = math.op === "-" || math.op === "−",
    multiply = math.op === "×" || math.op === "*",
    divide = math.op === "÷" || math.op === "/";
  return (
    <g data-arithmetic-diagram={math.op}>
      <text
        x="350"
        y="195"
        textAnchor="middle"
        fill={color}
        fontSize="48"
        fontWeight="750"
      >
        {math.a} {math.op} {math.b} = {elapsed >= 0 ? math.c : "?"}
      </text>
      {Array.from({ length: math.total }, (_, i) => {
        const right = i >= math.a,
          part = right ? i - math.a : i;
        const x0 =
          subtract || multiply || divide
            ? 120 + (i % 8) * 51
            : (right ? 390 : 95) + (part % 6) * 40;
        const y0 =
          255 +
          Math.floor(
            (subtract || multiply || divide ? i : part) /
              (subtract || multiply || divide ? 8 : 6),
          ) *
            43;
        const removed = subtract && i >= math.c;
        const x1 = divide
          ? 120 + (i % math.b) * 43
          : multiply
            ? 130 + (i % math.b) * 43
            : 150 + (i % 8) * 48;
        const y1 =
          divide || multiply
            ? 245 + Math.floor(i / math.b) * 43
            : 255 + Math.floor(i / 8) * 43;
        return (
          <g
            key={i}
            opacity={entered * (removed ? 1 - t * 0.85 : 1)}
            transform={`translate(${x0 + (x1 - x0) * t},${y0 + (y1 - y0) * t})`}
          >
            <circle r="14" fill={right || removed ? "#a691c8" : color} />
            {removed && (
              <path
                d="M-10 -10 L10 10 M10 -10 L-10 10"
                stroke="#9d3b56"
                strokeWidth="3"
                opacity={t}
              />
            )}
          </g>
        );
      })}
      <Label
        x={50}
        y={416}
        width={650}
        text={
          scene.items.length > 1 && time >= times[1]
            ? scene.items[1]
            : elapsed >= 0
              ? math.suffix
              : ""
        }
        size={26}
      />
      {scene.items.length > 2 && time >= times[2] && (
        <Label x={50} y={465} width={650} text={scene.items[2]} size={23} />
      )}
    </g>
  );
}
