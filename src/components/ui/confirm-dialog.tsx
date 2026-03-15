"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

/* ─── Types ─── */

type DialogVariant = "default" | "destructive" | "success" | "info";

interface ConfirmOptions {
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
}

interface AlertOptions {
  title?: string;
  description: string;
  confirmLabel?: string;
  variant?: DialogVariant;
}

interface ConfirmDialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
}

/* ─── Context ─── */

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(
  null
);

/* ─── Hook ─── */

export function useConfirm() {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error("useConfirm deve ser usado dentro de <ConfirmDialogProvider>");
  }
  return ctx;
}

/* ─── Variant helpers ─── */

const variantIcon: Record<DialogVariant, React.ReactNode> = {
  default: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  destructive: <XCircle className="h-5 w-5 text-destructive" />,
  success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  info: <Info className="h-5 w-5 text-blue-500" />,
};

const variantConfirmClass: Record<DialogVariant, string> = {
  default: "",
  destructive:
    "bg-destructive text-white hover:bg-destructive/90 shadow-none",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-none",
  info: "",
};

/* ─── Provider ─── */

interface DialogState {
  open: boolean;
  mode: "confirm" | "alert";
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: DialogVariant;
}

const defaultState: DialogState = {
  open: false,
  mode: "confirm",
  title: "Confirmar",
  description: "",
  confirmLabel: "Confirmar",
  cancelLabel: "Cancelar",
  variant: "default",
};

export function ConfirmDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<DialogState>(defaultState);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({
        open: true,
        mode: "confirm",
        title: options.title ?? "Confirmar",
        description: options.description,
        confirmLabel: options.confirmLabel ?? "Confirmar",
        cancelLabel: options.cancelLabel ?? "Cancelar",
        variant: options.variant ?? "default",
      });
    });
  }, []);

  const alert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise<void>((resolve) => {
      resolveRef.current = () => resolve();
      setState({
        open: true,
        mode: "alert",
        title: options.title ?? "Aviso",
        description: options.description,
        confirmLabel: options.confirmLabel ?? "OK",
        cancelLabel: "",
        variant: options.variant ?? "info",
      });
    });
  }, []);

  function handleClose(confirmed: boolean) {
    setState((prev) => ({ ...prev, open: false }));
    // Small delay to let the close animation finish
    setTimeout(() => {
      resolveRef.current?.(confirmed);
      resolveRef.current = null;
    }, 150);
  }

  return (
    <ConfirmDialogContext.Provider value={{ confirm, alert }}>
      {children}

      <Dialog
        open={state.open}
        onOpenChange={(open) => {
          if (!open) handleClose(false);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              {variantIcon[state.variant]}
              <div className="flex-1 space-y-1">
                <DialogTitle>{state.title}</DialogTitle>
                <DialogDescription>{state.description}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <DialogFooter>
            {state.mode === "confirm" && (
              <Button variant="outline" onClick={() => handleClose(false)}>
                {state.cancelLabel}
              </Button>
            )}
            <Button
              className={cn(variantConfirmClass[state.variant])}
              onClick={() => handleClose(true)}
            >
              {state.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmDialogContext.Provider>
  );
}
