import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

interface EvolutionCredentials {
  apiUrl: string;
  apiKey: string;
  instance: string;
}

/**
 * Busca as credenciais da Evolution API do workspace
 */
async function getEvolutionCredentials(
  workspaceId: string
): Promise<EvolutionCredentials | null> {
  const settings = await prisma.workspaceSettings.findUnique({
    where: { workspaceId },
  });

  if (
    !settings?.evolutionApiUrl ||
    !settings?.evolutionApiKey ||
    !settings?.evolutionInstance
  ) {
    return null;
  }

  try {
    return {
      apiUrl: settings.evolutionApiUrl.replace(/\/$/, ""),
      apiKey: decrypt(settings.evolutionApiKey),
      instance: settings.evolutionInstance,
    };
  } catch {
    console.error(
      "Falha ao descriptografar Evolution API key do workspace",
      workspaceId
    );
    return null;
  }
}

/**
 * Formata número de telefone para o WhatsApp
 * Adiciona código do Brasil (55) se necessário
 */
function formatPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  // Se tem 10 ou 11 dígitos, é número brasileiro sem código do país
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

/**
 * Envia mensagem de texto via WhatsApp usando Evolution API
 */
export async function sendWhatsApp({
  to,
  message,
  workspaceId,
}: {
  to: string;
  message: string;
  workspaceId: string;
}): Promise<{ success: boolean; mock?: boolean; error?: string }> {
  const credentials = await getEvolutionCredentials(workspaceId);

  if (!credentials) {
    console.log(
      `[Evolution Mock] To: ${to}, Message: ${message.substring(0, 50)}...`
    );
    return { success: true, mock: true };
  }

  const normalizedNumber = formatPhoneForWhatsApp(to);
  if (!normalizedNumber) {
    return { success: false, error: "Número de WhatsApp inválido" };
  }

  try {
    const url = `${credentials.apiUrl}/message/sendText/${credentials.instance}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        apikey: credentials.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: normalizedNumber,
        text: message,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const messages = data?.response?.message;

      // Número não está no WhatsApp
      const isNotOnWhatsApp =
        response.status === 400 &&
        Array.isArray(messages) &&
        messages.some(
          (m: Record<string, unknown>) => m && m.exists === false
        );

      if (isNotOnWhatsApp) {
        console.warn(
          `Número ${normalizedNumber} não está no WhatsApp.`
        );
        return {
          success: false,
          error: "Número não encontrado no WhatsApp",
        };
      }

      throw new Error(
        `Evolution API error: ${response.status} ${JSON.stringify(data)}`
      );
    }

    return { success: true };
  } catch (error) {
    console.error(`Falha ao enviar WhatsApp para ${normalizedNumber}:`, error);
    throw error;
  }
}

/**
 * Envia documento (PDF, imagem, etc) via WhatsApp
 */
export async function sendWhatsAppDocument({
  to,
  documentUrl,
  fileName,
  caption,
  mimeType = "application/pdf",
  workspaceId,
}: {
  to: string;
  documentUrl: string;
  fileName: string;
  caption?: string;
  mimeType?: string;
  workspaceId: string;
}): Promise<{ success: boolean; mock?: boolean; error?: string }> {
  const credentials = await getEvolutionCredentials(workspaceId);

  if (!credentials) {
    console.log(
      `[Evolution Mock] Document to: ${to}, File: ${fileName}`
    );
    return { success: true, mock: true };
  }

  const normalizedNumber = formatPhoneForWhatsApp(to);
  if (!normalizedNumber) {
    return { success: false, error: "Número de WhatsApp inválido" };
  }

  try {
    const url = `${credentials.apiUrl}/message/sendMedia/${credentials.instance}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        apikey: credentials.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: normalizedNumber,
        mediatype: "document",
        mimetype: mimeType,
        media: documentUrl,
        fileName,
        caption: caption || "",
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(
        `Evolution API error: ${response.status} ${JSON.stringify(data)}`
      );
    }

    return { success: true };
  } catch (error) {
    console.error(
      `Falha ao enviar documento WhatsApp para ${normalizedNumber}:`,
      error
    );
    throw error;
  }
}

/**
 * Envia imagem via WhatsApp
 */
export async function sendWhatsAppImage({
  to,
  imageUrl,
  caption,
  workspaceId,
}: {
  to: string;
  imageUrl: string;
  caption?: string;
  workspaceId: string;
}): Promise<{ success: boolean; mock?: boolean; error?: string }> {
  const credentials = await getEvolutionCredentials(workspaceId);

  if (!credentials) {
    console.log(`[Evolution Mock] Image to: ${to}`);
    return { success: true, mock: true };
  }

  const normalizedNumber = formatPhoneForWhatsApp(to);
  if (!normalizedNumber) {
    return { success: false, error: "Número de WhatsApp inválido" };
  }

  try {
    const url = `${credentials.apiUrl}/message/sendMedia/${credentials.instance}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        apikey: credentials.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: normalizedNumber,
        mediatype: "image",
        mimetype: "image/jpeg",
        media: imageUrl,
        caption: caption || "",
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(
        `Evolution API error: ${response.status} ${JSON.stringify(data)}`
      );
    }

    return { success: true };
  } catch (error) {
    console.error(
      `Falha ao enviar imagem WhatsApp para ${normalizedNumber}:`,
      error
    );
    throw error;
  }
}
