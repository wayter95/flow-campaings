import { Logo } from "@/components/logo";

interface AuthCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  logoHref?: string;
  footer?: React.ReactNode;
}

export function AuthCard({ title, description, children, logoHref = "/login", footer }: AuthCardProps) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-xl shadow-black/5 dark:shadow-black/20">
      <div className="pt-8 pb-2 px-6 text-center">
        <div className="flex justify-center">
          <Logo href={logoHref} height={48} />
        </div>
        <h1 className="mt-6 text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="px-6 pb-8 pt-6">
        {children}
        {footer && (
          <div className="mt-6 pt-4 border-t border-border/60 text-center">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
      <span className="shrink-0 size-4 rounded-full bg-destructive/20 flex items-center justify-center text-[10px] font-bold">!</span>
      <span>{message}</span>
    </div>
  );
}
