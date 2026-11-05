import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getSession } from "@/lib/auth/session";

export default async function LoginPage() {
  if (await getSession()) redirect("/dashboard");
  return <section className="auth-card"><div className="auth-symbol">✳</div><p className="eyebrow">WELCOME BACK</p><h1>Pick up where<br />your ideas left off.</h1><p className="auth-description">Sign in to return to your studio and keep creating.</p><AuthForm mode="login" /><p className="auth-privacy">Your account and videos stay yours.</p><Link className="auth-home-link" href="/">← Back to Frameforge</Link></section>;
}
