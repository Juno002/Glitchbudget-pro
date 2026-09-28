# GlitchBudget Pro

Aplicación de finanzas personales en español, con datos locales y distribución estática. Registra movimientos, sigue efectivo, bancos y tarjetas, organiza presupuestos y metas y consulta reportes sin conectar cuentas bancarias ni enviar datos financieros a servicios remotos.

## Estado del proyecto

**Fases 0–10 implementadas e integradas en main, incluida la fase 7.5.** Último cierre funcional: 28/09/2026, commit `60b50e9`, [PR #6](https://github.com/Juno002/Glitchbudget-pro/pull/6).

Ese cierre aprobó **259 pruebas**, tipos, lint, controles local-only y compilación estática. [GitHub Actions #346](https://github.com/Juno002/Glitchbudget-pro/actions/runs/36432350509) confirmó las comprobaciones. Son resultados del cierre funcional, no una certificación comercial ni garantía de ausencia de errores.

- [Todas las fases, contratos, migraciones y evidencia](docs/roadmap/README.md).
- [Fase 9: presupuestos](docs/roadmap/phase-9.md) y [Fase 10: metas](docs/roadmap/phase-10.md).
- [QA pendiente para publicación](docs/release-checklist.md).
- Siguiente fase prevista: **11 — Currency foundation**, todavía no iniciada.

## Funcionalidad actual

| Área | Qué permite hacer |
| --- | --- |
| Resumen | Consultar posición financiera, presupuestos restantes, próximos pagos, metas activas y movimientos recientes. |
| Movimientos | Buscar y filtrar el historial real; consultar y gestionar cuentas y tarjetas como actividad secundaria. |
| Plan → Presupuestos | Crear límites semanales, mensuales, anuales y únicos; consultar gastado, restante, porcentaje y estado; reasignar límites y aplicar rollover. |
| Plan → Metas | Crear y editar objetivos, plazos y cuotas; aportar; consultar progreso y aporte mensual requerido según el calendario financiero. |
| Plan → Planificados | Reglas semanales, cada 14 días y mensuales; ocurrencias pendientes, confirmadas, omitidas y vencidas. Confirmar genera un único movimiento real. |
| Reportes | Analizar actividad registrada, categorías, comparaciones por período y los cuatro tipos de presupuesto. |
| Nuevo movimiento | Compositor único para ingreso, gasto o transferencia, detalles secundarios y plantillas locales. |
| Ajustes | Temas claro, oscuro y minimalista; categorías estables, calendario financiero, políticas de cuenta y presupuesto, privacidad visual y respaldos. |

Efectivo es la cuenta predeterminada; puede elegirse explícitamente otra cuenta admitida por el flujo. Las transferencias entre cuentas no se registran como nuevos ingresos o gastos. El botón de nuevo movimiento está disponible desde las cuatro áreas.

## Semántica financiera

Los importes persistidos son centavos enteros. El dinero real se distingue de la planificación:

- **Disponible líquido:** efectivo más bancos registrados; excluye crédito disponible y sueldos previstos.
- **Patrimonio registrado:** disponible líquido más saldo a favor de tarjetas menos deuda de tarjetas.
- **Resultado del período:** ingresos registrados menos gastos/compras, incluidas las compras con tarjeta.
- **Flujo de efectivo:** ingresos registrados menos gastos pagados desde cuentas y pagos de tarjeta; no equivale al saldo de cuentas.
- **Presupuestos y metas:** límites y reservas de planificación. Reasignar límites o aportar a una meta no mueve dinero entre cuentas.
- **Planificados:** no afectan saldos hasta confirmarse. Los saldos iniciales no son ingresos mensuales.

La protección contra saldos negativos y la política presupuestaria son independientes. El exceso de presupuesto puede permitirse, requerir confirmación o bloquearse. El antiguo `strictMode` se interpreta mediante un adaptador de compatibilidad.

El mes financiero puede comenzar entre los días 1 y 31; los días inexistentes se ajustan al último día válido. Los límites semanales y anuales conservan su propio calendario.

## Datos y respaldos

- Persistencia financiera: IndexedDB mediante **Dexie v12**.
- Respaldo financiero: **JSON v8**, con lectura compatible de v3–v7 y validación previa al reemplazo.
- Las metas derivan su progreso de aportes. La migración conserva el avance heredado sin contarlo como una nueva reserva mensual.
- CSV intercambia tablas; conserva rangos presupuestarios y tipos de aporte. Un CSV antiguo de metas con progreso ambiguo se rechaza indicando usar el JSON completo para evitar duplicación.
- Las plantillas de Quick Add viven en localStorage y **no están incluidas en el JSON financiero**. El JSON tampoco copia íntegramente preferencias/logros de otros almacenamientos ni archivos OPFS.
- Los respaldos no están cifrados. Ocultar importes es privacidad visual, no autenticación ni cifrado.

Los datos pertenecen al navegador y al origen (protocolo, dominio y puerto). No hay inicio de sesión ni sincronización en la nube. Borrar los datos del sitio puede eliminar también los respaldos locales: conserva un JSON descargado fuera del navegador. Cambiar de origen requiere exportar e importar.

## Desarrollo y validación

Requiere **Node.js 22 o superior** y npm.

```sh
npm ci
npm run dev
```

Desarrollo: http://localhost:9002. Para validar y previsualizar producción:

```sh
npm run check
npm run build
npm start -- --port 9011
```

`check` ejecuta guard local-only, TypeScript, ESLint y pruebas. `build` exporta a `out/`, genera el precaché y verifica la CSP y ausencia de rutas de diagnóstico. Las pruebas usan datos sintéticos y fake-indexeddb para comprobar migraciones, respaldos, cálculos, concurrencia y políticas.

## Distribución y uso sin conexión

Publica solo **out/** en hosting estático HTTPS desde la raíz del dominio. No requiere servidor Next, rutas API ni variables de entorno en producción. Publica toda la carpeta de forma atómica y sirve HTML, `sw.js` y `precache-manifest.js` con revalidación (`Cache-Control: no-cache`).

La primera carga y las actualizaciones descargan recursos estáticos. Tras instalarse el service worker, la app funciona sin conexión. Una actualización se activa al cerrar las pestañas anteriores; no fuerza la recarga de formularios abiertos. Las fuentes se descargan durante el build y se sirven localmente al navegador.

La CSP mantiene `connect-src 'none'`. El guard local-only detecta primitivas de red y servicios remotos conocidos; no sustituye una auditoría integral de dependencias o seguridad.

## Estructura

```text
src/
├── app/                 # App Router y exportación estática
├── components/
│   ├── dashboard/       # Áreas financieras y compositor
│   ├── finance-ui/      # Patrones financieros compartidos
│   ├── layout/          # Navegación, cabecera y ajustes
│   └── ui/              # Controles base
├── contexts/            # Estado reactivo y coordinación
├── domain/              # Ledger, métricas, períodos, categorías y metas
├── policies/            # Protección de cuentas y exceso presupuestario
├── lib/                 # Persistencia, servicios y respaldos
└── hooks/               # Comportamientos reutilizables
tests/                   # Regresiones y fixtures históricos
scripts/                 # Servidor estático, precaché y verificadores
docs/roadmap/            # Cierres por fase y estado vigente
docs/ux/                 # Arquitectura y contrato visual
```

Tecnologías principales: Next.js, React, TypeScript, Tailwind CSS, Radix/shadcn, Dexie, Recharts y Lucide.

## Qué falta

Las fases **11–19 siguen pendientes**, desde monedas e inversiones hasta reportes avanzados, automatización, seguridad, Backup 2.0 y cierre de deuda técnica. Sus objetivos están en el [roadmap original](Roadmap%20septiembre%202026.txt); no son funciones ya disponibles.

Para publicación comercial queda ejecutar la matriz física Android/iOS, teclado, accesibilidad y respaldo/restauración en los navegadores elegidos, además de definir distribución, soporte y condiciones del producto. Consulta el [checklist de publicación](docs/release-checklist.md).
