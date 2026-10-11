## Qué cambia

<!-- Resume el cambio en una o dos frases. -->

## Por qué

<!-- El problema que resuelve. Si hay un issue, enlázalo: Closes #123 -->

## Cómo lo probé

<!-- Tests nuevos, comandos que corriste, capturas si toca la UI. -->

## Checklist

- [ ] Escribí primero el test que fallaba
- [ ] `npx tsc -b --noEmit`, `npm test`, `npm run build` y `npm run check:chunks` pasan
- [ ] No modifiqué los tests de paridad ni `design-handoff/`
- [ ] Si toca la UI: se ve bien en tema claro y oscuro, y con `prefers-reduced-motion`
- [ ] Si toca un nivel publicado: subí su `version`
