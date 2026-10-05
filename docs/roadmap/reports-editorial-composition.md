# Reportes — composición editorial final

Autorización: 5 de octubre de 2026. Corrección visual posterior; 20.6 y Final UI Polish permanecen cerrados. No crea una fase nueva.

## Auditoría inicial

Base inspeccionada: `main@d06759c6192bec7e91c2ecaad017782bcb19b35d`.
Referencia visual: `Juno002/Prisma@dc4310040f42cefd74cf41bad75152902e549c24`, únicamente `ReportsView` y su CSS.

Ya resuelto en main:

- insight principal jerarquizado, copy determinista y todos los insights canónicos;
- dona con leyenda propia, top 4 + Otros exacto y mayor resto a una decimal;
- tendencia canónica con cobertura parcial y sin gráfico para una sola ventana;
- análisis detallado cerrado por defecto y cuatro tablas exactas bajo demanda;
- seis rangos, privacidad y estructura local/offline.

Problemas visuales confirmados:

- controles de rango dentro de una card completa y separados del contexto temporal;
- gasto en una card neutra con cifra, cambio, comparable y tendencia apilados;
- lectura, categoría y comparación usan la misma superficie, borde y ritmo;
- leyenda fragmentada por bordes individuales;
- comparación y barras con ejes/grid/leyenda genéricos y valores dependientes de tooltip;
- cash flow y patrimonio como cuatro/cinco MetricCard de igual peso;
- movimientos como tabla estrecha en móvil y presupuestos como filas administrativas.

## Composición autorizada

Período → hero de gasto + cambio + tendencia → insight principal cálido → evidencia de categorías/comparación → auditoría opcional.

En la auditoría: tablas exactas, naturaleza del gasto, ecuaciones de cash flow/patrimonio, movimientos expresivos y contexto de presupuestos con acceso a Plan.

Los valores originales se presentan sin agregarlos. La geometría puede convertir valores en posiciones/anchos; no produce importes, diferencias, porcentajes financieros ni resultados contables.

## Invariantes

Sin cambios en dominio, queries/selectors, `getReportSnapshot`, definiciones de Spending/Cash Flow/Net Worth, comparación, períodos comparables, presupuestos, deuda, préstamos, inversiones, categorías, persistencia, schema, migraciones, backup, red ni offline. Mantener todos los datos, copy de limitaciones reales, privacidad, accesibilidad y reduced motion.

## Registro de ejecución

Rama: `reports-editorial-composition-final`, desde el main auditado. La rama de ejemplo y PR #126 ya existían; se conservan intactas. PR y merge SHA de esta intervención se completan al cerrar.

Hallazgos financieros fuera de alcance: ninguno confirmado en la auditoría inicial.

## Antes / después

| Antes | Después |
| --- | --- |
| Card de rango independiente | Período junto al título y seis controles contextuales; fechas Custom bajo demanda |
| Gasto neutro y tendencia apilada | Una composición protagonista verde: cifra, cambio, comparable y tendencia integrada |
| Superficies homogéneas | Lectura cálida con un titular principal, categorías neutras y comparación directamente sobre la página |
| Leyenda fragmentada y gráficos genéricos | Dona/leyenda compactas; valores, diferencias y porcentajes canónicos visibles junto a barras silenciosas |
| KPI equivalentes de flujo/patrimonio | Términos de ecuación y resultado dominante suministrado por el snapshot |
| Tabla estrecha de movimientos | Lista móvil con TransactionRow, concepto completo, metadata y monto; tabla exacta en escritorio |
| Presupuestos administrativos | Contexto breve del mes actual, estado canónico y acción a Plan |

## Archivos de producto

- `src/components/dashboard/reports-tab.tsx`
- `src/components/dashboard/report-range-controls.tsx`
- `src/components/dashboard/charts/report-charts.tsx`
- `src/lib/report-visualization.ts`: geometría firmada de barras; proyección de categorías existente intacta.
- `src/lib/report-formatting.ts`: formato compacto de fechas civiles, sin cambiar rangos.
- `src/app/globals.css`: estilos limitados a la composición de Reportes, con tokens de Prisma/Neón.

## Regresiones y documentación

- Nuevos: `tests/reports-editorial-composition.test.ts`, `tests/fixtures/reports-editorial-composition.json`, `scripts/reports-editorial-verification.mjs`.
- Actualizados: `tests/final-ui-polish-p0.test.ts`, `tests/final-ui-polish-p2.test.ts`, `tests/final-ui-polish-p5.test.ts`, `tests/final-ui-polish-p7.test.ts`, `tests/phase-20-6-reports.test.ts`, `tests/phase-20-7-5-3-debt-normalization.test.ts`, `tests/phase-20-8-6-reports-hierarchy.test.ts`, `tests/phase-20-9-6-visible-language.test.ts`, `tests/phase-20-9-8-mobile-accessibility.test.ts`, `tests/phase-7.5-roadmap.test.ts`.
- E2E actualizado: `scripts/e2e-smoke.mjs`, `scripts/final-ui-polish-p0-baseline.mjs`, `scripts/final-ui-polish-p2-verification.mjs`, `scripts/final-ui-polish-p3-verification.mjs`.
- Documentación: este documento, `docs/roadmap/Roadmap septiembre 2026.txt` y `docs/roadmap/final-ui-polish.md`.

Ocho regresiones nuevas protegen apertura, jerarquía, categorías/comparación, ecuaciones, auditoría/movimientos, privacidad/invariantes, geometría firmada y un fixture contrastado contra el selector canónico intacto. Los tests antiguos se adaptan al orden expresamente autorizado y a los nuevos bindings visuales, sin retirar la caracterización financiera. El fixture vive solo en tests; no se incorpora a la aplicación.

El verificador nuevo recorre 320/360/390/1280 px × Prisma/Neón × importes visibles/ocultos × detalle cerrado/abierto. Comprueba geometría, targets de 44 px, ranking canónico, Otros, comparación, ecuaciones, saldo positivo de tarjetas, metadata móvil, árbol accesible privado, teclado, Custom, reduced motion y restauración exacta del dataset aislado de prueba.

## Validación y límites del entorno local

- Suite completa equivalente mediante `node --import tsx --test tests/*.test.ts`: **817/817**, 0 fallos.
- Verificación de navegador de esta composición: **32/32 combinaciones**, privacidad visual/AX, Otros, ecuaciones, movimientos, teclado y reduced motion aprobados. Dataset original restaurado exactamente.
- `npm run build`: aprobado; export estático, 45 recursos y guard de red `connect-src 'none'` conservados.
- Los comandos exactos `npm run check` y ambos benchmarks no pueden terminar en este executor: la CLI de tsx intenta abrir un socket Unix, rechazado por el entorno con `EPERM`. Check completó previamente guard local-only, typecheck y lint. Se ejecutan las mismas suites/scripts mediante el loader nativo, sin modificar scripts ni thresholds del repositorio.
- Benchmark ledger por loader nativo: aprobado; medianas 50k de posición 62.501982 ms e historiales 51.145766 ms.
- Benchmark reports por loader nativo: **18 mediciones**, `gatePassed: true`; ratios 50k ≤0.539 frente al baseline ≤2×.
- El smoke completo local con Chromium disponible reproduce un overflow de Home a 320 px antes de Reportes, también presente al ejecutar main sin estos cambios. No se modifica Home en esta intervención. El Quality checks del main exacto auditado está aprobado en GitHub; el resultado local no se presenta como un gate verde.
- Antes de integrar se requieren los cinco comandos exactos verdes en GitHub Quality checks sobre el HEAD de esta PR. Registro definitivo pendiente de esa ejecución.

Sin cambios en `src/domain/**`, `src/application/**`, engine, context/selectors, `src/lib/report-editorial.ts`, persistencia, dependencias, scripts npm ni workflow. La aritmética nueva produce solo geometría o tamaño tipográfico sobre strings formateados; los resultados y porcentajes financieros se reciben ya calculados.
