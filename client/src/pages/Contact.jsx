import { useState } from 'react';
import { useI18n } from '../i18n.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';
const initialForm = { client_name: '', client_email: '', phone: '', service_type: '' };

export default function Contact() {
  const { t } = useI18n();
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('submitting');
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, phone: form.phone.trim() || null }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
      setStatus(body.email_sent === false ? 'notification-failed' : 'succeeded');
      setForm(initialForm);
    } catch (submitError) {
      setError(submitError.message || 'Unable to send your message.');
      setStatus('failed');
    }
  }

  return (
    <div className="contact-page container">
      <section className="contact-intro">
        <p className="eyebrow"><span className="eyebrow__line" /> {t('We’d love to hear from you')}</p>
        <h1>{t('Every good space')}<br /><em>{t('starts somewhere.')}</em></h1>
        <p>{t('Tell us a little about what you have in mind. We’ll get back to you to arrange a first conversation.')}</p>
        <div className="contact-details">
          <div><span className="contact-details__label">{t('Studio')}</span><span>{t('Architecture & interior design')}</span></div>
          <div><span className="contact-details__label">{t('Inquiries')}</span><span>{t('Please use the project form')}</span></div>
          <div><span className="contact-details__label">{t('Next step')}</span><span>{t('Tell us a little about your space')}</span></div>
        </div>
      </section>
      <section className="contact-form-card" aria-labelledby="contact-form-title">
        <p className="eyebrow"><span className="eyebrow__line" /> {t('Your project')}</p>
        <h2 id="contact-form-title">{t('Let’s start with the details.')}</h2>
        <form className="contact-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>{t('Name')}</span>
            <input className="form-control" name="client_name" autoComplete="name" placeholder={t('Your name')} value={form.client_name} onChange={updateField} required />
          </label>
          <label className="form-field">
            <span>{t('Email')}</span>
            <input className="form-control" name="client_email" type="email" autoComplete="email" placeholder="you@example.com" value={form.client_email} onChange={updateField} required />
          </label>
          <label className="form-field">
            <span>{t('Phone')} <small>{t('(optional)')}</small></span>
            <input className="form-control" name="phone" type="tel" autoComplete="tel" placeholder={t('Your phone number')} value={form.phone} onChange={updateField} />
          </label>
          <label className="form-field">
            <span>{t('What are you looking for?')}</span>
            <select className="form-control" name="service_type" value={form.service_type} onChange={updateField} required>
              <option value="" disabled>{t('Select a service')}</option>
              <option value="Architecture">{t('Architecture')}</option>
              <option value="Interior design">{t('Interior design')}</option>
              <option value="Renovation">{t('Renovation')}</option>
              <option value="Something else">{t('Something else')}</option>
            </select>
          </label>
          <button className="button button--dark contact-form__submit" type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? t('Sending…') : t('Send inquiry')} <span aria-hidden="true">↗</span>
          </button>
        </form>
        {status === 'succeeded' && <p className="form-feedback form-feedback--success" role="status">{t('Thank you. Your inquiry was received.')}</p>}
        {status === 'notification-failed' && <p className="form-feedback form-feedback--error" role="alert">{t('Your inquiry was saved, but the studio could not be notified by email. Please follow up directly.')}</p>}
        {status === 'failed' && <p className="form-feedback form-feedback--error" role="alert">{t('Could not send your inquiry: {error}', { error: t(error) })}</p>}
      </section>
    </div>
  );
}
