# Git Playground

**Aprende Git sin miedo a romper nada.** Un simulador de Git que corre en tu navegador: escribes comandos reales, ves crecer el grafo de commits en vivo y te equivocas todo lo que quieras.

👉 **Pruébalo:** https://eljosecito.github.io/git-playground/

> _English:_ Git Playground is an in-browser Git simulator for learning Git. Type real commands, watch the commit graph animate, play 30 guided levels and practice pull requests on a simulated GitHub. UI copy is in Spanish; code and docs for contributors are in English-friendly TypeScript.

## Qué incluye

- **Modo libre** (`#/playground`): una terminal con un motor Git simulado — `init`, `add`, `commit`, `branch`, `switch`, `merge` (con conflictos), `rebase`, `cherry-pick`, `revert`, `reset`, `stash`, `tag`, `push`/`fetch`/`pull` contra un `origin` simulado y más. Historial, autocompletado con Tab y explicaciones de cada evento.
- **Grafo animado**: commits, ramas y fusiones aparecen al instante, con cámara (pan/zoom) y coreografía de animaciones.
- **Pull requests simulados**: una web tipo GitHub donde abres PRs, comentas, y fusionas con merge commit, squash o rebase.
- **30 niveles en 6 mundos** (`#/niveles`): Básicos, Ramas, Merge y conflictos, Deshacer cambios, Remoto, Pull requests. Objetivos verificados en vivo, pistas progresivas, estrellas y desbloqueo por mundos. El progreso se guarda en tu navegador.

Todo es local: no hay cuentas, servidor ni datos que salgan de tu navegador.

## Desarrollo

Requiere Node 22+.

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # Vitest (usa TZ=UTC; no corras vitest directo)
npx tsc -b --noEmit  # typecheck
npm run build        # build de producción en dist/
npm run check:chunks # verifica que la landing no cargue el motor
```

### Estructura

| Carpeta | Qué hay |
|---|---|
| `src/engine/` | Motor Git puro en TypeScript (sin React). Estado serializable: `ejecutar(estado, comando)` → `{ estado, salida, eventos, error }`. |
| `src/engine/hosting/` | PRs simulados sobre el `origin`. |
| `src/engine/lessons/` | Predicados y evaluación de niveles. |
| `src/lessons/catalog/` | Los niveles, un archivo por mundo. |
| `src/components/` | UI en React + CSS Modules (grafo, terminal, paneles, niveles, landing). |
| `src/app/` | Router por hash, tema, estado de la app. |
| `design-handoff/` | Diseño original; `git-engine.js` es el oráculo de los tests de paridad del motor. |
| `openspec/` | Specs, diseño y tareas de cada cambio (Spec-Driven Development). |

## Contribuir

¡Las contribuciones son bienvenidas! Algunas ideas: niveles nuevos, comandos de Git que faltan, mejoras de accesibilidad, traducciones, bugs. Lee la [guía de contribución](CONTRIBUTING.md) y el [código de conducta](CODE_OF_CONDUCT.md); para problemas de seguridad, mira [SECURITY.md](SECURITY.md).

1. Abre un issue contando qué quieres cambiar (para cambios grandes, antes de programar).
2. Haz un fork, crea una rama y escribe **primero el test** que falla, después el código.
3. Asegúrate de que pasen `npm test`, `npx tsc -b --noEmit`, `npm run build` y `npm run check:chunks` (el CI los corre en cada PR).
4. Abre el pull request explicando el qué y el porqué.

Reglas del motor: es puro y determinista (nada de `Date.now()` ni `Math.random()` en hashes o ids), y los tests de paridad en `src/engine/__tests__/parity/` no se modifican: el comportamiento existente debe seguir idéntico al del oráculo.

### Agregar un nivel

Los niveles son datos en `src/lessons/catalog/wN-*.ts`:

```ts
export const miNivel: LevelDef = {
  id: 'basics-06-mi-nivel',
  world: 1,
  order: 6,
  version: 1,
  title: 'Mi nivel',
  objective: 'Qué tiene que lograr la persona.',
  theory: ['Explicación corta y correcta.'],
  setup: ['git init', 'touch a.txt'],          // se reproduce con el motor real
  solution: ['git add a.txt', 'git commit -m "a"'], // solución de referencia
  goals: [{ id: 'commit', label: 'Haz un commit', check: (s) => commitCount(s) >= 1 }],
  hints: ['Pista suave', 'Pista casi-respuesta'],
};
```

Agrégalo al arreglo del mundo. La suite `catalog.solvability.test.ts` comprueba automáticamente que el nivel **no** esté resuelto tras el `setup` y que la `solution` lo resuelva con el motor real. No uses hashes literales en los pasos: usa nombres de rama, `HEAD~n` o tags.

## Licencia

[MIT](LICENSE) © ElJosecito
