"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle } from "lucide-react";
import Link from "next/link";
import { importContacts } from "@/services/import-contacts";

type FieldMapping = "email" | "firstName" | "lastName" | "source" | "tags" | "ignore";

const fieldOptions: { value: FieldMapping; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "firstName", label: "Nome" },
  { value: "lastName", label: "Sobrenome" },
  { value: "source", label: "Origem" },
  { value: "tags", label: "Tags (separadas por virgula)" },
  { value: "ignore", label: "Ignorar" },
];

export default function ImportContactsPage() {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "mapping" | "importing" | "done">("upload");
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [duplicateAction, setDuplicateAction] = useState<"skip" | "update">("skip");
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number; errors: string[] } | null>(null);
  const [error, setError] = useState("");

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");

    Papa.parse(file, {
      complete: (results) => {
        const data = results.data as string[][];
        if (data.length < 2) {
          setError("O arquivo precisa ter pelo menos um cabecalho e uma linha de dados.");
          return;
        }

        const fileHeaders = data[0];
        setHeaders(fileHeaders);
        setCsvData(data.slice(1).filter((row) => row.some((cell) => cell?.trim())));

        // Auto-map columns
        const autoMappings = fileHeaders.map((h): FieldMapping => {
          const lower = h.toLowerCase().trim();
          if (lower === "email" || lower === "e-mail") return "email";
          if (lower === "nome" || lower === "first_name" || lower === "firstname" || lower === "first name") return "firstName";
          if (lower === "sobrenome" || lower === "last_name" || lower === "lastname" || lower === "last name") return "lastName";
          if (lower === "origem" || lower === "source") return "source";
          if (lower === "tags" || lower === "tag") return "tags";
          return "ignore";
        });

        setMappings(autoMappings);
        setStep("mapping");
      },
      error: () => {
        setError("Erro ao processar o arquivo CSV.");
      },
    });
  }, []);

  function updateMapping(index: number, value: FieldMapping) {
    setMappings((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  async function handleImport() {
    if (!mappings.includes("email")) {
      setError("Voce precisa mapear pelo menos a coluna de email.");
      return;
    }

    setStep("importing");
    setError("");

    const rows = csvData.map((row) => {
      const mapped: Record<string, string> = {};
      mappings.forEach((field, i) => {
        if (field !== "ignore" && row[i]?.trim()) {
          mapped[field] = row[i].trim();
        }
      });
      return mapped as { email: string; firstName?: string; lastName?: string; source?: string; tags?: string };
    });

    const importResult = await importContacts(rows, duplicateAction);
    setResult(importResult);
    setStep("done");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/contacts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Importar contatos</h1>
          <p className="text-muted-foreground">Importe contatos a partir de um arquivo CSV</p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload do arquivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 gap-4">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground text-center">
                Selecione um arquivo CSV com os contatos para importar.
                <br />
                <span className="text-xs">
                  O arquivo deve ter cabecalhos na primeira linha (ex: email, nome, sobrenome, tags)
                </span>
              </p>
              <Button variant="outline" type="button" onClick={() => document.getElementById("csv-file")?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Selecionar arquivo CSV
              </Button>
              <input
                id="csv-file"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === "mapping" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Mapeamento de colunas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Associe cada coluna do CSV a um campo do contato. {csvData.length} linha{csvData.length !== 1 ? "s" : ""} encontrada{csvData.length !== 1 ? "s" : ""}.
              </p>

              <div className="grid gap-3">
                {headers.map((header, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-40 truncate">{header}</span>
                    <Select
                      value={mappings[i]}
                      onValueChange={(v) => updateMapping(i, v as FieldMapping)}
                    >
                      <SelectTrigger className="w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground truncate">
                      ex: {csvData[0]?.[i] || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Duplicatas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                O que fazer quando um email ja existe?
              </p>
              <Select
                value={duplicateAction}
                onValueChange={(v) => setDuplicateAction(v as "skip" | "update")}
              >
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Pular duplicatas</SelectItem>
                  <SelectItem value="update">Atualizar dados existentes</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pre-visualizacao</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((h, i) => (
                      <TableHead key={i}>
                        <div className="space-y-1">
                          <span>{h}</span>
                          <Badge variant={mappings[i] === "ignore" ? "secondary" : "default"} className="text-xs block w-fit">
                            {fieldOptions.find((f) => f.value === mappings[i])?.label}
                          </Badge>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>
                      {row.map((cell, j) => (
                        <TableCell key={j} className={mappings[j] === "ignore" ? "text-muted-foreground" : ""}>
                          {cell || "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {csvData.length > 5 && (
                <p className="text-xs text-muted-foreground p-3">
                  Mostrando 5 de {csvData.length} linhas
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setStep("upload")}>
              Voltar
            </Button>
            <Button onClick={handleImport}>
              Importar {csvData.length} contato{csvData.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </>
      )}

      {step === "importing" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
            <p className="text-muted-foreground">Importando contatos...</p>
          </CardContent>
        </Card>
      )}

      {step === "done" && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Importacao concluida
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{result.created}</p>
                <p className="text-sm text-muted-foreground">Criados</p>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
                <p className="text-sm text-muted-foreground">Atualizados</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-950 rounded-lg">
                <p className="text-2xl font-bold text-gray-600">{result.skipped}</p>
                <p className="text-sm text-muted-foreground">Pulados</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="bg-destructive/10 p-3 rounded-md">
                <p className="text-sm font-medium text-destructive mb-1">
                  {result.errors.length} erro{result.errors.length > 1 ? "s" : ""}:
                </p>
                <ul className="text-xs text-destructive space-y-1">
                  {result.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={() => router.push("/contacts")}>
                Ver contatos
              </Button>
              <Button variant="outline" onClick={() => {
                setStep("upload");
                setCsvData([]);
                setHeaders([]);
                setMappings([]);
                setResult(null);
              }}>
                Importar mais
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
