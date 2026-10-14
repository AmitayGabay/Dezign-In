import { NavLink } from 'react-router-dom';
import { languages, useI18n } from '../i18n.jsx';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
  { to: '/client', label: 'Client area' },
  { to: '/admin', label: 'Admin' },
];

export default function Navbar() {
  const { language, setLanguage, t } = useI18n();
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <NavLink className="brand" to="/" aria-label={t('Architecture and interiors home')}>
          <span className="brand__mark" aria-hidden="true">S</span>
          <span className="brand__copy">
            <span className="brand__name">STUDIO</span>
            <span className="brand__descriptor">{t('Architecture · Interiors')}</span>
          </span>
        </NavLink>
        <nav className="main-nav" aria-label={t('Main navigation')}>
          {links.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `main-nav__link${isActive ? ' is-active' : ''}`}>
              {t(label)}
            </NavLink>
          ))}
        </nav>
        <label className="language-picker"><span>{t('Language')}</span><select aria-label={t('Language')} value={language} onChange={(event) => setLanguage(event.target.value)}>{languages.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}</select></label>
      </div>
    </header>
  );
}
