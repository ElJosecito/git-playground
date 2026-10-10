// Curated "not supported" explanations for real git subcommands the
// simulator doesn't implement, plus the typo-suggestion check `unaOrden`
// runs before dispatching to `GIT`. Ported from `design-handoff/git-engine.js`.
import { fail } from '../errors';
import { cercano } from '../util';

export const NO: Record<string, [string, string]> = {
  clone: ['copia un repositorio remoto completo', 'Aquí ya tienes un origin simulado: prueba git fetch o git pull.'],
  bisect: ['busca con búsqueda binaria qué commit introdujo un error', 'Prueba git log --oneline y git checkout <hash> para visitar commits.'],
  blame: ['muestra quién cambió cada línea de un archivo', 'Prueba git log o git show <hash>.'],
  config: ['configura tu nombre, email y preferencias', 'En el simulador ya eres "Tú <tu@ejemplo.com>".'],
  worktree: ['permite tener varias ramas abiertas en carpetas distintas', 'Usa git switch para cambiar de rama.'],
  submodule: ['incluye otro repositorio dentro de este', 'No está disponible aquí.'],
  grep: ['busca texto en los archivos del repo', 'Usa cat <archivo> para ver su contenido.'],
  describe: ['describe un commit usando el tag más cercano', 'Prueba git tag y git log --oneline.'],
  shortlog: ['resume el log por autor', 'Prueba git log --oneline.'],
  gc: ['limpia y optimiza el repositorio', 'En el simulador no hace falta.'],
  notes: ['añade notas a commits', 'Usa git commit --amend -m para cambiar un mensaje.'],
  am: ['aplica parches desde correos', 'Prueba git cherry-pick <hash>.'],
  apply: ['aplica un parche', 'Prueba git cherry-pick <hash>.'],
  'format-patch': ['exporta commits como parches', 'Prueba git show <hash>.'],
  mergetool: ['abre una herramienta externa para resolver conflictos', 'Usa el resolvedor visual que aparece al tener un conflicto.'],
  difftool: ['abre una herramienta externa de diff', 'Usa git diff.'],
  archive: ['empaqueta el repo en un .zip o .tar', 'No está disponible aquí.'],
  'sparse-checkout': ['descarga solo parte de un repo', 'No está disponible aquí.'],
  fsck: ['verifica la integridad del repo', 'El simulador siempre está íntegro.'],
  prune: ['borra objetos inalcanzables', 'Los commits fantasma se quedan visibles para que aprendas de ellos.'],
  'filter-branch': ['reescribe toda la historia', 'Prueba git rebase o git reset.'],
  'range-diff': ['compara dos rangos de commits', 'Prueba git log --oneline --all.'],
  cherry: ['lista commits no aplicados en otra rama', 'Prueba git log --oneline --all.'],
  bundle: ['empaqueta el repo en un archivo', 'No está disponible aquí.'],
  maintenance: ['tareas de mantenimiento', 'En el simulador no hace falta.'],
};

/**
 * Throws the curated NO-map explanation for a recognized-but-unsupported
 * real-git subcommand, or a typo suggestion (closest match in `known`, via
 * Levenshtein distance) when the subcommand is not recognized at all.
 */
export function assertKnownGitSubcommand(sub: string, known: string[]): void {
  if (NO[sub]) fail(`git ${sub} ${NO[sub]![0]}, pero el simulador no lo soporta todavía.`, NO[sub]![1]);
  if (!known.includes(sub) || sub === 'toString') {
    const near = cercano(sub, known.concat(Object.keys(NO)));
    fail(`git: '${sub}' no es un comando de git.`, near ? `¿Quisiste decir git ${near}?` : 'Escribe help para ver la lista.');
  }
}
