export default function About() {
  return (
    <div className="about-page container">
      <section className="page-intro about-intro">
        <p className="eyebrow"><span className="eyebrow__line" /> A considered way of working</p>
        <h1>Design begins with<br /><em>paying attention.</em></h1>
        <p className="page-intro__lead">We are an independent architecture and interior design studio focused on thoughtful, lasting spaces.</p>
      </section>
      <section className="about-story">
        <div className="about-story__visual" aria-hidden="true">
          <div className="about-story__shape about-story__shape--one" />
          <div className="about-story__shape about-story__shape--two" />
          <span>FORM FOLLOWS FEELING</span>
        </div>
        <div className="about-story__copy">
          <p className="eyebrow"><span className="eyebrow__line" /> The studio</p>
          <h2>Thoughtful spaces.<br />Personal by nature.</h2>
          <p>Our studio is led by an experienced designer who works closely with each client from the first conversation through to completion. We believe the best spaces are both beautiful and deeply useful.</p>
          <p>Every project starts by listening: to the site, to the materials, and to the everyday rituals that make a place feel like yours.</p>
          <div className="about-signoff"><span className="about-signoff__mark">S</span><span>Studio<br /><small>Architecture · Interiors</small></span></div>
        </div>
      </section>
      <section className="about-values" aria-label="Our approach">
        <article><span>01</span><h3>Listen closely</h3><p>We begin with how you live, work, and move through your space.</p></article>
        <article><span>02</span><h3>Design with care</h3><p>Honest materials and clear decisions create work that lasts.</p></article>
        <article><span>03</span><h3>Stay connected</h3><p>A collaborative process keeps the details grounded in your vision.</p></article>
      </section>
    </div>
  );
}
