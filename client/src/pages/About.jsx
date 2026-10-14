import { useI18n } from '../i18n.jsx';

export default function About() {
  const { t } = useI18n();
  return (
    <div className="about-page container">
      <section className="page-intro about-intro">
        <p className="eyebrow"><span className="eyebrow__line" /> {t('A considered way of working')}</p>
        <h1>{t('Design begins with')}<br /><em>{t('paying attention.')}</em></h1>
        <p className="page-intro__lead">{t('We are an independent architecture and interior design studio focused on thoughtful, lasting spaces.')}</p>
      </section>
      <section className="about-story">
        <div className="about-story__visual" aria-hidden="true">
          <div className="about-story__shape about-story__shape--one" />
          <div className="about-story__shape about-story__shape--two" />
          <span>{t('FORM FOLLOWS FEELING')}</span>
        </div>
        <div className="about-story__copy">
          <p className="eyebrow"><span className="eyebrow__line" /> {t('The studio')}</p>
          <h2>{t('Thoughtful spaces.')}<br />{t('Personal by nature.')}</h2>
          <p>{t('Our studio is led by an experienced designer who works closely with each client from the first conversation through to completion. We believe the best spaces are both beautiful and deeply useful.')}</p>
          <p>{t('Every project starts by listening: to the site, to the materials, and to the everyday rituals that make a place feel like yours.')}</p>
          <div className="about-signoff"><span className="about-signoff__mark">S</span><span>{t('Studio')}<br /><small>{t('Architecture · Interiors')}</small></span></div>
        </div>
      </section>
      <section className="about-values" aria-label={t('Our approach')}>
        <article><span>01</span><h3>{t('Listen closely')}</h3><p>{t('We begin with how you live, work, and move through your space.')}</p></article>
        <article><span>02</span><h3>{t('Design with care')}</h3><p>{t('Honest materials and clear decisions create work that lasts.')}</p></article>
        <article><span>03</span><h3>{t('Stay connected')}</h3><p>{t('A collaborative process keeps the details grounded in your vision.')}</p></article>
      </section>
    </div>
  );
}
