import Link from "next/link";
import Image from "next/image";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#e9f1ed]/10 bg-[#0b1112]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#75e8d0] shadow-[4px_4px_0_#e2b45c]">
            <Image
              src="https://avatars.githubusercontent.com/u/166032907?v=4"
              alt="Logo"
              className="size-7 rounded-full"
              width={28}
              height={28}
            />
          </div>
          <span
            className="text-[#e9f1ed] font-bold tracking-[0.16em] text-base uppercase"
            style={{ fontFamily: "var(--font-fraunces), serif" }}
          >
            CodebhaiyaAI
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#features" className="text-[#9aadaa] hover:text-[#75e8d0] transition-colors">Capabilities</a>
          <a href="#models" className="text-[#9aadaa] hover:text-[#75e8d0] transition-colors">Prompts</a>
          <a href="#how-it-works" className="text-[#9aadaa] hover:text-[#75e8d0] transition-colors">Your next move</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/register"
            className="hidden sm:inline-flex text-sm font-medium text-[#9aadaa] hover:text-[#75e8d0] transition-colors"
          >
            Register
          </Link>
          <Link
            href="/chat"
            className="inline-flex h-9 items-center justify-center bg-[#75e8d0] px-5 text-sm font-bold text-[#0b1112] transition-colors hover:bg-[#9bf1df]"
          >
            Go to Chat
          </Link>
        </div>
      </div>
    </header>
  );
}