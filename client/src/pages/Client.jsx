import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProjectImage from '../components/ProjectImage.jsx';
import { useI18n } from '../i18n.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';
const TOKEN_KEY = 'architecture_client_token';

async function request(path, token, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return body;
}

export default function Client() {
  const { t } = useI18n();
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState(false);
  const [reviewProject, setReviewProject] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!token) { setProjects([]); return undefined; }
    let active = true;
    setStatus('loading');
    request('/api/client/projects', token).then((items) => {
      if (active) { setProjects(items); setStatus('ready'); }
    }).catch((error) => {
      if (!active) return;
      setMessage(error.message);
      setMessageError(true);
      setStatus('error');
      if (error.status === 401 || error.status === 403) {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      }
    });
    return () => { active = false; };
  }, [token]);

  async function login(event) {
    event.preventDefault();
    setStatus('loading');
    setMessage('');
    setMessageError(false);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Sign in failed.');
      const payload = JSON.parse(atob(body.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.role !== 'client') throw new Error('This account is not a client account.');
      localStorage.setItem(TOKEN_KEY, body.token);
      setToken(body.token);
      setPassword('');
    } catch (error) { setMessage(error.message); setMessageError(true); setStatus('error'); }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setMessage('');
    setMessageError(false);
  }

  async function submitReview(event) {
    event.preventDefault();
    setStatus('sending');
    setMessage('');
    setMessageError(false);
    try {
      await request('/api/reviews', token, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: Number(reviewProject), rating: Number(rating), comment }),
      });
      setProjects((current) => current.map((project) => String(project.id) === reviewProject ? { ...project, has_review: true } : project));
      setReviewProject('');
      setComment('');
      setStatus('ready');
      setMessage('Thank you. Your review is now visible on the home page.');
    } catch (error) {
      if (error.status === 409) {
        request('/api/client/projects', token).then(setProjects).catch(() => {});
      }
      setStatus('ready'); setMessage(error.message); setMessageError(true);
    }
  }

  if (!token) return <div className="admin-page container"><section className="admin-login">
    <p className="eyebrow"><span className="eyebrow__line" /> {t('Client space')}</p>
    <h1>{t('Your projects.')}</h1>
    <p className="admin-login__intro">{t('Sign in with the details emailed when your first project was opened.')}</p>
    <form className="admin-login__form" onSubmit={login}>
      <label className="form-field"><span>{t('Email')}</span><input className="form-control" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label className="form-field"><span>{t('Password')}</span><input className="form-control" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
      <button className="button button--dark" type="submit" disabled={status === 'loading'}>{t('Sign in')} <span aria-hidden="true">↗</span></button>
    </form>
    {message && <p className="form-feedback form-feedback--error" role="alert">{t(message)}</p>}
  </section></div>;

  const completed = projects.filter((project) => project.status === 'Completed');
  const availableToReview = completed.filter((project) => !project.has_review);
  return <div className="admin-page container">
    <header className="admin-header"><div><p className="eyebrow"><span className="eyebrow__line" /> {t('Client space')}</p><h1>{t('Your projects.')}</h1></div><button className="button button--outline" onClick={logout}>{t('Sign out')}</button></header>
    {status === 'loading' && <p className="notice-card">{t('Loading your projects…')}</p>}
    {status === 'error' && <p className="form-feedback form-feedback--error" role="alert">{t(message)}</p>}
    {status === 'ready' && projects.length === 0 && <p className="notice-card">{t('No projects are linked to this account yet.')}</p>}
    <div className="client-project-grid">{projects.map((project) => <article key={project.id} className={`admin-panel client-project${project.status === 'Completed' ? ' client-project--completed' : ''}`}>
      <div className="client-project__heading"><div><p className="eyebrow"><span className="eyebrow__line" /> {t(project.status === 'Completed' ? 'Completed work' : 'In progress')}</p><h2 dir="auto">{project.title}</h2></div><span className="status-pill">{t(project.status)}</span></div>
      {project.description && <p className="client-project__description" dir="auto">{project.description}</p>}
      {project.images.length > 0 && <div className="client-project__images">{project.images.map((image) => <ProjectImage key={image.id} url={image.url} token={token} alt={image.caption || project.title} />)}</div>}
      {project.updates.length > 0 && <div className="client-project__updates"><h3>{t('Project updates')}</h3>{project.updates.map((update) => <p key={update.id} dir="auto">{update.body}</p>)}</div>}
    </article>)}</div>
    {completed.length > 0 && <section className="admin-panel client-review-panel"><p className="eyebrow"><span className="eyebrow__line" /> {t('Your voice')}</p><h2>{t(availableToReview.length ? 'Share your experience.' : 'Thank you for your feedback.')}</h2>
      {availableToReview.length === 0 && <p>{t('You have reviewed all your completed projects.')}</p>}
      {availableToReview.length > 0 && <>
      <form className="review-form" onSubmit={submitReview}>
        <label className="form-field"><span>{t('Completed project')}</span><select className="form-control" value={reviewProject} onChange={(event) => setReviewProject(event.target.value)} required><option value="">{t('Choose a project')}</option>{availableToReview.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
        <label className="form-field"><span>{t('Rating')}</span><select className="form-control" value={rating} onChange={(event) => setRating(Number(event.target.value))}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{t('{rating} / 5', { rating: value })}</option>)}</select></label>
        <label className="form-field"><span>{t('Your review')}</span><textarea className="form-control" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} rows={5} required /></label>
        <button className="button button--dark" type="submit" disabled={status === 'sending'}>{t(status === 'sending' ? 'Sending…' : 'Publish review')}</button>
      </form>
      </>}
      {message && <p className={`form-feedback ${messageError ? 'form-feedback--error' : 'form-feedback--success'}`} role={messageError ? 'alert' : 'status'}>{t(message)}</p>}
      <p><Link to="/#reviews">{t('View public reviews')}</Link></p>
    </section>}
  </div>;
}
