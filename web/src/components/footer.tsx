import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="landing-footer relative z-10 border-t py-10">
      <div className="landing-footer-inner mx-auto max-w-6xl px-5 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="footer-mark flex h-8 w-8 items-center justify-center rounded-full">
            <Image
              src="https://avatars.githubusercontent.com/u/166032907?v=4"
              alt="Logo"
              className="size-6 rounded-full"
              width={24}
              height={24}
            />
          </div>
          <span className="footer-brand font-bold tracking-widest text-sm uppercase" style={{ fontFamily: "var(--font-fraunces), serif" }}>
            Codebhaiya
          </span>
        </div>
        <p className="footer-copy text-xs" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>
          © {new Date().getFullYear()} Codebhaiya. All rights reserved.
        </p>
        <div className="footer-links flex gap-6 text-xs">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href="mailto:hello@codebhaiya.com">Contact</a>
        </div>
      </div>
    </footer>
  );
}
