export type HomeVideo = {
  youtubeId: string | null;
  title: string;
  embedUrl?: string;
};

// Videos appear in the order selected for the home page.
// Embed URLs supplied by the user, including YouTube's sharing parameters.
export const homeVideos: readonly HomeVideo[] = [
  {
    youtubeId: "qTQwaWPfZlw",
    title: "Video 01",
    embedUrl: "https://www.youtube.com/embed/qTQwaWPfZlw?si=rc1VdLVKQuRWxD1k",
  },
  {
    youtubeId: "3acYaHSFdVA",
    title: "Video 02",
    embedUrl: "https://www.youtube.com/embed/3acYaHSFdVA?si=aR4Aly1_L6-O9vCE",
  },
  {
    youtubeId: "2YwWn2M3wts",
    title: "Video 03",
    embedUrl: "https://www.youtube.com/embed/2YwWn2M3wts?si=PW5m9sGWbsvFykY4",
  },
  {
    youtubeId: "nyFvkfRPrDw",
    title: "Video 04",
    embedUrl: "https://www.youtube.com/embed/nyFvkfRPrDw?si=OtMW1vCU8Bi-jQCi",
  },
];
