// Local, unpersisted route state for the simulated hosting web view (design
// decision "View state": "Local `useHostingView` in `PlaygroundShell` (not
// persisted)" — same convention as `PlaygroundShell`'s own `stripOpen`/
// `stripMobile` local toggles). New behavior, no oracle equivalent. The
// `HostingRoute`/`HostingTab` shapes live in `ui/hostingSelectors.ts` (this
// hook only owns the mutable state, not the route-derived display strings).
import { useCallback, useState } from 'react';
import type { HostingRoute, HostingTab } from '../ui/hostingSelectors';

export interface UseHostingViewResult {
  open: boolean;
  route: HostingRoute;
  /** Opens the view and resets it to the PR list — same as navigating fresh
   * to `github.com/tu/proyecto/pulls`, matching the two entry points
   * (ActionBar button, remote-box click) always landing on the list. */
  openView(): void;
  closeView(): void;
  goToList(): void;
  goToNew(): void;
  goToPr(id: number, tab?: HostingTab): void;
  setTab(tab: HostingTab): void;
}

const LIST_ROUTE: HostingRoute = { kind: 'list' };
const NEW_ROUTE: HostingRoute = { kind: 'new' };

export function useHostingView(): UseHostingViewResult {
  const [open, setOpen] = useState(false);
  const [route, setRoute] = useState<HostingRoute>(LIST_ROUTE);

  const openView = useCallback(() => {
    setOpen(true);
    setRoute(LIST_ROUTE);
  }, []);
  const closeView = useCallback(() => setOpen(false), []);
  const goToList = useCallback(() => setRoute(LIST_ROUTE), []);
  const goToNew = useCallback(() => setRoute(NEW_ROUTE), []);
  const goToPr = useCallback((id: number, tab: HostingTab = 'conversation') => setRoute({ kind: 'pr', id, tab }), []);
  const setTab = useCallback((tab: HostingTab) => {
    setRoute((prev) => (prev.kind === 'pr' ? { ...prev, tab } : prev));
  }, []);

  return { open, route, openView, closeView, goToList, goToNew, goToPr, setTab };
}
