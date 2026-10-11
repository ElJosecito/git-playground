// GREEN (tasks.md Phase 5, 5.2 — REPLACES the Phase 1 placeholder):
// `#/niveles/:id`'s guard chain (app-routing spec "Unknown Level Fallback"
// / "Locked Level Guard"): an unknown catalog id redirects to the level
// map; an existing-but-locked id renders the "Nivel bloqueado" view
// instead of the level, with no way to bypass it via direct URL entry;
// otherwise it renders the real `LevelShell`.
import { useState } from 'react';
import { Redirect } from '../app/router/Redirect';
import { ProgressProvider, useProgress } from '../lessons/progress/ProgressContext';
import { getLevel, unlockMetaOf } from '../lessons/catalog';
import { LevelShell } from '../components/levels/LevelShell';
import { LockedLevel } from '../components/levels/LockedLevel';

export interface LevelRouteProps {
  id: string;
}

function LevelRouteBody({ id }: LevelRouteProps) {
  const progress = useProgress();
  const [nonce, setNonce] = useState(0);
  const level = getLevel(id);

  if (!level) return <Redirect to={{ name: 'levelMap' }} />;
  if (!progress.unlocked.has(id)) return <LockedLevel />;

  return <LevelShell key={`${id}:${nonce}`} level={level} onResetLevel={() => setNonce((n) => n + 1)} />;
}

export default function LevelRoute({ id }: LevelRouteProps) {
  return (
    <ProgressProvider levels={unlockMetaOf()}>
      <LevelRouteBody id={id} />
    </ProgressProvider>
  );
}
