# Fase 16.3 — Rule suggestions en Quick Add

Fuente de verdad: `Roadmap septiembre 2026.txt`, Fase 16.

Estado: **checkpoint completado**.

Fase 16 permanece **en progreso**. Este checkpoint no inicia 16.4.

## Objetivo

Conectar el motor puro de 16.2 a Quick Add para que una rule pueda **sugerir** clasificación sin modificar el movimiento hasta que el usuario lo confirme explícitamente.

## Integración

`TransactionModal` acepta ahora:

```ts
rules?: readonly TransactionRule[]
```

El valor por defecto es:

```ts
rules = []
```

Esto es intencional: 16.3 no crea almacenamiento ni fuente persistente de rules. Hasta 16.4, la integración existe pero no aparecen reglas persistentes por sí solas.

## Flujo

Para un movimiento nuevo distinto de transferencia:

1. el usuario escribe Concepto / Descripción;
2. `evaluateTransactionRules()` evalúa las rules recibidas;
3. `quickAddRuleSuggestions()` descarta partes incompatibles con el tipo/categorías actuales;
4. Quick Add muestra una tarjeta por match;
5. el usuario elige **Aceptar sugerencia** o **Ignorar sugerencia**.

Nada se modifica antes de pulsar **Aceptar sugerencia**.

## Qué puede aplicar una sugerencia

### Gasto

Puede sugerir:

- categoría válida del conjunto de categorías de gasto;
- `must | need | want`.

### Ingreso

Solo puede sugerir:

- categoría válida de ingreso.

`necessity` nunca se aplica a ingresos.

### Transferencia

Rules no producen sugerencias.

## Múltiples coincidencias

16.3 no introduce prioridad.

Si varias rules coinciden:

- se muestran todas en el orden que entrega el motor;
- ninguna se acepta automáticamente;
- el usuario decide cuál aceptar;
- aceptar una rule no implica aceptar las demás.

La resolución formal de conflictos/prioridades sigue fuera de alcance.

## Ignorar

Ignorar una sugerencia:

- la oculta durante la sesión actual del modal;
- no modifica la rule;
- no modifica el movimiento;
- no persiste nada.

El conjunto de sugerencias ignoradas se reinicia al abrir un nuevo Quick Add, cambiar el tipo de movimiento o aplicar una plantilla.

## Arquitectura

Nuevo adaptador puro:

```text
src/domain/rule-suggestions.ts
```

Responsabilidad:

- filtrar category IDs incompatibles;
- eliminar necessity fuera de gastos;
- excluir transferencias;
- conservar orden;
- devolver copias sin mutar matches.

El adaptador permanece dentro de `src/domain` y no depende de React, Dexie, browser APIs ni `src/lib`.

## Deliberadamente no implementado

16.3 no implementa:

- almacenamiento de rules;
- creación/edición de rules;
- activar/desactivar desde UI;
- reordenamiento/prioridad de rules;
- `Apply automatically`;
- IA;
- red;
- transmisión de descripciones.

No cambia:

- Dexie;
- JSON backup;
- CSV;
- Saved Filters;
- Quick Add Templates.

## Pruebas

`tests/phase-16-3-quick-add-rule-suggestions.test.ts` cubre:

- compatibilidad por tipo de movimiento;
- validación de category IDs permitidos;
- necessity solo en gastos;
- exclusión de transferencias;
- orden e inmutabilidad;
- presencia de aceptar/ignorar;
- `rules = []` como valor por defecto;
- ausencia de storage/UI de gestión;
- ausencia de `Apply automatically`.

Las regresiones históricas de 16.1 y 16.2 fueron actualizadas únicamente para reconocer que 16.3 ahora consume el contrato/motor desde Quick Add; sus invariantes de pureza, ausencia de storage y ausencia de auto-apply siguen intactas.

## Gate técnico

GitHub Actions `Quality checks` run `36496216494` verificó:

- **317/317 pruebas**, 0 fallos;
- typecheck aprobado;
- lint con cero warnings;
- guard local-only aprobado;
- build de producción aprobado;
- manifiesto offline: **42 recursos**;
- `connect-src 'none'` en cada HTML generado.

## Siguiente checkpoint

**16.4 — Gestión de rules** podrá introducir almacenamiento local y una UI explícita para crear, editar, activar/desactivar, ordenar y eliminar reglas.

16.4 no queda iniciado por este documento.
