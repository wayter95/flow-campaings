"use client";

import { useEffect, useRef, useCallback } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { html } from "@codemirror/lang-html";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter } from "@codemirror/language";
import { oneDark } from "@codemirror/theme-one-dark";
import { autocompletion, closeBrackets } from "@codemirror/autocomplete";
import { useTheme } from "next-themes";

interface HtmlCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const lightTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--color-card)",
    color: "var(--color-foreground)",
  },
  ".cm-gutters": {
    backgroundColor: "var(--color-muted)",
    color: "var(--color-muted-foreground)",
    borderRight: "1px solid var(--color-border)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--color-accent)",
  },
  ".cm-activeLine": {
    backgroundColor: "var(--color-accent)",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--color-foreground)",
  },
  ".cm-selectionBackground": {
    backgroundColor: "var(--color-accent) !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "oklch(0.7 0.1 250 / 0.3) !important",
  },
});

export function HtmlCodeEditor({ value, onChange, className = "" }: HtmlCodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const { resolvedTheme } = useTheme();

  onChangeRef.current = onChange;

  const createExtensions = useCallback(
    (isDark: boolean) => [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      foldGutter(),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      html(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      ...(isDark
        ? [oneDark]
        : [syntaxHighlighting(defaultHighlightStyle, { fallback: true }), lightTheme]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
      EditorView.lineWrapping,
      EditorView.theme({
        "&": { height: "100%", fontSize: "13px" },
        ".cm-scroller": { overflow: "auto" },
      }),
    ],
    []
  );

  // Create editor
  useEffect(() => {
    if (!editorRef.current) return;

    const isDark = resolvedTheme === "dark";

    const state = EditorState.create({
      doc: value,
      extensions: createExtensions(isDark),
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTheme, createExtensions]);

  // Sync external value changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentContent = view.state.doc.toString();
    if (currentContent !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: value,
        },
      });
    }
  }, [value]);

  return (
    <div
      ref={editorRef}
      className={`border rounded-md overflow-hidden ${className}`}
    />
  );
}
