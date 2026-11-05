"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  Check,
  ChevronDown,
  Code2,
  FileText,
  Github,
  Globe2,
  Layers3,
  MessageSquareText,
  Paperclip,
  Search,
  Sparkles,
  SquarePen,
  WandSparkles,
} from "lucide-react";
import { Footer } from "@/components/footer";

const features = [
  {
    index: "01",
    icon: Globe2,
    title: "Answers with receipts.",
    detail: "Search the live web and follow every citation back to its source.",
    note: "LIVE WEB · CITED SOURCES",
    color: "mint",
  },
  {
    index: "02",
    icon: FileText,
    title: "Your files in the conversation.",
    detail: "Ask questions across PDFs, notes, and documents you bring along.",
    note: "DOCUMENT CONTEXT · MULTIMODAL",
    color: "peach",
  },
  {
    index: "03",
    icon: Code2,
    title: "Built for the build loop.",
    detail: "Explain an error, shape an idea, refactor a snippet, keep moving.",
    note: "CODE · EXPLANATIONS · STREAMING",
    color: "blue",
  },
];

const prompts = [
  { icon: Search, tag: "RESEARCH", text: "What changed in React this month?", tone: "pink" },
  { icon: Code2, tag: "BUILD", text: "Explain this TypeScript error", tone: "yellow" },
  { icon: BookOpenText, tag: "LEARN", text: "Turn these notes into a study plan", tone: "blue" },
];

const integrations = ["GitHub", "Linear", "Notion", "PostgreSQL", "MongoDB", "Supabase"];

export function HomeView() {
  return (
    <main className="landing-page min-h-screen overflow-hidden">
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <Link href="/" className="landing-brand" aria-label="Codebhaiya home">
            <Image
              className="brand-logo"
              src="https://avatars.githubusercontent.com/u/166032907?v=4"
              alt="Codebhaiya logo"
              width={31}
              height={31}
            />
            <span>codebhaiya<span className="brand-period">.</span></span>
          </Link>
          <nav className="landing-links" aria-label="Main navigation">
            <a href="#capabilities">What it does</a>
            <a href="#connectors">Connections</a>
            <a href="#start">Try a prompt</a>
          </nav>
          <div className="landing-nav-actions">
            <Link href="/login" className="nav-login">Log in</Link>
            <Link href="/register" className="nav-cta">Get started <ArrowUpRight size={15} /></Link>
          </div>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-grain" aria-hidden="true" />
        <div className="hero-layout">
          <motion.div
            className="hero-copy"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
          >
            <div className="eyebrow"><span className="eyebrow-dot" /> YOUR THOUGHTS, WITH ROOM TO GO</div>
            <h1>Good questions<br />go <span className="headline-highlight">somewhere.</span></h1>
            <p className="hero-description">
              Research the web. Make sense of your files. Get unstuck in code.
              One thoughtful workspace for whatever you’re figuring out.
            </p>
            <div className="hero-actions">
              <Link href="/chat" className="button-primary">Start a conversation <ArrowRight size={17} /></Link>
              <a href="#capabilities" className="button-text">Take a look <ArrowDownRight size={17} /></a>
            </div>
            <div className="hero-footnote"><span className="sparkle-mini">✳</span> Free to start <span className="footnote-divider">·</span> Pick the model that fits</div>
          </motion.div>

          <motion.div
            className="hero-art"
            initial={{ opacity: 0, y: 22, rotate: 1.4 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.75, delay: 0.12, ease: "easeOut" }}
          >
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="chat-window">
              <div className="window-topbar">
                <div className="window-dots"><i /><i /><i /></div>
                <span className="window-title"><span className="window-live" /> NEW CONVERSATION</span>
                <SquarePen size={15} />
              </div>
              <div className="conversation">
                <div className="model-line"><span className="model-avatar"><Sparkles size={12} /></span><span>Codebhaiya</span><span className="model-sep">/</span><span className="model-selected">Gemini Flash <ChevronDown size={12} /></span></div>
                <div className="user-question">I have a folder of customer interviews. What are people asking for most?</div>
                <div className="answer-block">
                  <p>I found a clear pattern across your interviews: people want to <strong>see what changed</strong> without digging through every update.</p>
                  <p>Three themes come up repeatedly:</p>
                  <div className="insight-row"><span className="insight-number">01</span><span>One place to compare versions</span><span className="citation">[1]</span></div>
                  <div className="insight-row"><span className="insight-number">02</span><span>Short, plain-language summaries</span><span className="citation">[2]</span></div>
                  <div className="insight-row"><span className="insight-number">03</span><span>Clear ownership of next steps</span><span className="citation">[3]</span></div>
                  <div className="source-pills"><span><FileText size={11} /> Interview notes.pdf</span><span><FileText size={11} /> 8 conversations</span></div>
                </div>
              </div>
              <div className="composer"><Paperclip size={15} /><span>Ask a follow-up or add a file...</span><span className="composer-shortcut">↵</span></div>
            </div>
            <div className="floating-note note-top"><span className="note-icon note-icon-green"><Globe2 size={14} /></span><span><b>Grounded</b><small>In your sources</small></span><Check size={14} className="note-check" /></div>
            <div className="floating-note note-bottom"><span className="note-icon note-icon-yellow"><Layers3 size={14} /></span><span><b>Multi-model</b><small>Your call, always</small></span><span className="note-count">03</span></div>
            <div className="art-caption">A better place to think things through <span>↗</span></div>
          </motion.div>
        </div>
        <div className="hero-rule"><span>THINK CLEARER, MAKE MORE</span><span>01 — 04</span></div>
      </section>

      <section className="capabilities-section" id="capabilities">
        <div className="section-heading">
          <div><span className="section-kicker">A WORKSPACE THAT KEEPS UP</span><h2>From “wait, what?”<br /><span>to “there it is.”</span></h2></div>
          <p>Less tab juggling. More useful answers. Start with a question, bring the context, and keep the momentum.</p>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className={`feature-card feature-${feature.color}`} key={feature.index}>
              <div className="feature-card-top"><span>{feature.index}</span><feature.icon size={21} strokeWidth={1.7} /></div>
              <h3>{feature.title}</h3><p>{feature.detail}</p>
              <div className="feature-foot"><span className="feature-mini-icon"><feature.icon size={13} /></span>{feature.note}<ArrowUpRight size={14} /></div>
            </article>
          ))}
        </div>
      </section>

      <section className="model-band">
        <div className="model-copy"><span className="section-kicker">GOOD TO HAVE OPTIONS</span><h2>One workspace.<br /><em>Your choice of mind.</em></h2><p>Switch between models as the work changes. Keep the conversation, change the perspective.</p></div>
        <div className="model-showcase" aria-label="Available model providers">
          <div className="model-showcase-header"><span>CHOOSE YOUR MODEL</span><span>AVAILABLE IN CHAT <span className="available-dot" /></span></div>
          <div className="provider-grid">
            <div className="provider-card provider-gemini"><span className="provider-glyph">✳</span><span><b>Gemini</b><small>Fast & multimodal</small></span><span className="provider-active">ACTIVE</span></div>
            <div className="provider-card"><span className="provider-glyph glyph-openai">◎</span><span><b>GPT</b><small>Versatile reasoning</small></span><ArrowUpRight size={14} /></div>
            <div className="provider-card"><span className="provider-glyph glyph-llama">◈</span><span><b>Llama</b><small>Open model family</small></span><ArrowUpRight size={14} /></div>
            <div className="provider-hint"><WandSparkles size={14} /> The right tool for the thought you’re having.</div>
          </div>
        </div>
      </section>

      <section className="prompt-section" id="start">
        <div className="prompt-topline"><span className="section-kicker">NO PERFECT PROMPT REQUIRED</span><span>02 / BEGIN ANYWHERE</span></div>
        <div className="prompt-layout"><h2>Bring the<br /><span>half-formed</span><br />thought.</h2>
          <div className="prompt-list">
            {prompts.map((prompt) => <Link href="/chat" className={`prompt-item prompt-${prompt.tone}`} key={prompt.tag}>
              <span className="prompt-icon"><prompt.icon size={19} /></span><span className="prompt-label">{prompt.tag}</span><span className="prompt-text">{prompt.text}</span><ArrowUpRight size={17} className="prompt-arrow" />
            </Link>)}
            <Link href="/chat" className="prompt-more">Or just say what’s on your mind <ArrowRight size={15} /></Link>
          </div>
        </div>
      </section>

      <section className="connectors-section" id="connectors">
        <div className="connector-intro"><span className="section-kicker">WHEN YOUR WORK LIVES ELSEWHERE</span><h2>Bring your tools<br />into the conversation.</h2><p>Connect the places where your work already happens, then ask for what you need in plain language.</p><Link href="/register" className="connector-link">Explore the workspace <ArrowRight size={16} /></Link></div>
        <div className="connector-board"><div className="connector-board-head"><span>YOUR TOOLKIT</span><span>CONNECTED CONTEXT <span className="available-dot" /></span></div>
          <div className="connector-list">{integrations.map((name, index) => <div className="connector-row" key={name}><span className={`connector-icon connector-${index}`}>
            {index === 0 ? <Github size={17} /> : index === 1 ? <span className="linear-glyph">◉</span> : index === 2 ? <span className="notion-glyph">N</span> : index === 3 ? <span className="db-glyph">PG</span> : index === 4 ? <span className="mongo-glyph">◉</span> : <span className="supabase-glyph">ϟ</span>}
          </span><span className="connector-name">{name}</span><span className="connector-type">{index < 3 ? "WORKSPACE" : "DATABASE"}</span><ArrowUpRight size={14} /></div>)}</div>
          <div className="connector-foot"><MessageSquareText size={14} /><span>Ask once. Let context do the connecting.</span></div>
        </div>
      </section>

      <section className="closing-section">
        <div className="closing-stamp">CB<span>✳</span></div>
        <span className="section-kicker">YOUR NEXT GOOD QUESTION STARTS HERE</span>
        <h2>Curiosity looks<br /><em>good on you.</em></h2>
        <Link href="/chat" className="button-primary closing-button">Open your workspace <ArrowRight size={17} /></Link>
        <span className="closing-aside">No ceremony. Just start.</span>
      </section>

      <Footer />
    </main>
  );
}
