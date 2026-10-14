import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginAdmin, logout } from '../features/auth/authSlice.js';
import { fetchProjects } from '../features/projects/projectsSlice.js';
import ProjectImage from '../components/ProjectImage.jsx';
import { useI18n } from '../i18n.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';
const PROJECT_STATUSES = ['Planning', 'In Progress', 'Completed'];

async function apiRequest(path, token, options = {}) {
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

export default function Admin() {
  const { t, locale } = useI18n();
  const messageText = (message) => message?.startsWith('Error: ')
    ? t('Error: {message}', { message: t(message.slice(7)) }) : t(message || '');
  const dispatch = useDispatch();
  const { token, status: loginStatus, error: loginError } = useSelector((state) => state.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [dashboardStatus, setDashboardStatus] = useState('idle');
  const [dashboardError, setDashboardError] = useState('');
  const [messages, setMessages] = useState({});
  const [pending, setPending] = useState({});
  const [portfolio, setPortfolio] = useState({ title: '', description: '' });
  const [leadProjects, setLeadProjects] = useState({});
  const [editValues, setEditValues] = useState({});
  const [updateValues, setUpdateValues] = useState({});

  const refresh = useCallback(async () => {
    const [loadedLeads, loadedProjects, loadedReviews] = await Promise.all([
      apiRequest('/api/leads', token),
      apiRequest('/api/admin/projects', token),
      apiRequest('/api/admin/reviews', token),
    ]);
    setLeads(loadedLeads);
    setProjects(loadedProjects);
    setReviews(loadedReviews);
    setEditValues(Object.fromEntries(loadedProjects.map((project) => [project.id, {
      title: project.title, description: project.description || '', is_public: Boolean(project.is_public),
    }])));
  }, [token]);

  useEffect(() => {
    if (!token) { setLeads([]); setProjects([]); setReviews([]); setDashboardStatus('idle'); return undefined; }
    let active = true;
    setDashboardStatus('loading');
    refresh().then(() => { if (active) setDashboardStatus('ready'); }).catch((error) => {
      if (!active) return;
      setDashboardError(error.message);
      setDashboardStatus('error');
      if (error.status === 401 || error.status === 403) dispatch(logout());
    });
    return () => { active = false; };
  }, [dispatch, refresh, token]);

  async function act(key, task, success) {
    setPending((current) => ({ ...current, [key]: true }));
    setMessages((current) => ({ ...current, [key]: '' }));
    try {
      const result = await task();
      await refresh();
      dispatch(fetchProjects());
      setMessages((current) => ({ ...current, [key]: typeof success === 'function' ? success(result) : success }));
      return true;
    } catch (error) {
      setMessages((current) => ({ ...current, [key]: `Error: ${error.message}` }));
      if (error.status === 401 || error.status === 403) dispatch(logout());
      return false;
    } finally { setPending((current) => ({ ...current, [key]: false })); }
  }

  async function handleLogin(event) {
    event.preventDefault();
    try { await dispatch(loginAdmin({ email, password })).unwrap(); setPassword(''); } catch { /* shown by slice */ }
  }

  async function addPortfolio(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const image = form.elements.image.files[0];
    if (!image) { setMessages((current) => ({ ...current, portfolio: 'Error: Choose an image.' })); return; }
    const data = new FormData();
    data.append('title', portfolio.title);
    data.append('description', portfolio.description);
    data.append('image', image);
    const done = await act('portfolio', () => apiRequest('/api/projects', token, { method: 'POST', body: data }), 'Portfolio project published on Home.');
    if (done) { setPortfolio({ title: '', description: '' }); form.reset(); }
  }

  async function openClientProject(event, lead) {
    event.preventDefault();
    const value = leadProjects[lead.id] || { title: '', description: '' };
    const done = await act(`lead-${lead.id}`, () => apiRequest(`/api/leads/${lead.id}/projects`, token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value),
    }), (result) => result.welcome_email_sent === false
      ? 'Project opened, but login email failed. Use “Resend login details” below.'
      : result.welcome_email_sent === true
        ? 'Project opened. Login details were emailed to the new client.'
        : 'Another project was opened for this existing client; login details were already sent.');
    if (done) setLeadProjects((current) => ({ ...current, [lead.id]: { title: '', description: '' } }));
  }

  function deleteLead(lead) {
    if (!window.confirm(t('Delete the inquiry from {name}? Linked projects will stay with the client.', { name: lead.client_name }))) return;
    act(`lead-${lead.id}`, () => apiRequest(`/api/leads/${lead.id}`, token, { method: 'DELETE' }), 'Inquiry deleted.');
  }

  function updateProject(projectId, patch) {
    setEditValues((current) => ({ ...current, [projectId]: { ...current[projectId], ...patch } }));
  }

  function saveProject(event, projectId) {
    event.preventDefault();
    act(`project-${projectId}`, () => apiRequest(`/api/projects/${projectId}`, token, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editValues[projectId]),
    }), 'Project details and publication setting saved.');
  }

  function setProjectStatus(projectId, status) {
    act(`project-${projectId}`, () => apiRequest(`/api/projects/${projectId}/status`, token, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    }), (result) => result.email_sent === true ? 'Project completed. Review request emailed to the client.'
      : result.email_sent === false ? 'Project completed, but the review email failed. You can resend it below.'
        : 'Project status updated.');
  }

  async function uploadImages(event, projectId) {
    event.preventDefault();
    const form = event.currentTarget;
    const files = Array.from(form.elements.images.files);
    if (!files.length) { setMessages((current) => ({ ...current, [`project-${projectId}`]: 'Error: Choose images.' })); return; }
    const data = new FormData();
    files.forEach((file) => data.append('images', file));
    const done = await act(`project-${projectId}`, () => apiRequest(`/api/projects/${projectId}/images`, token, { method: 'POST', body: data }), 'Images added to this project.');
    if (done) form.reset();
  }

  async function addUpdate(event, projectId) {
    event.preventDefault();
    const body = updateValues[projectId] || '';
    const done = await act(`project-${projectId}`, () => apiRequest(`/api/projects/${projectId}/updates`, token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }),
    }), 'Project update added.');
    if (done) setUpdateValues((current) => ({ ...current, [projectId]: '' }));
  }

  if (!token) return <div className="admin-page container"><section className="admin-login">
    <p className="eyebrow"><span className="eyebrow__line" /> {t('Studio workspace')}</p><h1>{t('Welcome back.')}</h1>
    <p className="admin-login__intro">{t('Sign in to manage inquiries, client projects, and your public portfolio.')}</p>
    <form className="admin-login__form" onSubmit={handleLogin}>
      <label className="form-field"><span>{t('Email')}</span><input className="form-control" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label className="form-field"><span>{t('Password')}</span><input className="form-control" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
      <button className="button button--dark" disabled={loginStatus === 'loading'}>{t('Sign in')} <span aria-hidden="true">↗</span></button>
    </form>{loginError && <p className="form-feedback form-feedback--error" role="alert">{t(loginError)}</p>}
  </section></div>;

  return <div className="admin-page container">
    <header className="admin-header"><div><p className="eyebrow"><span className="eyebrow__line" /> {t('Studio workspace')}</p><h1>{t('Dashboard')}</h1></div><button className="button button--outline" onClick={() => dispatch(logout())}>{t('Sign out')}</button></header>
    {dashboardStatus === 'loading' && <p className="notice-card">{t('Loading your studio dashboard…')}</p>}
    {dashboardStatus === 'error' && <p className="form-feedback form-feedback--error" role="alert">{t(dashboardError)}</p>}
    {dashboardStatus === 'ready' && <div className="admin-content">
      <section className="admin-panel" aria-labelledby="leads-title"><div className="admin-panel__heading"><div><p className="eyebrow"><span className="eyebrow__line" /> {t('Inbox')}</p><h2 id="leads-title">{t('Inquiries')}</h2></div><span className="admin-count">{t('{count} leads', { count: leads.length })}</span></div>
        {leads.length === 0 && <p>{t('No inquiries yet.')}</p>}
        <div className="admin-lead-list">{leads.map((lead) => <article className="admin-lead" key={lead.id}>
          <div className="admin-lead__heading"><div><h3 dir="auto">{lead.client_name}</h3><p><a href={`mailto:${lead.client_email}`} dir="ltr">{lead.client_email}</a> · {lead.phone || t('No phone')} · {t(lead.service_type)}</p><small>{t('Received {date} · Linked projects: {count}', { date: new Date(lead.created_at).toLocaleString(locale), count: lead.project_count })}</small></div><button className="button button--outline button--small" onClick={() => deleteLead(lead)} disabled={pending[`lead-${lead.id}`]}>{t('Delete lead')}</button></div>
          <form className="admin-lead__form" onSubmit={(event) => openClientProject(event, lead)}>
            <label className="form-field"><span>{t('New project title')}</span><input className="form-control" value={leadProjects[lead.id]?.title || ''} onChange={(event) => setLeadProjects((current) => ({ ...current, [lead.id]: { ...current[lead.id], title: event.target.value } }))} required /></label>
            <label className="form-field"><span>{t('Project description')}</span><textarea className="form-control" value={leadProjects[lead.id]?.description || ''} onChange={(event) => setLeadProjects((current) => ({ ...current, [lead.id]: { ...current[lead.id], description: event.target.value } }))} rows={2} /></label>
            <button className="button button--dark" disabled={pending[`lead-${lead.id}`]}>{t('Open client project')}</button>
          </form>
          {messages[`lead-${lead.id}`] && <p className={`admin-project__feedback${messages[`lead-${lead.id}`].startsWith('Error:') ? ' is-error' : ''}`} role="status">{messageText(messages[`lead-${lead.id}`])}</p>}
        </article>)}</div>
      </section>

      <section className="admin-panel" aria-labelledby="projects-title"><div className="admin-panel__heading"><div><p className="eyebrow"><span className="eyebrow__line" /> {t('Workspace')}</p><h2 id="projects-title">{t('Open & completed projects')}</h2></div><span className="admin-count">{t('{count} projects', { count: projects.length })}</span></div>
        {projects.length === 0 && <p>{t('No projects yet. Open one from a lead or add portfolio work below.')}</p>}
        <div className="admin-project-list">{projects.map((project) => <details className={`admin-project${project.status === 'Completed' ? ' admin-project--completed' : ''}`} key={project.id}>
          <summary className="admin-project__summary">
            <span className="admin-project__summary-main"><span className="admin-project__summary-title" dir="auto">{project.title}</span><span className="admin-project__summary-client" dir="auto">{project.client_name ? `${project.client_name} · ${project.client_email}` : t('Portfolio project')}</span></span>
            <span className="admin-project__summary-meta"><span className="status-pill">{t(project.status)}</span><span className="admin-project__chevron" aria-hidden="true" /></span>
          </summary>
          <div className="admin-project__body">
          <div className="admin-project__photos">{project.images.map((image) => <div className="admin-project__photo" key={image.id}><ProjectImage url={image.url} token={token} alt={image.caption || project.title} /><button className="button button--outline button--small" type="button" disabled={pending[`project-${project.id}`]} onClick={() => act(`project-${project.id}`, () => apiRequest(`/api/projects/${project.id}/images/${image.id}`, token, { method: 'DELETE' }), 'Image removed.')}>{t('Remove image')}</button></div>)}</div>
          <form className="admin-project__edit" onSubmit={(event) => saveProject(event, project.id)}>
            <label className="form-field"><span>{t('Title')}</span><input className="form-control" value={editValues[project.id]?.title ?? project.title} onChange={(event) => updateProject(project.id, { title: event.target.value })} required /></label>
            <label className="form-field"><span>{t('Description')}</span><textarea className="form-control" value={editValues[project.id]?.description ?? project.description ?? ''} onChange={(event) => updateProject(project.id, { description: event.target.value })} rows={3} /></label>
            <div className="admin-project__edit-actions"><label className="admin-checkbox"><input type="checkbox" checked={editValues[project.id]?.is_public ?? Boolean(project.is_public)} onChange={(event) => updateProject(project.id, { is_public: event.target.checked })} /> {t('Publish in Home portfolio')}</label>
            <button className="button button--outline" disabled={pending[`project-${project.id}`]}>{t('Save details')}</button></div>
          </form>
          <div className="admin-project__tools"><label className="form-field"><span>{t('Status')}</span><select className="form-control" value={project.status} disabled={pending[`project-${project.id}`]} onChange={(event) => setProjectStatus(project.id, event.target.value)}>{PROJECT_STATUSES.map((value) => <option key={value} value={value}>{t(value)}</option>)}</select></label>
            {project.status === 'Completed' && project.client_id && <button className="button button--outline button--small" type="button" disabled={pending[`project-${project.id}`]} onClick={() => act(`project-${project.id}`, () => apiRequest(`/api/projects/${project.id}/review-request`, token, { method: 'POST' }), (result) => result.email_sent ? 'Review request sent again.' : 'Error: Review email failed.')}>{t('Resend review email')}</button>}
            {project.client_id && !project.welcome_email_sent_at && <button className="button button--outline button--small" type="button" disabled={pending[`project-${project.id}`]} onClick={() => act(`project-${project.id}`, () => apiRequest(`/api/clients/${project.client_id}/welcome-retry`, token, { method: 'POST' }), (result) => result.email_sent ? 'New login details emailed to client.' : 'Error: Login email failed.')}>{t('Resend login details')}</button>}
          </div>
          <form className="admin-project__media-form" onSubmit={(event) => uploadImages(event, project.id)}><label className="form-field"><span>{t('Add images (up to 20)')}</span><input className="form-control file-control" type="file" name="images" accept="image/jpeg,image/png,image/webp,image/gif" multiple /></label><button className="button button--outline" disabled={pending[`project-${project.id}`]}>{t('Upload images')}</button></form>
          <form className="admin-project__update-form" onSubmit={(event) => addUpdate(event, project.id)}><label className="form-field"><span>{t('Add project text update')}</span><textarea className="form-control" value={updateValues[project.id] || ''} onChange={(event) => setUpdateValues((current) => ({ ...current, [project.id]: event.target.value }))} rows={3} required /></label><button className="button button--outline" disabled={pending[`project-${project.id}`]}>{t('Add update')}</button></form>
          {project.updates.length > 0 && <div className="admin-project__updates">{project.updates.map((update) => <p key={update.id} dir="auto">{update.body}</p>)}</div>}
          {messages[`project-${project.id}`] && <p className={`admin-project__feedback${messages[`project-${project.id}`].startsWith('Error:') ? ' is-error' : ''}`} role="status">{messageText(messages[`project-${project.id}`])}</p>}
          </div>
        </details>)}</div>
      </section>

      <section className="admin-panel" aria-labelledby="portfolio-title"><div className="admin-panel__heading"><div><p className="eyebrow"><span className="eyebrow__line" /> {t('Selected work')}</p><h2 id="portfolio-title">{t('Add portfolio work')}</h2></div></div><p>{t('This creates a completed public gallery project without a linked client or review email.')}</p>
        <form className="admin-create-project" onSubmit={addPortfolio}><div className="admin-create-project__fields">
          <label className="form-field"><span>{t('Title')}</span><input className="form-control" value={portfolio.title} onChange={(event) => setPortfolio((current) => ({ ...current, title: event.target.value }))} required /></label>
          <label className="form-field"><span>{t('Description')}</span><input className="form-control" value={portfolio.description} onChange={(event) => setPortfolio((current) => ({ ...current, description: event.target.value }))} /></label>
          <label className="form-field"><span>{t('Image')}</span><input className="form-control file-control" type="file" name="image" accept="image/jpeg,image/png,image/webp,image/gif" required /></label>
          <button className="button button--dark" disabled={pending.portfolio}>{t('Publish to Home')}</button>
        </div>{messages.portfolio && <p className={`admin-project__feedback${messages.portfolio.startsWith('Error:') ? ' is-error' : ''}`} role="status">{messageText(messages.portfolio)}</p>}</form>
      </section>

      <section className="admin-panel" aria-labelledby="reviews-title"><div className="admin-panel__heading"><div><p className="eyebrow"><span className="eyebrow__line" /> {t('Client voices')}</p><h2 id="reviews-title">{t('Public reviews')}</h2></div><span className="admin-count">{t('{count} reviews', { count: reviews.length })}</span></div>
        {reviews.length === 0 && <p>{t('No reviews yet.')}</p>}
        <div className="admin-review-list">{reviews.map((review) => <article className="admin-review" key={review.id}><div><strong dir="auto">{review.client_name}</strong> · <span dir="auto">{review.project_title || t('Previous project')}</span> · {'★'.repeat(review.rating)}<p dir="auto">{review.comment}</p></div><button className="button button--outline button--small" type="button" disabled={pending[`review-${review.id}`]} onClick={() => act(`review-${review.id}`, () => apiRequest(`/api/reviews/${review.id}`, token, { method: 'DELETE' }), 'Review deleted.')}>{t('Delete review')}</button></article>)}</div>
      </section>
    </div>}
  </div>;
}
