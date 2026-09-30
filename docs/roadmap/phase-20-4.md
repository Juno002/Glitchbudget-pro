# Fase 20.4 — Movimientos + compositor global Prisma

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 20.

Estado: **completada / Gate 20.4 aprobado**.

Referencia visual: `Juno002/Prisma@dc4310040f42cefd74cf41bad75152902e549c24`.

## Objetivo

Migrar la superficie de actividad real y el compositor global al lenguaje Prisma sin crear una segunda ruta financiera.

```text
Movimientos / Quick Add Prisma
        ↓
useFinances / queries existentes
        ↓
commands / services
        ↓
domain
        ↓
Dexie local
```

No se importó lógica financiera, persistencia ni datos demo desde el repositorio Prisma.

## Superficies migradas

Migradas visualmente en 20.4:

- historial de Movimientos;
- búsqueda;
- filtros;
- filtros guardados;
- metadata de movimientos;
- Quick Add;
- Templates;
- sugerencias de Rules;
- gestión local de Rules;
- compositor de gasto / ingreso / transferencia;
- cuentas como gestión secundaria;
- tarjetas/deuda como gestión secundaria;
- diálogos de movimiento, cuentas, transferencias, tarjetas y pagos;
- confirmaciones destructivas existentes.

La ruta heredada `/transactions` no mantiene una segunda implementación: sigue reexportando `MovementsView`.

## Historial y filtros

La superficie Prisma mantiene todos los criterios existentes:

- tipo;
- cuenta;
- categoría;
- necesidad;
- fecha desde/hasta;
- monto mínimo/máximo;
- etiqueta;
- búsqueda textual;
- saved filters locales.

La jerarquía visual ahora prioriza:

```text
búsqueda + tipo + filtro guardado
        ↓
filtros avanzados
        ↓
historial
```

No se eliminó metadata. Las filas siguen mostrando naturaleza fija, necesidad y etiquetas cuando corresponda.

## Compositor global

`TransactionModal` continúa siendo el único compositor para:

- gasto;
- ingreso;
- transferencia.

Se conserva el flujo principal:

```text
amount
→ type
→ account
→ category
→ save
```

y `Más detalles` mantiene:

- fecha;
- concepto/descripción/nota;
- necesidad;
- etiquetas;
- naturaleza;
- método de pago;
- tarjeta;
- tipo de ingreso;
- guardado como plantilla.

## Mutaciones protegidas

La migración visual no cambió las APIs de mutación.

El compositor sigue usando:

- `addExpense`;
- `updateExpense`;
- `deleteExpense`;
- `addIncomeItem`;
- `updateIncomeItem`;
- `deleteIncomeItem`;
- `addAccountTransfer`.

Por tanto, 20.4 no introduce una ruta paralela de creación, edición o eliminación.

## Templates y Rules

Se conserva:

- `loadQuickAddTemplates(window.localStorage)`;
- `upsertQuickAddTemplate(...)`;
- eliminación local de templates;
- `loadTransactionRules(window.localStorage)`;
- evaluación local de Rules;
- sugerencias manuales;
- aplicación automática explícita por regla;
- resolución conservadora de conflictos.

Templates, saved filters y Rules continúan fuera de las tablas financieras de Dexie.

## Cuentas y tarjetas

La gestión sigue siendo secundaria dentro de Movimientos.

Cuentas continúa consumiendo:

- `selectAccountOverviewReadModel`;
- queries existentes;
- `useAccountManagement`.

Tarjetas continúa consumiendo:

- `selectCardReadModel`;
- mutaciones existentes de deuda/pagos.

No se añadió una quinta pestaña principal ni un destino independiente de navegación.

## Sonidos, animaciones y warnings

No se eliminó ni sustituyó:

- feedback/motion del compositor;
- animación de guardado;
- sonidos existentes de ingreso/gasto;
- budget warning;
- reglas de crédito;
- validación canónica en services;
- transaction automation.

La fase modificó la capa visual, no esos contratos.

## Arquitectura

No se añadió:

- Dexie directo a Movimientos o Quick Add;
- acceso IndexedDB nuevo en UI;
- fórmula financiera nueva;
- cálculo de saldo nuevo;
- cálculo de deuda nuevo;
- runtime remoto;
- tráfico financiero de red;
- datos financieros hardcoded de Prisma.

## Browser E2E

El smoke E2E valida en Chrome/Chromium real:

1. shell Prisma desktop/móvil;
2. Home Prisma;
3. abrir compositor global Prisma;
4. crear ingreso real;
5. abrir compositor global Prisma de nuevo;
6. crear gasto real;
7. abrir Movimientos;
8. detectar superficie Prisma;
9. detectar barra de búsqueda/filtros;
10. detectar panel avanzado;
11. verificar historial con datos creados;
12. service worker;
13. recarga offline;
14. fallo ante requests HTTP(S) externos.

## Gate 20.4

```text
483/483 tests
npm run check ✅
npm run build ✅
npm run test:e2e ✅
Quality checks 36660263082 ✅
```

E2E:

```text
responsive shell
+ Prisma Home
+ Prisma Movimientos/composer
+ movement mutation
+ navigation
+ offline reload
✅
```

## Persistencia

Sin cambios:

```text
Dexie v14
Backup JSON v13
Encrypted envelope v1
```

No hubo migración de schema ni cambio de formato de backup.

## Riesgos / límites

- Plan conserva su capa visual anterior hasta 20.5.
- Reportes conserva su capa visual anterior hasta 20.6.
- Inversiones y el barrido final de superficies secundarias permanecen para 20.7.
- El branding visible sigue siendo GlitchBudget Pro hasta 20.7.
- `serious` sigue intacto como tema legado.

Siguiente etapa autorizada tras merge y gate verde: **20.5 — Plan Prisma**.
