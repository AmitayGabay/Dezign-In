import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
  { to: '/client', label: 'Client area' },
  { to: '/admin', label: 'Admin' },
];

export default function Navbar() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <NavLink className="brand" to="/" aria-label="Architecture and interiors home">
          <span className="brand__mark" aria-hidden="true">S</span>
          <span className="brand__copy">
            <span className="brand__name">STUDIO</span>
            <span className="brand__descriptor">Architecture · Interiors</span>
          </span>
        </NavLink>
        <nav className="main-nav" aria-label="Main navigation">
          {links.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `main-nav__link${isActive ? ' is-active' : ''}`}>
              {label}
            </NavLink>
          ))}
        </nav>
        <span className="header-note">Designing with intention</span>
      </div>
    </header>
  );
}
