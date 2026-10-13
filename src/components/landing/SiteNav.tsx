// Shared top bar for the scrolling pages (landing, cheatsheet, roadmap): brand
// mark plus links to the other routes, each preloading its lazy chunk on
// hover/focus. `current` marks the page being shown with aria-current.
import { preloadCheatsheet, preloadLevelMap, preloadPlayground, preloadRoadmap } from '../../app/router/routes';
import styles from './SiteNav.module.css';

export type SiteNavPage = 'levels' | 'playground' | 'cheatsheet' | 'roadmap';

interface SiteNavLink {
  page: SiteNavPage;
  href: string;
  label: string;
  preload: () => Promise<unknown>;
}

// Wrapped in arrows so spies on the `routes` module exports are honored.
const LINKS: readonly SiteNavLink[] = [
  { page: 'levels', href: '#/niveles', label: 'Niveles', preload: () => preloadLevelMap() },
  { page: 'playground', href: '#/playground', label: 'Playground', preload: () => preloadPlayground() },
  { page: 'cheatsheet', href: '#/cheatsheet', label: 'Cheatsheet', preload: () => preloadCheatsheet() },
  { page: 'roadmap', href: '#/roadmap', label: 'Lo que viene', preload: () => preloadRoadmap() },
];

export function SiteNav({ current }: { current?: SiteNavPage }) {
  return (
    <nav className={styles.nav} aria-label="Principal">
      <div className={styles.navInner}>
        <a href="#/" className={styles.brand}>
          <svg viewBox="0 0 24 24" className={styles.brandMark} aria-hidden="true">
            <path d="M6 4v16M6 9c0 4 12 2 12 7" />
            <circle cx="6" cy="4" r="2.4" />
            <circle cx="6" cy="20" r="2.4" />
            <circle cx="18" cy="17" r="2.4" />
          </svg>
          <span className={styles.brandText}>
            git<span className={styles.brandDim}>/</span>playground
          </span>
        </a>
        <div className={styles.navLinks}>
          {LINKS.map((link) => (
            <a
              key={link.page}
              href={link.href}
              aria-current={current === link.page ? 'page' : undefined}
              onMouseEnter={() => void link.preload()}
              onFocus={() => void link.preload()}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default SiteNav;
