import { ImageResponse } from "next/og";

export const alt = "Codebhaiya | The AI Workbench for Builders";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          backgroundColor: "#0b1112",
          color: "#e9f1ed",
          border: "4px solid #1c3935",
        }}
      >
        {/* Top bar with brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                backgroundColor: "#75e8d0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                fontWeight: 900,
                color: "#0b1112",
              }}
            >
              CB
            </div>
            <span
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#e9f1ed",
              }}
            >
              CodebhaiyaAI
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 18px",
              borderRadius: "24px",
              backgroundColor: "rgba(117, 232, 208, 0.12)",
              border: "1px solid rgba(117, 232, 208, 0.35)",
              color: "#75e8d0",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            AI Workbench
          </div>
        </div>

        {/* Center Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: 66,
              lineHeight: 1.05,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: "#ffffff",
              display: "flex",
            }}
          >
            Think out loud.&nbsp;
            <span style={{ color: "#75e8d0" }}>Build</span>&nbsp;in public.
          </div>
          <div
            style={{
              fontSize: 24,
              lineHeight: 1.45,
              color: "#9aadaa",
              maxWidth: 960,
            }}
          >
            An intelligent workspace for developers. Multi-model routing (Gemini, Llama, GPT), live web citations, and document intelligence.
          </div>
        </div>

        {/* Footer features */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(233, 241, 237, 0.12)",
            paddingTop: 28,
            width: "100%",
          }}
        >
          <div style={{ display: "flex", gap: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: "#151e1f",
                padding: "8px 16px",
                border: "1px solid rgba(233, 241, 237, 0.15)",
                color: "#75e8d0",
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#75e8d0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Grounded Web Citations
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: "#151e1f",
                padding: "8px 16px",
                border: "1px solid rgba(233, 241, 237, 0.15)",
                color: "#e2b45c",
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e2b45c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Multi-Model AI Routing
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: "#151e1f",
                padding: "8px 16px",
                border: "1px solid rgba(233, 241, 237, 0.15)",
                color: "#9aadaa",
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9aadaa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Document Intelligence
            </div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#75e8d0" }}>
            chat.codebhaiya.com
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
