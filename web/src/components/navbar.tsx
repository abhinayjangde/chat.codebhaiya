import Link from "next/link";
import Image from "next/image";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#050505]/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            <Image
              src="https://avatars.githubusercontent.com/u/166032907?v=4"
              alt="Logo"
              className="size-7 rounded-full"
              width={28}
              height={28}
            />
          </div>
          <span
            className="text-white font-bold tracking-widest text-base uppercase"
            style={{ fontFamily: "var(--font-fraunces), serif" }}
          >
            CodebhaiyaAI
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#features" className="text-[#888] hover:text-white transition-colors">Features</a>
          <a href="#models" className="text-[#888] hover:text-white transition-colors">Models</a>
          <a href="#how-it-works" className="text-[#888] hover:text-white transition-colors">How it Works</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/register"
            className="hidden sm:inline-flex text-sm font-medium text-[#888] hover:text-white transition-colors"
          >
            Register
          </Link>
          <Link
            href="/chat"
            className="inline-flex h-9 items-center justify-center rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-5 text-sm font-medium text-[#ccc] transition-colors hover:bg-[#252525] hover:text-white"
          >
            Go to Chat
          </Link>
        </div>
      </div>
    </header>
  );
}