"use client";

import {
  ArrowLeft,
  BookOpen,
  Check,
  FileText,
  FolderPlus,
  Layers3,
  Loader2,
  Plus,
  RefreshCcw,
  Sparkles,
  Tags,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { apiClient } from "@/lib/api";
import { readStoredTokens } from "@/lib/storage";
import type {
  AuthTokens,
  DocumentCollection,
  DocumentStatusResponse,
} from "@/lib/types";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocumentLibraryProps {
  embedded?: boolean;
  onBack?: () => void;
}

export function DocumentLibrary({ embedded = false, onBack }: DocumentLibraryProps) {
  const [documents, setDocuments] = useState<DocumentStatusResponse[]>([]);
  const [collections, setCollections] = useState<DocumentCollection[]>([]);
  const [activeCollection, setActiveCollection] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState("All folders");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ filename: string; text: string } | null>(null);
  const [questions, setQuestions] = useState<{ filename: string; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFolder, setEditFolder] = useState("");
  const [editTags, setEditTags] = useState("");
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const router = useRouter();
  const uploadRef = useRef<HTMLInputElement>(null);
  const versionRef = useRef<HTMLInputElement>(null);
  const versionTarget = useRef<string | null>(null);

  const [tokens] = useState<AuthTokens | null>(() => readStoredTokens());
  const load = useCallback(async () => {
    if (!tokens) return;
    setIsLoading(true);
    try {
      const [documentData, collectionData] = await Promise.all([
        apiClient.listDocuments(tokens.accessToken),
        apiClient.listCollections(tokens.accessToken),
      ]);
      setDocuments(documentData.documents);
      setCollections(collectionData.collections);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load documents");
    } finally {
      setIsLoading(false);
    }
  }, [tokens]);

  useEffect(() => {
    void load();
  }, [load]);

  const folders = useMemo(
    () => ["All folders", ...Array.from(new Set(documents.map((document) => document.folder ?? "Unsorted")))],
    [documents]
  );
  const filteredDocuments = documents.filter((document) => {
    const matchesText = document.filename.toLowerCase().includes(query.toLowerCase()) ||
      (document.tags ?? []).some((tag) => tag.toLowerCase().includes(query.toLowerCase()));
    const matchesFolder = folder === "All folders" || (document.folder ?? "Unsorted") === folder;
    const matchesCollection = activeCollection === "all" ||
      (document.collectionIds ?? []).includes(activeCollection);
    return matchesText && matchesFolder && matchesCollection;
  });

  if (!tokens) {
    return <main className="flex min-h-screen items-center justify-center bg-(--chat-bg) text-(--chat-text)">Please log in to view your documents.</main>;
  }

  const upload = async (file: File) => {
    try {
      await apiClient.uploadFile(file, tokens.accessToken);
      toast.success("Document added to your library");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    }
  };

  const summarize = async (document: DocumentStatusResponse) => {
    setBusyId(document.documentId);
    try {
      const result = await apiClient.summarizeDocument(document.documentId, tokens.accessToken);
      setSummary({ filename: document.filename, text: result.summary });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Summary failed");
    } finally {
      setBusyId(null);
    }
  };

  const generateQuestions = async (document: DocumentStatusResponse) => {
    setBusyId(document.documentId);
    try {
      const result = await apiClient.generateDocumentQuestions(document.documentId, tokens.accessToken);
      setQuestions({ filename: document.filename, text: result.questions });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Question generation failed");
    } finally {
      setBusyId(null);
    }
  };

  const saveMetadata = async (documentId: string) => {
    try {
      const result = await apiClient.updateDocumentMetadata(
        documentId,
        { folder: editFolder.trim() || "Unsorted", tags: editTags.split(",").map((tag) => tag.trim()).filter(Boolean) },
        tokens.accessToken
      );
      setDocuments((current) => current.map((item) => item.documentId === documentId ? result.document : item));
      setEditingId(null);
      toast.success("Document details saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save document details");
    }
  };

  const createCollection = async () => {
    if (!collectionName.trim()) return;
    try {
      const result = await apiClient.createCollection(collectionName.trim(), "", tokens.accessToken);
      if (selectedIds.length > 0) {
        await apiClient.setCollectionDocuments(result.collection._id, selectedIds, tokens.accessToken);
      }
      setCollectionName("");
      setNewCollectionOpen(false);
      setSelectedIds([]);
      toast.success("Collection created");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create collection");
    }
  };

  return (
    <main className={`${embedded ? "h-full overflow-y-auto" : "min-h-screen"} bg-(--chat-bg) text-(--chat-text)`}>
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-10">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            {onBack ? (
              <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm text-(--chat-text-muted) hover:text-(--chat-text)">
                <ArrowLeft className="h-4 w-4" /> Back to chat
              </button>
            ) : (
              <Link href="/chat" className="mb-5 inline-flex items-center gap-2 text-sm text-(--chat-text-muted) hover:text-(--chat-text)">
              <ArrowLeft className="h-4 w-4" /> Back to chat
              </Link>
            )}
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-(--chat-brand)">Knowledge room</p>
            <h1 className="font-[var(--font-fraunces)] text-4xl tracking-tight md:text-5xl">Your document library</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-(--chat-text-secondary)">
              Keep your references close, organize them into collections, and ask questions with page-aware retrieval.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => uploadRef.current?.click()} className="inline-flex items-center gap-2 rounded-full bg-(--chat-brand) px-4 py-2.5 text-sm font-medium text-white hover:opacity-90">
              <Upload className="h-4 w-4" /> Add document
            </button>
            <input ref={uploadRef} hidden type="file" accept=".pdf,.txt,.md,.csv,.json,.js,.ts,.tsx,.py,.java,image/*" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }} />
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[230px_1fr]">
          <aside className="rounded-3xl border border-(--chat-dropdown-border) bg-(--chat-surface) p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-(--chat-text-muted)">Collections</p>
              <button type="button" onClick={() => setNewCollectionOpen(true)} aria-label="Create collection" className="rounded-full p-1.5 hover:bg-(--chat-dropdown-hover)"><FolderPlus className="h-4 w-4" /></button>
            </div>
            <button type="button" onClick={() => setActiveCollection("all")} className={`mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${activeCollection === "all" ? "bg-(--chat-sidebar-active)" : "hover:bg-(--chat-dropdown-hover)"}`}><Layers3 className="h-4 w-4" /> All documents</button>
            {collections.map((collection) => (
              <div key={collection._id} className="mb-1 flex items-center gap-1">
              <button type="button" onClick={() => setActiveCollection(collection._id)} className={`min-w-0 flex flex-1 items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${activeCollection === collection._id ? "bg-(--chat-sidebar-active)" : "hover:bg-(--chat-dropdown-hover)"}`}>
                <span className="flex min-w-0 items-center gap-2"><BookOpen className="h-4 w-4 shrink-0" /><span className="truncate">{collection.name}</span></span>
                <span className="text-xs text-(--chat-text-muted)">{collection.documentIds.length}</span>
              </button>
              <button type="button" title={`Chat with ${collection.name}`} onClick={() => { window.localStorage.setItem("chat.codebhaiya.collection", collection._id); router.push("/chat"); }} className="rounded-full p-2 text-(--chat-text-muted) hover:bg-(--chat-dropdown-hover) hover:text-(--chat-brand)"><Sparkles className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            <div className="my-5 border-t border-(--chat-dropdown-border)" />
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-(--chat-text-muted)">Folders</p>
            {folders.map((item) => <button key={item} type="button" onClick={() => setFolder(item)} className={`mb-1 block w-full rounded-xl px-3 py-2 text-left text-sm ${folder === item ? "bg-(--chat-sidebar-active)" : "hover:bg-(--chat-dropdown-hover)"}`}>{item}</button>)}
          </aside>

          <div>
            <div className="mb-5 flex flex-wrap gap-3">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search files or tags…" className="min-w-[220px] flex-1 rounded-full border border-(--chat-dropdown-border) bg-(--chat-surface) px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-(--chat-focus-ring)" />
              <button type="button" onClick={() => setNewCollectionOpen(true)} disabled={selectedIds.length === 0} className="inline-flex items-center gap-2 rounded-full border border-(--chat-dropdown-border) px-4 py-2.5 text-sm disabled:opacity-40"><Plus className="h-4 w-4" /> Collection from selection</button>
            </div>
            {selectedIds.length > 0 && <p className="mb-4 text-xs text-(--chat-text-muted)">{selectedIds.length} selected — choose “Collection from selection” to group them.</p>}
            {isLoading ? <div className="flex items-center gap-2 py-16 text-sm text-(--chat-text-muted)"><Loader2 className="h-4 w-4 animate-spin" /> Loading your library…</div> : filteredDocuments.length === 0 ? <div className="rounded-3xl border border-dashed border-(--chat-dropdown-border) px-6 py-20 text-center"><FileText className="mx-auto mb-3 h-8 w-8 text-(--chat-text-muted)" /><p className="text-sm text-(--chat-text-secondary)">No documents match this view.</p></div> : <div className="grid gap-3 md:grid-cols-2">{filteredDocuments.map((document) => {
              const ready = document.status === "ready";
              const selected = selectedIds.includes(document.documentId);
              return <article key={document.documentId} className={`rounded-3xl border p-4 transition ${selected ? "border-(--chat-brand) bg-(--chat-brand)/5" : "border-(--chat-dropdown-border) bg-(--chat-surface)"}`}>
                <div className="flex items-start gap-3"><button type="button" onClick={() => setSelectedIds((ids) => selected ? ids.filter((id) => id !== document.documentId) : [...ids, document.documentId])} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${selected ? "border-(--chat-brand) bg-(--chat-brand) text-white" : "border-(--chat-dropdown-border)"}`}>{selected && <Check className="h-3 w-3" />}</button><div className="min-w-0 flex-1"><h2 className="truncate font-medium">{document.filename}</h2><p className="mt-1 text-xs text-(--chat-text-muted)">{formatSize(document.size)} · v{document.version ?? 1} · {document.chunkCount} chunks</p></div><span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-wider ${ready ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>{document.status}</span></div>
                <div className="mt-4 flex flex-wrap gap-1.5">{(document.tags ?? []).map((tag) => <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-(--chat-dropdown-hover) px-2 py-1 text-[11px] text-(--chat-text-muted)"><Tags className="h-3 w-3" />{tag}</span>)}</div>
                {editingId === document.documentId ? <div className="mt-3 space-y-2 border-t border-(--chat-dropdown-border) pt-3"><input value={editFolder} onChange={(event) => setEditFolder(event.target.value)} placeholder="Folder" className="w-full rounded-lg border border-(--chat-dropdown-border) bg-(--chat-bg) px-2.5 py-2 text-xs outline-none" /><input value={editTags} onChange={(event) => setEditTags(event.target.value)} placeholder="Tags, comma separated" className="w-full rounded-lg border border-(--chat-dropdown-border) bg-(--chat-bg) px-2.5 py-2 text-xs outline-none" /><div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingId(null)} className="rounded-full px-2.5 py-1.5 text-xs">Cancel</button><button type="button" onClick={() => void saveMetadata(document.documentId)} className="rounded-full bg-(--chat-brand) px-2.5 py-1.5 text-xs text-white">Save details</button></div></div> : <div className="mt-4 flex flex-wrap gap-2 border-t border-(--chat-dropdown-border) pt-3"><button type="button" disabled={!ready || busyId === document.documentId} onClick={() => void summarize(document)} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs hover:bg-(--chat-dropdown-hover) disabled:opacity-40"><Sparkles className="h-3.5 w-3.5" /> Summary</button><button type="button" disabled={!ready || busyId === document.documentId} onClick={() => void generateQuestions(document)} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs hover:bg-(--chat-dropdown-hover)"><BookOpen className="h-3.5 w-3.5" /> Q&A</button><button type="button" onClick={() => { setEditingId(document.documentId); setEditFolder(document.folder ?? "Unsorted"); setEditTags((document.tags ?? []).join(", ")); }} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs hover:bg-(--chat-dropdown-hover)"><Tags className="h-3.5 w-3.5" /> Organize</button><button type="button" onClick={() => { versionTarget.current = document.documentId; versionRef.current?.click(); }} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs hover:bg-(--chat-dropdown-hover)"><RefreshCcw className="h-3.5 w-3.5" /> New version</button></div>}
              </article>;
            })}</div>}
            <input ref={versionRef} hidden type="file" onChange={(event) => { const file = event.target.files?.[0]; const target = versionTarget.current; if (file && target) void apiClient.uploadDocumentVersion(target, file, tokens.accessToken).then(() => { toast.success("New version queued"); return load(); }).catch((error) => toast.error(error instanceof Error ? error.message : "Version upload failed")); event.target.value = ""; }} />
          </div>
        </section>
      </div>

      {newCollectionOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-sm rounded-3xl border border-(--chat-dropdown-border) bg-(--chat-surface) p-6 shadow-2xl"><h2 className="text-lg font-semibold">New collection</h2><p className="mt-1 text-sm text-(--chat-text-secondary)">Group documents for focused conversations.</p><input autoFocus value={collectionName} onChange={(event) => setCollectionName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void createCollection(); }} placeholder="e.g. Product specs" className="mt-5 w-full rounded-xl border border-(--chat-dropdown-border) bg-(--chat-bg) px-3 py-2.5 text-sm outline-none" /><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setNewCollectionOpen(false)} className="rounded-full px-4 py-2 text-sm">Cancel</button><button type="button" onClick={() => void createCollection()} className="rounded-full bg-(--chat-brand) px-4 py-2 text-sm text-white">Create</button></div></div></div>}
      {(summary || questions) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-3xl border border-(--chat-dropdown-border) bg-(--chat-surface) p-6 shadow-2xl"><p className="text-xs font-semibold uppercase tracking-widest text-(--chat-brand)">{summary ? "Document summary" : "Suggested Q&A"}</p><h2 className="mt-2 text-xl font-semibold">{summary?.filename ?? questions?.filename}</h2><pre className="mt-5 whitespace-pre-wrap font-[var(--font-space-grotesk)] text-sm leading-7 text-(--chat-text-secondary)">{summary?.text ?? questions?.text}</pre><button type="button" onClick={() => { setSummary(null); setQuestions(null); }} className="mt-5 rounded-full bg-(--chat-brand) px-4 py-2 text-sm text-white">Close</button></div></div>}
    </main>
  );
}
