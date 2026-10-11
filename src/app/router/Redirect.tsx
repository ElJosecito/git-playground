// Declarative fallback redirect (app-routing spec "Unknown Route Fallback" /
// "Unknown Level Fallback"): fires `navigate(to, {replace:true})` once on
// mount so the bad hash never grows the back-stack, and renders nothing.
import { useEffect } from 'react';
import { navigate } from './hashLocation';
import type { Route } from './hashLocation';

export interface RedirectProps {
  to: Route;
}

export function Redirect({ to }: RedirectProps) {
  useEffect(() => {
    navigate(to, { replace: true });
    // `to` is a fresh object per render for callers that construct it
    // inline (e.g. `<Redirect to={{name:'levelMap'}} />`); re-running this
    // effect on every such render would be harmless (idempotent replace)
    // but needless — keyed on the route's own identity fields instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to.name, 'id' in to ? to.id : undefined, 'fallback' in to ? to.fallback : undefined]);

  return null;
}
