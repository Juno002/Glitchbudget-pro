# 💰 GlitchBudget Pro

## Estado del roadmap

**Fase 16 — Automatización local en progreso.** El checkpoint **16.1 — Contrato de Rules** está completado: solo define reglas deterministas `description contains` que podrán sugerir categoría y/o Must/Need/Want. Aún no existe motor, UI, almacenamiento de rules ni aplicación automática. El gate verificó **306/306 pruebas**. Consulta el [checkpoint 16.1](docs/roadmap/phase-16-1.md), el [índice de documentación vigente](docs/roadmap/README.md) y la [fuente de verdad del roadmap](Roadmap%20septiembre%202026.txt).

**GlitchBudget Pro** es una aplicación de finanzas personales moderna y potente, diseñada para ofrecer un control total sobre tu dinero. Construida con Next.js, React, ShadCN UI y Tailwind CSS, esta herramienta te permite planificar, registrar y analizar tus finanzas de una manera intuitiva y visual.

## ✨ Características Principales

- **Home 2.0:** Read model compacto con Posición financiera, Presupuesto disponible, Próximos pagos, Metas relevantes e Inversiones. Puede mostrar/ocultar, reordenar y elegir una sección inicial sin alterar cálculos financieros.
- **Transaction Metadata + filtros:** Gastos pueden clasificarse como Must/Need/Want y usar etiquetas. El historial admite filtros combinables por tipo, cuenta, categoría, fecha, monto, necesidad y etiqueta, además de presets locales guardados.
- **Modo Minimalista ("Serious Mode"):** Una interfaz ultra-limpia, en escala de grises y sin distracciones para quienes prefieren un enfoque profesional y sobrio en sus finanzas.
- **Ahorro sugerido:** Configura 0%, 5%, 10% o 20% desde Ajustes → Finanzas como referencia de planificación; no mueve dinero.
- **Gestión de Ingresos:** Define tu ingreso base (sueldo) y registra fácilmente ingresos adicionales o regalos.
- **Planificación Inteligente:**
    - **Presupuestos por Categoría:** Asigna límites semanales, mensuales, anuales o de rango único. Cada presupuesto muestra límite, gastado, restante, porcentaje y estado sobre el mismo Period Engine.
    - **Metas de Ahorro:** Crea objetivos con plazo y aportes. El progreso se deriva del historial de aportes y el aporte mensual requerido se calcula con el restante, la fecha límite y el Period Engine.
- **Registro Detallado de Gastos:** Clasifica tus gastos como fijos, variables u ocasionales. Incluye soporte para **Tarjetas de Crédito** con seguimiento de deudas.
- **Tarjetas de Crédito:** Registra compras y pagos sin duplicar gasto; deuda y patrimonio usan el mismo ledger que Reportes.
- **Logros:** Reconocimientos consultables como capa secundaria, sin banners persistentes sobre la información financiera.
- **Rollover de Presupuestos:** Aplica la estrategia configurada a presupuestos semanales, mensuales y anuales; los rangos únicos no se repiten automáticamente.
- **Reasignación de Límites:** Redistribuye límite planificado entre categorías del mismo rango sin mover dinero real, saldos de cuentas ni movimientos del ledger.
- **Fundación de Moneda:** Moneda base explícita y moneda por cuenta. Fase 11 conserva todos los saldos existentes, no consulta FX remoto y bloquea operaciones que requerirían una conversión no definida.
- **Investments 1.0:** Certificados, depósitos a plazo e inversiones de rendimiento conocido se registran como activos no líquidos. El valor futuro se calcula localmente y se etiqueta como estimado; nunca se suma silenciosamente al patrimonio real.
- **Reports 2.0:** Analiza gasto, cash flow y patrimonio en 7D, 30D, 3M, 6M, 1Y o un rango personalizado. Incluye categorías, transacciones mayores, naturaleza del gasto y comparación con una ventana anterior comparable.
- **Personalización Extrema:** Elige entre más de **35 iconos financieros** para tus categorías personalizadas, con persistencia total en base de datos.
- **Interfaz Mobile-First:** Diseño optimizado para controles táctiles con **Tarjetas Expandibles** en lugar de tablas pesadas, eliminando el scroll horizontal innecesario.
- **Glassmorphism UI:** Una experiencia visual premium con componentes translúcidos, sombras dinámicas y gradientes finamente trabajados.
- **Interactividad Sonora (8-bit):** Respuestas auditivas retro (Web Audio API) al realizar registros financieros o completar metas.
- **Persistencia de Datos Local-First:** Toda tu información se guarda de forma segura en **Dexie (IndexedDB)** directamente en tu navegador.

## 🚀 Flujo de Usuario Principal

El diseño de la aplicación sigue un ciclo financiero lógico:

1. **Registra operaciones:** El botón global Nuevo movimiento abre el mismo compositor para ingresos, gastos y transferencias.
2. **Consulta Resumen:** Responde rápido cuánto tienes, cuánto debes, cuánto puedes gastar, qué viene y qué requiere atención.
3. **Consulta Movimientos:** Busca el historial real, combina filtros avanzados o reutiliza filtros guardados; cuentas y tarjetas quedan como gestión secundaria.
4. **Organiza Plan:** Presupuestos, Metas y Planificados.
5. **Analiza en Reportes:** Elige un rango y revisa Spending, Cash Flow, Net Worth, categorías, transacciones mayores y comparación con el rango anterior. Gestiona categorías y preferencias desde Ajustes.

## 🛠️ Configuración y Opciones

El menú de configuración (ícono de engranaje ⚙️) centraliza el control:

- **Cambiar Tema:** Alterna entre Claro, Oscuro y el modo **Serious**.
- **Gestión de Categorías:** Crea categorías personalizadas eligiendo un icono del catálogo de Lucide (Cine, Café, Viajes, etc.).
- **Modo Estricto:** Bloquea el registro de un gasto si excede tu saldo disponible.
- **Estrategia de Rollover:** (Resetear, Acumular Sobrante o Acumular Deuda).
- **Copia de Seguridad:** Exportar/Importar JSON sin cifrar y Backups locales vía **OPFS**.

## 💻 Tech Stack

- **Framework:** Next.js (App Router)
- **UI:** React, ShadCN UI, Tailwind CSS
- **Persistencia:** **Dexie.js (IndexedDB)**
- **Iconos:** Lucide React
- **Gráficos:** Recharts + D3 logic para flujos
- **Audio:** Web Audio API

## 🧩 Instalación

1.  Instala las dependencias: `npm install`
2.  Servidor de desarrollo: `npm run dev`
3.  La aplicación estará disponible en `http://localhost:9002` (o el puerto asignado).

## 🗂️ Estructura del Proyecto
```
src/
├── components/
│   ├── dashboard/    # Pestañas (Summary, Planning, Reports, Movements)
│   ├── layout/       # BottomNav, Header (Settings), AppShell
│   └── ui/           # Base de ShadCN + IconPicker
├── contexts/         # FinanceContext (Lógica de negocio y Dexie sync)
├── lib/              # types.ts, categories.ts, goal-calculator.ts
└── app/              # PWA Wrapper
```

---
*GlitchBudget Pro: Diseñado para el Monje Financiero moderno. Privacidad total con IndexedDB, cálculos en centavos y una interfaz que se siente viva.*

## Validación y datos locales

Requiere Node.js 22 o superior. Ejecuta `npm ci`, `npm run check` y `npm run build`. La compilación genera los recursos de uso sin conexión; primero abre la versión de producción con conexión y espera a que se instale. Una actualización se activa al cerrar las pestañas anteriores.

Los datos pertenecen al navegador y a la dirección donde abres la aplicación. No hay cuentas ni sincronización. Borrar los datos del sitio elimina también los respaldos locales: descarga periódicamente un JSON externo. Los respaldos no están cifrados.

La revisión de calidad y sus límites están documentados en `docs/quality-review.md`.

## Distribución estática (roadmap, fase 1)

Ejecuta `npm run build` y publica exclusivamente la carpeta `out/` en un hosting estático HTTPS, desde la raíz del dominio. No requiere Next en producción, rutas API ni variables de entorno. Para una vista previa local: `npm start -- --port 9011`. El servidor de vista previa solo escucha en este equipo.

El manifiesto offline se genera dentro de `out/` después de exportar. Publica toda la carpeta de forma atómica y sirve `sw.js`, `precache-manifest.js` y HTML con revalidación (Cache-Control: no-cache). Las fuentes se descargan durante el build con next/font y se incluyen en los archivos locales; el navegador no contacta Google Fonts.

`npm run check:local` forma parte del check de CI y rechaza primitivas de red, rutas de servidor y SDK remotos conocidos en el código de aplicación. No sustituye una auditoría de dependencias ni detecta código deliberadamente ofuscado.
