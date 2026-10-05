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

Rama: `reports-editorial-composition`. PR, archivos definitivos, regresiones, gates y merge SHA se completan con evidencia real al cerrar.

Hallazgos financieros fuera de alcance: ninguno confirmado en la auditoría inicial.
