# Cómo contribuir

1. **`main` siempre ejecutable.** Nunca se hace *push* directo a `main`.
2. **Una rama por funcionalidad**: `feat/<tema>`, `fix/<tema>`, `docs/<tema>`.
3. **Commits pequeños y descriptivos** en español, en imperativo: `escena: valida límites al rotar`.
   Referencien la tarea del plan o la *issue*: `(T6)` o `#12`.
4. **Pull request** con la plantilla: qué cambia, cómo se probó (captura o salida de `node tests/run-tests.js`)
   y tareas relacionadas.
5. **Revisión obligatoria** de un compañero distinto del autor. Rotación inicial: A revisa a B,
   B revisa a C y C revisa a A. Resuelvan todos los comentarios antes de integrar.
6. **Integración**: *merge commit* (no *squash*), para conservar los commits individuales y su autoría.
7. **Cambios de interfaz**: actualicen `docs/INTERFACES.md` (sección 9) y todos los módulos afectados en el mismo PR.
8. **IA**: todo cambio generado con asistentes sigue este mismo proceso y se registra en `AI_USAGE.md`.

## Configurar la protección de `main` (una sola vez, la hace el dueño del repositorio)

*Settings → Branches → Add branch protection rule* (o *Rulesets*), patrón `main`:
- Require a pull request before merging → **Require approvals: 1**
- Dismiss stale pull request approvals when new commits are pushed
- Require conversation resolution before merging
