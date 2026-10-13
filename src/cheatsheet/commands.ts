// Static Git command reference shown at `#/cheatsheet`. Pure data: the page
// must stay a light, engine-free chunk, so `inSimulator` is a hand-kept flag
// (a test checks it against the engine's command table) rather than a
// runtime lookup.

export interface CheatCommand {
  id: string;
  /** The command as you would type it, with `<placeholders>`. */
  command: string;
  /** One-line summary. */
  summary: string;
  /** Short, accurate explanation of what it does and when to use it. */
  explanation: string;
  /** Short forms, equivalent flags, or common aliases. */
  shortcuts: string[];
  /** Whether this exact usage can be tried in `#/playground`. */
  inSimulator: boolean;
}

export interface CheatCategory {
  id: string;
  title: string;
  description: string;
  commands: CheatCommand[];
}

export const CHEATSHEET: readonly CheatCategory[] = [
  {
    id: 'config',
    title: 'Configuración e inicio',
    description: 'Prepara Git una vez y empieza un repositorio.',
    commands: [
      {
        id: 'config-identity',
        command: 'git config --global user.name "<nombre>"',
        summary: 'Define el nombre que firmará tus commits.',
        explanation:
          'Se guarda en ~/.gitconfig y se usa en todos tus repositorios. Haz lo mismo con user.email. Sin --global, solo aplica al repositorio actual.',
        shortcuts: ['git config --global user.email "<correo>"', 'git config --list'],
        inSimulator: false,
      },
      {
        id: 'config-alias',
        command: 'git config --global alias.st status',
        summary: 'Crea un alias para escribir menos.',
        explanation: 'Después de esto, git st hace lo mismo que git status. Puedes crear alias para cualquier subcomando y sus opciones.',
        shortcuts: ['git st', 'git config --global alias.co checkout', 'git config --global alias.lg "log --oneline --graph --all"'],
        inSimulator: false,
      },
      {
        id: 'init',
        command: 'git init',
        summary: 'Convierte la carpeta actual en un repositorio.',
        explanation: 'Crea la carpeta oculta .git donde Git guarda la historia. La rama inicial se llama main o master según init.defaultBranch; -b la elige.',
        shortcuts: ['git init -b main'],
        inSimulator: true,
      },
      {
        id: 'clone',
        command: 'git clone <url>',
        summary: 'Descarga un repositorio remoto completo.',
        explanation: 'Copia toda la historia y configura el remoto origin apuntando a la URL. Crea una carpeta con el nombre del repositorio.',
        shortcuts: ['git clone <url> <carpeta>', 'git clone --depth 1 <url>'],
        inSimulator: false,
      },
    ],
  },
  {
    id: 'staging',
    title: 'Cambios y staging',
    description: 'Revisa qué cambió, prepáralo y guárdalo en un commit.',
    commands: [
      {
        id: 'status',
        command: 'git status',
        summary: 'Muestra qué archivos cambiaron y qué está preparado.',
        explanation: 'Separa los cambios preparados (staged), los no preparados y los archivos sin seguimiento. Úsalo a menudo.',
        shortcuts: ['git status -s', 'git st (con alias)'],
        inSimulator: true,
      },
      {
        id: 'add',
        command: 'git add <archivo>',
        summary: 'Prepara cambios para el próximo commit.',
        explanation: 'Copia el estado actual del archivo al área de staging. Solo lo preparado entra en el commit.',
        shortcuts: ['git add .', 'git add -A', 'git add -p'],
        inSimulator: true,
      },
      {
        id: 'diff',
        command: 'git diff',
        summary: 'Muestra los cambios que aún no preparaste.',
        explanation: 'Compara tu directorio de trabajo con el staging. Con --staged compara el staging con el último commit.',
        shortcuts: ['git diff --staged', 'git diff --cached'],
        inSimulator: true,
      },
      {
        id: 'commit',
        command: 'git commit -m "<mensaje>"',
        summary: 'Guarda lo preparado como un commit nuevo.',
        explanation: 'Crea una instantánea con todo lo que está en staging y mueve la rama actual hacia ese commit.',
        shortcuts: ['git commit (abre el editor)'],
        inSimulator: true,
      },
      {
        id: 'commit-all',
        command: 'git commit -am "<mensaje>"',
        summary: 'Prepara y guarda de una vez los archivos ya rastreados.',
        explanation: 'Equivale a git add de los archivos modificados más git commit -m. No incluye archivos nuevos sin seguimiento.',
        shortcuts: ['git commit -a -m "<mensaje>"'],
        inSimulator: true,
      },
      {
        id: 'commit-amend',
        command: 'git commit --amend -m "<mensaje>"',
        summary: 'Rehace el último commit.',
        explanation: 'Reemplaza el último commit por uno nuevo con lo que esté en staging y el mensaje indicado. No lo hagas sobre commits ya publicados.',
        shortcuts: ['git commit --amend --no-edit'],
        inSimulator: true,
      },
      {
        id: 'rm-mv',
        command: 'git rm <archivo>',
        summary: 'Borra un archivo y prepara ese borrado.',
        explanation: 'Elimina el archivo del disco y del índice. Para renombrar, git mv hace el cambio y lo prepara en un paso.',
        shortcuts: ['git mv <origen> <destino>', 'git rm --cached <archivo>'],
        inSimulator: true,
      },
    ],
  },
  {
    id: 'history',
    title: 'Historial',
    description: 'Explora qué pasó, cuándo y en qué commit.',
    commands: [
      {
        id: 'log',
        command: 'git log',
        summary: 'Lista los commits de la rama actual.',
        explanation: 'Muestra hash, autor, fecha y mensaje, del más nuevo al más antiguo.',
        shortcuts: ['git log -n 5', 'git log --oneline'],
        inSimulator: true,
      },
      {
        id: 'log-graph',
        command: 'git log --oneline --graph --all',
        summary: 'Dibuja el grafo de todas las ramas en una línea por commit.',
        explanation: 'La forma más rápida de ver cómo se separan y se unen las ramas desde la terminal.',
        shortcuts: ['git lg (con alias)', 'git log --oneline --decorate --graph --all'],
        inSimulator: true,
      },
      {
        id: 'show',
        command: 'git show <commit>',
        summary: 'Muestra un commit y sus cambios.',
        explanation: 'Sin argumento muestra HEAD. Acepta hashes, ramas, tags o referencias como HEAD~2.',
        shortcuts: ['git show HEAD', 'git show HEAD~1'],
        inSimulator: true,
      },
      {
        id: 'reflog',
        command: 'git reflog',
        summary: 'Registro de todo lo que hizo HEAD.',
        explanation: 'Guarda cada movimiento de HEAD, incluso tras un reset o un rebase. Es la red de seguridad para recuperar commits “perdidos”.',
        shortcuts: ['git reset --hard HEAD@{1}'],
        inSimulator: true,
      },
      {
        id: 'blame',
        command: 'git blame <archivo>',
        summary: 'Muestra qué commit cambió cada línea.',
        explanation: 'Útil para entender por qué existe una línea: te da el commit y el autor del último cambio de cada una.',
        shortcuts: ['git blame -L 10,20 <archivo>'],
        inSimulator: false,
      },
    ],
  },
  {
    id: 'branches',
    title: 'Ramas',
    description: 'Trabaja en paralelo sin tocar main.',
    commands: [
      {
        id: 'branch-list',
        command: 'git branch',
        summary: 'Lista las ramas locales.',
        explanation: 'Marca con * la rama actual. Con un nombre como argumento crea una rama nueva sin cambiarte a ella.',
        shortcuts: ['git branch <rama>', 'git branch -a', 'git branch -v'],
        inSimulator: true,
      },
      {
        id: 'switch-create',
        command: 'git switch -c <rama>',
        summary: 'Crea una rama y se cambia a ella.',
        explanation: 'Es la forma moderna de git checkout -b: crea la rama en el commit actual y mueve HEAD a ella.',
        shortcuts: ['git checkout -b <rama>', 'git switch --create <rama>'],
        inSimulator: true,
      },
      {
        id: 'switch',
        command: 'git switch <rama>',
        summary: 'Cambia a otra rama.',
        explanation: 'Actualiza tus archivos al último commit de esa rama. git switch - vuelve a la rama anterior.',
        shortcuts: ['git checkout <rama>', 'git switch -'],
        inSimulator: true,
      },
      {
        id: 'branch-rename',
        command: 'git branch -m <nuevo-nombre>',
        summary: 'Renombra la rama actual.',
        explanation: 'Con dos argumentos (git branch -m <vieja> <nueva>) renombra otra rama. -M fuerza aunque exista una con ese nombre.',
        shortcuts: ['git branch -M main'],
        inSimulator: true,
      },
      {
        id: 'branch-delete',
        command: 'git branch -d <rama>',
        summary: 'Borra una rama ya fusionada.',
        explanation: 'Git se niega si la rama tiene commits sin fusionar; -D la borra de todos modos.',
        shortcuts: ['git branch -D <rama>', 'git branch --delete <rama>'],
        inSimulator: true,
      },
    ],
  },
  {
    id: 'integrate',
    title: 'Merge y rebase',
    description: 'Une el trabajo de varias ramas.',
    commands: [
      {
        id: 'merge',
        command: 'git merge <rama>',
        summary: 'Une otra rama a la actual.',
        explanation: 'Si la historia no divergió, avanza la rama (fast-forward); si divergió, crea un merge commit con dos padres.',
        shortcuts: ['git merge --no-ff <rama>', 'git merge --abort'],
        inSimulator: true,
      },
      {
        id: 'rebase',
        command: 'git rebase <rama>',
        summary: 'Reaplica tus commits encima de otra rama.',
        explanation: 'Crea copias nuevas de tus commits sobre la punta de <rama> y deja una historia lineal. No reescribas commits que otros ya usan.',
        shortcuts: ['git rebase --continue', 'git rebase --abort', 'git pull --rebase'],
        inSimulator: true,
      },
      {
        id: 'rebase-interactive',
        command: 'git rebase -i HEAD~<n>',
        summary: 'Edita, une o reordena los últimos n commits.',
        explanation: 'Abre una lista donde puedes marcar commits con pick, reword, squash, fixup o drop antes de reaplicarlos.',
        shortcuts: ['git rebase --interactive HEAD~3'],
        inSimulator: false,
      },
      {
        id: 'cherry-pick',
        command: 'git cherry-pick <commit>',
        summary: 'Copia un commit concreto a la rama actual.',
        explanation: 'Aplica los cambios de ese commit como uno nuevo. Útil para traer un arreglo puntual sin fusionar toda la rama.',
        shortcuts: ['git cherry-pick --continue', 'git cherry-pick --abort'],
        inSimulator: true,
      },
    ],
  },
  {
    id: 'undo',
    title: 'Deshacer',
    description: 'Vuelve atrás sin miedo, eligiendo cuánto deshacer.',
    commands: [
      {
        id: 'restore',
        command: 'git restore <archivo>',
        summary: 'Descarta los cambios no preparados de un archivo.',
        explanation: 'Devuelve el archivo a como está en el staging. Los cambios descartados no se pueden recuperar.',
        shortcuts: ['git checkout -- <archivo>'],
        inSimulator: true,
      },
      {
        id: 'restore-staged',
        command: 'git restore --staged <archivo>',
        summary: 'Quita un archivo del staging.',
        explanation: 'Deshace un git add sin tocar tu archivo: los cambios siguen en el directorio de trabajo.',
        shortcuts: ['git reset <archivo>', 'git reset HEAD <archivo>'],
        inSimulator: true,
      },
      {
        id: 'reset-soft',
        command: 'git reset --soft HEAD~1',
        summary: 'Deshace el último commit y conserva los cambios preparados.',
        explanation: 'Mueve la rama un commit atrás. Sin --soft (modo --mixed) los cambios quedan sin preparar; con --hard se pierden.',
        shortcuts: ['git reset HEAD~1', 'git reset --hard HEAD~1'],
        inSimulator: true,
      },
      {
        id: 'revert',
        command: 'git revert <commit>',
        summary: 'Crea un commit que deshace otro.',
        explanation: 'No reescribe la historia, así que es la forma segura de deshacer algo que ya publicaste.',
        shortcuts: ['git revert HEAD', 'git revert --no-edit <commit>'],
        inSimulator: true,
      },
      {
        id: 'clean',
        command: 'git clean -n',
        summary: 'Muestra qué archivos sin seguimiento se borrarían.',
        explanation: 'Es una prueba en seco. Con -f los borra de verdad y con -d incluye carpetas. No se puede deshacer.',
        shortcuts: ['git clean -f', 'git clean -fd'],
        inSimulator: true,
      },
    ],
  },
  {
    id: 'remote',
    title: 'Remoto',
    description: 'Sincroniza tu repositorio con origin.',
    commands: [
      {
        id: 'remote-list',
        command: 'git remote -v',
        summary: 'Lista los remotos y sus URL.',
        explanation: 'origin es el nombre habitual del remoto del que clonaste. git remote add <nombre> <url> agrega otro.',
        shortcuts: ['git remote add origin <url>'],
        inSimulator: true,
      },
      {
        id: 'fetch',
        command: 'git fetch',
        summary: 'Descarga lo nuevo del remoto sin tocar tus ramas.',
        explanation: 'Actualiza las ramas remotas (como origin/main) para que puedas revisarlas antes de integrarlas.',
        shortcuts: ['git fetch origin', 'git fetch --all'],
        inSimulator: true,
      },
      {
        id: 'pull',
        command: 'git pull',
        summary: 'Trae e integra los cambios del remoto.',
        explanation: 'Equivale a git fetch seguido de git merge de la rama remota. Con --rebase reaplica tus commits encima en lugar de fusionar.',
        shortcuts: ['git pull --rebase', 'git fetch && git merge origin/<rama>'],
        inSimulator: true,
      },
      {
        id: 'push-upstream',
        command: 'git push -u origin <rama>',
        summary: 'Publica una rama nueva y la enlaza con el remoto.',
        explanation: 'La opción -u guarda el enlace (upstream), así que después basta con git push o git pull sin argumentos.',
        shortcuts: ['git push --set-upstream origin <rama>', 'git push'],
        inSimulator: true,
      },
    ],
  },
  {
    id: 'stash-tags',
    title: 'Stash y tags',
    description: 'Guarda trabajo a medias y marca versiones.',
    commands: [
      {
        id: 'stash',
        command: 'git stash',
        summary: 'Aparta tus cambios sin hacer commit.',
        explanation: 'Deja el directorio de trabajo limpio para cambiar de rama. Los cambios quedan en una pila que puedes recuperar después.',
        shortcuts: ['git stash push -m "<mensaje>"', 'git stash list'],
        inSimulator: true,
      },
      {
        id: 'stash-pop',
        command: 'git stash pop',
        summary: 'Recupera el último stash y lo borra de la pila.',
        explanation: 'git stash apply hace lo mismo pero conserva la entrada; git stash drop la borra sin aplicarla.',
        shortcuts: ['git stash apply', 'git stash drop'],
        inSimulator: true,
      },
      {
        id: 'tag',
        command: 'git tag <nombre>',
        summary: 'Marca el commit actual con un nombre fijo.',
        explanation: 'A diferencia de una rama, un tag no avanza. Se usa para versiones como v1.0. Sin argumentos lista los tags.',
        shortcuts: ['git tag -a v1.0 -m "<mensaje>"', 'git push origin --tags'],
        inSimulator: true,
      },
    ],
  },
];
