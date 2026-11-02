import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://chat.codebhaiya.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/register", "/login", "/privacy", "/terms"],
        disallow: [
          "/chat",
          "/documents",
          "/forgot-password",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
