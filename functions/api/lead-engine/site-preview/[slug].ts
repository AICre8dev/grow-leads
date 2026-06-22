const demoSites: Record<string, { title: string; phone: string; area: string; html: string }> = {
  'brighton-road-dentalcare': {
    title: 'Brighton Road Dentalcare',
    phone: '020 8688 8883',
    area: 'Purley, South London',
    html: renderDentistPreview(),
  },
};

export const onRequest: PagesFunction = async ({ params }) => {
  const slug = String(params.slug || '');
  const site = demoSites[slug];

  if (!site) {
    return new Response('Preview site not found', { status: 404 });
  }

  return new Response(site.html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60',
    },
  });
};

function renderDentistPreview() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Brighton Road Dentalcare | Private Dental Care in South London</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #faf8f2;
      --ink: #17201b;
      --muted: #657069;
      --line: #ded7ca;
      --accent: #2d6272;
      --gold: #c89547;
      --card: #fffdf8;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--ink); font-family: Inter, system-ui, sans-serif; }
    a { color: inherit; text-decoration: none; }
    header { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 18px 6vw; background: rgba(250, 248, 242, 0.9); backdrop-filter: blur(16px); border-bottom: 1px solid var(--line); }
    .brand { font-weight: 700; }
    nav { display: flex; gap: 18px; color: var(--muted); font-size: 14px; }
    .call, .primary, form button { border-radius: 6px; background: var(--accent); color: white; padding: 12px 16px; font-weight: 700; display: inline-flex; border: 0; }
    .secondary { border: 1px solid var(--line); border-radius: 6px; padding: 12px 16px; font-weight: 700; }
    .hero { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr); gap: 40px; padding: 88px 6vw 72px; align-items: end; }
    .eyebrow { text-transform: uppercase; letter-spacing: 0.16em; font-size: 12px; color: var(--accent); font-weight: 800; }
    h1, h2 { font-family: "Instrument Serif", Georgia, serif; font-weight: 400; line-height: 0.96; margin: 0; }
    h1 { font-size: clamp(46px, 8vw, 92px); max-width: 850px; }
    h2 { font-size: clamp(34px, 5vw, 58px); }
    .lead { font-size: 19px; line-height: 1.65; color: var(--muted); max-width: 680px; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
    .hero-card, article, blockquote, form { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 24px; box-shadow: 0 20px 60px rgba(45, 38, 20, 0.08); }
    .hero-card { padding: 28px; }
    .hero-card h2 { font-size: 36px; margin: 16px 0; }
    .rating, article span { color: var(--gold); font-weight: 800; }
    section { padding: 72px 6vw; border-top: 1px solid var(--line); }
    .grid, .quotes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 30px; }
    article h3 { margin: 18px 0 8px; }
    p { color: var(--muted); line-height: 1.6; }
    blockquote { margin: 0; font-size: 18px; line-height: 1.55; }
    cite { display: block; margin-top: 18px; color: var(--muted); font-size: 14px; }
    .contact { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; align-items: start; }
    form { display: grid; gap: 14px; }
    label { display: grid; gap: 8px; font-size: 13px; font-weight: 700; color: var(--muted); }
    input, textarea { width: 100%; border: 1px solid var(--line); border-radius: 6px; background: white; padding: 12px; font: inherit; }
    textarea { min-height: 120px; }
    footer { display: flex; flex-wrap: wrap; gap: 18px; justify-content: space-between; padding: 28px 6vw; background: #17201b; color: white; }
    @media (max-width: 860px) {
      .hero, .contact { grid-template-columns: 1fr; }
      .grid, .quotes { grid-template-columns: 1fr; }
      nav { display: none; }
      .hero { padding-top: 56px; }
      header { align-items: flex-start; }
      .call { padding: 10px 12px; font-size: 13px; }
    }
  </style>
</head>
<body>
  <header>
    <a class="brand" href="#top">Brighton Road Dentalcare</a>
    <nav aria-label="Primary">
      <a href="#services">Services</a>
      <a href="#reviews">Reviews</a>
      <a href="#contact">Contact</a>
    </nav>
    <a class="call" href="tel:+442086888883">020 8688 8883</a>
  </header>
  <main id="top">
    <section class="hero">
      <div>
        <p class="eyebrow">Private dental care in Purley</p>
        <h1>Calm, modern dental care for confident everyday smiles.</h1>
        <p class="lead">A welcoming dental practice for check-ups, hygiene care, restorative dentistry, and cosmetic treatments across Purley and South London.</p>
        <div class="actions">
          <a class="primary" href="tel:+442086888883">Call 020 8688 8883</a>
          <a class="secondary" href="#contact">Request an appointment</a>
        </div>
      </div>
      <aside class="hero-card" aria-label="Practice summary">
        <span class="rating">5 star Google rating</span>
        <h2>Friendly dentistry, clearly explained.</h2>
        <p>From first consultation to aftercare, every visit is designed to feel reassuring, practical, and personal.</p>
      </aside>
    </section>
    <section id="services">
      <p class="eyebrow">Treatments</p>
      <h2>Dental services built around real life.</h2>
      <div class="grid">
        <article><span>01</span><h3>General dentistry</h3><p>Routine examinations, fillings, gum care, and practical treatment plans.</p></article>
        <article><span>02</span><h3>Hygiene appointments</h3><p>Gentle cleaning and prevention advice to keep teeth healthy.</p></article>
        <article><span>03</span><h3>Cosmetic options</h3><p>Whitening, bonding, and natural-looking smile improvements.</p></article>
      </div>
    </section>
    <section id="reviews">
      <p class="eyebrow">Patient notes</p>
      <h2>Reassuring care from booking to treatment.</h2>
      <div class="quotes">
        <blockquote>"The team explained everything clearly and made the visit feel easy."<cite>Local patient</cite></blockquote>
        <blockquote>"Professional, gentle, and very calm. Exactly what I needed."<cite>Google review</cite></blockquote>
        <blockquote>"Great communication and a lovely practice atmosphere."<cite>Practice patient</cite></blockquote>
      </div>
    </section>
    <section class="contact" id="contact">
      <div>
        <p class="eyebrow">Book a visit</p>
        <h2>Ready to talk through your dental care?</h2>
        <p>Call the practice or send a short message and the team can help with the next appointment.</p>
        <a class="primary" href="tel:+442086888883">Call now</a>
      </div>
      <form>
        <label>Name<input placeholder="Your name" /></label>
        <label>Phone<input placeholder="Your phone" /></label>
        <label>Message<textarea placeholder="How can we help?"></textarea></label>
        <button type="button">Request appointment</button>
      </form>
    </section>
  </main>
  <footer>
    <strong>Brighton Road Dentalcare</strong>
    <span>Purley, South London</span>
    <a href="tel:+442086888883">020 8688 8883</a>
  </footer>
</body>
</html>`;
}
