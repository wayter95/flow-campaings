import { getSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const session = await getSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuracoes</h1>
        <p className="text-muted-foreground">Gerencie sua conta e workspace</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Nome</p>
            <p className="font-medium">{session.user.name || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{session.user.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integracao SendGrid</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Configure sua API key do SendGrid no arquivo .env para habilitar o
            envio de emails.
          </p>
          <p className="text-sm mt-2">
            Status:{" "}
            <span className={process.env.SENDGRID_API_KEY ? "text-green-600" : "text-yellow-600"}>
              {process.env.SENDGRID_API_KEY ? "Configurado" : "Nao configurado (modo mock)"}
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
