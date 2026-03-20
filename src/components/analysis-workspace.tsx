"use client";

import { useRouter } from "next/navigation";

import { CSVUpload } from "@/components/csv-upload";
import { GenerateTopicsButton } from "@/components/generate-topics-button";

export function AnalysisWorkspace({
  analysisId,
  hasMetrics,
}: {
  analysisId: string;
  hasMetrics: boolean;
}) {
  const router = useRouter();

  function refresh() {
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <CSVUpload analysisId={analysisId} onUploaded={refresh} />
      <GenerateTopicsButton analysisId={analysisId} hasMetrics={hasMetrics} onGenerated={refresh} />
    </div>
  );
}
