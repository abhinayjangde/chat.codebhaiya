"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BrainCircuit,
  Search,
  Shield,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Mic,
  Code,
  ChevronRight,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const features = [
  { icon: Search, title: "Deep Web Search", desc: "Live internet access to pull the latest documentation, news, and facts into every response." },
  { icon: BrainCircuit, title: "Multi-Model Architecture", desc: "Seamlessly switch between GPT, Gemini, Llama, and more — pick the best brain for every task." },
  { icon: Code, title: "Developer First", desc: "Syntax highlighting, pristine code blocks, and markdown formatting built for builders." },
  { icon: ImageIcon, title: "Vision Capabilities", desc: "Upload and analyze images with models that truly see and understand visual context." },
  { icon: Mic, title: "Audio & Speech", desc: "Interact via voice input — perfect for hands-free learning or accessibility needs." },
  { icon: Shield, title: "Secure & Private", desc: "Your conversations are encrypted and strictly tied to your account. No data sharing." },
];

const models = [
  { name: "Groq Llama 3", desc: "Blazing fast text", color: "from-orange-500/20 to-orange-600/5" },
  { name: "Google Gemini", desc: "Multimodal power", color: "from-blue-500/20 to-blue-600/5" },
  { name: "OpenAI GPT", desc: "Deep reasoning", color: "from-green-500/20 to-green-600/5" },
  { name: "Ollama Cloud", desc: "Open-source models", color: "from-purple-500/20 to-purple-600/5" },
];

const steps = [
  { step: "01", title: "Create an Account", desc: "Sign up for free in under 30 seconds. No credit card required." },
  { step: "02", title: "Select a Model", desc: "Choose the intelligence that fits your task — speed, vision, or reasoning." },
  { step: "03", title: "Start Building", desc: "Ask questions, write code, run web searches, and learn — all in one place." },
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-[#050505] text-[#e0e0e0] overflow-hidden">
      {/* ── Global Background (same as AuthSidebar) ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px),
                              linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        {/* Orbs */}
        <motion.div
          animate={{ x: ["-20%", "20%", "-20%"], y: ["-20%", "20%", "-20%"], scale: [1, 1.2, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen"
        />
        <motion.div
          animate={{ x: ["20%", "-20%", "20%"], y: ["20%", "-20%", "20%"], scale: [1.2, 1, 1.2] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/4 -right-1/4 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[150px] mix-blend-screen"
        />
        {/* Scanline */}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_4px]" />
      </div>

      {/* ── Navigation ── */}
      <Navbar />

      {/* ── Hero Section ── */}
      <section className="relative z-10 pt-24 pb-32 sm:pt-32 sm:pb-40">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-10"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#a78bfa]" />
            <span className="text-xs font-medium tracking-wider text-neutral-300 uppercase">
              Next Generation Intelligence
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl sm:text-7xl font-bold text-white leading-[1.1] mb-8"
            style={{ fontFamily: "var(--font-fraunces), serif" }}
          >
            Unleash your coding{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a78bfa] to-[#6366f1]">
              potential
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mx-auto max-w-2xl text-lg text-neutral-400 leading-relaxed mb-12"
            style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
          >
            Experience the future of development with an intelligent agent that understands
            your codebase, unblocks your workflows, and helps you ship faster.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link
              href="/chat"
              className="inline-flex h-12 items-center justify-center rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-8 text-sm font-medium text-[#ccc] transition-all hover:bg-[#252525] hover:text-white w-full sm:w-auto gap-2"
            >
              Start Chatting <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center rounded-md border border-white/10 bg-white/5 backdrop-blur-md px-8 text-sm font-medium text-[#ccc] transition-all hover:bg-white/10 hover:text-white w-full sm:w-auto gap-2"
            >
              Create Free Account <ChevronRight className="h-4 w-4" />
            </Link>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-14 flex items-center justify-center gap-4"
          >
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-9 h-9 rounded-full border-2 border-[#050505] overflow-hidden relative">
                  <Image
                    src={`https://i.pravatar.cc/100?img=${i}`}
                    alt="Avatar"
                    fill
                    sizes="36px"
                    unoptimized
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
            <div className="text-sm" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>
              <span className="text-white font-semibold">10,000+</span>
              <span className="text-neutral-500 ml-1.5">developers joined</span>
            </div>
          </motion.div>

          {/* Mock Chat Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-20 mx-auto max-w-4xl rounded-2xl border border-white/[0.06] bg-[#0d0d0d]/80 p-3 shadow-2xl backdrop-blur-sm"
          >
            <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-[#0a0a0a]">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3 bg-[#0d0d0d]">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#333]" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#333]" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#333]" />
                </div>
                <div className="mx-auto flex h-6 items-center rounded-md bg-white/5 px-16 sm:px-24 text-xs text-[#555]">
                  chat.codebhaiya.com
                </div>
              </div>
              {/* Mock conversation */}
              <div className="h-[340px] sm:h-[380px] flex p-6 sm:p-8 items-center justify-center">
                <div className="flex flex-col gap-5 w-full max-w-xl">
                  {/* AI message */}
                  <div className="flex gap-3">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center">
                      <Sparkles className="h-3.5 w-3.5 text-[#a78bfa]" />
                    </div>
                    <div className="flex-1 space-y-2.5 rounded-2xl rounded-tl-sm bg-[#151515] border border-[#2a2a2a] p-4">
                      <div className="h-2 w-4/5 bg-[#2a2a2a] rounded" />
                      <div className="h-2 w-3/5 bg-[#2a2a2a] rounded" />
                      <div className="h-2 w-2/5 bg-[#2a2a2a] rounded" />
                    </div>
                  </div>
                  {/* User message */}
                  <div className="flex gap-3 flex-row-reverse">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-[#1a1a1a] border border-white/10" />
                    <div className="rounded-2xl rounded-tr-sm bg-[#1a1a1a] border border-[#2a2a2a] p-4 max-w-[60%]">
                      <div className="h-2 w-full bg-[#2a2a2a] rounded" />
                      <div className="h-2 w-3/4 bg-[#2a2a2a] rounded mt-2.5" />
                    </div>
                  </div>
                  {/* Composer */}
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#2a2a2a] bg-[#151515] px-4 py-3">
                    <div className="h-2 w-32 bg-[#2a2a2a] rounded" />
                    <div className="ml-auto h-7 w-7 rounded-md bg-[#2a2a2a]" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative z-10 py-28 border-t border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-5">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="mb-16 text-center max-w-2xl mx-auto"
          >
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-6">
              <span className="text-xs font-medium tracking-wider text-neutral-300 uppercase">Capabilities</span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl font-bold text-white mb-4"
              style={{ fontFamily: "var(--font-fraunces), serif" }}
            >
              Powerful workflow features
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-neutral-400 text-lg">
              Built from the ground up for developers, learners, and creators.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i}
                className="group rounded-2xl border border-white/[0.06] bg-[#0d0d0d] p-7 transition-all hover:border-white/10 hover:bg-[#111]"
              >
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-[#a78bfa] group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(167,139,250,0.15)] transition-all">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-[#f0f0f0]">{feature.title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Supported Models ── */}
      <section id="models" className="relative z-10 py-28 border-t border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-5">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="flex flex-col lg:flex-row gap-16 items-center"
          >
            <motion.div variants={fadeUp} custom={0} className="flex-1 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
                <Layers className="h-3.5 w-3.5 text-[#a78bfa]" />
                <span className="text-xs font-medium tracking-wider text-neutral-300 uppercase">Multi-Provider</span>
              </div>
              <h2
                className="text-3xl sm:text-4xl font-bold text-white"
                style={{ fontFamily: "var(--font-fraunces), serif" }}
              >
                Choose the perfect brain for your task
              </h2>
              <p className="text-neutral-400 text-lg leading-relaxed" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>
                Not all models are created equal. Use Groq for blazing fast text, Gemini for complex
                multimodal tasks, or OpenAI for deep reasoning.
              </p>
              <Link
                href="/chat"
                className="inline-flex items-center gap-1.5 text-[#a78bfa] font-medium text-sm hover:text-[#c4b5fd] transition-colors"
              >
                View all models <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} custom={1} className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
              {models.map((model, i) => (
                <div
                  key={i}
                  className="group flex items-center gap-4 p-5 rounded-2xl border border-white/[0.06] bg-[#0d0d0d] transition-all hover:border-white/10 hover:bg-[#111]"
                >
                  <div className={`h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br ${model.color} flex items-center justify-center border border-white/10`}>
                    <Layers className="h-5 w-5 text-[#ccc]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#f0f0f0] text-sm">{model.name}</p>
                    <p className="text-xs text-[#666] mt-0.5">{model.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="relative z-10 py-28 border-t border-white/[0.06]">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-6">
              <span className="text-xs font-medium tracking-wider text-neutral-300 uppercase">Getting Started</span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl font-bold text-white mb-16"
              style={{ fontFamily: "var(--font-fraunces), serif" }}
            >
              Get started in seconds
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid md:grid-cols-3 gap-8"
          >
            {steps.map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i}
                className="relative flex flex-col items-center"
              >
                <div className="h-14 w-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-lg font-bold text-[#a78bfa] mb-6 shadow-[0_0_25px_rgba(167,139,250,0.1)]">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-neutral-400 text-sm" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>
                  {item.desc}
                </p>
                {i !== 2 && (
                  <div className="hidden md:block absolute top-7 left-[60%] w-full h-[1px] bg-gradient-to-r from-[#a78bfa]/30 to-transparent" />
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="relative z-10 py-28 border-t border-white/[0.06]">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <motion.h2
              variants={fadeUp}
              custom={0}
              className="text-3xl sm:text-4xl font-bold text-white mb-6"
              style={{ fontFamily: "var(--font-fraunces), serif" }}
            >
              Ready to start building?
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={1}
              className="text-neutral-400 text-lg mb-10"
              style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
            >
              Join thousands of developers who are already shipping faster with CodebhaiyaAI.
            </motion.p>
            <motion.div variants={fadeUp} custom={2} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-8 text-sm font-medium text-[#ccc] transition-all hover:bg-[#252525] hover:text-white gap-2"
              >
                Create Free Account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-md border border-white/10 bg-white/5 px-8 text-sm font-medium text-[#888] transition-all hover:bg-white/10 hover:text-white"
              >
                Register
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <Footer />
    </div>
  );
}
