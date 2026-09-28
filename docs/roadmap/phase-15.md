# Fase 15 — Transaction Metadata + filtros

Fuente de verdad: `Roadmap septiembre 2026.txt`, Fase 15.

Estado: **completada técnicamente**.

## Objetivo

Añadir metadata ligera a movimientos reales y convertir Movimientos en una superficie de búsqueda/filtro más potente, sin introducir todavía automatización local ni almacenamiento de archivos.

## Metadata

### Gastos

Campo opcional:

```ts
necessity?: 'must' | 'need' | 'want'
```

Etiquetas opcionales:

```ts
labels?: string[]
```

### Ingresos

Los ingresos admiten:

```ts
labels?: string[]
```

`necessity` se aplica únicamente a gastos porque Must / Need / Want clasifica necesidad de consumo, no origen del ingreso.

Las etiquetas:

- se recortan;
- colapsan espacios internos;
- se deduplican sin distinguir mayúsculas;
- permiten hasta 12 valores;
- permiten hasta 40 caracteres por etiqueta;
- permanecen ausentes cuando no hay metadata, para no reescribir movimientos históricos con arrays vacíos.

## Quick Add / edición

La metadata vive dentro de **Más detalles**, por lo que el flujo rápido principal sigue siendo:

```text
Amount
Type
Account
Category
Save
```

Para gastos se puede elegir:

- Must · imprescindible;
- Need · necesario;
- Want · deseo;
- Sin clasificar.

Ingresos y gastos admiten etiquetas separadas por comas.

Las plantillas existentes pueden conservar `necessity` y `labels`; esto solo reutiliza metadata explícita y no constituye una regla automática.

## Filtros

Motor puro:

```text
src/domain/transaction-filters.ts
```

Filtros admitidos:

```text
account
category
dateStart / dateEnd
amountMin / amountMax
necessity
label
type
```

Tipos filtrables:

- income;
- expense;
- transfer;
- payment;
- saving;
- opening.

La búsqueda textual existente permanece separada del contrato de filtros guardados.

## Filtros guardados

Contrato local:

```text
src/lib/saved-transaction-filters.ts
glitchbudget_saved_transaction_filters_v1
```

Se pueden guardar hasta 20 filtros nombrados.

Los filtros guardados:

- viven solo en `localStorage`;
- no entran en Dexie;
- no entran en JSON backup;
- normalizan valores inválidos al cargarse;
- se eliminan al usar “Borrar todos los datos”;
- no guardan la búsqueda textual libre.

Al aplicar/restablecer un filtro guardado se limpia la búsqueda libre para evitar restricciones invisibles.

## Persistencia

### Dexie

Fase 15 **no cambia el esquema**:

```text
Dexie v14
```

`necessity` y `labels` son campos opcionales no indexados, por lo que no requieren una migración de Dexie.

### Backup JSON

Contrato canónico actual:

```text
JSON v11
```

v11 añade metadata opcional a ingresos/gastos y mantiene lectura de v3–v10.

Un backup v10 o anterior importa sin inventar metadata.

### CSV

Los CSV actuales incluyen:

- `necessity` en gastos;
- `labels` en ingresos y gastos.

Las etiquetas se serializan como lista JSON dentro de la celda CSV para evitar ambigüedad con comas de CSV. Los CSV legacy siguen siendo válidos porque las nuevas columnas son opcionales.

## UI de Movimientos

El historial abre por defecto en el mes activo, expresado ahora como un rango de fechas real.

Se puede filtrar por:

- tipo;
- cuenta;
- categoría;
- necesidad;
- desde/hasta;
- monto mínimo/máximo;
- etiqueta.

Los movimientos muestran badges compactos para:

- Fijo;
- Must / Need / Want;
- hasta dos etiquetas visibles.

## Fuera de alcance

Fase 15 no añade:

- ubicación;
- garantías;
- loyalty cards;
- receipts;
- reglas automáticas;
- IA;
- transmisión de descripciones.

Receipts siguen bloqueados hasta existir una estrategia explícita para archivos OPFS + export/import + cifrado.

Rules pertenecen a Fase 16.

## Pruebas específicas

`tests/phase-15-transaction-metadata.test.ts` cubre:

- normalización y deduplicación de labels;
- persistencia de necessity/labels por servicios reales;
- los siete ejes de filtro del roadmap;
- filtros guardados locales;
- metadata en Quick Add templates;
- JSON v11 + compatibilidad v10;
- CSV metadata;
- presencia de controles UI;
- ausencia de campos fuera de alcance.

## Gate técnico

El gate de implementación `Quality checks` run `36471585078` verificó:

- **300/300 pruebas**, 0 fallos;
- typecheck aprobado;
- lint con cero warnings;
- guard local-only aprobado;
- build de producción aprobado;
- manifiesto offline: **42 recursos**;
- `connect-src 'none'` en cada HTML generado.

**Fase 16 — Automatización local no se inicia automáticamente.**
