import Link from "next/link";
import Image from "next/image";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#172126]/15 bg-[#f4f0e7]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#087f78] shadow-[4px_4px_0_#d9c98c]">
            <Image
              src="https://avatars.githubusercontent.com/u/166032907?v=4"
              alt="Logo"
              className="size-7 rounded-full"
              width={28}
              height={28}
            />
          </div>
          <span
            className="text-[#172126] font-bold tracking-[0.16em] text-base uppercase"
            style={{ fontFamily: "var(--font-fraunces), serif" }}
          >
            CodebhaiyaAI
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#features" className="text-[#526066] hover:text-[#087f78] transition-colors">Capabilities</a>
          <a href="#models" className="text-[#526066] hover:text-[#087f78] transition-colors">Prompts</a>
          <a href="#how-it-works" className="text-[#526066] hover:text-[#087f78] transition-colors">Your next move</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/register"
            className="hidden sm:inline-flex text-sm font-medium text-[#526066] hover:text-[#087f78] transition-colors"
          >
            Register
          </Link>
          <Link
            href="/chat"
            className="inline-flex h-9 items-center justify-center bg-[#172126] px-5 text-sm font-bold text-[#f4f0e7] transition-colors hover:bg-[#087f78]"
          >
            Go to Chat
          </Link>
        </div>
      </div>
    </header>
  );
}