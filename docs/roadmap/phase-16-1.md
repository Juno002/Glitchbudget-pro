# Fase 16.1 — Contrato de Rules

Fuente de verdad: `Roadmap septiembre 2026.txt`, Fase 16.

Estado: **checkpoint completado**.

Fase 16 permanece **en progreso**. Este checkpoint no inicia 16.2.

## Alcance exacto

16.1 define únicamente el contrato mínimo necesario para representar el ejemplo canónico del roadmap:

```text
Description contains "Spotify"
→ Entertainment
→ Want
```

Contrato:

```ts
TransactionRule {
  id
  name
  enabled
  condition: {
    field: 'description'
    operator: 'contains'
    value
  }
  suggestion: {
    categoryId?
    necessity?
  }
}
```

La sugerencia debe contener al menos uno de:

- `categoryId`;
- `necessity: must | need | want`.

## Deliberadamente no implementado

16.1 **no** implementa:

- evaluación de reglas;
- sugerencias dentro de Quick Add;
- almacenamiento de reglas;
- UI de gestión;
- prioridad o resolución de conflictos;
- labels automáticos;
- `Apply automatically`;
- IA;
- red o transmisión de descripciones.

No se modifican:

- Quick Add;
- Templates;
- Saved Filters;
- Dexie;
- JSON backup;
- CSV.

## Invariantes

1. Solo existe la condición `description contains <texto>`.
2. No se aceptan regex, equals u otros operadores.
3. La salida solo puede sugerir categoría y/o necessity.
4. Una regla sin salida útil es inválida.
5. El contrato no contiene ningún flag de aplicación automática.
6. El módulo de dominio no contiene transporte de red.
7. El módulo de dominio no contiene dependencias de IA.
8. El orden del roadmap continúa siendo:
   `Templates → Saved filters → Rules`.

## Archivos

```text
src/domain/rules.ts
tests/phase-16-1-rules-contract.test.ts
```

## Gate técnico

GitHub Actions `Quality checks` run `36492690727` verificó:

- **306/306 pruebas**, 0 fallos;
- typecheck aprobado;
- lint con cero warnings;
- guard local-only aprobado;
- build de producción aprobado;
- manifiesto offline: **42 recursos**;
- `connect-src 'none'` en cada HTML generado.

## Siguiente checkpoint

**16.2 — Motor determinista** podrá evaluar este contrato y producir una sugerencia pura.

16.2 no queda iniciado por este documento.
