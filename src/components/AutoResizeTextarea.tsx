import React, { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type AutoResizeTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  maxRows?: number;
  minRows?: number;
};

// A controlled textarea that starts as a single line and grows with content up to maxRows.
export const AutoResizeTextarea = React.forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ className, style, maxRows = 4, minRows = 1, value, onChange, ...props }, ref) => {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    // Allow external refs to work
    const setRefs = useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      },
      [ref]
    );

    const resize = useCallback(() => {
      const el = innerRef.current;
      if (!el) return;

      const computed = window.getComputedStyle(el);
      const fontSize = parseFloat(computed.fontSize || "16");
      const lineHeight = computed.lineHeight === "normal"
        ? fontSize * 1.2
        : parseFloat(computed.lineHeight || String(fontSize * 1.2));

      const paddingTop = parseFloat(computed.paddingTop || "0");
      const paddingBottom = parseFloat(computed.paddingBottom || "0");
      const borderTop = parseFloat(computed.borderTopWidth || "0");
      const borderBottom = parseFloat(computed.borderBottomWidth || "0");

      const boxExtras = paddingTop + paddingBottom + borderTop + borderBottom;
      const minHeight = Math.max(lineHeight * minRows + boxExtras, 0);
      const maxHeight = lineHeight * maxRows + boxExtras;

      // Reset height to auto to allow shrinking, then measure scrollHeight
      el.style.height = "auto";
      el.style.minHeight = `${minHeight}px`;

      const scrollH = el.scrollHeight;
      const target = Math.max(minHeight, Math.min(scrollH, maxHeight));

      el.style.height = `${target}px`;
      el.style.overflowY = scrollH > maxHeight ? "auto" : "hidden";
      el.style.resize = "none";
      el.style.boxSizing = "border-box";
    }, [maxRows, minRows]);

    // Resize on mount and whenever value changes
    useEffect(() => {
      // rAF to ensure styles are applied before measurement
      const id = requestAnimationFrame(resize);
      return () => cancelAnimationFrame(id);
    }, [value, resize]);

    // Also resize on window resize to adapt to font/layout changes
    useEffect(() => {
      const handler = () => resize();
      window.addEventListener("resize", handler);
      return () => window.removeEventListener("resize", handler);
    }, [resize]);

    return (
      <textarea
        ref={setRefs}
        value={value as any}
        onChange={onChange}
        rows={minRows}
        className={cn(
          // Base styles adapted from shadcn/ui textarea, without a fixed min-height
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        style={{ ...style, overflowY: "hidden" }}
        {...props}
      />
    );
  }
);

AutoResizeTextarea.displayName = "AutoResizeTextarea";

export default AutoResizeTextarea;
