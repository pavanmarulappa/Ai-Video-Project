import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { CreateVideoForm } from "@/components/video/create-video-form";
import { getVideoProvider } from "@/server/providers";

export default function CreatePage() {
  const capabilities = getVideoProvider().capabilities;
  return <div className="page-stack create-page">
    <Link className="back-link" href="/dashboard"><ArrowLeft size={14} /> Back to overview</Link>
    <div className="page-title-row"><div><p className="eyebrow">THE CREATIVE PART</p><h1>Let’s make a video.</h1><p className="page-intro">Start with the scene in your head. We’ll take it from there.</p></div><div className="provider-label"><span className="provider-status" /><div><span>GENERATION MODE</span><strong>{capabilities.label}</strong></div><Sparkles size={17} /></div></div>
    <CreateVideoForm capabilities={capabilities} />
  </div>;
}
