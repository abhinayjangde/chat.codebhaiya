import Image from "next/image";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/[0.06] py-10">
      <div className="mx-auto max-w-6xl px-5 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/10">
            <Image
              src="https://avatars.githubusercontent.com/u/166032907?v=4"
              alt="Logo"
              className="size-6 rounded-full"
              width={24}
              height={24}
            />
          </div>
          <span className="text-white font-bold tracking-widest text-sm uppercase" style={{ fontFamily: "var(--font-fraunces), serif" }}>
            CodebhaiyaAI
          </span>
        </div>
        <p className="text-[#555] text-xs" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>
          © {new Date().getFullYear()} Codebhaiya. All rights reserved.
        </p>
        <div className="flex gap-6 text-xs text-[#555]">
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}