"use client";

import { Check, Copy } from "lucide-react";
import { FC, memo, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeBlockProps {
  language: string;
  value: string;
}

interface languageMap {
  [key: string]: string | undefined;
}

export const programmingLanguages: languageMap = {
  javascript: ".js",
  python: ".py",
  java: ".java",
  c: ".c",
  cpp: ".cpp",
  "c++": ".cpp",
  csharp: ".cs",
  ruby: ".rb",
  php: ".php",
  swift: ".swift",
  "objective-c": ".m",
  kotlin: ".kt",
  typescript: ".ts",
  go: ".go",
  perl: ".pl",
  rust: ".rs",
  scala: ".scala",
  haskell: ".hs",
  lua: ".lua",
  shell: ".sh",
  sql: ".sql",
  html: ".html",
  css: ".css",
  json: ".json",
  yaml: ".yaml",
  yml: ".yml",
  markdown: ".md",
  md: ".md",
};

export const generateRandomString = (length: number, lowercase = false) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXY3456789"; // excluding similar looking characters like Z, 2, I, 1, O, 0
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return lowercase ? result.toLowerCase() : result;
};

const CodeBlock: FC<CodeBlockProps> = memo(({ language, value }) => {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = () => {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      return;
    }

    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);

      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    });
  };

  const lineCount = value.trim().split("\n").length;
  const showLineNumbers = lineCount > 3;

  return (
    <div className="relative my-3 w-full rounded-xl border border-neutral-700/50 bg-[#18181b] shadow-sm overflow-hidden font-sans code-block">
      <div className="flex items-center justify-between w-full px-4 py-2 bg-[#232326] border-b border-neutral-700/40 select-none">
        <span className="text-xs font-mono font-medium text-neutral-300 lowercase">
          {language || "code"}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs text-neutral-400 hover:text-neutral-100 hover:bg-white/5 transition-colors cursor-pointer"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy code
              </>
            )}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto w-full">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: "1rem",
            background: "transparent",
            fontSize: "0.85rem",
            lineHeight: "1.55",
          }}
          wrapLines={true}
          showLineNumbers={showLineNumbers}
          lineNumberStyle={{
            minWidth: "2.5em",
            paddingRight: "1em",
            color: "#6e7681",
            userSelect: "none",
          }}
          lineProps={() => ({
            style: { display: "block" },
          })}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
});

CodeBlock.displayName = "CodeBlock";

export { CodeBlock };
