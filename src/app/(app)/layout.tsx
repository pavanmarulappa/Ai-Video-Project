import Link from "next/link";
import { ArrowUpRight, Clapperboard, Film, LayoutDashboard, Plus, Settings2 } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { isAdminEmail } from "@/lib/auth/admin";
import { requireUser } from "@/lib/auth/require-user";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  return (
    <div className="studio-shell">
      <header className="studio-topbar">
        <Link className="brand" href="/dashboard"><span className="brand-mark"><Clapperboard size={16} /></span><span>frameforge</span></Link>
        <div className="topbar-right"><span className="workspace-label">YOUR STUDIO</span><span className="topbar-divider" /><div className="user-avatar" aria-label={user.name}>{user.name.slice(0, 1).toUpperCase()}</div><span className="topbar-name">{user.name}</span><SignOutButton /></div>
      </header>
      <div className="studio-body">
        <aside className="studio-sidebar">
          <div className="sidebar-label">WORKSPACE</div>
          <nav className="studio-nav" aria-label="Main navigation">
            <Link href="/dashboard"><LayoutDashboard size={17} /><span>Overview</span></Link>
            <Link href="/create"><Plus size={17} /><span>Create a video</span><ArrowUpRight className="sidebar-arrow" size={14} /></Link>
            <Link href="/videos"><Film size={17} /><span>Your videos</span></Link>
            {isAdminEmail(user.email) && <Link href="/settings/providers"><Settings2 size={17} /><span>Providers</span></Link>}
          </nav>
          <div className="sidebar-bottom"><div className="sidebar-tip-icon">✳</div><p className="sidebar-tip-title">A note for your next prompt</p><p>Describe the movement you want to see. A slow pan, a drifting cloud, a small gesture.</p><Link href="/create">Try a prompt <ArrowUpRight size={13} /></Link></div>
          <div className="sidebar-version">FRAMEFORGE STUDIO <span>v0.1</span></div>
        </aside>
        <main className="studio-content">{children}</main>
      </div>
    </div>
  );
}
