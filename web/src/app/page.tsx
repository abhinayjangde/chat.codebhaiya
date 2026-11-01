"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Code2,
  FileSearch,
  Mic,
  Paperclip,
  Search,
  Terminal,
  WandSparkles,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const capabilities = [
  { number: "01", icon: FileSearch, title: "Grounded answers", text: "Search the live web and your documents without leaving the thread." },
  { number: "02", icon: Code2, title: "Code that fits", text: "Explain, refactor, and ship code with context from the work you are already doing." },
  { number: "03", icon: WandSparkles, title: "The right model", text: "Move between fast, visual, and reasoning-first models in one calm workspace." },
];

const prompts = [
  { icon: Terminal, text: "Explain this error in plain English" },
  { icon: BookOpen, text: "Turn my notes into a study plan" },
  { icon: Search, text: "Find the latest on React Server Components" },
];

export default function HomePage() {
  return (
    <main className="home-shell min-h-screen overflow-hidden bg-[#0b1112] text-[#e9f1ed]">
      <Navbar />
      <section className="relative border-b border-[#e9f1ed]/10">
        <div className="home-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="absolute -left-48 top-20 h-96 w-96 rounded-full bg-[#1cbfa6]/10 blur-3xl" />
        <div className="mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-16 sm:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20 lg:px-16 lg:pb-28 lg:pt-24">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="relative z-10">
            <p className="mb-7 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.22em] text-[#75e8d0]"><span className="h-px w-8 bg-[#75e8d0]" /> An AI workbench for curious people</p>
            <h1 className="max-w-2xl text-[4rem] font-medium leading-[0.91] tracking-[-0.06em] text-[#e9f1ed] sm:text-[6rem] lg:text-[7.4rem]">Think out loud. <em className="font-normal text-[#75e8d0]">Build</em> in public.</h1>
            <p className="mt-8 max-w-lg text-lg leading-8 text-[#9aadaa] sm:text-xl">Codebhaiya is the intelligent workspace for turning rough questions into clear plans, useful code, and work you are proud to share.</p>
            <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Link href="/chat" className="group inline-flex h-13 items-center gap-3 bg-[#75e8d0] px-6 text-sm font-bold text-[#0b1112] transition-transform hover:-translate-y-1">Open the workbench <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /></Link>
              <Link href="/register" className="inline-flex items-center gap-2 px-3 py-3 text-sm font-bold text-[#e9f1ed] underline decoration-[#e2b45c] decoration-2 underline-offset-4 hover:text-[#75e8d0]">Start for free <span aria-hidden="true">↗</span></Link>
            </div>
            <div className="mt-12 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.14em] text-[#718380]"><span className="flex -space-x-2">{["#75e8d0", "#e2b45c", "#e77c65"].map((color) => <span key={color} className="h-7 w-7 rounded-full border-2 border-[#0b1112]" style={{ backgroundColor: color }} />)}</span> Used by builders who like to understand the why</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.15 }} className="relative z-10">
            <div className="absolute -right-5 -top-7 hidden h-24 w-24 border-r border-t border-[#75e8d0] sm:block" />
            <div className="workbench-panel relative border border-[#e9f1ed]/10 bg-[#151e1f] p-3 shadow-[14px_14px_0_#263c37] sm:p-5">
              <div className="flex items-center justify-between border-b border-[#e9f1ed]/10 pb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#718380]"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#e2b45c]" /> New thread</span><span>01 / 04</span></div>
              <div className="min-h-[330px] py-8 sm:min-h-[380px] sm:px-5"><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#75e8d0]">You asked</p><p className="mt-3 max-w-md text-2xl font-medium leading-tight tracking-[-0.03em] text-[#e9f1ed] sm:text-3xl">How do I make my side project feel less like a side project?</p><div className="my-8 h-px bg-[#e9f1ed]/10" /><p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-[#75e8d0]">Codebhaiya says</p><p className="max-w-md text-base leading-7 text-[#9aadaa]">Start with the part people can feel: a clear point of view, a short path to value, and one detail that makes the experience unmistakably yours.</p><div className="mt-7 flex flex-wrap gap-2 text-xs font-bold text-[#b8c8c3]"><span className="bg-[#1c3935] px-3 py-2"><Check className="mr-1 inline h-3 w-3 text-[#75e8d0]" /> Point of view</span><span className="bg-[#3a3020] px-3 py-2"><Check className="mr-1 inline h-3 w-3 text-[#e2b45c]" /> Clear next step</span></div></div>
              <div className="flex items-center gap-3 border-t border-[#e9f1ed]/10 pt-4"><Paperclip className="h-4 w-4 text-[#718380]" /><span className="flex-1 text-sm text-[#627571]">Ask anything, attach context...</span><button aria-label="Use voice input" className="p-2 text-[#75e8d0] hover:bg-[#1c3935]"><Mic className="h-4 w-4" /></button><Link aria-label="Send message" href="/chat" className="bg-[#75e8d0] p-2 text-[#0b1112] hover:bg-[#9bf1df]"><ArrowUpRight className="h-4 w-4" /></Link></div>
            </div>
            <div className="mt-7 flex justify-end gap-3 text-xs font-bold uppercase tracking-[0.14em] text-[#718380]"><span className="h-px w-10 self-center bg-[#718380]" /> Think less about prompts. More about progress.</div>
          </motion.div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:px-16 lg:py-28"><div className="mb-14 flex flex-col justify-between gap-6 border-b border-[#e9f1ed]/10 pb-8 sm:flex-row sm:items-end"><div><p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#75e8d0]">The useful stuff</p><h2 className="max-w-xl text-4xl font-medium leading-none tracking-[-0.05em] sm:text-6xl">A sharper second brain.</h2></div><p className="max-w-xs text-sm leading-6 text-[#9aadaa]">Less ceremony between a thought and the thing it becomes.</p></div><div className="grid gap-px bg-[#e9f1ed]/10 md:grid-cols-3">{capabilities.map((item) => <article key={item.number} className="group bg-[#0f1718] p-7 transition-colors hover:bg-[#172525] sm:p-9"><div className="flex items-start justify-between"><span className="text-sm font-bold text-[#e2b45c]">{item.number}</span><item.icon className="h-6 w-6 text-[#75e8d0] transition-transform group-hover:rotate-12" /></div><h3 className="mt-20 text-2xl font-medium tracking-[-0.04em]">{item.title}</h3><p className="mt-4 max-w-xs text-sm leading-6 text-[#9aadaa]">{item.text}</p></article>)}</div></section>

      <section id="models" className="border-y border-[#e9f1ed]/10 bg-[#121c1d]"><div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 sm:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:px-16 lg:py-24"><div><p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[#75e8d0]">Start anywhere</p><h2 className="max-w-md text-4xl font-medium leading-[0.95] tracking-[-0.05em] sm:text-6xl">Bring the half-formed idea.</h2><p className="mt-6 max-w-sm text-[#9aadaa]">The best prompts are often not prompts yet. Pick a direction and let the conversation do the shaping.</p></div><div className="space-y-3">{prompts.map((prompt) => <Link key={prompt.text} href="/chat" className="group flex items-center gap-5 border-b border-[#e9f1ed]/15 py-5 text-lg transition-colors hover:border-[#75e8d0]"><prompt.icon className="h-5 w-5 text-[#75e8d0]" /><span className="flex-1">{prompt.text}</span><ArrowUpRight className="h-5 w-5 text-[#718380] transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" /></Link>)}</div></div></section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:px-16 lg:py-28"><div className="flex flex-col items-start justify-between gap-10 sm:flex-row sm:items-end"><div><p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#75e8d0]">Your next move</p><h2 className="text-4xl font-medium tracking-[-0.05em] sm:text-6xl">Make a little<br /><span className="text-[#75e8d0]">more sense</span>.</h2></div><Link href="/chat" className="inline-flex items-center gap-2 border-b-2 border-[#e2b45c] pb-2 text-sm font-bold">Open Codebhaiya <ArrowUpRight className="h-4 w-4" /></Link></div></section>
      <Footer />
    </main>
  );
}
