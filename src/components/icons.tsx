import { useId, type SVGProps } from "react";
export type IconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  strokeWidth?: number;
};
// Original Vui học "Hạt Sao" vector alphabet. No external icon font or system emoji.
function Artwork({ name, ...props }: IconProps & { name: string }) {
  const { size = 24, strokeWidth = 1.8, ...rest } = props;
  const line = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const arrow = name.includes("Left")
    ? "left"
    : name.includes("Down")
      ? "down"
      : name.includes("Up")
        ? "up"
        : "right";
  let shape;
  if (name.startsWith("Arrow") || name.startsWith("Chevron"))
    shape = (
      <g
        {...line}
        transform={`rotate(${arrow === "left" ? 180 : arrow === "up" ? -90 : arrow === "down" ? 90 : 0} 12 12)`}
      >
        {!name.startsWith("Chevron") && <path d="M3.5 12h16" />}
        <path d="m13 6 6.5 6-6.5 6" />
      </g>
    );
  else if (name === "X")
    shape = (
      <g {...line}>
        <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
      </g>
    );
  else if (name === "Menu")
    shape = (
      <g {...line}>
        <path d="M4 6.5h16M4 12h11M4 17.5h16" />
        <circle cx="19" cy="12" r="1" fill="currentColor" />
      </g>
    );
  else if (name.includes("Check"))
    shape = (
      <>
        <path
          d="M12 2.5c5.8 0 9 3.4 9 9.5s-3.4 9.5-9 9.5S3 18 3 12s3.2-9.5 9-9.5"
          fill="#b9e0d0"
        />
        <path d="m7.5 12 3 3 6-6" {...line} />
      </>
    );
  else if (name === "Info")
    shape = (
      <>
        <path d="M3 3h18v15H10l-6 4v-4H3Z" fill="#bfd3e5" />
        <path d="M12 10v5m0-8v.1" {...line} />
      </>
    );
  else if (name === "LoaderCircle")
    shape = (
      <g {...line}>
        <path d="M12 3a9 9 0 1 1-9 9" stroke="#b6a2d4" strokeDasharray="5 4" />
        <circle cx="5" cy="5" r="2" fill="#eac790" stroke="none" />
      </g>
    );
  else if (name === "Layers3")
    shape = (
      <>
        <path d="M2 5h9v9H2Zm11 6h9v10h-9Z" fill="#b7c9e6" />
        <path d="M5 2h9v9H5Z" fill="#d7bfdf" />
        <path d="M4 9h5m-2.5-2.5v5M16 16h4" {...line} />
        <circle cx="18" cy="5" r="3" fill="#eccb93" />
      </>
    );
  else if (name === "EnglishAlphabet" || name === "VietnameseAlphabet")
    shape = (
      <>
        <path
          d="M2 4Q12 1 22 4v15q-10 3-20 0Z"
          fill={name === "EnglishAlphabet" ? "#f0ceb5" : "#d8c5ed"}
        />
        <path d="M4 21q8 2 16-1" {...line} stroke="#fff7ed" strokeWidth="1.2" />
        <g
          fill="none"
          stroke={name === "EnglishAlphabet" ? "#a7734e" : "#8060ac"}
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {name === "EnglishAlphabet" ? (
            <>
              <path d="M7.5 11q-4-1.7-4 2.5t4 2.5m0-5v5.5M11 7v9m0-4.5q4-2 4 2t-4 2M21 11.7q-4-2.2-4 2.3t4 2.3" />
            </>
          ) : (
            <>
              {[0, 6.5, 13].map((x) => (
                <path
                  key={x}
                  transform={`translate(${x} 0)`}
                  d="M7.2 12q-3.5-1.7-3.5 2.5t3.5 2.5m0-5v5.5"
                />
              ))}
              <path d="M10.5 8.3q1.6 2.7 3.3 0M17 9l1.6-2 1.6 2" />
            </>
          )}
        </g>
      </>
    );
  else if (name === "RankingPodium")
    shape = (
      <>
        <path d="M2 14h6v8H2Z" fill="#bacce5" />
        <path d="M9 9h6v13H9Z" fill="#efd39a" />
        <path d="M16 16h6v6h-6Z" fill="#d7c5e8" />
        <path
          d="M11 13h1v5m-8-1q2-2 2 0l-2 3h2m12-1h2m-2 2h2"
          {...line}
          stroke="#827493"
          strokeWidth="1.1"
        />
        <path
          d="m12 1 1.2 2.5 2.8.4-2 2 .5 2.7L12 7.3l-2.5 1.3.5-2.7-2-2 2.8-.4Z"
          fill="#c1addf"
        />
      </>
    );
  else if (name === "Library")
    shape = (
      <>
        <path d="M2 3h20v19H2Z" fill="#c6d7df" />
        <path d="M4 5h4v13H4Z" fill="#ae9bd2" />
        <path d="M9 4h4v14H9Z" fill="#efc9a0" />
        <path d="m14 6 3-1 3 12-3 1Z" fill="#a6ccbc" />
        <path
          d="M3 19h18M5 8h2m3-1h2m4 1 2-.5"
          {...line}
          stroke="#74768b"
          strokeWidth="1.1"
        />
      </>
    );
  else if (name === "Captions")
    shape = (
      <>
        <path d="M2 3h20v15h-8l-7 5v-5H2Z" fill="#e8c3aa" />
        <path d="m6 13 3-7 3 7m-5-2h4m4-2q4-2 4 2v3m0-2q-5 3-4-1" {...line} />
      </>
    );
  else if (["RefreshCw", "RotateCcw"].includes(name))
    shape = (
      <>
        <path
          d="M19 6A8 8 0 1 0 20 16"
          fill="none"
          stroke="#b6cbdc"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="m17 1 5 8-9 1Z" fill="#cbb3db" />
        <circle cx="11" cy="12" r="2" fill="#e9cb97" />
      </>
    );
  else if (name === "Clock3")
    shape = (
      <>
        <circle cx="12" cy="12" r="10" fill="#d8cae7" />
        <circle cx="12" cy="12" r="7" fill="#fff7e6" />
        <path d="M12 6v6l4 2" {...line} />
      </>
    );
  else if (["Info", "AlertCircle"].includes(name))
    shape = (
      <>
        <path d="M12 3 22 19q.5 2-2 2H4q-2.5 0-2-2L12 3" fill="#f4bfca" />
        <path d="M12 9v5m0 3v.2" {...line} />
      </>
    );
  else if (name === "Award")
    shape = (
      <>
        <path
          d="m5 13-2 10 6-3 3 3 1-11m-1 1 2 10 3-3 5 3-3-11"
          fill="#b8acd9"
        />
        <circle cx="12" cy="9" r="8" fill="#efd39a" />
        <circle cx="12" cy="9" r="5.5" fill="#fff0c7" />
        <path
          d="m12 5 1.2 2.5 2.8.4-2 2 .5 2.7L12 11.3l-2.5 1.3.5-2.7-2-2 2.8-.4Z"
          fill="#cf9c52"
        />
      </>
    );
  else if (["Star", "Sparkles"].includes(name))
    shape = (
      <>
        <path
          d="m12 2 3.1 6.3 7 1-5.1 5 1.2 7L12 18l-6.2 3.3 1.2-7-5.1-5 7-1Z"
          fill="#efd39a"
        />
        <ellipse cx="9" cy="11.5" rx=".8" ry="1.1" fill="#686487" />
        <ellipse cx="15" cy="11.5" rx=".8" ry="1.1" fill="#686487" />
        <path
          d="M9.5 14.5q2.5 2 5 0"
          {...line}
          stroke="#686487"
          strokeWidth="1.2"
        />
      </>
    );
  else if (name === "Trophy")
    shape = (
      <>
        <path d="M6 3h12v8c0 8-12 8-12 0Z" fill="#f0ce8f" />
        <path d="M6 6H2v3q0 5 5 5m11-8h4v3q0 5-5 5M12 17v4m-5 1h10" {...line} />
        <path
          d="m12 6 1 2 2 .4-1.5 1.5.3 2-1.8-1-1.8 1 .3-2L9 8.4l2-.4Z"
          fill="#fff9e9"
        />
      </>
    );
  else if (name === "Sprout")
    shape = (
      <>
        <path d="M12 17C1 17 2 5 3 4c7 0 11 4 9 13" fill="#acd4ba" />
        <path d="M12 14c0-8 6-11 10-10 0 7-4 12-10 10" fill="#d1e9bd" />
        <path d="M12 22V12M6 9l6 8m0-3 5-5" {...line} />
      </>
    );
  else if (name === "Home")
    shape = (
      <>
        <path d="M4 11 12 3l8 8v10H5Z" fill="#c1c8ec" />
        <path d="M2 12 12 2l10 10M9 22v-7h6v7" {...line} />
        <circle cx="16.5" cy="12" r="1" fill="#fff" />
      </>
    );
  else if (["BookOpen", "Layers3", "Captions"].includes(name))
    shape = (
      <>
        <path
          d="M2 4q5-2 10 2 5-4 10-2v15q-5-2-10 2-5-4-10-2Z"
          fill="#c8b7e5"
        />
        <path d="M12 6v15M5 9l4 1m-4 3 4 1m6-4 4-1m-4 5 4-1" {...line} />
      </>
    );
  else if (name === "FileText")
    shape = (
      <>
        <path d="M5 2h10l5 5v15H5Z" fill="#bfcfea" />
        <path d="M15 2v6h5M8 12h8m-8 4h6" {...line} />
      </>
    );
  else if (name === "Gift")
    shape = (
      <>
        <path d="M3 10h18v12H3Z" fill="#e8bdd4" />
        <path d="M2 7h20v5H2Z" fill="#f5d5bc" />
        <path
          d="M12 7v15m0-15C3 8 3 1 7 2c3 0 5 5 5 5Zm0 0c9 1 9-6 5-5-3 0-5 5-5 5Z"
          {...line}
        />
      </>
    );
  else if (["UserRound", "LogIn"].includes(name))
    shape = (
      <>
        <circle cx="12" cy="7" r="4.5" fill="#d0bde9" />
        <path d="M3 22v-4q9-10 18 0v4" fill="#bbcee9" />
        <path d="M9 7h.1m5.8 0h.1m-5 3q2 1 4 0" {...line} />
      </>
    );
  else if (["Play", "Pause", "Volume2"].includes(name))
    shape = (
      <>
        <rect x="2" y="3" width="20" height="18" rx="7" fill="#b8cbed" />
        {name === "Pause" ? (
          <path d="M9 8v8m6-8v8" {...line} />
        ) : name === "Volume2" ? (
          <path
            d="m6 10 3-3v10l-3-3H4v-4h2Zm8-2q6 4 0 8m3-11q8 7 0 14"
            {...line}
          />
        ) : (
          <path d="m9 7 8 5-8 5Z" fill="#fffaf3" />
        )}
      </>
    );
  else if (name === "PencilLine")
    shape = (
      <>
        <path d="m4 16 12-13 5 5L9 21l-6 1Z" fill="#f1c3a9" />
        <path d="m14 5 5 5M4 16l5 5m3 1h9" {...line} />
      </>
    );
  else if (name === "Search")
    shape = (
      <>
        <circle cx="10" cy="10" r="7" fill="#c7dfe5" />
        <circle cx="10" cy="10" r="4" fill="#f8fbff" />
        <path d="m15 15 6 6" {...line} />
      </>
    );
  else if (name === "Upload")
    shape = (
      <>
        <path d="M3 15v7h18v-7" fill="#c7d1ed" />
        <path d="M12 16V2m-5 5 5-5 5 5M3 15v7h18v-7" {...line} />
      </>
    );
  else if (
    ["Clock3", "History", "RefreshCw", "RotateCcw", "LoaderCircle"].includes(
      name,
    )
  )
    shape = (
      <>
        <path d="M20 6a9 9 0 1 0 1 10" fill="#e2d5ef" />
        <path d="M20 2v5h-5M12 6v6l4 2" {...line} />
        <circle cx="4" cy="4" r="1.5" fill="#e1b97b" />
      </>
    );
  else if (name === "Lightbulb")
    shape = (
      <>
        <path d="M6 12a8 8 0 1 1 12 0l-3 5H9Z" fill="#f3dca0" />
        <path d="M9 21h6m-7-4h8m-6-6 2 2 2-2" {...line} />
      </>
    );
  else if (name === "Flag")
    shape = (
      <>
        <path d="M5 3h16l-4 5 4 5H5Z" fill="#d0bce8" />
        <path d="M5 2v20M2 22h7" {...line} />
      </>
    );
  else
    shape = (
      <>
        <path d="M7 16C5 5 12 1 20 2c1 8-3 15-14 14" fill="#c4b2e4" />
        <circle cx="15" cy="7" r="3" fill="#fdf5df" />
        <path d="m7 16-4 5m6-2-2 3m-2-7-3 2" {...line} />
      </>
    );
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      {...rest}
      className={`vui-icon ${rest.className || ""}`}
    >
      {shape}
    </svg>
  );
}
export const AlertCircle = (props: IconProps) => (
  <Artwork name="AlertCircle" {...props} />
);
export const ArrowDown = (props: IconProps) => (
  <Artwork name="ArrowDown" {...props} />
);
export const ArrowLeft = (props: IconProps) => (
  <Artwork name="ArrowLeft" {...props} />
);
export const ArrowRight = (props: IconProps) => (
  <Artwork name="ArrowRight" {...props} />
);
export const ArrowUp = (props: IconProps) => (
  <Artwork name="ArrowUp" {...props} />
);
export const Award = (props: IconProps) => <Artwork name="Award" {...props} />;
export const BookOpen = (props: IconProps) => (
  <Artwork name="BookOpen" {...props} />
);
export const Captions = (props: IconProps) => (
  <Artwork name="Captions" {...props} />
);
export const Check = (props: IconProps) => <Artwork name="Check" {...props} />;
export const CheckCircle2 = (props: IconProps) => (
  <Artwork name="CheckCircle2" {...props} />
);
export const ChevronDown = (props: IconProps) => (
  <Artwork name="ChevronDown" {...props} />
);
export const ChevronLeft = (props: IconProps) => (
  <Artwork name="ChevronLeft" {...props} />
);
export const ChevronRight = (props: IconProps) => (
  <Artwork name="ChevronRight" {...props} />
);
export const Clock3 = (props: IconProps) => (
  <Artwork name="Clock3" {...props} />
);
export const FileText = (props: IconProps) => (
  <Artwork name="FileText" {...props} />
);
export const Flag = (props: IconProps) => <Artwork name="Flag" {...props} />;
export const Gift = (props: IconProps) => <Artwork name="Gift" {...props} />;
export const History = (props: IconProps) => (
  <Artwork name="History" {...props} />
);
export const Home = (props: IconProps) => <Artwork name="Home" {...props} />;
export const Info = (props: IconProps) => <Artwork name="Info" {...props} />;
export const Layers3 = (props: IconProps) => (
  <Artwork name="Layers3" {...props} />
);
export const Lightbulb = (props: IconProps) => (
  <Artwork name="Lightbulb" {...props} />
);
export const LoaderCircle = (props: IconProps) => (
  <Artwork name="LoaderCircle" {...props} />
);
export const LogIn = (props: IconProps) => <Artwork name="LogIn" {...props} />;
export const Menu = (props: IconProps) => <Artwork name="Menu" {...props} />;
export const Pause = (props: IconProps) => <Artwork name="Pause" {...props} />;
export const PencilLine = (props: IconProps) => (
  <Artwork name="PencilLine" {...props} />
);
export const Play = (props: IconProps) => <Artwork name="Play" {...props} />;
export const RefreshCw = (props: IconProps) => (
  <Artwork name="RefreshCw" {...props} />
);
export const Rocket = (props: IconProps) => (
  <Artwork name="Rocket" {...props} />
);
export const RotateCcw = (props: IconProps) => (
  <Artwork name="RotateCcw" {...props} />
);
export const Search = (props: IconProps) => (
  <Artwork name="Search" {...props} />
);
export const Sparkles = (props: IconProps) => (
  <Artwork name="Sparkles" {...props} />
);
export const Sprout = (props: IconProps) => (
  <Artwork name="Sprout" {...props} />
);
export const Star = (props: IconProps) => <Artwork name="Star" {...props} />;
export const Trophy = (props: IconProps) => (
  <Artwork name="Trophy" {...props} />
);
export const Upload = (props: IconProps) => (
  <Artwork name="Upload" {...props} />
);
export const UserRound = (props: IconProps) => (
  <Artwork name="UserRound" {...props} />
);
export const Volume2 = (props: IconProps) => (
  <Artwork name="Volume2" {...props} />
);
export const X = (props: IconProps) => <Artwork name="X" {...props} />;

export function Glyph({
  token,
  size = 36,
  className = "",
}: {
  token?: string;
  size?: number;
  className?: string;
}) {
  const map: Record<string, string> = {
    math: "Layers3",
    english: "EnglishAlphabet",
    vietnamese: "VietnameseAlphabet",
    self: "PencilLine",
    library: "Library",
    practice: "FileText",
    review: "RefreshCw",
    "review-set": "BookOpen",
    upload: "Upload",
    journey: "History",
    timo: "Trophy",
    ranking: "RankingPodium",
    rewards: "Gift",
    "⭐": "Star",
    "✨": "Sparkles",
    "🌟": "Star",
    "✦": "Sparkles",
    "🏆": "Trophy",
    "🏅": "Award",
    "🛡️": "Award",
    "🌱": "Sprout",
    "🌿": "Sprout",
    "👋": "UserRound",
    "📚": "BookOpen",
    "📖": "BookOpen",
    "👣": "Rocket",
    "💪": "Flag",
    "🛠️": "PencilLine",
    "🦋": "Sprout",
    "🪽": "Rocket",
    "📅": "Clock3",
    "🔥": "Lightbulb",
    "🌈": "Sparkles",
    "🏮": "Lightbulb",
    "🧭": "Search",
    "🔭": "Search",
    "🚂": "Rocket",
    "⛵": "Rocket",
    "⛰️": "Flag",
    "🐉": "Rocket",
    "🌌": "Sparkles",
    "＋": "Layers3",
    Aa: "Captions",
    "✎": "PencilLine",
    "△": "Layers3",
    "🧮": "Layers3",
    "🌏": "Rocket",
    "🥇": "Award",
    "🥈": "Award",
    "🥉": "Award",
  };
  return (
    <Artwork
      name={map[token || ""] || "Gift"}
      size={size}
      className={className}
    />
  );
}
function MedalMotif({ index }: { index: number }) {
  const ink = {
    stroke: "#686487",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const star = (
    <path
      d="m12 3 2.5 5 5.5 1-4 4 .9 5.5-4.9-2.5-4.9 2.5.9-5.5-4-4 5.5-1Z"
      fill="#e9c573"
    />
  );
  const pictures = [
    <g key="first">
      {star}
      <path d="M9 10v1m6-1v1m-6 3q3 3 6 0" {...ink} fill="none" />
    </g>,
    <g key="steps">
      <ellipse
        cx="8"
        cy="15"
        rx="3"
        ry="4"
        transform="rotate(-25 8 15)"
        fill="#a8bddf"
      />
      <ellipse
        cx="16"
        cy="9"
        rx="3"
        ry="4"
        transform="rotate(25 16 9)"
        fill="#d3c1e7"
      />
      <circle cx="5" cy="9" r="1.5" fill="#a8bddf" />
      <circle cx="18" cy="3" r="1.5" fill="#d3c1e7" />
      <path d="m3 21 2-1m15-5 2-1" {...ink} />
    </g>,
    <g key="seed">
      <path d="M3 16q5-2 9 1 5-3 9-1v5q-4-1-9 1-4-2-9-1Z" fill="#b9c5e4" />
      <path
        d="M12 17V8m0 4C4 13 3 6 5 4c6 0 8 4 7 8m0-3c0-6 6-7 9-6 0 6-5 10-9 6"
        fill="#b6d1a7"
        stroke="#7e9d85"
        strokeWidth="1.2"
      />
    </g>,
    <g key="pouch">
      <path d="m5 3 7 2 7-2-3 7q8 9 1 11H7Q0 19 8 10Z" fill="#d3bee5" />
      <path d="M8 9h8" {...ink} />
      <g transform="translate(5 8) scale(.6)">{star}</g>
    </g>,
    <g key="retry">
      <path
        d="M18 6a8 8 0 1 0 2 10"
        fill="none"
        stroke="#a4c4b2"
        strokeWidth="4"
      />
      <path d="m17 2 4 7-8 1" fill="#a4c4b2" />
      <path d="m7 12 3 3 5-6" {...ink} fill="none" />
    </g>,
    <g key="repair">
      <path d="m4 18 12-13 4 4L8 22H3Z" fill="#eac1a4" />
      <path d="m5 3 7 2-3 3 6 7-3 3-6-7-3 2Z" fill="#b9c5de" />
      <path d="m14 7 4 4" {...ink} />
    </g>,
    <g key="butterfly">
      <path
        d="M12 12C-1-5-3 17 10 16 2 24 14 25 12 12m0 0C25-5 27 17 14 16c8 8-4 9-2-4"
        fill="#d2b7dd"
      />
      <path d="M12 9v12m0-12L8 5m4 4 4-4" {...ink} fill="none" />
      <circle cx="6" cy="10" r="2" fill="#f1dba1" />
      <circle cx="18" cy="10" r="2" fill="#f1dba1" />
    </g>,
    <g key="wings">
      <path d="M10 17C-2 16 0 3 3 3l9 8 9-8c3 0 5 13-7 14" fill="#b9cce0" />
      <path d="m10 8 4 1 1 10-3 4-3-4Z" fill="#e8c594" />
      <path d="m5 8 3 5m11-5-3 5" {...ink} fill="none" />
    </g>,
    <g key="calendar">
      <rect x="3" y="4" width="18" height="18" rx="4" fill="#b8c6df" />
      <path d="M3 10h18M8 2v5m8-5v5" {...ink} />
      <path d="m8 15 3 3 5-5" {...ink} fill="none" />
    </g>,
    <g key="flame">
      <path
        d="M11 1c1 9-7 7-7 14a8 8 0 0 0 16 0c0-4-2-6-3-8-1 5-3 4-3 2Z"
        fill="#e8b78f"
      />
      <path d="M12 11c-5 5-3 9 0 9 4 0 4-4 0-9" fill="#fae6ab" />
      <path d="M8 16h.1m7.8 0h.1" {...ink} />
    </g>,
    <g key="rainbow">
      <path
        d="M2 20C2-2 22-2 22 20"
        fill="none"
        stroke="#d4b6df"
        strokeWidth="4"
      />
      <path
        d="M6 20C6 5 18 5 18 20"
        fill="none"
        stroke="#eac9a1"
        strokeWidth="3"
      />
      <path
        d="M10 20c0-8 4-8 4 0"
        fill="none"
        stroke="#adc9bf"
        strokeWidth="3"
      />
    </g>,
    <g key="lighthouse">
      <path d="m9 8-3 14h12L15 8Z" fill="#bbcae3" />
      <path d="M8 4h8v6H8Z" fill="#f1d69b" />
      <path
        d="m6 4 6-4 6 4M8 14h8M1 6l4 1m14 0 4-1M2 22h20"
        {...ink}
        fill="none"
      />
    </g>,
    <g key="compass">
      <circle cx="12" cy="12" r="10" fill="#bed6cf" />
      <circle cx="12" cy="12" r="7" fill="#fff4df" />
      <path d="m17 5-3 9-7 5 3-9Z" fill="#b29acb" />
      <path d="m17 5-5 7 2 2Z" fill="#e5c790" />
    </g>,
    <g key="telescope">
      <path d="m3 11 13-8 5 8-14 6Z" fill="#b9b6df" />
      <path d="m15 4 4 7M2 12l3 6m7-3v7m0-7-5 7m5-7 5 7" {...ink} fill="none" />
      <ellipse
        cx="19"
        cy="7"
        rx="2"
        ry="5"
        transform="rotate(-28 19 7)"
        fill="#c8e0e3"
      />
    </g>,
    <g key="train">
      <path d="M2 10h15v9H2Zm10-7h9v12h-9Z" fill="#b8cbe1" />
      <path d="M14 5h4v5h-4Z" fill="#fff3d6" />
      <path d="M4 6h4v5H4Z" fill="#ddc2df" />
      <circle cx="6" cy="20" r="3" fill="#8d86b0" />
      <circle cx="17" cy="20" r="3" fill="#8d86b0" />
      <path d="M2 23h20" {...ink} />
    </g>,
    <g key="sail">
      <path d="M2 17h21l-4 6H7Z" fill="#b6cfc3" />
      <path d="M12 1v16H3Zm2 4 8 11h-8Z" fill="#cdb9de" />
      <path d="M12 1v16M5 20h15" {...ink} />
      <path d="m3 3 2-2 2 2" {...ink} fill="none" />
    </g>,
    <g key="shield">
      <path d="M12 1 22 6l-2 11-8 6-8-6L2 6Z" fill="#b9c9df" />
      <path d="m12 4 7 4-2 8-5 4-5-4-2-8Z" fill="#fff3d4" />
      <g transform="translate(5 5) scale(.58)">{star}</g>
    </g>,
    <g key="summit">
      <circle cx="18" cy="5" r="4" fill="#eacb8f" />
      <path d="m1 22 9-20 12 20Z" fill="#b8cbd8" />
      <path d="m6 11 4-9 5 9-4-2-2 3Z" fill="#fff9ec" />
      <path d="M10 2V0" {...ink} />
    </g>,
    <g key="dragon">
      <path d="M10 10 2 5l1 11 7-2m4-4 8-5-1 11-7-2" fill="#b4c9b5" />
      <path d="m7 5 3-4 2 3 3-3 3 6-1 12-5 4-6-4Z" fill="#dcc58c" />
      <path d="M8 11h1m6 0h1m-7 5 3 2 3-2" {...ink} fill="none" />
    </g>,
    <g key="galaxy">
      <ellipse
        cx="12"
        cy="13"
        rx="12"
        ry="4"
        transform="rotate(-30 12 13)"
        fill="none"
        stroke="#baa2d5"
        strokeWidth="2"
      />
      <g transform="translate(4 4) scale(.65)">{star}</g>
      <circle cx="20" cy="4" r="2" fill="#a7cbd3" />
      <circle cx="4" cy="21" r="1.6" fill="#d9b4d2" />
    </g>,
  ];
  return (
    <svg x="28" y="22" width="44" height="44" viewBox="0 0 24 24">
      {pictures[index]}
    </svg>
  );
}
export function MedalArtwork({ id, size = 88 }: { id: string; size?: number }) {
  const ids = [
    "first-star",
    "first-journey",
    "little-brave",
    "twenty-stars",
    "try-again",
    "repair-five",
    "repair-twenty",
    "independent-fifty",
    "three-days",
    "streak-three",
    "streak-seven",
    "streak-thirty",
    "three-topics",
    "two-subjects",
    "five-lessons",
    "twentyfive-lessons",
    "brave-warrior",
    "mountain-fifteen",
    "dragon-fifty",
    "fivehundred-stars",
  ];
  const index = Math.max(0, ids.indexOf(id));
  const colors = ["#f0ce8e", "#b8c8e9", "#b8d6c5", "#cfbbe5", "#e5b7ca"];
  return (
    <svg
      className="vui-medal"
      width={size}
      height={size * 1.18}
      viewBox="0 0 100 118"
      aria-hidden="true"
    >
      <path
        d="m27 65-5 49 16-9 13 12 3-48m1 0 5 48 13-12 17 9-11-49"
        fill={colors[index % 5]}
      />
      <path
        d="m31 75-4 30 10-6 10 9 3-33m11 0 4 33 8-9 11 6-8-30"
        fill="#fff"
        opacity=".3"
      />
      <path
        d="M50 3 62 8l13 1 7 11 10 9-1 14 3 12-9 11-5 12-14 3-12 7-12-5-14-1-8-12-10-9 1-14-3-12 9-10 6-13 14-2Z"
        fill={colors[index % 5]}
      />
      <circle cx="50" cy="44" r="32" fill="#fff8ed" />
      <circle
        cx="50"
        cy="44"
        r="27"
        fill="none"
        stroke={colors[index % 5]}
        strokeWidth="1.5"
        strokeDasharray="2 4"
      />
      <MedalMotif index={index} />
      <path d="m82 5 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill={colors[index % 5]} />
      {index > 15 && <path d="m35 74 15-6 15 6-15 7Z" fill="#b5874f" />}
    </svg>
  );
}
export function WelcomeScene() {
  const gradientId = useId();
  return (
    <svg className="welcome-scene" viewBox="0 0 460 350" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x2="1" y2="1">
          <stop stopColor="#e5d4ff" />
          <stop offset="1" stopColor="#a5c8f3" />
        </linearGradient>
      </defs>
      <ellipse
        cx="229"
        cy="183"
        rx="151"
        ry="142"
        fill={`url(#${gradientId})`}
        opacity=".3"
      />
      <ellipse
        cx="229"
        cy="183"
        rx="131"
        ry="123"
        fill="none"
        stroke="#e6d9f8"
        strokeWidth="2"
        strokeDasharray="5 12"
      />
      <path
        d="M48 255Q202 321 404 114"
        fill="none"
        stroke="#e8c491"
        strokeWidth="3"
        strokeDasharray="4 10"
      />
      <g transform="rotate(-12 225 175)">
        <path
          d="M112 235q38-23 103 3 63-26 125-1v51q-67-12-124 12-53-25-104-13Z"
          fill="#6e7dc0"
        />
        <path
          d="M112 224q48-20 103 5 62-28 125-3v48q-67-12-124 12-53-25-104-13Z"
          fill="#fff4df"
        />
        <path
          d="M216 230v54m-80-44 49 10m-49 5 37 8m77-15 58-9m-57 25 43-8"
          fill="none"
          stroke="#b9a7d6"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <path
        d="m227 70 28 39 45 8-27 37 5 45-44-14-42 17 1-45-29-35 44-11Z"
        fill="#f4cf85"
      />
      <path d="m227 70 6 27-25 14-44 11 28 6 26-4 24-22Z" fill="#fff4d5" />
      <ellipse cx="215" cy="140" rx="4" ry="6" fill="#4b4c73" />
      <ellipse cx="248" cy="140" rx="4" ry="6" fill="#4b4c73" />
      <path
        d="M220 156q12 13 25-1"
        fill="none"
        stroke="#806076"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <ellipse cx="202" cy="153" rx="10" ry="5" fill="#eaa8a4" />
      <ellipse cx="259" cy="153" rx="10" ry="5" fill="#eaa8a4" />
      <g transform="translate(332 65) rotate(18)">
        <path d="M0 0h37v47H0Z" fill="#baa6e1" />
        <path d="M5 0v47m5-34h19m-19 7h15" stroke="#fff1df" strokeWidth="2" />
      </g>
      <g transform="translate(75 139) rotate(-24)">
        <path d="M0 0h13v63L6 76 0 63Z" fill="#f2b8a3" />
        <path d="M0 9h13M0 62h13" stroke="#fff4df" strokeWidth="3" />
      </g>
      <path
        d="m374 230 5 12 13 4-13 5-5 13-4-13-13-5 13-4Zm-266-166 3 8 9 3-9 3-3 9-3-9-9-3 9-3Z"
        fill="#e5c497"
      />
      <circle cx="155" cy="75" r="5" fill="#b8a6db" />
      <circle cx="362" cy="187" r="6" fill="#b2c9e2" />
    </svg>
  );
}

/** Official approved mark. Canonical artwork: public/brand/vui-hoc-logo.svg. */
export function BrandLogo({ size = 40 }: { size?: number }) {
  return (
    <img
      src="/brand/vui-hoc-logo.svg"
      width={size}
      height={size}
      className="brand-logo"
      alt=""
      aria-hidden="true"
    />
  );
}
