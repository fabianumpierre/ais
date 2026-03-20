"use client";

type ClientItem = {
  id: string;
  name: string;
  segment: string;
};

export function ClientSelector({
  clients,
  value,
  onChange,
}: {
  clients: ClientItem[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-sm text-slate-700">
      <span className="font-medium">Cliente</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-300"
      >
        <option value="">Selecione um cliente</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name} · {client.segment}
          </option>
        ))}
      </select>
    </label>
  );
}
