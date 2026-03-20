"use client";

import { TopicCard, type TopicCardItem } from "@/components/TopicCard";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";

export function TopicsList({ topics }: { topics: TopicCardItem[] }) {
  return (
    <Card className="p-6">
      <SectionHeader
        title="Posts gerados"
        description="Cada item combina ideia estratégica, copy pronta e direção criativa para o time de design."
        className="mb-6"
      />
      {topics.length === 0 ? (
        <Card strong className="rounded-3xl border border-dashed p-6 text-sm text-slate-500">
          Nenhum post gerado ainda. Envie métricas e clique em gerar para popular esta seção.
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {topics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </div>
      )}
    </Card>
  );
}
