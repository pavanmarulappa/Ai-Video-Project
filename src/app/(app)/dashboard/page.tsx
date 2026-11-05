import Link from "next/link";
import { ArrowRight, ArrowUpRight, Film, Plus, Sparkles, Video } from "lucide-react";
import { GenerationList } from "@/components/video/generation-list";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/db/prisma";

export default async function DashboardPage() {
  const user = await requireUser();
  const today = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "2-digit" }).format(new Date()).toUpperCase();
  const [total, completed, active, recent] = await Promise.all([
    prisma.generation.count({ where: { userId: user.id } }),
    prisma.generation.count({ where: { userId: user.id, status: "COMPLETED" } }),
    prisma.generation.count({ where: { userId: user.id, status: { in: ["QUEUED", "PROCESSING"] } } }),
    prisma.generation.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 3 }),
  ]);

  return <div className="page-stack">
    <div className="welcome-row"><div><p className="eyebrow">{today} <span className="eyebrow-star">✳</span></p><h1>Good ideas start<br /><em>with a little motion.</em></h1><p className="page-intro">Welcome back, {user.name.split(" ")[0]}. What would you like to make today?</p></div><Link className="button button-primary" href="/create"><Plus size={17} /> Create a video <ArrowUpRight size={15} /></Link></div>

    <div className="stats-grid">
      <div className="stat-card"><div className="stat-icon stat-lilac"><Film size={17} /></div><span className="stat-label">TOTAL GENERATIONS</span><strong>{total}</strong><span className="stat-note">Your ideas in motion</span></div>
      <div className="stat-card"><div className="stat-icon stat-peach"><Video size={17} /></div><span className="stat-label">COMPLETED VIDEOS</span><strong>{completed}</strong><span className="stat-note">Ready to preview and share</span></div>
      <div className="stat-card"><div className="stat-icon stat-mint"><Sparkles size={17} /></div><span className="stat-label">IN THE WORKS</span><strong>{active}</strong><span className="stat-note">Making their way to you</span></div>
    </div>

    <section className="dashboard-section"><div className="section-head"><div><p className="eyebrow">YOUR RECENT WORK</p><h2>A few things you’ve made.</h2></div><Link className="text-arrow" href="/videos">See your video library <ArrowRight size={15} /></Link></div><GenerationList generations={recent.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))} compact /></section>

    {total === 0 && <section className="first-project-card"><div className="first-project-art"><div className="first-orbit" /><span>✳</span><i /></div><div><span className="first-tag">A FRESH CANVAS</span><h2>Every film starts with<br />one small thought.</h2><p>Write a prompt, pick your frame, and let’s see where it goes.</p><Link className="button button-primary" href="/create">Create your first video <ArrowRight size={16} /></Link></div></section>}
    <div className="dashboard-footnote"><span className="footnote-icon">✳</span><p>Good prompts are little stories. Give your scene a setting, a moment, and a feeling.</p><Link href="/create">Start with a prompt <ArrowUpRight size={14} /></Link></div>
  </div>;
}
