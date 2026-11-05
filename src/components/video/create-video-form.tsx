"use client";

import { ArrowUpRight, Check, Clapperboard, Film, MonitorPlay, Smartphone } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProviderCapabilities } from "@/server/providers/provider";
import { MAX_PROMPT_LENGTH } from "@/lib/validation/generation";

const ratios = [
  { value: "16:9", label: "Landscape", size: "16:9", icon: MonitorPlay, detail: "YouTube · presentations" },
  { value: "9:16", label: "Portrait", size: "9:16", icon: Smartphone, detail: "Reels · Shorts · TikTok" },
  { value: "1:1", label: "Square", size: "1:1", icon: Film, detail: "Social posts · feeds" },
] as const;

export function CreateVideoForm({ capabilities }: { capabilities: ProviderCapabilities }) {
  const router = useRouter();
  const firstRatio = ratios.find((ratio) => capabilities.aspectRatios.includes(ratio.value))?.value || "16:9";
  const [aspectRatio, setAspectRatio] = useState<string>(firstRatio);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          aspectRatio,
          duration: Number(form.get("duration")),
          resolution: form.get("resolution"),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "We couldn't start this generation. Please check your settings.");
        return;
      }
      router.push("/videos");
      router.refresh();
    } catch {
      setError("Could not reach the app. Check that the server and worker are running.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="create-layout" onSubmit={submit}>
      <div className="create-main panel">
        <div className="form-section-heading">
          <div className="section-icon"><Clapperboard size={18} /></div>
          <div><h2>Describe your video</h2><p>Write a clear scene, action, and visual style.</p></div>
        </div>
        <label className="field-label" htmlFor="prompt">Your prompt</label>
        <textarea
          className="prompt-input"
          id="prompt"
          name="prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value.slice(0, MAX_PROMPT_LENGTH))}
          minLength={8}
          maxLength={MAX_PROMPT_LENGTH}
          placeholder="A quiet coastal town at sunrise, waves washing over dark stones…"
          required
          rows={8}
        />
        <div className="prompt-footer"><span>Be specific about motion, lighting, and mood.</span><span>{prompt.length.toLocaleString()} / {MAX_PROMPT_LENGTH.toLocaleString()}</span></div>

        <div className="form-divider" />
        <div className="field-label">Aspect ratio</div>
        <div className="ratio-grid">
          {ratios.map(({ value, label, size, icon: Icon, detail }) => {
            const available = capabilities.aspectRatios.includes(value);
            return (
              <button
                className={`ratio-option ${aspectRatio === value ? "selected" : ""} ${!available ? "unavailable" : ""}`}
                key={value}
                type="button"
                disabled={!available}
                onClick={() => setAspectRatio(value)}
                aria-pressed={aspectRatio === value}
              >
                <span className="ratio-top"><Icon size={18} /><span className="ratio-check">{aspectRatio === value && <Check size={13} />}</span></span>
                <strong>{label}</strong><span className="ratio-size">{size}</span><span className="ratio-detail">{available ? detail : "Not supported by this provider"}</span>
              </button>
            );
          })}
        </div>

        <div className="settings-row">
          <label className="field-label" htmlFor="duration">Duration
            <select className="select-input" id="duration" name="duration" defaultValue={capabilities.durations.includes(10) ? 10 : capabilities.durations[0]}>
              {capabilities.durations.map((duration) => <option key={duration} value={duration}>{duration} seconds</option>)}
            </select>
          </label>
          <label className="field-label" htmlFor="resolution">Quality
            <select className="select-input" id="resolution" name="resolution" defaultValue={capabilities.resolutions[0]}>
              {capabilities.resolutions.map((resolution) => <option key={resolution} value={resolution}>{resolution}</option>)}
            </select>
          </label>
        </div>

        {capabilities.note && <div className="provider-note"><span className="note-dot" /><p>{capabilities.note}</p></div>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="submit-row">
          <p>Generation can take a few minutes. Keep this tab open to follow progress.</p>
          <button className="button button-primary" type="submit" disabled={pending || prompt.trim().length < 8}>
            {pending ? "Adding to queue…" : <>Generate video <ArrowUpRight size={16} /></>}
          </button>
        </div>
      </div>
      <aside className="create-aside">
        <div className="aside-preview">
          <div className="preview-sky" />
          <div className="preview-horizon" />
          <div className="preview-sun" />
          <div className="preview-mountains" />
          <div className="preview-overlay"><span className="preview-pill"><span className="live-dot" /> READY TO CREATE</span><span className="preview-caption">Your next idea<br />starts here.</span></div>
          <div className="preview-corner">FRAMEFORGE <span>01</span></div>
        </div>
        <div className="aside-tip"><span className="tip-spark">✳</span><div><strong>Prompt tip</strong><p>Tell the model what moves through the scene. “Camera slowly pans across…” often gives a clearer result than a list of objects.</p></div></div>
      </aside>
    </form>
  );
}
