"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Editor } from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import "@/styles/grapesjs-custom.css";

interface DragDropEmailEditorProps {
  value: string;
  onChange: (html: string) => void;
}

function getFullHtml(editor: Editor): string {
  const html = editor.getHtml();
  const css = editor.getCss();
  return css ? `<style>${css}</style>${html}` : html;
}

export function DragDropEmailEditor({ value, onChange }: DragDropEmailEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const gjsRef = useRef<Editor | null>(null);
  const onChangeRef = useRef(onChange);
  const initializedRef = useRef(false);
  const valueRef = useRef(value);
  const lastEmittedRef = useRef<string | null>(null);

  onChangeRef.current = onChange;
  valueRef.current = value;

  const initEditor = useCallback(async () => {
    if (!editorRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const grapesjs = (await import("grapesjs")).default;
    const newsletterPreset = (await import("grapesjs-preset-newsletter")).default;

    const editor = grapesjs.init({
      container: editorRef.current,
      height: "100%",
      width: "auto",
      fromElement: false,
      storageManager: false,
      plugins: [newsletterPreset],
      pluginsOpts: {
        [newsletterPreset as unknown as string]: {
          modalTitleImport: "Importar HTML",
          modalBtnImport: "Importar",
          modalLabelImport: "Cole seu HTML aqui",
          modalTitleExport: "Exportar HTML",
          importPlaceholder: "<table>...</table>",
          cellStyle: {
            "font-size": "14px",
            "font-family": "Arial, sans-serif",
          },
        },
      },
      canvas: {
        styles: [
          "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
        ],
      },
      panels: { defaults: [] },
      blockManager: {
        appendTo: ".gjs-blocks-container",
      },
      styleManager: {
        appendTo: ".gjs-styles-container",
      },
    });

    // Load initial content
    if (valueRef.current) {
      editor.setComponents(valueRef.current);
      lastEmittedRef.current = valueRef.current;
    }

    // Debounced change handler
    let changeTimer: ReturnType<typeof setTimeout>;
    const emitChange = () => {
      clearTimeout(changeTimer);
      changeTimer = setTimeout(() => {
        const html = getFullHtml(editor);
        lastEmittedRef.current = html;
        onChangeRef.current(html);
      }, 150);
    };

    editor.on("update", emitChange);
    editor.on("component:add", emitChange);
    editor.on("component:remove", emitChange);
    editor.on("component:styleUpdate", emitChange);

    gjsRef.current = editor;
  }, []);

  useEffect(() => {
    initEditor();

    return () => {
      if (gjsRef.current) {
        gjsRef.current.destroy();
        gjsRef.current = null;
        initializedRef.current = false;
      }
    };
  }, [initEditor]);

  // Sync editor when value changes from parent (e.g. template selected/applied)
  useEffect(() => {
    const editor = gjsRef.current;
    if (!editor || !initializedRef.current) return;
    // Skip if this value came from our own emit (user edited in editor)
    if (value === lastEmittedRef.current) return;
    lastEmittedRef.current = value;
    editor.setComponents(value || "");
  }, [value]);

  return (
    <div className="flex h-full">
      {/* Left sidebar - Blocks & Styles */}
      <div className="w-56 border-r flex flex-col overflow-hidden bg-card">
        <div className="px-3 py-2 border-b bg-muted/50">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Blocos
          </span>
        </div>
        <div className="gjs-blocks-container overflow-y-auto p-2" style={{ maxHeight: "50%" }} />

        <div className="px-3 py-2 border-t border-b bg-muted/50">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Estilos
          </span>
        </div>
        <div className="gjs-styles-container flex-1 overflow-y-auto p-2" />
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col">
        <div ref={editorRef} className="flex-1" />
      </div>
    </div>
  );
}
