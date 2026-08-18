import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BookOpen, GraduationCap, Menu, X, Brain, BarChart3 } from 'lucide-react';

/**
 * Navbar – Fixed top navigation bar with glassmorphism effect.
 *
 * Features:
 *  - Glass-card background with blue tint
 *  - Desktop horizontal links + mobile hamburger dropdown
 *  - Active route highlighted with primary-500 pill
 *  - Slide-down animation for mobile menu
 */

// Navigation items definition (centralised so desktop & mobile stay in sync)
const NAV_ITEMS = [
  { to: '/', label: 'คำศัพท์', icon: BookOpen },       // Vocabulary
  { to: '/quiz', label: 'ทดสอบ', icon: Brain },         // Quiz
  { to: '/stats', label: 'สถิติ', icon: BarChart3 },    // Statistics
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close mobile menu when the viewport grows past the md breakpoint
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e) => {
      if (e.matches) setMobileOpen(false);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /**
   * Helper that returns the className string for a NavLink.
   * `isActive` is provided automatically by react-router-dom.
   */
  const linkClass = ({ isActive }) =>
    [
      // Base styles shared by active & inactive states
      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
      'transition-all duration-200 ease-in-out',
      isActive
        ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
        : 'text-text-secondary hover:bg-primary-50 hover:text-primary-600',
    ].join(' ');

  /** Mobile-specific link styling (full width) */
  const mobileLinkClass = ({ isActive }) =>
    [
      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium w-full',
      'transition-all duration-200 ease-in-out',
      isActive
        ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
        : 'text-text-secondary hover:bg-primary-50 hover:text-primary-600',
    ].join(' ');

  return (
    <nav className="glass-card fixed top-0 inset-x-0 z-50 bg-white/70 backdrop-blur-xl border-b border-border">
      {/* ─── Inner container ─── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* ─── Brand / Logo ─── */}
          <NavLink
            to="/"
            className="flex items-center gap-2 group select-none"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-500 text-white shadow-md shadow-primary-500/25 transition-transform duration-200 group-hover:scale-110">
              <GraduationCap size={20} />
            </div>
            <span className="text-lg font-bold text-text-primary tracking-tight">
              Learn<span className="text-primary-500">X</span>Not
            </span>
          </NavLink>

          {/* ─── Desktop links ─── */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} className={linkClass}>
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </div>

          {/* ─── Mobile hamburger button ─── */}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-text-secondary hover:bg-primary-50 hover:text-primary-600 transition-colors duration-200"
            aria-label={mobileOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* ─── Mobile dropdown menu ─── */}
      <div
        className={[
          'md:hidden overflow-hidden transition-all duration-300 ease-in-out',
          mobileOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0',
        ].join(' ')}
      >
        <div className="px-4 pb-4 pt-1 flex flex-col gap-1 border-t border-border">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={mobileLinkClass}
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
