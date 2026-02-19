"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface AutoResizeTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxHeight?: number;
}

const AutoResizeTextarea = React.forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ className, maxHeight = 200, onChange, value, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

    // Combine refs
    React.useImperativeHandle(ref, () => textareaRef.current!);

    const adjustHeight = React.useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      
      if (maxHeight && scrollHeight > maxHeight) {
        textarea.style.height = `${maxHeight}px`;
        textarea.style.overflowY = "auto";
      } else {
        textarea.style.height = `${scrollHeight}px`;
        textarea.style.overflowY = "hidden";
      }
    }, [maxHeight]);

    // Adjust height on value change
    React.useEffect(() => {
      adjustHeight();
    }, [value, adjustHeight]);

    // Adjust height on window resize
    React.useEffect(() => {
        window.addEventListener("resize", adjustHeight);
        return () => window.removeEventListener("resize", adjustHeight);
    }, [adjustHeight]);

    return (
      <textarea
        ref={textareaRef}
        className={cn(
          "flex min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none thin-scrollbar",
          className
        )}
        onChange={(e) => {
          adjustHeight();
          onChange?.(e);
        }}
        value={value}
        rows={1}
        {...props}
      />
    );
  }
);
AutoResizeTextarea.displayName = "AutoResizeTextarea";

export { AutoResizeTextarea };
