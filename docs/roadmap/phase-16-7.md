# Fase 16.7 — Hardening + gate final

Fuente funcional: `Roadmap septiembre 2026.txt`, Fase 16.
Plan de ejecución: [phase-16.md](phase-16.md).

Estado: **checkpoint completado y Fase 16 cerrada**.

## Objetivo

Cerrar la automatización local después de 16.1–16.6, formalizando:

- conflictos entre Rules;
- precedencia;
- compatibilidad legacy;
- backup/export;
- regresiones completas;
- documentación y gate final.

## Política de conflictos y precedencia

La política canónica queda congelada como:

```text
stored-order-manual-on-automatic-conflict
```

Semántica:

1. el orden guardado de Rules determina el orden de evaluación y presentación;
2. una única Rule automática compatible puede rellenar clasificación;
3. si coinciden dos o más Rules automáticas compatibles, **ninguna gana por posición**;
4. el conflicto vuelve a sugerencias manuales en el mismo orden guardado;
5. mover una Rule arriba o abajo nunca convierte silenciosamente ese orden en una prioridad automática.

Esto conserva determinismo sin introducir una precedencia implícita difícil de detectar.

## Compatibilidad legacy

Rules anteriores a 16.6 no contienen `applyAutomatically`.

Su comportamiento queda definido como:

```text
missing / false
→ manual suggestion

true
→ eligible for automatic application
```

Los normalizadores de Templates, Saved Filters y Rules son ahora las rutas canónicas también para escrituras y restore.

Se rechazan:

- filas malformadas;
- IDs duplicados en backups;
- conjuntos por encima de sus límites locales.

## Backup JSON v12

El backup completo sube de **JSON v11 a JSON v12**.

v12 añade:

```ts
localAutomation: {
  templates
  savedFilters
  rules
}
```

Las tres capas continúan almacenadas en `localStorage`; no se trasladan a Dexie.

### Restore de backups antiguos

Backups **v3–v11** nunca pudieron contener automatización local.

Por tanto:

```text
restore v3–v11
→ restaura datos financieros
→ preserva Templates / Saved Filters / Rules locales actuales
```

Esto evita borrar silenciosamente datos que un formato antiguo no podía representar.

### Restore de v12

```text
restore v12
→ valida todo primero
→ reemplaza Templates / Saved Filters / Rules
→ restaura Dexie
```

Si falla una escritura de localStorage, las tres capas locales vuelven al estado previo.

Si la transacción Dexie falla después de preparar el restore local, la automatización local también se revierte.

Un v12 con automatización no vacía se rechaza cuando el almacenamiento local no está disponible, en vez de perderla silenciosamente.

## Invariantes finales de Fase 16

- cero IA;
- cero transmisión de descripciones;
- cero dependencia de red para evaluar/aplicar Rules;
- motor determinista;
- Templates siguen siendo presets;
- Saved Filters siguen siendo vistas;
- Rules siguen siendo clasificación;
- auto-apply es opt-in por Rule;
- no existe auto-apply global;
- auto-apply no guarda movimientos;
- transferencias no reciben clasificación;
- `necessity` no se aplica a ingresos;
- múltiples Rules automáticas no tienen ganador implícito;
- Rules no se almacenan en Dexie;
- datos financieros existentes no cambian por añadir automatización.

## Definition of Done

### 1. Files changed

Principales:

```text
src/domain/rule-suggestions.ts
src/lib/quick-add-templates.ts
src/lib/saved-transaction-filters.ts
src/lib/transaction-rules.ts
src/lib/local-automation.ts
src/lib/backup-json.ts
tests/phase-16-7-hardening.test.ts
tests/roadmap-baseline.test.ts
```

Más regresiones históricas actualizadas al contrato JSON v12.

### 2. Schema changes

**Dexie:** ninguno. Permanece en **v14**.

**Backup JSON:** **v11 → v12**.

v12 añade únicamente `localAutomation`.

### 3. Migration behavior

No existe migración destructiva.

- Dexie no cambia.
- Rules legacy sin `applyAutomatically` siguen manuales.
- v3–v11 siguen importándose.
- v3–v11 preservan automatización local actual.
- v12 restaura explícitamente las tres capas locales.

### 4. Invariants affected

No se modifica ninguna invariante financiera.

Templates, filtros y Rules continúan fuera del ledger y no mueven dinero.

### 5. Tests added / hardened

`tests/phase-16-7-hardening.test.ts` cubre:

- política de precedencia;
- conflicto de Rules automáticas;
- orden manual estable;
- validación del bundle local;
- legacy manual por defecto;
- rechazo de duplicados/malformados;
- rollback de localStorage;
- ausencia de tablas Dexie para automatización;
- local-only y ausencia de IA.

`tests/roadmap-baseline.test.ts` cubre además:

- v4 legacy preservando automatización local;
- export v12;
- round-trip financiero + automatización;
- rechazo atómico de un v12 corrupto;
- mismos resultados financieros después del round-trip.

### 6. Known limitations

- CSV continúa siendo backup tabular financiero; no incluye Templates, Saved Filters ni Rules.
- La restauración completa de automatización corresponde al JSON v12.
- Las Rules siguen limitadas a `description contains` y categoría/necessity.
- No existe prioridad numérica ni merge automático de múltiples Rules.

### 7. Architectural concerns

No queda un bloqueo arquitectónico para Fase 17.

La automatización sigue separada del dominio financiero y de Dexie. El único contrato nuevo transversal es el bundle opcional de automatización dentro del backup completo.

## Gate técnico

GitHub Actions `Quality checks` run `36503687919` verificó:

- **339/339 pruebas**, 0 fallos;
- typecheck aprobado;
- lint con cero warnings;
- guard local-only aprobado;
- build de producción aprobado;
- manifiesto offline: **42 recursos**;
- `connect-src 'none'` en cada HTML generado.

El primer intento del gate detectó únicamente expectativas históricas fijadas a JSON v11 y una comparación de propiedades `undefined` eliminadas por serialización JSON. Se actualizaron esas regresiones al contrato v12 y el segundo gate pasó completo.

## Cierre

Las siete iteraciones acordadas quedan completadas:

```text
16.1 Contrato ✅
16.2 Motor determinista ✅
16.3 Suggestions ✅
16.4 Gestión ✅
16.5 Integración ✅
16.6 Apply automatically opcional ✅
16.7 Hardening + gate ✅
```

**Fase 16 — Automatización local queda completada.**

La siguiente fase canónica es **Fase 17 — Seguridad y privacidad local**.

Fase 17 no queda iniciada por este documento.
