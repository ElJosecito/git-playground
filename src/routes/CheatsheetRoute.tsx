// Lazy route for `#/cheatsheet`: a searchable Git command reference.
// Like the landing, it is a normal scrolling document, so it scopes off
// `global.css`'s `body { overflow: hidden }` via `data-scroll-page` while
// mounted.
import { useEffect } from 'react';

export default function CheatsheetRoute() {
  useEffect(() => {
    document.body.setAttribute('data-scroll-page', 'true');
    return () => {
      document.body.removeAttribute('data-scroll-page');
    };
  }, []);

  return (
    <main>
      <h1 data-route-focus tabIndex={-1}>
        Cheatsheet de Git
      </h1>
    </main>
  );
}
