"use client";

import { ArrowDownToLine, CircleAlert, Clock3, LoaderCircle, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export type GenerationSummary = {
  id: string;
  prompt: string;
  aspectRatio: string;
  duration: number;
  resolution: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  provider: string;
  errorMessage: string | null;
  createdAt: string | Date;
};

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function Status({ status }: { status: GenerationSummary["status"] }) {
  if (status === "COMPLETED") return <span className="status-badge status-done"><span /> Complete</span>;
  if (status === "FAILED") return <span className="status-badge status-failed"><span /> Failed</span>;
  if (status === "PROCESSING") return <span className="status-badge status-processing"><LoaderCircle size={12} className="spin" /> Creating</span>;
  return <span className="status-badge status-queued"><Clock3 size={12} /> In queue</span>;
}

export function GenerationRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const interval = window.setInterval(() => router.refresh(), 4000);
    return () => window.clearInterval(interval);
  }, [active, router]);
  return null;
}

export function GenerationList({ generations, compact = false }: { generations: GenerationSummary[]; compact?: boolean }) {
  const active = generations.some((generation) => generation.status === "QUEUED" || generation.status === "PROCESSING");
  if (!generations.length) {
    return <div className="empty-state"><div className="empty-icon"><Sparkles size={20} /></div><h3>Your video history starts here</h3><p>When you generate a video, it will show up here with its status and download.</p></div>;
  }

  return (
    <>
      <GenerationRefresh active={active} />
      <div className={`generation-list ${compact ? "generation-list-compact" : ""}`}>
        {generations.map((generation) => (
          <article className="generation-card" key={generation.id}>
            <div className={`generation-media ratio-${generation.aspectRatio.replace(":", "-")}`}>
              {generation.status === "COMPLETED" ? (
                <video controls preload="metadata" src={`/api/generations/${generation.id}/video`} aria-label={`Video preview: ${generation.prompt}`} />
              ) : generation.status === "FAILED" ? (
                <div className="media-state media-failed"><CircleAlert size={20} /><span>Generation failed</span></div>
              ) : (
                <div className="media-state media-pending"><span className="loader-ring"><LoaderCircle size={22} /></span><span>{generation.status === "PROCESSING" ? "Creating your video…" : "Waiting in queue…"}</span></div>
              )}
              <span className="media-ratio">{generation.aspectRatio}</span>
            </div>
            <div className="generation-content">
              <div className="generation-heading"><Status status={generation.status} /><span className="generation-date">{formatDate(generation.createdAt)}</span></div>
              <p className="generation-prompt">{generation.prompt}</p>
              <div className="generation-meta"><span>{generation.duration}s</span><span className="meta-separator">·</span><span>{generation.resolution}</span><span className="meta-separator">·</span><span>{generation.provider === "mock" ? "Mock sample" : "Runway"}</span></div>
              {generation.status === "FAILED" && <p className="generation-error">{generation.errorMessage || "The provider could not complete this video. You can try again."}</p>}
              {generation.status === "COMPLETED" && (
                <a className="download-link" href={`/api/generations/${generation.id}/video?download=1`}><ArrowDownToLine size={15} /> Download video</a>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
