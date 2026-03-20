"use client";

type InsightsFormValue = {
  date: string;
  objective: string;
  insights: string;
};

export function InsightsForm({
  value,
  onChange,
}: {
  value: InsightsFormValue;
  onChange: (value: InsightsFormValue) => void;
}) {
  return (
    <div className="grid gap-5">
      <label className="space-y-2 text-sm text-slate-700">
        <span className="font-medium">Data da analise</span>
        <input
          type="date"
          value={value.date}
          onChange={(event) => onChange({ ...value, date: event.target.value })}
          className="w-full rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-300"
        />
      </label>
      <label className="space-y-2 text-sm text-slate-700">
        <span className="font-medium">Objetivo da semana</span>
        <input
          type="text"
          value={value.objective}
          onChange={(event) => onChange({ ...value, objective: event.target.value })}
          placeholder="Ex.: gerar leads para campanha de Pascoa"
          className="w-full rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-300"
        />
      </label>
      <label className="space-y-2 text-sm text-slate-700">
        <span className="font-medium">Insights e contexto</span>
        <textarea
          value={value.insights}
          onChange={(event) => onChange({ ...value, insights: event.target.value })}
          placeholder="Campanhas ativas, foco comercial, eventos, promocoes e aprendizados recentes."
          rows={6}
          className="w-full rounded-3xl border border-white/80 bg-white/80 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-300"
        />
      </label>
    </div>
  );
}
