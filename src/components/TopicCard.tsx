"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type TopicCardItem = {
  id: string;
  title: string;
  format: string;
  objective: string;
  description: string;
  caption: string;
  headline: string | null;
  subheadline: string | null;
  visualScript: string[];
  visualIdea: string;
  cta: string;
};

type TopicDraft = {
  title: string;
  caption: string;
  headline: string;
  subheadline: string;
  visualScript: string;
  visualIdea: string;
  cta: string;
};

function createDraft(topic: TopicCardItem): TopicDraft {
  return {
    title: topic.title,
    caption: topic.caption,
    headline: topic.headline ?? "",
    subheadline: topic.subheadline ?? "",
    visualScript: topic.visualScript.join("\n"),
    visualIdea: topic.visualIdea,
    cta: topic.cta,
  };
}

function getObjectiveBadgeClasses(objective: string) {
  const normalized = objective.toLowerCase();

  if (normalized === "conversion") {
    return "bg-[var(--green-soft)] text-[var(--green)]";
  }

  if (normalized === "education") {
    return "bg-[var(--blue-soft)] text-[var(--blue)]";
  }

  if (normalized === "awareness") {
    return "bg-[var(--orange-soft)] text-[var(--orange)]";
  }

  return "bg-[var(--purple-soft)] text-[var(--purple)]";
}

export function TopicCard({ topic }: { topic: TopicCardItem }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<TopicDraft>(() => createDraft(topic));

  useEffect(() => {
    setDraft(createDraft(topic));
  }, [topic]);

  function updateField(field: keyof TopicDraft, value: string) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleCancel() {
    setDraft(createDraft(topic));
    setIsEditing(false);
    setMessage(null);
  }

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);

    const response = await fetch(`/api/topics/${topic.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: draft.title,
        caption: draft.caption,
        headline: draft.headline,
        subheadline: draft.subheadline,
        visualScript: draft.visualScript
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        visualIdea: draft.visualIdea,
        cta: draft.cta,
      }),
    });

    const payload = (await response.json()) as { message?: string };

    setIsSaving(false);
    setMessage(payload.message ?? (response.ok ? "Post atualizado." : "Falha ao atualizar o post."));

    if (response.ok) {
      setIsEditing(false);
      router.refresh();
    }
  }

  async function handleRegenerate() {
    setIsRegenerating(true);
    setMessage(null);

    const response = await fetch(`/api/topics/${topic.id}`, {
      method: "POST",
    });

    const payload = (await response.json()) as { message?: string };

    setIsRegenerating(false);
    setMessage(payload.message ?? (response.ok ? "Post regenerado." : "Falha ao regenerar o post."));

    if (response.ok) {
      setIsEditing(false);
      router.refresh();
    }
  }

  const displayCaption =
    isCaptionExpanded || topic.caption.length <= 220
      ? topic.caption
      : `${topic.caption.slice(0, 220).trimEnd()}...`;

  return (
    <Card hover className="p-5">
      <div className="flex items-center justify-between gap-4">
        <Badge tone="neutral">{topic.format}</Badge>
        <Badge tone="neutral" className={getObjectiveBadgeClasses(topic.objective)}>
          {topic.objective}
        </Badge>
      </div>

      <div className="mt-4">
        {isEditing ? (
          <input
            value={draft.title}
            onChange={(event) => updateField("title", event.target.value)}
            className="w-full rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-xl font-semibold tracking-[-0.03em] text-slate-950 outline-none transition focus:border-sky-300"
          />
        ) : (
          <h3 className="text-[1.7rem] font-semibold leading-tight tracking-[-0.04em] text-slate-950">{topic.title}</h3>
        )}
      </div>

      <Card strong className="mt-4 rounded-[28px] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Headline</p>
        {isEditing ? (
          <div className="mt-3 grid gap-3">
            <input
              value={draft.headline}
              onChange={(event) => updateField("headline", event.target.value)}
              className="w-full rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-xl font-semibold tracking-[-0.04em] text-slate-950 outline-none transition focus:border-sky-300"
            />
            <input
              value={draft.subheadline}
              onChange={(event) => updateField("subheadline", event.target.value)}
              placeholder="Subheadline opcional"
              className="w-full rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-300"
            />
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-[2rem] font-semibold leading-tight tracking-[-0.05em] text-slate-950">{topic.headline ?? topic.title}</p>
            {topic.subheadline ? (
              <p className="mt-2 text-sm leading-6 text-slate-500">{topic.subheadline}</p>
            ) : null}
          </div>
        )}
      </Card>

      <div className="mt-4 grid gap-4">
        <Card strong className="rounded-[26px] p-4">
          <p className="text-sm font-medium text-slate-900">Contexto</p>
          <p className="mt-3 text-sm leading-7 text-slate-700">{topic.description}</p>
        </Card>

        <Card strong className="rounded-[26px] p-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-slate-900">Legenda sugerida</p>
            {!isEditing && topic.caption.length > 220 ? (
              <button
                type="button"
                onClick={() => setIsCaptionExpanded((current) => !current)}
                className="text-xs font-semibold text-[var(--primary)] transition hover:opacity-80"
              >
                {isCaptionExpanded ? "Recolher" : "Expandir"}
              </button>
            ) : null}
          </div>
          {isEditing ? (
            <textarea
              value={draft.caption}
              onChange={(event) => updateField("caption", event.target.value)}
              rows={6}
              className="mt-3 w-full rounded-3xl border border-white/80 bg-white/80 px-4 py-3 outline-none transition focus:border-sky-300"
            />
          ) : (
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{displayCaption}</p>
          )}
        </Card>

        <Card strong className="rounded-[26px] p-4">
          <p className="text-sm font-medium text-slate-900">Ideia visual</p>
          {isEditing ? (
            <textarea
              value={draft.visualIdea}
              onChange={(event) => updateField("visualIdea", event.target.value)}
              rows={4}
              className="mt-3 w-full rounded-3xl border border-white/80 bg-white/80 px-4 py-3 outline-none transition focus:border-sky-300"
            />
          ) : (
            <p className="mt-3 text-sm leading-7 text-slate-700">{topic.visualIdea}</p>
          )}
        </Card>

        <Card strong className="rounded-[26px] p-4">
          <p className="text-sm font-medium text-slate-900">Roteiro visual</p>
          {isEditing ? (
            <textarea
              value={draft.visualScript}
              onChange={(event) => updateField("visualScript", event.target.value)}
              rows={5}
              className="mt-3 w-full rounded-3xl border border-white/80 bg-white/80 px-4 py-3 outline-none transition focus:border-sky-300"
            />
          ) : (
            <ol className="mt-3 grid gap-2">
              {topic.visualScript.map((step) => (
                <li
                  key={step}
                  className="rounded-2xl border border-white/60 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                >
                  {step}
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card strong className="rounded-[26px] p-4">
          <p className="text-sm font-medium text-slate-900">CTA</p>
          {isEditing ? (
            <input
              value={draft.cta}
              onChange={(event) => updateField("cta", event.target.value)}
              className="mt-3 w-full rounded-2xl border border-white/80 bg-white/80 px-4 py-3 outline-none transition focus:border-sky-300"
            />
          ) : (
            <p className="mt-3 text-sm leading-7 text-slate-700">{topic.cta}</p>
          )}
        </Card>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {!isEditing ? (
          <Button
            type="button"
            onClick={() => setIsEditing(true)}
            variant="secondary"
            size="sm"
          >
            Editar
          </Button>
        ) : (
          <>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              variant="primary"
              size="sm"
              className="disabled:bg-slate-400 disabled:shadow-none"
            >
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
            <Button
              type="button"
              onClick={handleCancel}
              variant="secondary"
              size="sm"
            >
              Cancelar
            </Button>
          </>
        )}
        <Button
          type="button"
          onClick={handleRegenerate}
          disabled={isRegenerating}
          size="sm"
          className="border border-[color:rgba(79,70,229,0.14)] bg-[var(--primary-soft)] text-[var(--primary)] shadow-[0_10px_24px_rgba(79,70,229,0.08)] hover:opacity-90"
        >
          {isRegenerating ? "Regenerando..." : "Regenerar"}
        </Button>
      </div>

      {message ? <p className="mt-4 text-sm leading-6 text-slate-500">{message}</p> : null}
    </Card>
  );
}
