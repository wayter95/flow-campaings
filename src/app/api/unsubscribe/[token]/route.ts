import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseUnsubscribeToken } from "@/lib/unsubscribe";
import { logActivity } from "@/services/activities";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const parsed = parseUnsubscribeToken(token);

  if (!parsed) {
    return new NextResponse(errorHtml("Token invalido."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const { contactId, workspaceId } = parsed;

  try {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, workspaceId },
    });

    if (!contact) {
      return new NextResponse(errorHtml("Contato nao encontrado."), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (!contact.unsubscribed) {
      await prisma.contact.update({
        where: { id: contactId },
        data: { unsubscribed: true },
      });

      await logActivity({
        type: "unsubscribed",
        contactId,
        workspaceId,
        metadata: { method: "email_link" },
      });
    }

    return new NextResponse(successHtml(), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch {
    return new NextResponse(errorHtml("Erro interno. Tente novamente."), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

function successHtml(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inscricao cancelada</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background: white; border-radius: 12px; padding: 48px 40px; max-width: 460px; width: 100%; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .icon { width: 64px; height: 64px; background: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
    .icon svg { width: 32px; height: 32px; color: #16a34a; }
    h1 { font-size: 22px; color: #18181b; margin-bottom: 12px; font-weight: 600; }
    p { font-size: 15px; color: #71717a; line-height: 1.6; }
    .note { margin-top: 24px; padding-top: 24px; border-top: 1px solid #e4e4e7; font-size: 13px; color: #a1a1aa; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <h1>Inscricao cancelada com sucesso</h1>
    <p>Voce foi removido da nossa lista de emails e nao recebera mais mensagens.</p>
    <p class="note">Se isso foi um engano, entre em contato conosco para reativar sua inscricao.</p>
  </div>
</body>
</html>`;
}

function errorHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Erro</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background: white; border-radius: 12px; padding: 48px 40px; max-width: 460px; width: 100%; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .icon { width: 64px; height: 64px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
    .icon svg { width: 32px; height: 32px; color: #dc2626; }
    h1 { font-size: 22px; color: #18181b; margin-bottom: 12px; font-weight: 600; }
    p { font-size: 15px; color: #71717a; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
    <h1>Erro</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
