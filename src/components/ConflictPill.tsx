// The collapsed conflict-resolver indicator (shown when the resolver panel
// has been hidden while a conflict is still unresolved). 1:1 port of the DC
// template's `resolverPill` button (design-handoff/Git Playground.dc.html,
// line 166).
import styles from './ConflictPill.module.css';

export interface ConflictPillProps {
  onShow(): void;
}

export function ConflictPill({ onShow }: ConflictPillProps) {
  return (
    <button type="button" onClick={onShow} className={styles.pill}>
      Conflicto · abrir resolvedor
    </button>
  );
}
