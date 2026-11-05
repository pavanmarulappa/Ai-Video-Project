import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getSession } from "@/lib/auth/session";

export default async function RegisterPage() {
  if (await getSession()) redirect("/dashboard");
  return <section className="auth-card"><div className="auth-symbol">✳</div><p className="eyebrow">MAKE ROOM FOR IDEAS</p><h1>Start your<br />creative studio.</h1><p className="auth-description">Create a free account and bring your first scene to life.</p><AuthForm mode="register" /><p className="auth-privacy">No payment details needed to get started.</p></section>;
}
