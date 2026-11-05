import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { GenerationList } from "@/components/video/generation-list";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/db/prisma";

export default async function VideosPage() {
  const user = await requireUser();
  const generations = await prisma.generation.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
  return <div className="page-stack videos-page">
    <div className="page-title-row"><div><p className="eyebrow">YOUR PERSONAL LIBRARY</p><h1>Videos, all in one place.</h1><p className="page-intro">Your ideas, drafts, and finished moments.</p></div><Link className="button button-primary" href="/create"><Plus size={16} /> New video <ArrowUpRight size={15} /></Link></div>
    <div className="library-toolbar"><span>{generations.length} {generations.length === 1 ? "video" : "videos"}</span><span className="library-sort">Most recent <i>⌄</i></span></div>
    <GenerationList generations={generations.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))} />
  </div>;
}
