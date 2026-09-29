# Fase 16.5 — Integración del stack de automatización local

Fuente de verdad: `Roadmap septiembre 2026.txt`, Fase 16.

Estado: **checkpoint 16.5 completado; Fase 16 continúa en progreso**.

## Objetivo

Consolidar explícitamente el orden canónico:

```text
Templates
↓
Saved filters
↓
Rules
```

sin mezclar responsabilidades ni introducir automatización implícita.

## Stack local

Se añade `src/lib/local-automation.ts` como coordinador liviano.

Define el orden y la función de cada capa:

1. **Templates** — gestionadas en Quick Add; reutilizan datos de movimientos frecuentes.
2. **Saved filters** — gestionados en Movimientos; recuperan vistas y criterios de filtrado.
3. **Rules** — gestionadas en Ajustes → Automatización; sugieren categoría y/o necesidad a partir de la descripción.

El coordinador no sustituye los módulos existentes ni mueve su lógica interna.

## Resumen en Ajustes

Ajustes → Automatización muestra las tres capas en el orden del roadmap, su ubicación y el número de elementos guardados.

La UI deja explícito que:

- Templates se gestionan dentro de Quick Add;
- Saved filters se gestionan en Movimientos;
- Rules se gestionan en Automatización;
- cada capa conserva una responsabilidad distinta.

El gestor de Rules reporta su conteo al resumen para mantener la tarjeta actualizada durante la misma sesión.

## Limpieza local

El borrado total centraliza ahora la limpieza de:

```text
QUICK_ADD_TEMPLATES_KEY
SAVED_TRANSACTION_FILTERS_KEY
TRANSACTION_RULES_KEY
```

mediante:

```ts
clearLocalAutomation(localStorage)
```

La centralización no mezcla formatos ni almacenamiento; cada capa conserva su propia key y normalizador.

## Invariantes preservadas

- Templates no crean movimientos por sí solas.
- Saved filters no clasifican ni modifican movimientos.
- Rules siguen siendo deterministas.
- Rules solo sugieren.
- Quick Add mantiene **Aceptar sugerencia** e **Ignorar sugerencia**.
- No hay resolución implícita de conflictos.
- No hay IA.
- No se transmiten descripciones.
- No hay red.
- No se añade tabla Dexie.
- No cambia la versión de backup.

## Apply automatically

El roadmap indica que **después puede existir** una opción explícita `Apply automatically` y el plan de ejecución de Fase 16 reserva ese trabajo para **16.6**.

16.5 permanece deliberadamente suggestion-only. `Apply automatically` no se implementa antes de 16.6.

## Pruebas

`tests/phase-16-5-local-automation-stack.test.ts` verifica:

- orden exacto Templates → Saved filters → Rules;
- resumen independiente de las tres capas;
- limpieza conjunta sin borrar preferencias locales ajenas;
- ubicación nativa de cada editor;
- aislamiento entre módulos;
- ausencia de auto-apply, red e IA.

También se actualizaron regresiones históricas de Fases 8, 15 y 16.4 para seguir la limpieza centralizada sin debilitar sus garantías originales.

## Gate técnico

GitHub Actions `Quality checks` run `36500337917` verificó:

- **327/327 pruebas**, 0 fallos;
- typecheck aprobado;
- lint con cero warnings;
- guard local-only aprobado;
- build de producción aprobado;
- manifiesto offline: **42 recursos**;
- `connect-src 'none'` en cada HTML generado.

## Estado después de 16.5

16.5 completa la convivencia de:

```text
Templates
↓
Saved filters
↓
Rules deterministas
↓
sugerencias explícitas
```

pero **no cierra Fase 16**.

Pendientes obligatorios:

- **16.6 — Apply automatically opcional**, opt-in explícito por rule;
- **16.7 — Hardening + gate**, incluyendo conflictos, precedencia, legacy, backup/export si aplica, pruebas, documentación y cierre formal.

La siguiente fase del roadmap, **Fase 17 — Seguridad y privacidad local**, no debe iniciarse antes de cerrar 16.7.
