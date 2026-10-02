<p align="center">
  <img src="public/logo.svg" alt="Prisma" width="88" />
</p>

<h1 align="center">Prisma</h1>

<p align="center"><strong>Finanzas personales claras, privadas y disponibles incluso sin conexión.</strong></p>

Prisma es una aplicación local-first de finanzas personales para registrar dinero real, planificar lo que viene y entender tu posición sin depender de una cuenta remota. Reúne movimientos, presupuestos, metas, deudas, inversiones y reportes en una sola experiencia.

Está pensada para responder rápido tres preguntas: **qué tienes**, **qué viene** y **qué necesita atención**, sin convertir cada pantalla en una hoja de cálculo.

## Tu dinero en cuatro espacios

### Resumen

Una vista compacta de tu posición financiera: disponible líquido, deuda, patrimonio neto, presupuesto restante, próximos movimientos, metas, inversiones y actividad reciente.

### Movimientos

El lugar para registrar y consultar ingresos, gastos, transferencias y pagos de deuda. Incluye búsqueda, filtros guardados, etiquetas, plantillas, reglas locales y gestión de cuentas y tarjetas.

### Plan

Separa las decisiones futuras del dinero ya movido. Aquí viven:

- **Presupuestos**, con límites por período y seguimiento de lo restante.
- **Metas**, con aportes y progreso.
- **Planificados**, para pagos y cobros recurrentes que pueden confirmarse, omitirse o quedar pendientes.

### Reportes

Analiza gastos, flujo de caja, patrimonio neto, categorías y comparaciones entre períodos. Los rangos rápidos y personalizados permiten cambiar de escala sin perder el contexto.

**Lectura rápida** destaca hasta tres señales relevantes del período usando reglas locales y deterministas; no envía tus movimientos a un servicio externo.

## Cuentas, tarjetas e inversiones

Prisma distingue entre efectivo, cuentas bancarias, tarjetas y activos de inversión para evitar mezclar conceptos diferentes.

- Una compra con tarjeta cuenta como gasto y aumenta la deuda, pero no reduce tu efectivo hasta que pagas la tarjeta.
- Una transferencia mueve dinero entre cuentas sin convertirse en ingreso ni gasto.
- Una inversión financiada desde una cuenta mueve patrimonio líquido a patrimonio invertido.
- Las proyecciones de rendimiento se mantienen separadas del patrimonio real.

## Privado por diseño

Tus datos financieros permanecen en tu dispositivo.

- No necesitas una cuenta de Prisma.
- No hay sincronización bancaria ni sincronización financiera remota.
- La aplicación puede seguir funcionando sin conexión después de cargarse.
- **Ocultar importes** protege la información en pantalla.
- **App Lock** y el bloqueo automático añaden una barrera de acceso a la interfaz.

App Lock protege el acceso a la **interfaz de Prisma**. No cifra Dexie en reposo, no protege por sí solo archivos exportados ni impide el acceso de alguien que ya controle los archivos o herramientas del dispositivo. El contrato técnico y sus límites están definidos en [`src/domain/local-security.ts`](src/domain/local-security.ts).

## Desarrollo

Prisma requiere **Node.js 22 o superior**.

```bash
npm ci
npm run dev
```

Antes de proponer cambios, ejecuta la comprobación local principal:

```bash
npm run check
```

El CI completa además el benchmark del ledger, el build de producción y el E2E.

## Nombre público y compatibilidad interna

**Prisma** es el nombre público del producto.

**GlitchBudget** sigue siendo una identidad interna y de compatibilidad histórica en lugares donde renombrarla rompería datos o copias existentes, por ejemplo nombres de base de datos, claves de almacenamiento y formatos/versiones de backup. Esos identificadores no deben cambiarse solo por razones de branding.

## Copias y recuperación

Puedes crear copias JSON para conservar o trasladar tus datos y, cuando quieras una capa adicional de protección para el archivo exportado, crear una **copia cifrada con contraseña**.

Antes de una importación, Prisma puede generar una copia local de seguridad cuando el navegador ofrece el almacenamiento necesario.

## Modo Prisma y Modo Neón

**Modo Prisma** es la experiencia clara principal: fondos cálidos, verde profundo, jerarquía tipográfica limpia y acentos coral/salvia.

**Modo Neón** ofrece la misma información y las mismas funciones en una presentación oscura y luminosa.

El cambio de tema no cambia tus datos ni tus cálculos.

## Detalles que acompañan sin estorbar

Prisma utiliza microinteracciones, sonido opcional, feedback de estado y movimiento breve para confirmar acciones sin convertir la interfaz en una distracción. También respeta la preferencia del sistema para reducir movimiento.

---

**Prisma** pone el control financiero cerca de ti: datos locales, planificación separada del dinero real y análisis suficientemente claro para decidir qué hacer después.
