// GREEN (tasks.md Phase 6, 6.2 — REPLACES the Phase 1 placeholder):
// `#/niveles`'s real content.
import { ProgressProvider } from '../lessons/progress/ProgressContext';
import { unlockMetaOf } from '../lessons/catalog';
import { LevelMap } from '../components/levels/LevelMap';

export default function LevelMapRoute() {
  return (
    <ProgressProvider levels={unlockMetaOf()}>
      <LevelMap />
    </ProgressProvider>
  );
}
