# Fase 20.3 — Resumen / Home Prisma

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 20.

Estado: **completada / Gate 20.3 aprobado**.

Referencia visual: `Juno002/Prisma@dc4310040f42cefd74cf41bad75152902e549c24`.

## Objetivo

Migrar visualmente Resumen al lenguaje Prisma sin sustituir `selectHomeReadModel` ni introducir cálculos financieros nuevos en React.

```text
read models / selectors existentes
        ↓
selectHomeReadModel
        ↓
Resumen Prisma
```

No se importó lógica financiera ni datos demo desde el repositorio Prisma.

## Superficie migrada

Migrada en 20.3:

- Resumen / Home.

Aún no migradas:

- Movimientos y compositor global;
- Plan;
- Reportes;
- superficies secundarias de 20.7.

## Jerarquía visual

Resumen adopta:

- encabezado editorial Prisma;
- estado global de atención;
- posición financiera como bloque principal;
- presupuesto y próximos pagos como paneles centrales;
- metas e inversiones como paneles secundarios;
- dos columnas en desktop y una en móvil;
- cuatro métricas de posición en desktop y una columna en móvil.

La composición respeta el orden personalizado de módulos.

## Datos reales protegidos

La pantalla sigue consumiendo exclusivamente:

- `getReportSnapshot(currentPeriod, today)`;
- `getBudgetStatusDetails(currentMonth)`;
- planned occurrences existentes;
- recurring rules existentes;
- goals existentes;
- investments existentes;
- `selectHomeReadModel(...)`.

No se portaron desde Prisma:

- usuario demo “Alex”;
- fechas demo;
- porcentajes de tendencia hardcoded;
- presupuestos demo;
- categorías demo;
- movimientos demo;
- sparkline demo;
- cálculos financieros de `Home.tsx`.

## Paridad funcional

Conservado:

- disponible líquido;
- patrimonio neto;
- deuda;
- inversiones;
- presupuesto restante/gastado/estado;
- próximos pagos/ingresos;
- confirmar planificado;
- omitir planificado;
- metas relevantes;
- aportes requeridos derivados;
- vencimientos de inversiones;
- señales de atención;
- navegación contextual a cuentas, inversiones y Plan;
- Personalizar Home;
- orden, ocultación y sección inicial de módulos.

## Privacidad y renderers compartidos

Los importes siguen pasando por renderers compartidos:

- `MoneyValue`;
- `usePrivateCurrency`;
- `ProgressMetric`;
- `PlannedPaymentRow`;
- `StatusBadge`.

Hide amounts continúa funcionando sin crear una segunda ruta de render financiero.

## Arquitectura

No se añadió:

- Dexie directo en Home;
- acceso IndexedDB;
- fórmula de ledger;
- cálculo de patrimonio;
- cálculo de deuda;
- cálculo de presupuesto;
- cálculo de metas;
- cálculo de inversión;
- runtime remoto;
- tráfico financiero de red.

`src/domain/home.ts` no fue modificado en esta etapa.

## Gráficos

Home continúa sin gráficos analíticos por categoría.

```text
Home = status + action
Reports = analysis + exploration
```

Los gráficos reales siguen reservados para Reportes y serán tratados en 20.6.

## Browser E2E

El smoke E2E valida en Chrome/Chromium real:

1. shell desktop;
2. Home Prisma desktop;
3. module grid = 2 columnas;
4. position metrics = 4 columnas;
5. shell móvil;
6. Home Prisma móvil;
7. module grid = 1 columna;
8. position metrics = 1 columna;
9. retorno a desktop;
10. crear ingreso;
11. crear gasto;
12. abrir Movimientos;
13. verificar datos;
14. service worker;
15. recarga offline;
16. fallo ante requests HTTP(S) externos.

## Gate 20.3

```text
477/477 tests
npm run check ✅
npm run build ✅
npm run test:e2e ✅
Quality checks 36650050876 ✅
```

E2E:

```text
responsive shell
+ Prisma Home
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

- Movimientos conserva su capa visual anterior hasta 20.4.
- Plan conserva su capa visual anterior hasta 20.5.
- Reportes conserva su capa visual anterior hasta 20.6.
- El branding visible sigue siendo GlitchBudget Pro hasta 20.7.
- `serious` sigue intacto como tema legado.

Siguiente etapa autorizada tras merge y gate verde: **20.4 — Movimientos + compositor global**.
