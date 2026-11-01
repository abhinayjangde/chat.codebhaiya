import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type LegalSection = {
  title: string;
  children: ReactNode;
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
};

export function LegalPage({
  eyebrow,
  title,
  intro,
  updated,
  sections,
}: LegalPageProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0b1112] text-[#e9f1ed]">
      <header className="border-b border-[#e9f1ed]/10">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6 sm:px-10">
          <Link href="/" className="flex items-center gap-3" aria-label="Codebhaiya home">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#75e8d0] shadow-[4px_4px_0_#e2b45c]">
              <Image
                src="https://avatars.githubusercontent.com/u/166032907?v=4"
                alt=""
                className="size-7 rounded-full"
                width={28}
                height={28}
              />
            </div>
            <span className="text-sm font-bold uppercase tracking-[0.16em]" style={{ fontFamily: "var(--font-fraunces), serif" }}>
              CodebhaiyaAI
            </span>
          </Link>
          <Link href="/chat" className="text-xs font-bold uppercase tracking-[0.14em] text-[#75e8d0] transition-colors hover:text-[#e9f1ed]">
            Open the workbench <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      <div className="pointer-events-none absolute right-[-10rem] top-32 h-96 w-96 rounded-full bg-[#1cbfa6]/10 blur-3xl" />
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:px-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24 lg:py-24">
        <aside className="relative">
          <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.22em] text-[#75e8d0]">
            <span className="h-px w-8 bg-[#75e8d0]" /> {eyebrow}
          </p>
          <h1 className="mt-7 max-w-md text-5xl font-medium leading-[0.95] tracking-[-0.06em] sm:text-7xl">{title}</h1>
          <p className="mt-7 max-w-sm text-base leading-7 text-[#9aadaa]">{intro}</p>
          <p className="mt-8 text-xs uppercase tracking-[0.14em] text-[#718380]">Last updated {updated}</p>
        </aside>

        <article className="relative border-l border-[#e9f1ed]/10 pl-6 sm:pl-10">
          <div className="space-y-12">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-2xl font-medium tracking-[-0.04em] text-[#e9f1ed]">{section.title}</h2>
                <div className="mt-4 space-y-4 text-[15px] leading-7 text-[#9aadaa]">{section.children}</div>
              </section>
            ))}
          </div>
        </article>
      </div>

      <footer className="border-t border-[#e9f1ed]/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-xs text-[#718380] sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <span>© {new Date().getFullYear()} Codebhaiya. Built for curious people.</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="transition-colors hover:text-[#75e8d0]">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-[#75e8d0]">Terms</Link>
            <a href="mailto:hello@codebhaiya.com" className="transition-colors hover:text-[#75e8d0]">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
