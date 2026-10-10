// The "Cambios" tab inside `PullRequestDetail`: the changed-file list
// (+/−/~) and the unified diff. `diffArboles`'s output is markup-encoded
// exactly like terminal `salida` lines (spec "Live Commit and Diff
// Tracking"), so it reuses `SegText`/`parseLine` instead of a bespoke
// renderer. New behavior, no oracle equivalent.
import { SegText } from '../SegText';
import { parseLine } from '../../ui/markup';
import styles from './PullRequestDetail.module.css';

export interface ChangesTabProps {
  files: { f: string; t: '+' | '−' | '~' }[];
  diff: string[];
}

export function ChangesTab({ files, diff }: ChangesTabProps) {
  if (files.length === 0) {
    return <div className={styles.empty}>No hay cambios para mostrar.</div>;
  }
  return (
    <div className={styles.changes}>
      <ul className={styles.fileList}>
        {files.map((file) => (
          <li key={file.f} className={styles.fileRow}>
            <span className={styles.fileType}>{file.t}</span>
            <span className={styles.fileName}>{file.f}</span>
          </li>
        ))}
      </ul>
      <pre className={styles.diff}>
        {diff.map((line, i) => (
          // Diff lines have no stable id of their own — same convention as
          // `SegText`'s own segment list.
          // eslint-disable-next-line react/no-array-index-key
          <div key={i}>
            <SegText segs={parseLine(line)} />
          </div>
        ))}
      </pre>
    </div>
  );
}
