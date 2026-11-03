"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Maximize2,
  Minimize2,
  Download,
  FileText,
  FileCode,
  FileSpreadsheet,
  Check,
  Copy,
  Edit3,
  Eye,
  Loader2,
  Printer,
  ChevronDown,
  Sparkles,
  Plus,
  Trash2,
  Save,
} from "lucide-react";
import { toast } from "react-hot-toast";
import type {
  IResumeData,
  IResumeDoc,
  ResumeExportFormat,
  ResumeTemplate,
} from "@/lib/types";
import { apiClient } from "@/lib/api";
import {
  ModernTemplate,
  ClassicTemplate,
  MinimalTemplate,
  ExecutiveTemplate,
} from "./resume-templates";
import { cn } from "@/lib/utils";

interface ResumeSidePanelProps {
  resume: IResumeDoc | null;
  chatId: string;
  runWithSession: <T>(operation: (accessToken: string) => Promise<T>) => Promise<T>;
  onClose: () => void;
  onResumeUpdated: (updated: IResumeDoc) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const TEMPLATE_OPTIONS: { id: ResumeTemplate; label: string }[] = [
  { id: "modern", label: "Modern Clean" },
  { id: "classic", label: "Classic ATS" },
  { id: "minimal", label: "Tech Minimalist" },
  { id: "executive", label: "Executive" },
];

export function ResumeSidePanel({
  resume,
  chatId,
  runWithSession,
  onClose,
  onResumeUpdated,
  isFullscreen = false,
  onToggleFullscreen,
}: ResumeSidePanelProps) {
  const [activeTemplate, setActiveTemplate] = useState<ResumeTemplate>(
    resume?.template || "modern"
  );
  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview");
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<ResumeExportFormat | null>(null);
  const [copiedLatex, setCopiedLatex] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Local editable copy of resume data
  const [editableData, setEditableData] = useState<IResumeData | null>(
    resume?.data || null
  );
  const [editableTitle, setEditableTitle] = useState(resume?.title || "Professional Resume");

  // Keep local state in sync when parent resume prop updates
  useEffect(() => {
    if (resume) {
      setEditableData(resume.data);
      setEditableTitle(resume.title);
      setActiveTemplate(resume.template);
    }
  }, [resume]);

  const handleTemplateChange = async (template: ResumeTemplate) => {
    setActiveTemplate(template);
    if (!resume || !editableData) return;

    try {
      const updated = await runWithSession((token) =>
        apiClient.updateResume(
          chatId,
          {
            title: editableTitle,
            template,
            data: editableData,
          },
          token
        )
      );
      onResumeUpdated(updated);
    } catch (err) {
      console.error("Failed to save template selection:", err);
    }
  };

  const handleSaveEdits = async () => {
    if (!editableData) return;
    setIsSaving(true);
    try {
      const updated = await runWithSession((token) =>
        apiClient.updateResume(
          chatId,
          {
            title: editableTitle,
            template: activeTemplate,
            data: editableData,
          },
          token
        )
      );
      onResumeUpdated(updated);
      toast.success("Resume saved successfully!");
      setActiveTab("preview");
    } catch (err: unknown) {
      console.error("Failed to update resume:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save resume");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async (format: ResumeExportFormat) => {
    setDownloadMenuOpen(false);
    setIsExporting(format);
    try {
      await runWithSession((token) =>
        apiClient.downloadResume(chatId, format, token)
      );
      toast.success(`Downloaded ${format.toUpperCase()} successfully!`);
    } catch (err: unknown) {
      console.error(`Export failed for format ${format}:`, err);
      toast.error(err instanceof Error ? err.message : `Failed to export ${format.toUpperCase()}`);
    } finally {
      setIsExporting(null);
    }
  };

  const handleCopyLatex = async () => {
    setDownloadMenuOpen(false);
    setIsExporting("latex");
    try {
      // Fetch the latex source as text
      await runWithSession(async (token) => {
        const res = await fetch(`/api/chat/${chatId}/resume/export?format=latex`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch LaTeX source");
        const latexText = await res.text();
        await navigator.clipboard.writeText(latexText);
      });
      setCopiedLatex(true);
      toast.success("LaTeX source code copied to clipboard!");
      setTimeout(() => setCopiedLatex(false), 2500);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to copy LaTeX");
    } finally {
      setIsExporting(null);
    }
  };

  const handlePrint = () => {
    setDownloadMenuOpen(false);
    setTemplateMenuOpen(false);
    if (activeTab !== "preview") {
      setActiveTab("preview");
    }
    setTimeout(() => {
      window.print();
    }, 150);
  };

  if (!resume || !editableData) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center text-muted-foreground bg-(--chat-bg) border-l border-border">
        <Sparkles className="h-8 w-8 text-(--chat-brand) mb-3 animate-pulse" />
        <h3 className="font-semibold text-foreground text-base mb-1">
          No Resume Generated Yet
        </h3>
        <p className="text-xs max-w-xs mb-4">
          Ask the AI assistant to build a resume or attach a past resume PDF to start deep research!
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted transition"
        >
          Close Panel
        </button>
      </div>
    );
  }

  return (
    <aside
      id="resume-side-panel"
      className={cn(
        "flex flex-col h-full bg-(--chat-bg) border-l border-border z-20 shadow-xl transition-all duration-200 print:w-full print:h-auto print:border-none print:shadow-none print:bg-white print:p-0 print:static print:z-auto",
        isFullscreen ? "w-full" : "w-full"
      )}
    >
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border bg-(--chat-surface) text-xs print:hidden">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-(--chat-brand) shrink-0" />
          <span className="font-semibold text-foreground truncate max-w-[180px] sm:max-w-[240px]">
            {editableTitle}
          </span>
          {resume.targetRole && (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
              {resume.targetRole}
            </span>
          )}
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Template Switcher Custom Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setTemplateMenuOpen(!templateMenuOpen);
                setDownloadMenuOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-(--chat-dropdown-hover) text-foreground text-xs font-medium hover:bg-(--chat-surface) transition cursor-pointer"
              aria-label="Select resume template"
            >
              <span>{TEMPLATE_OPTIONS.find((t) => t.id === activeTemplate)?.label || "Template"}</span>
              <ChevronDown
                className={cn(
                  "h-3 w-3 text-muted-foreground transition-transform duration-150",
                  templateMenuOpen && "rotate-180"
                )}
              />
            </button>

            {templateMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setTemplateMenuOpen(false)}
                />
                <div className="absolute left-0 mt-1.5 w-44 rounded-xl border border-border bg-(--chat-dropdown) p-1.5 shadow-2xl z-40 text-xs text-foreground">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Resume Template
                  </div>
                  {TEMPLATE_OPTIONS.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        handleTemplateChange(tpl.id);
                        setTemplateMenuOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between px-2.5 py-2 rounded-lg text-left transition cursor-pointer",
                        activeTemplate === tpl.id
                          ? "bg-(--chat-brand)/10 text-(--chat-brand) font-semibold"
                          : "text-foreground hover:bg-(--chat-dropdown-hover)"
                      )}
                    >
                      <span>{tpl.label}</span>
                      {activeTemplate === tpl.id && (
                        <Check className="h-3.5 w-3.5 text-(--chat-brand)" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Mode toggle (Preview / Edit) */}
          <div className="flex items-center border border-border rounded-lg p-0.5 bg-(--chat-dropdown-hover)">
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition",
                activeTab === "preview"
                  ? "bg-(--chat-surface) text-(--chat-brand) shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("edit")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition",
                activeTab === "edit"
                  ? "bg-(--chat-surface) text-(--chat-brand) shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
          </div>

          {/* Download Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setDownloadMenuOpen(!downloadMenuOpen);
                setTemplateMenuOpen(false);
              }}
              disabled={isExporting !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--chat-brand) text-white font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>Download</span>
              <ChevronDown className="h-3 w-3" />
            </button>

            {downloadMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setDownloadMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-48 rounded-xl border border-border bg-(--chat-dropdown) p-1.5 shadow-2xl z-40 text-xs text-foreground">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Export Format
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownload("pdf")}
                    className="flex w-full items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-(--chat-dropdown-hover) transition text-left"
                  >
                    <FileText className="h-4 w-4 text-red-500" />
                    <div className="flex flex-col">
                      <span className="font-medium">Download PDF</span>
                      <span className="text-[10px] text-muted-foreground">ATS Vector PDF (.pdf)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownload("docx")}
                    className="flex w-full items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-(--chat-dropdown-hover) transition text-left"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                    <div className="flex flex-col">
                      <span className="font-medium">Download Word</span>
                      <span className="text-[10px] text-muted-foreground">Microsoft Word (.docx)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownload("txt")}
                    className="flex w-full items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-(--chat-dropdown-hover) transition text-left"
                  >
                    <FileCode className="h-4 w-4 text-emerald-500" />
                    <div className="flex flex-col">
                      <span className="font-medium">Download Plain Text</span>
                      <span className="text-[10px] text-muted-foreground">ATS Text (.txt)</span>
                    </div>
                  </button>

                  <div className="border-t border-border my-1" />

                  <button
                    type="button"
                    onClick={() => handleDownload("latex")}
                    className="flex w-full items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-(--chat-dropdown-hover) transition text-left"
                  >
                    <FileCode className="h-4 w-4 text-amber-500" />
                    <div className="flex flex-col">
                      <span className="font-medium">Download LaTeX</span>
                      <span className="text-[10px] text-muted-foreground">Compilable (.tex)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLatex}
                    className="flex w-full items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-(--chat-dropdown-hover) transition text-left text-muted-foreground hover:text-foreground"
                  >
                    {copiedLatex ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>Copy LaTeX Code</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex w-full items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-(--chat-dropdown-hover) transition text-left text-muted-foreground hover:text-foreground border-t border-border mt-1 pt-1.5"
                  >
                    <Printer className="h-3.5 w-3.5 text-zinc-500" />
                    <span>Print / Print to PDF</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Fullscreen Toggle */}
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-md transition hover:bg-muted"
              title={isFullscreen ? "Exit Fullscreen" : "Expand to Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          )}

          {/* Close Panel */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-md transition hover:bg-muted"
            title="Close Resume View"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-100 dark:bg-zinc-950/50 print:p-0 print:m-0 print:bg-white print:overflow-visible print:h-auto">
        {activeTab === "preview" ? (
          <div id="resume-print-area" className="w-full print:w-full print:m-0 print:p-0">
            {activeTemplate === "modern" && <ModernTemplate data={editableData} />}
            {activeTemplate === "classic" && <ClassicTemplate data={editableData} />}
            {activeTemplate === "minimal" && <MinimalTemplate data={editableData} />}
            {activeTemplate === "executive" && <ExecutiveTemplate data={editableData} />}
          </div>
        ) : (
          /* Live Edit Form */
          <div className="max-w-2xl mx-auto space-y-6 pb-12">
            <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border shadow-xs">
              <div>
                <h3 className="font-semibold text-foreground text-sm">Direct Edit Mode</h3>
                <p className="text-xs text-muted-foreground">
                  Modify details directly. Changes sync immediately with the preview and downloads.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveEdits}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--chat-brand) text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>Save Changes</span>
              </button>
            </div>

            {/* Personal Information */}
            <div className="bg-card p-4 rounded-xl border border-border space-y-3">
              <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Personal Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-muted-foreground mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editableData.personalInfo?.fullName || ""}
                    onChange={(e) =>
                      setEditableData({
                        ...editableData,
                        personalInfo: {
                          ...editableData.personalInfo,
                          fullName: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-(--chat-brand)"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Headline</label>
                  <input
                    type="text"
                    value={editableData.personalInfo?.headline || ""}
                    onChange={(e) =>
                      setEditableData({
                        ...editableData,
                        personalInfo: {
                          ...editableData.personalInfo,
                          headline: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-(--chat-brand)"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Email</label>
                  <input
                    type="email"
                    value={editableData.personalInfo?.email || ""}
                    onChange={(e) =>
                      setEditableData({
                        ...editableData,
                        personalInfo: {
                          ...editableData.personalInfo,
                          email: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-(--chat-brand)"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Phone</label>
                  <input
                    type="text"
                    value={editableData.personalInfo?.phone || ""}
                    onChange={(e) =>
                      setEditableData({
                        ...editableData,
                        personalInfo: {
                          ...editableData.personalInfo,
                          phone: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-(--chat-brand)"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Location</label>
                  <input
                    type="text"
                    value={editableData.personalInfo?.location || ""}
                    onChange={(e) =>
                      setEditableData({
                        ...editableData,
                        personalInfo: {
                          ...editableData.personalInfo,
                          location: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-(--chat-brand)"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">LinkedIn URL</label>
                  <input
                    type="text"
                    value={editableData.personalInfo?.linkedin || ""}
                    onChange={(e) =>
                      setEditableData({
                        ...editableData,
                        personalInfo: {
                          ...editableData.personalInfo,
                          linkedin: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-(--chat-brand)"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">GitHub URL</label>
                  <input
                    type="text"
                    value={editableData.personalInfo?.github || ""}
                    onChange={(e) =>
                      setEditableData({
                        ...editableData,
                        personalInfo: {
                          ...editableData.personalInfo,
                          github: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-(--chat-brand)"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Website / Portfolio</label>
                  <input
                    type="text"
                    value={editableData.personalInfo?.website || ""}
                    onChange={(e) =>
                      setEditableData({
                        ...editableData,
                        personalInfo: {
                          ...editableData.personalInfo,
                          website: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-(--chat-brand)"
                  />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-card p-4 rounded-xl border border-border space-y-2">
              <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Professional Summary
              </h4>
              <textarea
                rows={4}
                value={editableData.summary || ""}
                onChange={(e) =>
                  setEditableData({ ...editableData, summary: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-(--chat-brand) leading-relaxed"
              />
            </div>

            {/* Work Experience */}
            <div className="bg-card p-4 rounded-xl border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                  Work Experience ({editableData.experience?.length || 0})
                </h4>
                <button
                  type="button"
                  onClick={() =>
                    setEditableData({
                      ...editableData,
                      experience: [
                        {
                          company: "New Company",
                          position: "Software Engineer",
                          startDate: "2023",
                          endDate: "Present",
                          highlights: ["Key achievement here"],
                        },
                        ...(editableData.experience || []),
                      ],
                    })
                  }
                  className="inline-flex items-center gap-1 text-xs text-(--chat-brand) hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Role</span>
                </button>
              </div>

              {editableData.experience?.map((exp, expIdx) => (
                <div
                  key={expIdx}
                  className="p-3 border border-border rounded-lg bg-background/50 space-y-2 text-xs"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-foreground">
                      Role #{expIdx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setEditableData({
                          ...editableData,
                          experience: editableData.experience.filter(
                            (_, i) => i !== expIdx
                          ),
                        })
                      }
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Remove Role"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Position / Title"
                      value={exp.position}
                      onChange={(e) => {
                        const updated = [...editableData.experience];
                        updated[expIdx] = { ...exp, position: e.target.value };
                        setEditableData({ ...editableData, experience: updated });
                      }}
                      className="px-2 py-1.5 rounded border border-border bg-background text-foreground"
                    />
                    <input
                      type="text"
                      placeholder="Company"
                      value={exp.company}
                      onChange={(e) => {
                        const updated = [...editableData.experience];
                        updated[expIdx] = { ...exp, company: e.target.value };
                        setEditableData({ ...editableData, experience: updated });
                      }}
                      className="px-2 py-1.5 rounded border border-border bg-background text-foreground"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Start Date (e.g. Jan 2022)"
                      value={exp.startDate}
                      onChange={(e) => {
                        const updated = [...editableData.experience];
                        updated[expIdx] = { ...exp, startDate: e.target.value };
                        setEditableData({ ...editableData, experience: updated });
                      }}
                      className="px-2 py-1.5 rounded border border-border bg-background text-foreground"
                    />
                    <input
                      type="text"
                      placeholder="End Date (e.g. Present)"
                      value={exp.endDate}
                      onChange={(e) => {
                        const updated = [...editableData.experience];
                        updated[expIdx] = { ...exp, endDate: e.target.value };
                        setEditableData({ ...editableData, experience: updated });
                      }}
                      className="px-2 py-1.5 rounded border border-border bg-background text-foreground"
                    />
                  </div>

                  {/* Highlights */}
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">
                      Highlights (one per line):
                    </label>
                    <textarea
                      rows={3}
                      value={exp.highlights?.join("\n") || ""}
                      onChange={(e) => {
                        const updated = [...editableData.experience];
                        updated[expIdx] = {
                          ...exp,
                          highlights: e.target.value
                            .split("\n")
                            .filter((line) => line.trim().length > 0),
                        };
                        setEditableData({ ...editableData, experience: updated });
                      }}
                      className="w-full px-2 py-1 rounded border border-border bg-background text-foreground text-xs leading-normal"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Save Action */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveEdits}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-(--chat-brand) text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>Save All Edits</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
