// GREEN (tasks.md Phase 5, 5.2 — REPLACES the Phase 1 placeholder):
// `#/niveles/:id`'s guard chain (app-routing spec "Unknown Level Fallback"
// / "Locked Level Guard"): an unknown catalog id redirects to the level
// map; an existing-but-locked id renders the "Nivel bloqueado" view
// instead of the level, with no way to bypass it via direct URL entry;
// otherwise it renders the real `LevelShell`.
import { useState } from 'react';
import { Redirect } from '../app/router/Redirect';
import { ProgressProvider, useProgress } from '../lessons/progress/ProgressContext';
import { getLevel, levels, unlockMetaOf } from '../lessons/catalog';
import { WORLD_NAMES } from '../lessons/worldNames';
import { lockedHintFor } from '../components/levels/mapModel';
import { accentFor } from '../components/landing/colors';
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
  if (!progress.unlocked.has(id)) {
    return (
      <LockedLevel
        title={level.title}
        hint={lockedHintFor(level, levels, progress.unlocked, (w) => WORLD_NAMES[w] ?? `Mundo ${w}`)}
        accent={accentFor(level.world - 1)}
      />
    );
  }

  return <LevelShell key={`${id}:${nonce}`} level={level} onResetLevel={() => setNonce((n) => n + 1)} />;
}

export default function LevelRoute({ id }: LevelRouteProps) {
  return (
    <ProgressProvider levels={unlockMetaOf()}>
      <LevelRouteBody id={id} />
    </ProgressProvider>
  );
}
