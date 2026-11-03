"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Sparkles,
  Upload,
  Briefcase,
  Building2,
  FileText,
  Loader2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import type { Attachment } from "@/lib/types";

interface ResumeWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string, attachments?: Attachment[]) => void;
  onUploadFile?: (file: File) => Promise<Attachment>;
}

export function ResumeWizardModal({
  isOpen,
  onClose,
  onSubmit,
  onUploadFile,
}: ResumeWizardModalProps) {
  const [targetRole, setTargetRole] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [seniority, setSeniority] = useState("Senior");
  const [keyNotes, setKeyNotes] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadFile) return;

    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      toast.error("Please upload a PDF document (e.g. past resume, portfolio, or job description)");
      return;
    }

    setIsUploading(true);
    try {
      const att = await onUploadFile(file);
      setAttachedFiles((prev) => [...prev, att]);
      toast.success(`Attached ${file.name}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload PDF");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleStart = () => {
    if (!targetRole.trim() && attachedFiles.length === 0) {
      toast.error("Please enter a target role or attach your past resume PDF");
      return;
    }

    let prompt = `Please perform deep research and build a professional, ATS-optimized resume for the role of ${targetRole.trim() || "Software Engineer"}`;
    if (targetCompany.trim()) {
      prompt += ` targeted at ${targetCompany.trim()}`;
    }
    if (seniority) {
      prompt += ` (${seniority} level)`;
    }
    prompt += ".\n\n";

    if (attachedFiles.length > 0) {
      prompt += `I have attached my past resume / background document (${attachedFiles.map((f) => f.name).join(", ")}). Please extract all my work experience, education, skills, and accomplishments from it, cross-reference industry benchmark requirements, optimize the bullet points using the Google XYZ formula, and generate my complete structured resume.`;
    } else {
      prompt += "Please create a comprehensive resume structure tailored to this target role with high-impact achievements and modern technology stack.";
    }

    if (keyNotes.trim()) {
      prompt += `\n\nSpecific requirements / focus areas to highlight:\n${keyNotes.trim()}`;
    }

    onSubmit(prompt, attachedFiles);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-(--chat-surface) text-foreground shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-(--chat-brand)/10 text-(--chat-brand)">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">AI Resume Builder</h2>
              <p className="text-xs text-muted-foreground">
                Deep research, ATS keyword optimization & multi-format export
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-foreground mb-1">
              Target Job Title / Role *
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="e.g. Senior Full Stack Engineer, Product Manager, DevOps"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-(--chat-brand)"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-foreground mb-1">
                Target Company (Optional)
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="e.g. Google, Stripe, Startup"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-(--chat-brand)"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-foreground mb-1">
                Seniority Level
              </label>
              <select
                value={seniority}
                onChange={(e) => setSeniority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-(--chat-brand) cursor-pointer"
              >
                <option value="Entry-Level / Junior" className="bg-card text-foreground">Entry-Level / Junior</option>
                <option value="Mid-Level" className="bg-card text-foreground">Mid-Level</option>
                <option value="Senior" className="bg-card text-foreground">Senior</option>
                <option value="Lead / Staff" className="bg-card text-foreground">Lead / Staff</option>
                <option value="Executive / Director" className="bg-card text-foreground">Executive / Director</option>
              </select>
            </div>
          </div>

          {/* Attach Past Resume / PDF */}
          <div>
            <label className="block font-medium text-foreground mb-1">
              Attach Past Resume or Details PDF (Optional)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,application/pdf"
              className="hidden"
            />

            {attachedFiles.length > 0 ? (
              <div className="space-y-1.5">
                {attachedFiles.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/40 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 text-red-500 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachedFiles(attachedFiles.filter((_, idx) => idx !== i))
                      }
                      className="text-muted-foreground hover:text-red-500 p-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-1 hover:border-(--chat-brand)/50 hover:bg-muted/20 transition cursor-pointer text-muted-foreground hover:text-foreground"
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-(--chat-brand)" />
                ) : (
                  <Upload className="h-5 w-5 text-(--chat-brand)" />
                )}
                <span className="font-medium text-xs">
                  {isUploading ? "Uploading & parsing PDF..." : "Click to upload past resume PDF"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  AI will extract your past achievements and optimize them for the new role
                </span>
              </button>
            )}
          </div>

          {/* Specific Focus Notes */}
          <div>
            <label className="block font-medium text-foreground mb-1">
              Key Focus Areas / Highlights (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Highlight my Kubernetes & Next.js skills, mention 40% latency reduction"
              value={keyNotes}
              onChange={(e) => setKeyNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-(--chat-brand)"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl border border-border text-xs font-medium hover:bg-muted transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStart}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-(--chat-brand) text-white text-xs font-semibold hover:opacity-90 transition shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Start Deep Research & Build</span>
          </button>
        </div>
      </div>
    </div>
  );
}
