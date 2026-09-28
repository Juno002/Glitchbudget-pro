# Fase 16.2 — Motor determinista

Fuente de verdad: `Roadmap septiembre 2026.txt`, Fase 16.

Estado: **checkpoint completado**.

Fase 16 permanece **en progreso**. Este checkpoint no inicia 16.3.

## Alcance exacto

16.2 implementa únicamente evaluación pura del contrato creado en 16.1.

Entrada:

```text
description
rules[]
```

Salida:

```text
RuleMatch[]
```

Cada coincidencia conserva:

- `ruleId`;
- `ruleName`;
- la sugerencia de `categoryId?`;
- la sugerencia de `necessity?`.

## Semántica de coincidencia

La única condición sigue siendo:

```text
Description contains "<texto>"
```

La comparación:

- es local;
- es determinista;
- ignora mayúsculas/minúsculas;
- colapsa espacios repetidos;
- no modifica la descripción recibida.

Una rule deshabilitada nunca produce match.

## Múltiples coincidencias

16.2 **no resuelve conflictos**.

Si varias reglas coinciden:

- devuelve todas;
- conserva el orden de entrada;
- no combina categorías;
- no elige ganador;
- no introduce prioridad implícita.

La resolución de conflictos queda fuera de este checkpoint.

## Pureza

`src/domain/rule-engine.ts`:

- no lee ni escribe Dexie;
- no usa `localStorage`;
- no llama servicios de transacciones;
- no modifica rules;
- devuelve copia de la suggestion;
- no usa red;
- no usa IA.

## Deliberadamente no implementado

16.2 no implementa:

- integración con Quick Add;
- UI de sugerencias;
- almacenamiento de rules;
- UI de gestión;
- prioridades;
- resolución de conflictos;
- `Apply automatically`;
- IA;
- transmisión de descripciones.

## Archivos

```text
src/domain/rule-engine.ts
tests/phase-16-2-rule-engine.test.ts
```

## Pruebas específicas

Las regresiones verifican:

- contains case-insensitive;
- normalización de espacios;
- no match para descripción vacía;
- no match para rule deshabilitada;
- category-only;
- necessity-only;
- múltiples matches en orden;
- ausencia de resolución implícita;
- inmutabilidad de input/rules;
- ausencia de UI, storage, red, IA y escrituras financieras.

## Gate técnico

GitHub Actions `Quality checks` run `36494425297` verificó:

- **313/313 pruebas**, 0 fallos;
- typecheck aprobado;
- lint con cero warnings;
- guard local-only aprobado;
- build de producción aprobado;
- manifiesto offline: **42 recursos**;
- `connect-src 'none'` en cada HTML generado.

## Siguiente checkpoint

**16.3 — Rule suggestions en Quick Add** podrá consumir este motor y presentar una sugerencia al usuario.

16.3 no queda iniciado por este documento.
