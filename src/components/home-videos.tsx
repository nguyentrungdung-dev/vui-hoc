"use client";

import { homeVideos } from "@/lib/home-videos";
import { ArrowRight, Play } from "./icons";

export function HomeVideos() {
  return (
    <section className="home-videos" aria-label="Video khám phá">
      <div className="home-video-grid">
        {homeVideos.map((video, index) => {
          const content = (
            <>
              <div className="home-video-preview">
                {video.youtubeId && video.allowEmbed ? (
                  <iframe
                    src={`${video.embedUrl || `https://www.youtube.com/embed/${video.youtubeId}`}${video.embedUrl ? "&" : "?"}autoplay=1&mute=1&playsinline=1&controls=0&disablekb=1&loop=1&playlist=${video.youtubeId}&rel=0`}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                ) : video.youtubeId ? (
                  <>
                    {/* Native image: YouTube serves the selected video's cover. */}
                    <img
                      className="home-video-cover"
                      src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
                      alt=""
                      width={480}
                      height={360}
                    />
                    <span className="home-video-play" aria-hidden="true">
                      <Play size={26} />
                    </span>
                  </>
                ) : (
                  <span className="home-video-placeholder">
                    <Play size={28} aria-hidden="true" />
                    <span>Sắp có video</span>
                  </span>
                )}
              </div>
              <div className="home-video-caption">
                <h2>{video.title}</h2>
                {video.youtubeId && (
                  <span>
                    Xem trên YouTube <ArrowRight size={14} aria-hidden="true" />
                  </span>
                )}
              </div>
            </>
          );

          return video.youtubeId ? (
            <a
              key={index}
              className="home-video-card"
              href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
              aria-label={`${video.title} — xem trên YouTube`}
            >
              {content}
            </a>
          ) : (
            <div key={index} className="home-video-card is-pending">
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
