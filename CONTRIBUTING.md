# Cómo contribuir a Git Playground

¡Gracias por querer aportar! Este proyecto existe para que cualquiera aprenda Git sin miedo, así que toda ayuda cuenta: niveles nuevos, comandos que faltan, bugs, accesibilidad, diseño o documentación.

Al participar aceptas nuestro [Código de conducta](CODE_OF_CONDUCT.md).

## Antes de empezar

- **Bugs:** abre un issue con la plantilla "Reportar un bug". Incluye los comandos exactos que escribiste; el motor es determinista, así que con eso casi siempre podemos reproducirlo.
- **Ideas y cambios grandes:** abre primero un issue para conversarlo. Así evitamos que trabajes en algo que después no encaje.
- **Niveles nuevos:** usa la plantilla "Proponer un nivel".
- Busca issues con la etiqueta `good first issue` si es tu primera contribución.

## Preparar el entorno

Necesitas Node 22 o superior.

```bash
git clone https://github.com/<tu-usuario>/git-playground.git
cd git-playground
npm install
npm run dev   # http://localhost:5173
```

## Flujo de trabajo

1. Haz un fork y crea una rama desde `main` (`feat/nivel-stash-apply`, `fix/merge-conflicto`, …).
2. **Escribe primero el test que falla** y después el código que lo hace pasar. El proyecto se desarrolla con TDD estricto.
3. Antes de abrir el PR, corre todo lo que corre el CI:

   ```bash
   npx tsc -b --noEmit
   npm test              # usa TZ=UTC; no corras vitest directo
   npm run build
   npm run check:chunks
   ```

4. Abre el pull request contra `main` usando la plantilla. Explica qué cambia y por qué; si toca la UI, agrega una captura.

Mantén cada PR enfocado en una sola cosa. Si son varias, mejor varios PRs.

## Reglas del proyecto

### Motor (`src/engine/`)

- Es **puro y determinista**: recibe un estado y un comando y devuelve un estado nuevo. Nada de React ni DOM.
- No uses `Date.now()` ni `Math.random()` en hashes, ids o cualquier cosa que afecte el resultado.
- El estado tiene que ser JSON serializable.
- **No modifiques** los tests de paridad en `src/engine/__tests__/parity/` ni `design-handoff/git-engine.js`: comparan el motor contra el original y el comportamiento existente debe seguir idéntico. Para comportamiento nuevo, agrega tests nuevos.
- La salida que ve el usuario va en español.

### Niveles (`src/lessons/catalog/`)

- Cada mundo vive en su archivo (`w1-basicos.ts`, …). El README tiene un ejemplo completo de `LevelDef`.
- El `setup` y la `solution` se reproducen con el motor real; usa solo comandos que el simulador soporta.
- No uses hashes literales en los pasos: usa nombres de rama, `HEAD~n` o tags.
- La suite `catalog.solvability.test.ts` verifica que el nivel no esté resuelto tras el `setup` y que la `solution` lo resuelva. Tiene que pasar.
- Teoría corta y correcta, pistas de menos a más (de un empujón a casi la respuesta) y objetivos que no se puedan cumplir por un atajo que no enseñe nada.
- Si cambias un nivel ya publicado, sube su `version` para descartar el progreso guardado viejo.

### UI (`src/components/`)

- React + CSS Modules, usando los tokens de `src/styles/theme.css`. Tiene que verse bien en tema claro y oscuro.
- Tipografías: solo Geist y Geist Mono.
- Respeta `prefers-reduced-motion`: sin animaciones, todo el contenido visible.
- La landing no puede importar el motor en tiempo de ejecución (`npm run check:chunks` lo verifica).
- Textos de la interfaz en español neutro.

### Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/es/): `feat(levels): …`, `fix(engine): …`, `docs: …`. Mensajes en inglés, cortos, en imperativo.

## Specs

La carpeta `openspec/` guarda la propuesta, los specs, el diseño y las tareas de cada cambio grande. Es una buena forma de entender por qué algo es como es. Para cambios grandes, puedes proponer un spec en el issue antes de programar.

## ¿Dudas?

Abre un issue o comenta en el PR. Ninguna pregunta es tonta: este es un proyecto para aprender.
