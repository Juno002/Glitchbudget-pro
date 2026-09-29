# Fase 16.6 — Apply automatically opcional

Fuente funcional: `Roadmap septiembre 2026.txt`, Fase 16.
Plan de ejecución: [phase-16.md](phase-16.md).

Estado: **checkpoint completado**.

Fase 16 permanece **en progreso**. Este checkpoint no inicia 16.7.

## Objetivo

Añadir `Apply automatically` únicamente como opt-in explícito por Rule, después de haber estabilizado Suggestions en 16.1–16.5.

## Contrato

`TransactionRule` admite ahora:

```ts
applyAutomatically?: boolean
```

Compatibilidad:

- Rules legacy sin el campo siguen siendo manuales;
- `false` se normaliza como ausencia del campo;
- solo `true` activa la ruta automática;
- no existe setting global de auto-apply.

## Semántica

El motor determinista conserva la intención de auto-apply en el match.

Quick Add filtra primero la sugerencia por compatibilidad de tipo/categoría.

Después:

### Una coincidencia automática compatible

```text
1 automatic compatible match
→ rellenar categoryId y/o necessity
→ NO guardar movimiento
→ campos siguen editables
```

Quick Add muestra qué Rule fue aplicada automáticamente.

### Cero coincidencias automáticas

El flujo sigue siendo el de 16.3:

```text
Sugerencia
→ Aceptar sugerencia | Ignorar sugerencia
```

### Varias coincidencias automáticas

16.6 **no inventa precedencia**.

```text
2+ automatic compatible matches
→ no aplicar ninguna automáticamente
→ mostrar sugerencias manuales
→ usuario decide
```

La política formal de conflictos y precedencia queda para 16.7.

## Scope por tipo

### Expense

Puede autoaplicar:

- categoría compatible;
- necessity.

### Income

Puede autoaplicar:

- categoría compatible.

Nunca aplica necessity a income.

### Transfer

Rules no producen clasificación y no hay auto-apply.

## Gestión

Ajustes → Automatización añade un control explícito por Rule:

```text
[ ] Aplicar automáticamente
```

No es una preferencia global.

Las Rules automáticas se identifican visualmente con el estado **Automática**.

## Persistencia

Se mantiene la key existente:

```text
glitchbudget_transaction_rules_v1
```

No se añade:

- tabla Dexie;
- migración Dexie;
- cambio de JSON backup;
- cambio de CSV.

Rules legacy continúan cargando sin conversión destructiva.

## Invariantes preservadas

- cero IA;
- cero transmisión de descripciones;
- cero red para evaluar/aplicar Rules;
- motor determinista;
- auto-apply no guarda movimientos;
- auto-apply solo rellena clasificación en Quick Add;
- usuario puede editar los campos antes de guardar;
- no existe ganador implícito entre múltiples Rules automáticas;
- Templates y Saved Filters mantienen sus responsabilidades separadas.

## Pruebas

`tests/phase-16-6-auto-apply.test.ts` cubre:

- legacy manual por defecto;
- persistencia del opt-in explícito;
- propagación determinista del flag;
- compatibilidad por tipo;
- una coincidencia automática;
- conflicto entre múltiples automáticas;
- control UI por Rule;
- ausencia de setting global;
- ausencia de IA y red.

Las regresiones históricas de 16.1–16.5 fueron actualizadas para distinguir correctamente entre sus garantías originales y la extensión explícita de 16.6.

## Gate técnico

GitHub Actions `Quality checks` run `36502529791` verificó:

- **333/333 pruebas**, 0 fallos;
- typecheck aprobado;
- lint con cero warnings;
- guard local-only aprobado;
- build de producción aprobado;
- manifiesto offline: **42 recursos**;
- `connect-src 'none'` en cada HTML generado.

## Siguiente checkpoint

**16.7 — Hardening + gate**

Debe cerrar, como mínimo:

- conflictos entre Rules;
- precedencia formal;
- datos legacy;
- backup/export si aplica;
- regresiones completas;
- documentación;
- cierre formal de Fase 16.

16.7 no queda iniciado por este documento.
