import { redirect } from "next/navigation";
import { ArrowLeft, Settings2 } from "lucide-react";
import Link from "next/link";
import { ProviderSettingsPanel } from "@/components/settings/provider-settings-panel";
import { isAdminEmail } from "@/lib/auth/admin";
import { requireUser } from "@/lib/auth/require-user";
import { getActiveVideoProviderName, getVideoProviderOptions } from "@/server/providers";

export default async function ProviderSettingsPage() {
  const user = await requireUser();
  if (!isAdminEmail(user.email)) redirect("/dashboard");
  const [activeProvider, providers] = await Promise.all([getActiveVideoProviderName(), getVideoProviderOptions()]);

  return <div className="page-stack provider-settings-page">
    <Link className="back-link" href="/dashboard"><ArrowLeft size={14} /> Back to overview</Link>
    <div className="page-title-row">
      <div><p className="eyebrow">STUDIO CONTROLS</p><h1>Choose your video engine.</h1><p className="page-intro">Select which generation provider the studio uses for new videos.</p></div>
      <div className="provider-label"><span className="provider-status" /><div><span>ACTIVE ENGINE</span><strong>{providers.find((provider) => provider.name === activeProvider)?.label || activeProvider}</strong></div><Settings2 size={17} /></div>
    </div>
    <ProviderSettingsPanel activeProvider={activeProvider} providers={providers.map(({ name, label, configured, capabilities }) => ({ name, label, configured, note: capabilities.note || "" }))} />
  </div>;
}
