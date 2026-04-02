"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

export function AuthSidebar() {
  return (
    <div className="relative hidden w-full h-full lg:flex flex-col justify-between p-12 bg-[#050505] overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        {/* Base Grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px),
                              linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Animated Orbs */}
        <motion.div
          animate={{
            x: ["-20%", "20%", "-20%"],
            y: ["-20%", "20%", "-20%"],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen"
        />
        
        <motion.div
          animate={{
            x: ["20%", "-20%", "20%"],
            y: ["20%", "-20%", "20%"],
            scale: [1.2, 1, 1.2],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/4 -right-1/4 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[150px] mix-blend-screen"
        />

        {/* Scanline Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_4px] pointer-events-none" />
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col justify-between h-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            <Image
              src="https://avatars.githubusercontent.com/u/166032907?v=4"
              alt="Logo"
              className="size-8 rounded-full"
              width={32}
              height={32}
            />
          </div>
          <span className="text-white font-bold tracking-widest text-lg uppercase">CodebhaiyaAI</span>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-6 max-w-lg"
        >
          <div className="inline-block px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
            <span className="text-xs font-medium tracking-wider text-neutral-300 uppercase">
              Next Generation Intelligence
            </span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight" style={{ fontFamily: "var(--font-fraunces), serif" }}>
            Unleash your coding potential
          </h2>
          
          <p className="text-neutral-400 text-lg leading-relaxed">
            Experience the future of development with an intelligent agent that understands your codebase, unblocks your workflows, and helps you ship faster.
          </p>

          <div className="pt-8 flex items-center gap-4">
            <div className="flex -space-x-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-[#050505] overflow-hidden relative">
                  <Image 
                    src={`https://i.pravatar.cc/100?img=${i}`} 
                    alt="Avatar"
                    fill
                    sizes="40px"
                    unoptimized
                    className="object-cover" 
                  />
                </div>
              ))}
            </div>
            <div className="text-sm">
              <span className="text-white font-semibold">10,000+</span>
              <span className="text-neutral-500 ml-1">developers joined</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Decorative gradient border right */}
      <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent" />
    </div>
  );
}
