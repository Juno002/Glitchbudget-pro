# Fase 16.4 — Gestión local de rules

Fuente de verdad: `Roadmap septiembre 2026.txt`, Fase 16.

Estado: **checkpoint completado**.

Fase 16 permanece **en progreso**. Este checkpoint no inicia 16.5.

## Objetivo

Dar una fuente persistente y una UI explícita a las rules deterministas de 16.1–16.3 sin convertirlas en escrituras automáticas sobre movimientos.

## Persistencia

Las rules se guardan exclusivamente en:

```text
localStorage
glitchbudget_transaction_rules_v1
```

No se añade tabla Dexie ni se modifica el backup JSON/CSV.

El storage:

- reutiliza `normalizeTransactionRule()` como contrato canónico;
- repara entradas malformadas descartándolas;
- conserva el orden explícito;
- evita IDs duplicados;
- limita el conjunto a 50 rules;
- no contiene red, IA ni transporte de descripciones.

## Gestión

Ajustes incorpora la sección **Automatización** con **Reglas locales**.

La UI permite:

- crear;
- editar;
- activar/desactivar;
- subir/bajar en el orden;
- eliminar.

Cada rule sigue limitada a:

```text
Description contains "<texto>"
→ categoryId?
→ necessity?
```

Debe existir al menos una sugerencia útil.

La necesidad sigue siendo aplicable únicamente a gastos cuando Quick Add filtra la sugerencia.

## Integración con Quick Add

`TransactionModal` mantiene el prop opcional:

```ts
rules?: readonly TransactionRule[]
```

Si el consumidor no inyecta rules, Quick Add carga las rules persistidas desde `localStorage` al abrir un movimiento nuevo.

La fuente efectiva es:

```ts
rules ?? storedRules
```

Las coincidencias siguen pasando por:

```text
evaluateTransactionRules()
↓
quickAddRuleSuggestions()
↓
Aceptar sugerencia | Ignorar sugerencia
```

No existe escritura automática.

## Orden

El orden guardado es también el orden de evaluación/presentación.

16.4 no introduce:

- prioridad numérica;
- ganador implícito;
- merge de sugerencias;
- resolución de conflictos.

Esas semantics continúan siendo explícitas y deterministas.

## Borrado total

**Borrar todos los datos** elimina también `TRANSACTION_RULES_KEY`, igual que Templates, Saved Filters y preferencias locales relacionadas.

## Deliberadamente no implementado

16.4 no implementa:

- `Apply automatically`;
- IA;
- red;
- transmisión de descripciones;
- regex u operadores adicionales;
- labels automáticos;
- reglas por cuenta/importe/fecha;
- tabla Dexie;
- cambio de versión de backup.

## Archivos principales

```text
src/lib/transaction-rules.ts
src/components/settings/transaction-rule-manager.tsx
src/components/layout/settings-dialog.tsx
src/components/dashboard/TransactionModal.tsx
tests/phase-16-4-rule-management.test.ts
```

Las regresiones de 16.3 se actualizaron únicamente para reconocer que 16.4 añade la fuente persistente; aceptar/ignorar y la ausencia de auto-apply permanecen intactos.

## Gate técnico

GitHub Actions `Quality checks` run `36497955697` verificó:

- **322/322 pruebas**, 0 fallos;
- typecheck aprobado;
- lint con cero warnings;
- guard local-only aprobado;
- build de producción aprobado.

## Siguiente checkpoint

**16.5 — Integración Templates → Saved Filters → Rules** consolidará el orden acordado de Automatización local sin mezclar responsabilidades entre las tres capas.

16.5 no queda iniciado por este documento.
