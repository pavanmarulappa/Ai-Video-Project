"use client";

import { Check, CircleDollarSign, LoaderCircle, LockKeyhole, Radio } from "lucide-react";
import { useState } from "react";

type ProviderName = "runway" | "replicate" | "fal";
type ProviderOption = { name: ProviderName; label: string; configured: boolean; note: string };

export function ProviderSettingsPanel({ activeProvider, providers }: { activeProvider: ProviderName; providers: ProviderOption[] }) {
  const [selected, setSelected] = useState(activeProvider);
  const [pending, setPending] = useState<ProviderName | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function activate(provider: ProviderName) {
    setPending(provider);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Could not switch providers.");
        return;
      }
      setSelected(provider);
      setMessage(`${providers.find((option) => option.name === provider)?.label || provider} is now active for new generations.`);
    } catch {
      setError("Could not reach the app. Check that the server is running.");
    } finally {
      setPending(null);
    }
  }

  return <section className="provider-settings panel">
    <div className="settings-intro"><div className="section-icon"><Radio size={18} /></div><div><h2>Available providers</h2><p>API keys stay on the server. The selected provider applies to all new generations.</p></div></div>
    <div className="provider-settings-list">
      {providers.map((provider) => {
        const active = provider.name === selected;
        return <article className={`provider-settings-card ${active ? "active" : ""} ${!provider.configured ? "unconfigured" : ""}`} key={provider.name}>
          <div className="provider-card-heading"><div><h3>{provider.label}</h3><span className={`provider-config-status ${provider.configured ? "ready" : "missing"}`}>{provider.configured ? "Ready" : "API key needed"}</span></div>{active && <span className="active-provider-mark"><Check size={13} /> Active</span>}</div>
          <p>{provider.note || "Returns a fixed sample clip for workflow checks. It does not generate video from your prompt."}</p>
          {provider.configured
            ? <button className={active ? "button provider-current-button" : "button button-primary provider-activate-button"} type="button" disabled={active || pending !== null} onClick={() => void activate(provider.name)}>
                {pending === provider.name ? <><LoaderCircle className="spin" size={15} /> Switching…</> : active ? "Currently selected" : "Use this provider"}
              </button>
            : <div className="provider-key-hint"><LockKeyhole size={14} /><span>Add its key to <code>.env.production</code>, then restart app and worker.</span></div>}
        </article>;
      })}
    </div>
    <div className="provider-cost-note"><CircleDollarSign size={16} /><p>Runway, Replicate, and fal.ai charge for real generations. Check the provider’s live model pricing before creating a video.</p></div>
    {message && <p className="provider-settings-success" role="status">{message}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>;
}
