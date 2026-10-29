"use client";
import { GuidanceStoryStage } from "./guidance-story-stage";
import { useEffect, useRef } from "react";
import type { GuidanceMotion } from "@/lib/guidance";

/** The vetted static renderer accepts data only; it never runs model code.
 * Its paused GSAP timeline is driven exclusively by the parent's audio clock. */
function CarryMotionStage({
  motion,
  time,
}: {
  motion: GuidanceMotion;
  time: number;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const clock = useRef(time);
  clock.current = time;
  useEffect(() => {
    function initialize(event: MessageEvent) {
      if (
        event.source !== ref.current?.contentWindow ||
        event.origin !== location.origin ||
        event.data?.type !== "guidance-stage-ready"
      )
        return;
      ref.current.contentWindow?.postMessage(
        {
          type: "guidance-init",
          data: {
            events: motion.events,
            clips: { duration: motion.duration, clips: motion.clips },
          },
        },
        location.origin,
      );
      ref.current.contentWindow?.postMessage(
        { type: "guidance-time", time: clock.current },
        location.origin,
      );
    }
    window.addEventListener("message", initialize);
    return () => window.removeEventListener("message", initialize);
  }, [motion]);
  useEffect(() => {
    ref.current?.contentWindow?.postMessage(
      { type: "guidance-time", time },
      location.origin,
    );
  }, [time]);
  return (
    <iframe
      ref={ref}
      src="/guidance/carry-v2/stage.html"
      onLoad={() => {
        ref.current?.contentWindow?.postMessage(
          {
            type: "guidance-init",
            data: {
              events: motion.events,
              clips: { duration: motion.duration, clips: motion.clips },
            },
          },
          location.origin,
        );
        ref.current?.contentWindow?.postMessage(
          { type: "guidance-time", time: clock.current },
          location.origin,
        );
      }}
      title="Minh họa gom mười đơn vị thành một chục"
      tabIndex={-1}
      style={{
        width: "100%",
        aspectRatio: "16 / 9",
        display: "block",
        border: 0,
        borderRadius: 18,
        pointerEvents: "none",
      }}
    />
  );
}

export function GuidanceMotionStage({
  motion,
  time,
}: {
  motion: GuidanceMotion;
  time: number;
}) {
  return motion.template === "lesson-v3" ? (
    <GuidanceStoryStage motion={motion} time={time} />
  ) : (
    <CarryMotionStage motion={motion} time={time} />
  );
}
