// GREEN (tasks.md Phase 5, 5.2). app-routing spec "Locked Level Guard":
// renders instead of the level, with no way to bypass it via direct URL
// entry — `LevelRoute`'s body renders this INSTEAD of `LevelShell` whenever
// the requested level id isn't in `useProgress().unlocked`.
export function LockedLevel() {
  return (
    <main>
      <h1 data-route-focus tabIndex={-1}>
        Nivel bloqueado
      </h1>
      <p>Todavía no desbloqueaste este nivel. Completa los niveles anteriores para acceder.</p>
      <a href="#/niveles">Volver al mapa</a>
    </main>
  );
}
