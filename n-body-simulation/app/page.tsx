import Link from 'next/link';

export default function Home() {
  return (
    <main className="landing">
      <div className="landing__glow landing__glow--left" />
      <div className="landing__glow landing__glow--right" />

      <section className="landing__hero">
        <p className="landing__eyebrow">MAT397 · numerical systems sandbox</p>
        <h1>Rebuilt N-body simulation with cleaner physics, richer controls, and a 3D mode.</h1>
        <p>
          This project now combines a better integrator pipeline, curated orbital presets, live diagnostics, editable bodies,
          collision merging, and a perspective renderer for clustered 3D systems.
        </p>

        <div className="landing__actions">
          <Link href="/simulation" className="landing__primary">
            Launch simulator
          </Link>
          <a href="https://en.wikipedia.org/wiki/N-body_problem" className="landing__secondary">
            Read the math
          </a>
        </div>
      </section>

      <section className="landing__features">
        <article>
          <h2>Cleaner engine</h2>
          <p>Shared types, metrics, presets, and integrators replace the original single-component prototype.</p>
        </article>
        <article>
          <h2>Faster insight</h2>
          <p>Energy, momentum, center of mass, and max speed update live so you can feel numerical drift quickly.</p>
        </article>
        <article>
          <h2>More to explore</h2>
          <p>Switch between 2D and 3D, rotate the camera, merge collisions, randomize systems, and edit any body directly.</p>
        </article>
      </section>
    </main>
  );
}
