import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProjects } from '../features/projects/projectsSlice.js';
import CostCalculator from '../components/CostCalculator.jsx';
import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';

function projectImageSource(imageUrl) {
  if (!imageUrl) return '';
  return imageUrl.startsWith('http') ? imageUrl : `${API_BASE_URL}${imageUrl}`;
}

export default function Home() {
  const { t, dir } = useI18n();
  const { hash } = useLocation();
  const dispatch = useDispatch();
  const { items: projects, status, error } = useSelector((state) => state.projects);
  const [reviews, setReviews] = useState([]);
  const [reviewsError, setReviewsError] = useState('');
  const projectsRail = useRef(null);
  const reviewsRail = useRef(null);

  function scrollRail(ref, direction) {
    const rail = ref.current;
    if (!rail) return;
    const card = rail.firstElementChild;
    const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
    rail.scrollBy({ left: direction * (dir === 'rtl' ? -1 : 1) * ((card?.getBoundingClientRect().width || rail.clientWidth) + gap), behavior: 'smooth' });
  }

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE_URL}/api/reviews`).then(async (response) => {
      if (!response.ok) throw new Error('Could not load reviews.');
      return response.json();
    }).then((body) => { if (active) { setReviews(Array.isArray(body) ? body : []); setReviewsError(''); } })
      .catch((error) => { if (active) setReviewsError(error.message); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (hash === '#reviews' && reviews.length > 0) {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.getElementById('reviews')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
  }, [hash, reviews.length]);

  return (
    <div className="home-page">
      <section className="hero container">
        <div className="hero__content">
          <p className="eyebrow"><span className="eyebrow__line" /> {t('Independent architecture & interiors')}</p>
          <h1>{t('Spaces that feel')}<br /><em>{t('like they belong.')}</em></h1>
          <p className="hero__intro">{t('We create thoughtful, enduring places shaped around the people who live in them.')}</p>
          <Link className="button button--dark" to="/contact">{t('Start a conversation')} <span aria-hidden="true">↗</span></Link>
          <p className="hero__location">{t('Architecture · Interiors · Renovation')}</p>
        </div>
        <div className="hero-art" aria-label={t('Abstract architectural study in warm stone tones')} role="img">
          <div className="hero-art__sun" />
          <div className="hero-art__wall hero-art__wall--back" />
          <div className="hero-art__wall hero-art__wall--front" />
          <div className="hero-art__arch"><div /></div>
          <div className="hero-art__plinth" />
          <span className="hero-art__caption">{t('A study in light & form')} <span>01 — 04</span></span>
        </div>
      </section>

      <div className="studio-note container">
        <span>{t('Good design is felt before it is seen.')}</span>
        <span className="studio-note__rule" />
        <span>{t('Homes · Workplaces · Renewals')}</span>
      </div>

      <CostCalculator />
      <section className="project-section container" aria-labelledby="projects-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow__line" /> {t('Selected work')}</p>
            <h2 id="projects-title">{t('Made to be lived in.')}</h2>
          </div>
          <p className="section-heading__aside">{t('A collection of spaces, each with its own story.')}</p>
        </div>
        {status === 'loading' && <p className="notice-card">{t('Gathering our latest projects…')}</p>}
        {status === 'failed' && <p className="notice-card notice-card--error" role="alert">{t('Could not load projects: {error}', { error: t(error) })}</p>}
        {status === 'succeeded' && projects.length === 0 && <p className="notice-card">{t('Our project gallery is taking shape. Please check back soon.')}</p>}
        {status === 'succeeded' && projects.length > 0 && (<>
          <div className="rail-controls" aria-label={t('Portfolio navigation')}>
            <span>{t('Scroll to explore the gallery')}</span>
            <button type="button" aria-label={t('Previous portfolio image')} onClick={() => scrollRail(projectsRail, -1)}>{dir === 'rtl' ? '→' : '←'}</button>
            <button type="button" aria-label={t('Next portfolio image')} onClick={() => scrollRail(projectsRail, 1)}>{dir === 'rtl' ? '←' : '→'}</button>
          </div>
          <div className="project-grid scroll-rail" ref={projectsRail} role="region" aria-label={t('Portfolio images')} tabIndex="0">
            {projects.flatMap((project) => project.images?.length ? project.images.map((image) => ({ project, image })) : [{ project, image: null }]).map(({ project, image }, index) => (
              <article className={`project-card${project.status === 'Completed' ? ' project-card--completed' : ''}`} key={`${project.id}-${image?.id || 'cover'}`}>
                <div className="project-card__image-wrap">
                  {(image?.url || project.image_url) ? (
                    <img className="project-card__image" src={projectImageSource(image?.url || project.image_url)} alt={image?.caption || project.title} />
                  ) : (
                    <div className={`project-card__placeholder project-card__placeholder--${index % 3}`} aria-hidden="true">
                      <span>{String(index + 1).padStart(2, '0')}</span>
                    </div>
                  )}
                  {project.status && <span className="project-card__status">{t(project.status)}</span>}
                </div>
                <div className="project-card__body">
                  <h3 dir="auto">{project.title}</h3>
                  {project.description && <p dir="auto">{project.description}</p>}
                </div>
              </article>
            ))}
          </div>
        </>)}
      </section>
      {reviews.length > 0 && <section id="reviews" className="reviews-section container" aria-labelledby="reviews-title">
        <div className="section-heading"><div><p className="eyebrow"><span className="eyebrow__line" /> {t('Kind words')}</p><h2 id="reviews-title">{t('What our clients say.')}</h2></div></div>
        {reviews.length > 1 && <div className="rail-controls" aria-label={t('Review navigation')}><span>{t('Scroll through client stories')}</span><button type="button" aria-label={t('Previous review')} onClick={() => scrollRail(reviewsRail, -1)}>{dir === 'rtl' ? '→' : '←'}</button><button type="button" aria-label={t('Next review')} onClick={() => scrollRail(reviewsRail, 1)}>{dir === 'rtl' ? '←' : '→'}</button></div>}
        <div className="reviews-grid scroll-rail" ref={reviewsRail} role="region" aria-label={t('Client reviews')} tabIndex="0">{reviews.map((review) => <figure className="review-quote" key={review.id}>
          <div className="review-quote__stars" aria-label={t('{rating} out of 5 stars', { rating: review.rating })}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
          <blockquote dir="auto">{review.comment}</blockquote>
          <figcaption dir="auto">{review.client_name}{review.project_title ? ` · ${review.project_title}` : ''}</figcaption>
        </figure>)}</div>
      </section>}
      {reviewsError && <p className="notice-card notice-card--error container" role="alert">{t(reviewsError)}</p>}
      <section className="home-contact-cta">
        <div className="container home-contact-cta__inner">
          <p className="eyebrow eyebrow--light"><span className="eyebrow__line" /> {t('Have a project in mind?')}</p>
          <h2>{t('Let’s make room')}<br /><em>{t('for something good.')}</em></h2>
          <Link className="button button--light" to="/contact">{t('Tell us about it')} <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
    </div>
  );
}
