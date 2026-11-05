import Link from "next/link";
import { Clapperboard } from "lucide-react";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <main className="auth-page"><div className="auth-top shell"><Link className="brand" href="/"><span className="brand-mark"><Clapperboard size={17} /></span><span>frameforge</span></Link><Link className="nav-text-link" href="/">Back to home <ArrowBack /></Link></div><div className="auth-centered">{children}</div><div className="auth-footer">A creative studio for curious minds <span>✳</span></div></main>;
}

function ArrowBack() { return <span aria-hidden="true">↗</span>; }
