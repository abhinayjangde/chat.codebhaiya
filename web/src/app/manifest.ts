import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Codebhaiya AI Workbench",
    short_name: "Codebhaiya",
    description:
      "Intelligent AI workbench for developers and builders with multi-model routing, web citations, and document analysis.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1112",
    theme_color: "#0b1112",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
