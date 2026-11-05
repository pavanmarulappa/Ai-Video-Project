import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, CirclePlay, Clapperboard, Layers3, WandSparkles } from "lucide-react";

export default function HomePage() {
  return (
    <main className="marketing-page">
      <nav className="marketing-nav shell">
        <Link className="brand" href="/"><span className="brand-mark"><Clapperboard size={17} strokeWidth={2.3} /></span><span>frameforge</span></Link>
        <div className="marketing-nav-links"><a href="#how-it-works">How it works</a><a href="#features">Studio</a></div>
        <div className="marketing-nav-actions"><Link className="nav-text-link" href="/login">Sign in</Link><Link className="button button-dark" href="/register">Start creating <ArrowUpRight size={15} /></Link></div>
      </nav>

      <section className="hero shell">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> YOUR IDEAS, IN MOTION</div>
          <h1>Dream it.<br /><span>Frame it.</span><br />Make it move.</h1>
          <p className="hero-description">A thoughtful space to turn the little scenes in your head into videos worth sharing.</p>
          <div className="hero-actions"><Link className="button button-primary button-large" href="/register">Make your first video <ArrowRight size={17} /></Link><a className="hero-secondary" href="#how-it-works"><CirclePlay size={18} /> See how it works</a></div>
          <div className="hero-footnote"><span className="avatar-stack"><i>J</i><i>M</i><i>A</i></span><span>A creative studio for curious minds</span></div>
        </div>
        <div className="hero-art" aria-label="Abstract sunset landscape illustration">
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="art-window"><div className="art-sky" /><div className="art-sun" /><div className="art-cloud cloud-one" /><div className="art-cloud cloud-two" /><div className="art-mountain mountain-back" /><div className="art-mountain mountain-front" /><div className="art-water" /><div className="art-spark spark-one">✳</div><div className="art-spark spark-two">✴</div></div>
          <div className="art-tag tag-top"><span className="tag-play"><CirclePlay size={15} /></span><span><strong>scene_001</strong><small>your first frame</small></span></div>
          <div className="art-tag tag-bottom"><span className="tag-indicator" /><span>quiet moments, made visible</span><ArrowUpRight size={14} /></div>
          <div className="art-number">01 <span>— 03</span></div>
        </div>
      </section>

      <section className="intro-band shell" id="how-it-works">
        <div className="intro-stamp"><WandSparkles size={18} /><span>MADE FOR<br />IMAGINATION</span></div>
        <div className="intro-copy"><p className="eyebrow">FROM THOUGHT TO TAKE</p><h2>Less figuring it out.<br /><em>More making things.</em></h2></div>
        <div className="intro-description"><p>Start with a sentence. Set the shape and pace. We’ll handle the busywork while you stay close to the idea.</p><a href="#features" className="text-arrow">A little tour <ArrowDown size={15} /></a></div>
      </section>

      <section className="feature-section" id="features">
        <div className="shell feature-shell">
          <div className="feature-heading"><div><p className="eyebrow">YOUR CREATIVE WORKSPACE</p><h2>A good idea deserves<br />a good place to grow.</h2></div><span className="feature-counter">01 <i>/</i> 03</span></div>
          <div className="feature-grid">
            <article className="feature-card feature-card-large"><div className="feature-visual prompt-visual"><div className="prompt-paper"><span className="paper-label">YOUR PROMPT</span><span className="prompt-line line-1" /><span className="prompt-line line-2" /><span className="prompt-line line-3" /><div className="paper-stamp"><WandSparkles size={18} /></div></div><div className="visual-scribble">✳</div></div><div className="feature-card-copy"><span className="feature-number">01 — THE IDEA</span><h3>Start anywhere.</h3><p>Put the picture in your head into words. You can fine-tune the framing before you press go.</p></div></article>
            <article className="feature-card"><div className="feature-visual ratios-visual"><span className="ratio-frame frame-landscape"><i /></span><span className="ratio-frame frame-portrait"><i /></span><span className="ratio-frame frame-square"><i /></span><span className="ratio-caption">SHAPE YOUR STORY</span></div><div className="feature-card-copy"><span className="feature-number">02 — THE FRAME</span><h3>Fits where you share.</h3><p>Choose landscape, portrait, or square. Available settings follow the provider you choose.</p></div></article>
            <article className="feature-card"><div className="feature-visual history-visual"><div className="history-ticket ticket-one"><span /><i /><small>just now</small></div><div className="history-ticket ticket-two"><span /><i /><small>yesterday</small></div><div className="history-ticket ticket-three"><span /><i /><small>last week</small></div><div className="history-play"><CirclePlay size={25} /></div></div><div className="feature-card-copy"><span className="feature-number">03 — THE LIBRARY</span><h3>Keep what you make.</h3><p>Every draft stays organized in one place, ready to preview or download.</p></div></article>
          </div>
        </div>
      </section>

      <section className="closing-cta shell"><div className="closing-flower">✳</div><p className="eyebrow">YOUR NEXT SCENE IS WAITING</p><h2>Go on. Make<br /><em>something move.</em></h2><Link href="/register" className="button button-primary button-large">Open your studio <ArrowUpRight size={17} /></Link><span className="closing-note">A good idea is all you need to begin.</span></section>

      <footer className="marketing-footer shell"><Link className="brand" href="/"><span className="brand-mark"><Clapperboard size={16} /></span><span>frameforge</span></Link><span>Made with care, for the curious.</span><div><Link href="/login">Sign in</Link><Link href="/register">Create account</Link></div><span className="footer-mark"><Layers3 size={16} /></span></footer>
    </main>
  );
}
