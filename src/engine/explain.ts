// Human-readable Spanish explanations for event batches, ported from
// `design-handoff/git-engine.js`. One mapping per event type, in strict
// priority order — the first matching branch wins.
import { pl, short } from './util';
import { curName } from './refs';
import type { ExplainResult, GitEvent, RepoState } from './types';

const code = (x: string): string => '`' + x + '`';

function find<T extends GitEvent['type']>(E: GitEvent[], t: T): Extract<GitEvent, { type: T }> | undefined {
  return E.find((e) => e.type === t) as Extract<GitEvent, { type: T }> | undefined;
}

export function explicar(E: GitEvent[], s: RepoState): ExplainResult | null {
  const cur = curName(s);
  const orf = find(E, 'commits-orphaned');
  const n = orf ? orf.hashes.length : 0;

  if (find(E, 'error')) return null;

  const conflict = find(E, 'merge-conflict');
  if (conflict) {
    return {
      icon: '!',
      tone: 'danger',
      text: `Conflicto: los dos lados cambiaron ${conflict.files.map(code).join(', ')}. Elige una versión, luego ${code('git add')} y ${
        conflict.kind === 'rebase' ? code('git rebase --continue') : conflict.kind === 'merge' ? code('git commit') : code('git ' + conflict.kind + ' --continue')
      }.`,
    };
  }

  const rebaseDone = find(E, 'rebase-done');
  if (rebaseDone) {
    return { icon: '↷', tone: 'info', text: `Rebase: ${pl(rebaseDone.count, 'commit se copió', 'commits se copiaron')} sobre ${code(rebaseDone.onto)}. Los originales quedan como fantasma.` };
  }

  if (find(E, 'pull-done')) {
    const mergeOrFf = find(E, 'merge-commit') || find(E, 'fast-forward');
    if (mergeOrFf) return { icon: '↓', tone: 'info', text: `Trajiste los cambios de origin y los uniste a ${code(cur ?? '')}.` };
    if (find(E, 'up-to-date')) return { icon: '↓', tone: 'info', text: 'Tu rama ya tenía todo lo de origin.' };
  }

  const mergeCommit = find(E, 'merge-commit');
  if (mergeCommit) return { icon: '⑂', tone: 'success', text: `Uniste ${code(mergeCommit.theirs)} en ${code(mergeCommit.into)} con un commit de merge: tiene dos padres.` };

  const ff = find(E, 'fast-forward');
  if (ff) return { icon: '→', tone: 'success', text: `${code(ff.ref)} avanzó directamente hasta ${code(ff.theirs)}. No hizo falta commit de merge (fast-forward).` };

  if (find(E, 'commit-amended')) return { icon: '✎', tone: 'info', text: 'Reemplazaste el último commit por uno nuevo. El antiguo queda como fantasma.' };

  const created = find(E, 'commit-created');
  if (created) {
    return {
      icon: '+',
      tone: 'success',
      text: created.root
        ? `Primer commit: aquí empieza la historia de ${code(created.branch || 'HEAD')}.`
        : created.branch
          ? `Creaste un commit nuevo. ${code(created.branch)} avanzó y HEAD la siguió.`
          : `Creaste un commit con HEAD separado: ninguna rama lo apunta. Guárdalo con ${code('git switch -c <rama>')}.`,
    };
  }

  const cherry = find(E, 'cherry-picked');
  if (cherry) return { icon: '⧉', tone: 'success', text: `Copiaste ${code(short(cherry.of))} encima de ${code(cur || 'HEAD')} como un commit nuevo.` };

  const reverted = find(E, 'reverted');
  if (reverted) return { icon: '↺', tone: 'success', text: `Creaste un commit que deshace ${code(short(reverted.of))} sin borrar la historia.` };

  const reset = find(E, 'reset');
  if (reset) {
    const w = { soft: 'Sus cambios siguen preparados en staging.', mixed: 'Sus cambios siguen en tus archivos, sin preparar.', hard: 'Los cambios se descartaron.' }[reset.mode];
    return {
      icon: '↺',
      tone: reset.mode === 'hard' ? 'warning' : 'info',
      text: reset.count
        ? `${code(cur || 'HEAD')} retrocedió ${pl(reset.count, 'commit', 'commits')} (--${reset.mode}). ${w}`
        : reset.mode === 'hard'
          ? 'Descartaste todos los cambios sin commit (reset --hard).'
          : 'Sacaste los cambios del staging.',
    };
  }

  const aborted = find(E, 'op-aborted');
  if (aborted) return { icon: '↺', tone: 'info', text: `Cancelaste el ${aborted.kind}. Todo vuelve a como estaba.` };

  const pushed = find(E, 'stash-pushed');
  if (pushed) return { icon: '≡', tone: 'info', text: `Guardaste ${pl(pushed.files.length, 'cambio', 'cambios')} en el stash. Tu working directory quedó limpio.` };

  const popped = find(E, 'stash-popped');
  if (popped) return { icon: '≡', tone: 'info', text: `Recuperaste los cambios del stash${popped.drop ? ' y se borró de la pila' : ''}.` };

  const pushSent = find(E, 'push-sent');
  if (pushSent) return { icon: '↑', tone: 'success', text: `Enviaste ${pl(pushSent.hashes.length, 'commit', 'commits')} a origin. ${code('origin/' + pushSent.branch)} se actualizó.` };

  const fetched = find(E, 'fetch-received');
  if (fetched) {
    return fetched.count
      ? { icon: '↓', tone: 'info', text: `Trajiste ${pl(fetched.hashes.length, 'commit', 'commits')} de origin. Aún no están en tu rama: usa ${code('git merge origin/main')} o ${code('git pull')}.` }
      : { icon: '↓', tone: 'info', text: 'Nada nuevo en origin.' };
  }

  const remoteCommit = find(E, 'remote-commit');
  if (remoteCommit) return { icon: '↑', tone: 'info', text: `Lucía subió un commit a ${code('origin/' + remoteCommit.branch)}. Tu repositorio aún no lo sabe: prueba ${code('git fetch')}.` };

  const switched = find(E, 'switched');
  if (switched) return { icon: '⇄', tone: 'info', text: `${switched.created ? 'Creaste la rama ' + code(switched.name) + ' y ' : ''}${switched.created ? 'ahora' : 'Ahora'} estás en ${code(switched.name)}. Tus archivos muestran su versión.` };

  const branchCreated = find(E, 'branch-created');
  if (branchCreated) return { icon: '⑂', tone: 'success', text: `Creaste la rama ${code(branchCreated.name)}: es solo una etiqueta que apunta al commit actual.` };

  const branchDeleted = find(E, 'branch-deleted');
  if (branchDeleted) {
    return {
      icon: '−',
      tone: 'info',
      text: `Borraste la rama ${code(branchDeleted.name)}.` + (n ? ` ${pl(n, 'commit quedó', 'commits quedaron')} sin referencia (fantasma).` : ' Sus commits siguen en otra rama.'),
    };
  }

  const branchRenamed = find(E, 'branch-renamed');
  if (branchRenamed) return { icon: '✎', tone: 'info', text: `Renombraste ${code(branchRenamed.from)} a ${code(branchRenamed.to)}.` };

  if (find(E, 'detached')) return { icon: '!', tone: 'warning', text: 'HEAD apunta directamente a un commit (separado). Puedes mirar y experimentar sin miedo.' };

  const tagCreated = find(E, 'tag-created');
  if (tagCreated) return { icon: '◆', tone: 'success', text: `Etiquetaste ${code(short(tagCreated.hash))} como ${code(tagCreated.name)}. Un tag nunca se mueve.` };

  const tagDeleted = find(E, 'tag-deleted');
  if (tagDeleted) return { icon: '◆', tone: 'info', text: `Borraste el tag ${code(tagDeleted.name)}.` };

  if (find(E, 'repo-init')) return { icon: '+', tone: 'success', text: 'Creaste un repositorio vacío. Git ya vigila esta carpeta.' };

  const restored = find(E, 'file-restored');
  if (restored) return { icon: '↺', tone: 'info', text: `Descartaste los cambios de ${restored.files.map(code).join(', ')}: vuelve a la versión guardada.` };

  const st = E.filter((x) => x.type === 'file-staged') as Extract<GitEvent, { type: 'file-staged' }>[];
  const us = E.filter((x) => x.type === 'file-unstaged') as Extract<GitEvent, { type: 'file-unstaged' }>[];
  if (st.length) return { icon: '→', tone: 'success', text: st.length === 1 ? `Preparaste ${code(st[0]!.file)} para el próximo commit (staging).` : `Preparaste ${st.length} archivos para el próximo commit.` };
  if (us.length) return { icon: '←', tone: 'info', text: us.length === 1 ? `Sacaste ${code(us[0]!.file)} del staging. Tus cambios siguen en el archivo.` : `Sacaste ${us.length} archivos del staging.` };

  const fileCreated = find(E, 'file-created');
  if (fileCreated) return { icon: '+', tone: 'info', text: s.inited ? `Creaste ${code(fileCreated.file)}. Git lo ve como archivo sin seguimiento.` : `Creaste ${code(fileCreated.file)}.` };

  const fileModified = find(E, 'file-modified');
  if (fileModified) return { icon: '~', tone: 'warning', text: `Modificaste ${code(fileModified.file)}. Git ve el cambio, pero aún no está preparado.` };

  const fileDeleted = find(E, 'file-deleted');
  if (fileDeleted) return { icon: '−', tone: 'info', text: `Borraste ${code(fileDeleted.file)}.` };

  return null;
}
