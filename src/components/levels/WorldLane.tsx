// GREEN (tasks.md Phase 6, 6.2). design.md UI: "6 WorldLanes as git lanes
// in branch colors, levels as an <ol> of LevelNodes" — `GitEngine.PALETA`
// (the same lane-color palette `GraphLayer` uses for branches) accents each
// lane's left border, picked by world number rather than an actual branch
// name (worlds aren't branches).
import { GitEngine } from '../../engine';
import { LevelNode } from './LevelNode';
import type { LevelNodeProps } from './LevelNode';
import styles from './WorldLane.module.css';

export interface WorldLaneProps {
  world: number;
  name: string;
  levels: Omit<LevelNodeProps, never>[];
}

export function WorldLane({ world, name, levels }: WorldLaneProps) {
  const color = GitEngine.PALETA[(world - 1) % GitEngine.PALETA.length];
  return (
    <section className={styles.lane} style={{ borderInlineStartColor: color }}>
      <h2 className={styles.name}>{name}</h2>
      <ol className={styles.list}>
        {levels.map((level) => (
          <LevelNode key={level.id} {...level} />
        ))}
      </ol>
    </section>
  );
}
