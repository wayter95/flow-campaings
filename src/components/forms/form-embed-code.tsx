"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
}

interface FormEmbedCodeProps {
  formId: string;
  fields: FormField[];
}

export function FormEmbedCode({ formId, fields }: FormEmbedCodeProps) {
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const embedCode = `<form id="flow-form-${formId}" onsubmit="(async function(e){e.preventDefault();const d={};new FormData(e.target).forEach((v,k)=>d[k]=v);const r=await fetch('${baseUrl}/api/forms/${formId}/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});if(r.ok){e.target.innerHTML='<p>Obrigado pelo envio!</p>'}else{alert('Erro ao enviar')}})(event)">
${fields
  .map((f) => {
    const req = f.required ? " required" : "";
    if (f.type === "textarea") {
      return `  <div style="margin-bottom:12px">
    <label>${f.label}</label><br>
    <textarea name="${f.label}"${req} style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px"></textarea>
  </div>`;
    }
    return `  <div style="margin-bottom:12px">
    <label>${f.label}</label><br>
    <input type="${f.type}" name="${f.label}"${req} style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px">
  </div>`;
  })
  .join("\n")}
  <button type="submit" style="background:#000;color:#fff;padding:8px 24px;border:none;border-radius:4px;cursor:pointer">Enviar</button>
</form>`;

  async function handleCopy() {
    await navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Codigo de embed</CardTitle>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-1" /> Copiado
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1" /> Copiar
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          Cole este codigo HTML na sua landing page para capturar leads.
        </p>
        <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
          {embedCode}
        </pre>
      </CardContent>
    </Card>
  );
}
