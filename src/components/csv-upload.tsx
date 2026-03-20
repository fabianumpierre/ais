"use client";

import { useRef, useState } from "react";

const mappableFields = [
  { id: "date", label: "Date" },
  { id: "reach", label: "Reach" },
  { id: "format", label: "Format" },
  { id: "theme", label: "Theme" },
  { id: "likes", label: "Likes" },
  { id: "comments", label: "Comments" },
  { id: "saves", label: "Saves" },
  { id: "shares", label: "Shares" },
] as const;

export function CSVUpload({
  analysisId,
  onUploaded,
}: {
  analysisId: string;
  onUploaded: () => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Record<string, string> | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
  const [manualMapping, setManualMapping] = useState<Record<string, string>>({});
  const [missingRequiredFields, setMissingRequiredFields] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitUpload();
  }

  async function submitUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setMessage("Selecione um arquivo CSV antes de enviar.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    if (Object.keys(manualMapping).length > 0) {
      formData.append("mapping", JSON.stringify(manualMapping));
    }

    setIsUploading(true);
    setMessage(null);
    setMapping(null);
    setWarnings([]);

    const response = await fetch(`/api/analyses/${analysisId}/metrics`, {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as {
      code?: string;
      message?: string;
      mapping?: Record<string, string>;
      warnings?: string[];
      availableHeaders?: string[];
      missingRequiredFields?: string[];
    };

    setIsUploading(false);
    setMessage(payload.message ?? (response.ok ? "CSV enviado." : "Falha ao enviar o CSV."));
    setMapping(payload.mapping ?? null);
    setWarnings(payload.warnings ?? []);
    setAvailableHeaders(payload.availableHeaders ?? []);
    setMissingRequiredFields(payload.missingRequiredFields ?? []);

    if (payload.mapping) {
      setManualMapping(payload.mapping);
    }

    if (response.ok) {
      setAvailableHeaders([]);
      setMissingRequiredFields([]);
      setManualMapping({});
      fileInputRef.current?.form?.reset();
      onUploaded();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-[30px] p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <label className="flex-1 space-y-2 text-sm text-slate-700">
          <span className="font-medium">CSV de métricas</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="block w-full rounded-2xl border border-dashed border-white/70 bg-white/70 px-4 py-3 text-sm text-slate-600"
          />
        </label>
        <button
          type="submit"
          disabled={isUploading}
          className="pill-button rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(15,23,42,0.16)] hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
        >
          {isUploading ? "Processando..." : "Enviar CSV"}
        </button>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-500">
        O sistema tenta detectar automaticamente colunas em ingles e portugues para date, format, theme, reach, likes, comments, saves e shares.
      </p>
      {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
      {mapping ? (
        <div className="glass-card-strong mt-4 rounded-2xl p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Detected column mapping</p>
          <div className="mt-3 grid gap-2">
            {Object.entries(mapping).map(([field, header]) => (
              <p key={field}>
                <span className="font-medium capitalize">{field}</span> → &quot;{header}&quot;
              </p>
            ))}
          </div>
        </div>
      ) : null}
      {warnings.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-200/60 bg-amber-50/80 p-4 text-sm text-amber-900 backdrop-blur">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
      {missingRequiredFields.length > 0 && availableHeaders.length > 0 ? (
        <div className="glass-card-strong mt-4 rounded-2xl p-4">
          <p className="text-sm font-semibold text-slate-900">Confirm missing column mapping</p>
          <p className="mt-1 text-sm text-slate-600">
            Selecione manualmente as colunas obrigatorias que nao foram detectadas automaticamente.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {mappableFields.map((field) => (
              <label key={field.id} className="space-y-2 text-sm text-slate-700">
                <span className="font-medium">
                  {field.label}
                  {missingRequiredFields.includes(field.id) ? " *" : ""}
                </span>
                <select
                  value={manualMapping[field.id] ?? ""}
                  onChange={(event) =>
                    setManualMapping((current) => ({
                      ...current,
                      [field.id]: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-white/80 bg-white/80 px-4 py-3 outline-none transition focus:border-sky-300"
                >
                  <option value="">Nao mapear</option>
                  {availableHeaders.map((header) => (
                    <option key={`${field.id}-${header}`} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={submitUpload}
            disabled={isUploading || missingRequiredFields.some((field) => !manualMapping[field])}
            className="pill-button mt-4 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(15,23,42,0.16)] hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
          >
            Tentar importacao com mapeamento manual
          </button>
        </div>
      ) : null}
    </form>
  );
}
