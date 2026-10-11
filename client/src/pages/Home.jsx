import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProjects } from '../features/projects/projectsSlice.js';
import CostCalculator from '../components/CostCalculator.jsx';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';

function projectImageSource(imageUrl) {
  if (!imageUrl) return '';
  return imageUrl.startsWith('http') ? imageUrl : `${API_BASE_URL}${imageUrl}`;
}

export default function Home() {
  const dispatch = useDispatch();
  const { items: projects, status, error } = useSelector((state) => state.projects);
  const [reviews, setReviews] = useState([]);
  const [reviewsError, setReviewsError] = useState('');

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

  return (
    <div className="home-page">
      <section className="hero container">
        <div className="hero__content">
          <p className="eyebrow"><span className="eyebrow__line" /> Independent architecture &amp; interiors</p>
          <h1>Spaces that feel<br /><em>like they belong.</em></h1>
          <p className="hero__intro">We create thoughtful, enduring places shaped around the people who live in them.</p>
          <Link className="button button--dark" to="/contact">Start a conversation <span aria-hidden="true">↗</span></Link>
          <p className="hero__location">Architecture · Interiors · Renovation</p>
        </div>
        <div className="hero-art" aria-label="Abstract architectural study in warm stone tones" role="img">
          <div className="hero-art__sun" />
          <div className="hero-art__wall hero-art__wall--back" />
          <div className="hero-art__wall hero-art__wall--front" />
          <div className="hero-art__arch"><div /></div>
          <div className="hero-art__plinth" />
          <span className="hero-art__caption">A study in light &amp; form <span>01 — 04</span></span>
        </div>
      </section>

      <div className="studio-note container">
        <span>Good design is felt before it is seen.</span>
        <span className="studio-note__rule" />
        <span>Homes · Workplaces · Renewals</span>
      </div>

      <CostCalculator />
      <section className="project-section container" aria-labelledby="projects-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow__line" /> Selected work</p>
            <h2 id="projects-title">Made to be lived in.</h2>
          </div>
          <p className="section-heading__aside">A collection of spaces, each with its own story.</p>
        </div>
        {status === 'loading' && <p className="notice-card">Gathering our latest projects…</p>}
        {status === 'failed' && <p className="notice-card notice-card--error" role="alert">Could not load projects: {error}</p>}
        {status === 'succeeded' && projects.length === 0 && <p className="notice-card">Our project gallery is taking shape. Please check back soon.</p>}
        {status === 'succeeded' && projects.length > 0 && (
          <div className="project-grid">
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
                  {project.status && <span className="project-card__status">{project.status}</span>}
                </div>
                <div className="project-card__body">
                  <h3>{project.title}</h3>
                  {project.description && <p>{project.description}</p>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      {reviews.length > 0 && <section className="reviews-section container" aria-labelledby="reviews-title">
        <div className="section-heading"><div><p className="eyebrow"><span className="eyebrow__line" /> Kind words</p><h2 id="reviews-title">What our clients say.</h2></div></div>
        <div className="reviews-grid">{reviews.map((review) => <figure className="review-quote" key={review.id}>
          <div className="review-quote__stars" aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
          <blockquote>{review.comment}</blockquote>
          <figcaption>{review.client_name}{review.project_title ? ` · ${review.project_title}` : ''}</figcaption>
        </figure>)}</div>
      </section>}
      {reviewsError && <p className="notice-card notice-card--error container" role="alert">{reviewsError}</p>}
      <section className="home-contact-cta">
        <div className="container home-contact-cta__inner">
          <p className="eyebrow eyebrow--light"><span className="eyebrow__line" /> Have a project in mind?</p>
          <h2>Let’s make room<br /><em>for something good.</em></h2>
          <Link className="button button--light" to="/contact">Tell us about it <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
    </div>
  );
}
