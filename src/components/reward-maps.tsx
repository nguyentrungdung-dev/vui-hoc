"use client";

import { MovableRewardItem, useRewardEditor } from "./reward-layout-editor";
import { rewardItemLayout } from "@/lib/reward-layout";
import { useId } from "react";
import {
  rewardItems,
  rewardMaps,
  type RewardItem,
  type RewardItemId,
  type RewardMapId,
} from "@/lib/rewards";

function Tree({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        d="M0 0V84"
        stroke="#9d805a"
        strokeWidth="13"
        strokeLinecap="round"
      />
      <circle cy="-13" r="40" fill="#93b479" />
      <circle cx="-26" cy="4" r="30" fill="#779b64" />
      <circle cx="24" cy="6" r="33" fill="#a2be85" />
    </g>
  );
}
function Building({
  x,
  y,
  width,
  height,
  color,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx="12" fill={color} />
      {[0, 1, 2].map((n) => (
        <path
          key={n}
          d={`M${x + 12} ${y + 20 + n * 22}H${x + width - 12}`}
          stroke="#f2f8ed"
          strokeWidth="7"
          strokeDasharray="10 9"
          opacity=".65"
        />
      ))}
      <rect
        x={x + width / 2 - 9}
        y={y + height - 26}
        width="18"
        height="26"
        rx="5"
        fill="#556f87"
      />
    </g>
  );
}

export function RewardMapScene({
  mapId,
  placed,
  preview,
}: {
  mapId: RewardMapId;
  placed: RewardItemId[];
  preview?: RewardItem;
}) {
  const editor = useRewardEditor();
  const uid = useId().replace(/:/g, "");
  const map = rewardMaps.find((entry) => entry.id === mapId)!;
  const items = rewardItems.filter((item) => item.map === mapId);
  const visible = items.filter(
    (item) => placed.includes(item.id) || preview?.id === item.id,
  );
  const palette =
    mapId === "space"
      ? ["#23294b", "#51516e"]
      : mapId === "wildlife"
        ? ["#d7e9dc", "#f9efd2"]
        : mapId === "castle"
          ? ["#e7dcf2", "#fff1e1"]
          : ["#d8eaf1", "#f1f3ed"];
  return (
    <svg
      viewBox="0 0 720 510"
      className={`study-room reward-map-scene scene-${mapId} ${editor.editing ? "is-editing" : ""}`}
      role={editor.editing ? "group" : "img"}
      aria-label={`${map.name}${visible.map((item) => `, ${item.name}`).join("")}${preview ? `. Đang xem thử ${preview.name}` : ""}`}
    >
      <defs>
        <linearGradient id={`${uid}-sky`} x2="0" y2="1">
          <stop stopColor={palette[0]} />
          <stop offset="1" stopColor={palette[1]} />
        </linearGradient>
        <clipPath id={`${uid}-clip`}>
          <rect width="720" height="510" rx="26" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid}-clip)`}>
        <rect width="720" height="510" fill={`url(#${uid}-sky)`} />
        {mapId === "space" && (
          <>
            {[
              [46, 59],
              [89, 159],
              [219, 59],
              [294, 197],
              [448, 50],
              [528, 88],
              [644, 64],
              [677, 173],
              [423, 119],
              [66, 276],
              [626, 241],
            ].map(([x, y], i) => (
              <g key={i} fill="#f4e7bd">
                <circle cx={x} cy={y} r={i % 3 === 0 ? 2.5 : 1.5} />
                <path
                  d={`M${x - 5} ${y}H${x + 5}M${x} ${y - 5}V${y + 5}`}
                  stroke="#f4e7bd"
                  strokeWidth=".8"
                  opacity={i % 3 === 0 ? 0.8 : 0}
                />
              </g>
            ))}
            <circle cx="566" cy="127" r="55" fill="#b8becf" opacity=".16" />
            <circle cx="566" cy="127" r="40" fill="#e7d8bd" />
            <circle cx="553" cy="113" r="9" fill="#d2c5b1" />
            <circle cx="578" cy="135" r="12" fill="#d2c5b1" />
            <path
              d="M0 361Q161 325 362 368Q559 337 720 363V510H0Z"
              fill="#b6b2bd"
            />
            <ellipse cx="605" cy="440" rx="48" ry="14" fill="#9e9bac" />
            <ellipse cx="91" cy="466" rx="30" ry="8" fill="#9e9bac" />
            <path d="M172 390H543L492 510H91Z" fill="#cfced5" />
            <path
              d="M155 425H529M135 464H510"
              stroke="#e6e4e9"
              strokeWidth="4"
            />
            <path
              d="M191 351V282Q191 208 265 208H371Q446 208 446 282V351Z"
              fill="#d9dae5"
            />
            <path
              d="M206 278Q206 225 262 225H374Q429 225 429 278Z"
              fill="#a6b2cb"
            />
            <rect
              x="216"
              y="284"
              width="79"
              height="48"
              rx="15"
              fill="#7583a6"
            />
            <path
              d="M255 284V332M217 309H295"
              stroke="#bbc7d8"
              strokeWidth="4"
            />
            <rect
              x="320"
              y="276"
              width="64"
              height="75"
              rx="25"
              fill="#626f92"
            />
            <path
              d="M333 287V337M348 285V337M363 287V337"
              stroke="#94b6c0"
              strokeWidth="4"
            />
            <path
              d="M318 208V180M307 180H329"
              stroke="#bbc2d2"
              strokeWidth="5"
            />
            <circle cx="318" cy="173" r="5" fill="#e8cb86" />
            <rect x="61" y="330" width="58" height="36" rx="6" fill="#868da6" />
            <path
              d="M69 337H111M69 350H111M80 332V365M99 332V365"
              stroke="#b6c9dc"
              strokeWidth="2"
            />
          </>
        )}
        {mapId === "wildlife" && (
          <>
            <circle cx="581" cy="80" r="34" fill="#f7dda0" />
            <path
              d="M0 235Q120 139 277 220Q430 126 720 223V510H0Z"
              fill="#abc69b"
            />
            <path
              d="M0 309Q197 248 360 303Q544 254 720 309V510H0Z"
              fill="#c1d0a0"
            />
            <path
              d="M0 407Q199 370 399 411Q581 359 720 402V510H0Z"
              fill="#a2bd86"
            />
            <path
              d="M368 271Q437 329 360 374Q299 412 402 510H316Q233 410 313 366Q386 325 338 281Z"
              fill="#e6d8b1"
            />
            <ellipse cx="574" cy="316" rx="81" ry="33" fill="#91b7b3" />
            <ellipse cx="574" cy="310" rx="66" ry="23" fill="#b6d1c9" />
            <path
              d="M550 308H581M590 319H613"
              stroke="#d5e4d5"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <Tree x={84} y={213} scale={1.15} />
            <Tree x={649} y={174} scale={0.85} />
            <Tree x={233} y={198} scale={0.65} />
            <path
              d="M35 365L112 382M41 354V385M73 361V392M105 368V400M618 464L703 444M627 446V478M662 436V471M696 427V460"
              stroke="#b1986f"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {[
              [74, 434],
              [214, 292],
              [442, 442],
              [631, 365],
              [67, 301],
              [487, 242],
            ].map(([x, y], i) => (
              <path
                key={i}
                d={`M${x} ${y}l-5 -9m5 9l5 -12m-5 12v-11`}
                stroke="#7f9e69"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ))}
          </>
        )}
        {mapId === "castle" && (
          <>
            <path
              d="M60 142Q60 127 78 131Q83 106 106 121Q131 116 139 141ZM488 83Q493 63 511 69Q522 49 540 67Q562 62 571 83Z"
              fill="#fff9f3"
              opacity=".85"
            />
            <path
              d="M0 305Q112 218 246 291Q455 204 720 302V510H0Z"
              fill="#b6c4b1"
            />
            <path
              d="M0 402Q166 320 360 383Q541 322 720 377V510H0Z"
              fill="#d0d6b3"
            />
            <path d="M333 348H384L455 510H253Z" fill="#e4d0bc" />
            <path
              d="M303 408H410M282 457H431"
              stroke="#f2e2cf"
              strokeWidth="4"
            />
            <rect
              x="244"
              y="201"
              width="228"
              height="148"
              rx="5"
              fill="#e6cdd1"
            />
            <rect x="258" y="187" width="33" height="29" fill="#e6cdd1" />
            <rect x="307" y="187" width="33" height="29" fill="#e6cdd1" />
            <rect x="357" y="187" width="33" height="29" fill="#e6cdd1" />
            <rect x="407" y="187" width="33" height="29" fill="#e6cdd1" />
            <rect
              x="224"
              y="171"
              width="62"
              height="179"
              rx="6"
              fill="#d2b7ce"
            />
            <path d="M214 175L255 103L296 175Z" fill="#a993bf" />
            <rect
              x="429"
              y="171"
              width="62"
              height="179"
              rx="6"
              fill="#d2b7ce"
            />
            <path d="M419 175L460 103L501 175Z" fill="#a993bf" />
            <path
              d="M255 104V78L285 86L255 94M460 104V78L490 86L460 94"
              fill="#dfacaa"
              stroke="#a993bf"
              strokeWidth="3"
            />
            <path d="M328 350V298A31 31 0 0 1 390 298V350Z" fill="#a68bab" />
            <path d="M359 279V349" stroke="#c9abc2" strokeWidth="3" />
            <circle cx="350" cy="319" r="3" fill="#f8dda0" />
            {[255, 460].map((x) => (
              <path
                key={x}
                d={`M${x - 9} 242V221a9 9 0 0 1 18 0V242Z`}
                fill="#f6e4c1"
              />
            ))}
            <Tree x={70} y={291} scale={0.8} />
            <Tree x={659} y={310} scale={0.7} />
            {[
              [81, 79],
              [181, 155],
              [402, 85],
              [540, 290],
              [625, 135],
            ].map(([x, y], i) => (
              <path
                key={i}
                d={`M${x - 4} ${y}H${x + 4}M${x} ${y - 4}V${y + 4}`}
                stroke="#b59cbe"
                strokeWidth="2"
              />
            ))}
          </>
        )}
        {mapId === "robot" && (
          <>
            <circle cx="117" cy="84" r="30" fill="#f3dda3" />
            <path
              d="M0 222H33V161H76V222H96V125H149V222H174V183H215V222H242V143H278V222H304V190H347V222H373V135H413V222H442V177H485V222H507V147H544V222H575V111H622V222H652V170H700V222H720V351H0Z"
              fill="#9cb9c4"
              opacity=".4"
            />
            <path d="M0 354L360 254L720 354V510H0Z" fill="#c0d1cc" />
            <path d="M0 440L720 348V405L0 501Z" fill="#839aa6" />
            <path d="M267 292L382 510H458L307 282Z" fill="#839aa6" />
            <path
              d="M0 470L720 377M286 292L419 510"
              stroke="#e6e7cd"
              strokeWidth="3"
              strokeDasharray="17 15"
            />
            <Building x={189} y={225} width={90} height={116} color="#9ba6c4" />
            <Building x={330} y={207} width={95} height={123} color="#8cb7b6" />
            <path d="M345 207V194H411V207" fill="#8cb7b6" />
            <rect
              x="348"
              y="186"
              width="60"
              height="11"
              rx="5"
              fill="#c4dace"
            />
            <Building x={552} y={266} width={89} height={70} color="#c6b49e" />
            <path d="M565 278H626" stroke="#f9edce" strokeWidth="5" />
            <path
              d="M68 392V312H104M656 431V351H620"
              fill="none"
              stroke="#627d8d"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <ellipse cx="102" cy="314" rx="16" ry="6" fill="#e9d598" />
            <ellipse cx="621" cy="353" rx="16" ry="6" fill="#e9d598" />
            <rect x="55" y="250" width="23" height="43" rx="9" fill="#97a9b5" />
            <circle cx="66" cy="261" r="4" fill="#a9c6b3" />
            <circle cx="66" cy="276" r="4" fill="#eed6a2" />
          </>
        )}
        {[...items]
          .sort((a, b) => placed.indexOf(a.id) - placed.indexOf(b.id))
          .map((item) => {
            if (!visible.includes(item)) return null;
            const { x, baseline: y, size } = rewardItemLayout(item.id);
            return (
              <MovableRewardItem
                key={item.id}
                itemId={item.id}
                preview={preview?.id === item.id && !placed.includes(item.id)}
              >
                <ellipse
                  cx={x}
                  cy={y + size * 0.17}
                  rx={size * 0.38}
                  ry={size * 0.09}
                  fill={mapId === "space" ? "#141c37" : "#596f69"}
                  opacity=".14"
                />
                {preview?.id === item.id && (
                  <rect
                    x={x - size * 0.6}
                    y={y - size * 0.92}
                    width={size * 1.2}
                    height={size * 1.25}
                    rx="15"
                    fill="white"
                    fillOpacity=".12"
                    stroke={mapId === "space" ? "#e4d5fa" : "#7f7aa7"}
                    strokeDasharray="5 4"
                    strokeWidth="2"
                  />
                )}
                <text
                  x={x}
                  y={y}
                  fontSize={size}
                  textAnchor="middle"
                  fontFamily="Apple Color Emoji, Segoe UI Emoji, sans-serif"
                >
                  {item.icon}
                </text>
              </MovableRewardItem>
            );
          })}
      </g>
    </svg>
  );
}
