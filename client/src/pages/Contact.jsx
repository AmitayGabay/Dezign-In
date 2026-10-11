import { useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';
const initialForm = { client_name: '', client_email: '', phone: '', service_type: '' };

export default function Contact() {
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
        <p className="eyebrow"><span className="eyebrow__line" /> We’d love to hear from you</p>
        <h1>Every good space<br /><em>starts somewhere.</em></h1>
        <p>Tell us a little about what you have in mind. We’ll get back to you to arrange a first conversation.</p>
        <div className="contact-details">
          <div><span className="contact-details__label">Studio</span><span>Architecture &amp; interior design</span></div>
          <div><span className="contact-details__label">Inquiries</span><span>Please use the project form</span></div>
          <div><span className="contact-details__label">Next step</span><span>Tell us a little about your space</span></div>
        </div>
      </section>
      <section className="contact-form-card" aria-labelledby="contact-form-title">
        <p className="eyebrow"><span className="eyebrow__line" /> Your project</p>
        <h2 id="contact-form-title">Let’s start with the details.</h2>
        <form className="contact-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Name</span>
            <input className="form-control" name="client_name" autoComplete="name" placeholder="Your name" value={form.client_name} onChange={updateField} required />
          </label>
          <label className="form-field">
            <span>Email</span>
            <input className="form-control" name="client_email" type="email" autoComplete="email" placeholder="you@example.com" value={form.client_email} onChange={updateField} required />
          </label>
          <label className="form-field">
            <span>Phone <small>(optional)</small></span>
            <input className="form-control" name="phone" type="tel" autoComplete="tel" placeholder="Your phone number" value={form.phone} onChange={updateField} />
          </label>
          <label className="form-field">
            <span>What are you looking for?</span>
            <select className="form-control" name="service_type" value={form.service_type} onChange={updateField} required>
              <option value="" disabled>Select a service</option>
              <option>Architecture</option>
              <option>Interior design</option>
              <option>Renovation</option>
              <option>Something else</option>
            </select>
          </label>
          <button className="button button--dark contact-form__submit" type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Sending…' : 'Send inquiry'} <span aria-hidden="true">↗</span>
          </button>
        </form>
        {status === 'succeeded' && <p className="form-feedback form-feedback--success" role="status">Thank you. Your inquiry was received.</p>}
        {status === 'notification-failed' && <p className="form-feedback form-feedback--error" role="alert">Your inquiry was saved, but the studio could not be notified by email. Please follow up directly.</p>}
        {status === 'failed' && <p className="form-feedback form-feedback--error" role="alert">Could not send your inquiry: {error}</p>}
      </section>
    </div>
  );
}
