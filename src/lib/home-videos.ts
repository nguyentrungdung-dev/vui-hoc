export type HomeVideo = {
  youtubeId: string | null;
  title: string;
  allowEmbed?: boolean;
  embedUrl?: string;
};

// Videos appear in the order selected for the home page.
// Embed URLs supplied by the user, including YouTube's sharing parameters.
export const homeVideos: readonly HomeVideo[] = [
  {
    youtubeId: "STzVMU2bhjE",
    title: "Video 01",
    allowEmbed: true,
    embedUrl: "https://www.youtube.com/embed/STzVMU2bhjE?si=H9v52V35hce0l64r",
  },
  {
    youtubeId: "f0o5NQ9MUjs",
    title: "Video 02",
    allowEmbed: true,
    embedUrl: "https://www.youtube.com/embed/f0o5NQ9MUjs?si=WCNTVBKQGjY1hg1G",
  },
  {
    youtubeId: "0P1pqrQnWt8",
    title: "Video 03",
    allowEmbed: true,
    embedUrl: "https://www.youtube.com/embed/0P1pqrQnWt8?si=w_Ecc8QEkDIcRaIf",
  },
  {
    youtubeId: "ctRTaBaGh5Y",
    title: "Video 04",
    allowEmbed: true,
    embedUrl: "https://www.youtube.com/embed/ctRTaBaGh5Y?si=JUX5dPNlRtFwIfbw",
  },
];
