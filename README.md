# 💰 GlitchBudget Pro

**GlitchBudget Pro** es una aplicación de finanzas personales moderna y potente, diseñada para ofrecer un control total sobre tu dinero. Construida con Next.js, React, ShadCN UI y Tailwind CSS, esta herramienta te permite planificar, registrar y analizar tus finanzas de una manera intuitiva y visual.

## ✨ Características Principales

- **Dashboard Interactivo:** Un resumen visual de tu salud financiera con KPIs clave adaptables a dispositivos móviles, gráficos de gastos y estado de tus presupuestos.
- **Estrategias de Ahorro Rápidas:** Alterna el objetivo de ahorro general entre un 0% (sin forzar), 5%, 10% o 20% con un solo toque desde tu resumen mensual.
- **Gestión de Ingresos:** Define tu ingreso base (sueldo) y registra fácilmente ingresos adicionales o regalos.
- **Planificación Inteligente:**
    - **Presupuestos por Categoría:** Asigna límites de gasto mensuales a diferentes categorías y observa tu progreso en tiempo real.
    - **Metas de Ahorro con Calculadora Inteligente:** Crea objetivos de ahorro y recibe sugerencias realistas basadas en tu capacidad financiera. La calculadora te ayuda a determinar cuotas mensuales, fechas estimadas y la viabilidad de tus planes.
- **Registro Detallado de Gastos:** Clasifica tus gastos como fijos, variables u ocasionales, y asígnalos a categorías para un seguimiento preciso.
- **Cierre de Mes Automatizado (Rollover):** Configura cómo se deben tratar los excedentes o déficits de tus presupuestos al pasar al siguiente mes.
- **Transferencias Flexibles:** Mueve fondos entre tus presupuestos de diferentes categorías a mitad de mes sin perder el control.
- **Reportes Detallados:** Analiza tus finanzas con tablas comparativas mensuales, desgloses por tipo de gasto y el estado de tus presupuestos.
- **Interfaz Limpia y Adaptable:** Diseño moderno con un enfoque **Mobile-First**, tipografía responsiva y componentes optimizados tanto para pantallas anchas como controles táctiles. Tema oscuro global.
- **IA Integrada (Google GenAI):** Recibe análisis detallados y consejos personalizados sobre tus reportes mensuales, progreso de metas y el impacto de transacciones individuales en tu presupuesto general utilizando el poder de Gemini y Firebase Genkit.
- **Glassmorphism UI:** Una experiencia visual sumamente premium con componentes translúcidos finamente trabajados, sombras dinámicas y gradientes de fondo fijos usando TailwindCSS (Next-gen UI design).
- **Interactividad Sonora (8-bit):** Respuestas táctiles y auditivas; escucha agradables tonos en síntesis retro (Web Audio API) generados sin dependencias al realizar ingresos, gastos, o cuando completas una meta de ahorro.
- **Persistencia de Datos:** Toda tu información se guarda de forma segura en el almacenamiento local de tu navegador.

## 🚀 Flujo de Usuario Principal

El diseño de la aplicación sigue un ciclo financiero lógico y fácil de seguir:

1.  **Define tus Ingresos (Pestaña "Ingresos"):**
    *   Establece tu **ingreso principal** (ej. salario mensual, quincenal o semanal).
    *   Añade cualquier **ingreso extra** que recibas durante el mes.

2.  **Planifica tu Mes (Pestaña "Planificación"):**
    *   **Crea tus Presupuestos:** Asigna un monto límite a cada categoría de gasto (Vivienda, Alimentación, etc.).
    *   **Define tus Metas de Ahorro:** Utiliza la calculadora inteligente para crear metas realistas. Define un objetivo y la app te sugerirá un plan, o introduce una fecha y te dirá cuánto necesitas ahorrar mensualmente.

3.  **Registra tus Gastos (Pestaña "Gastos"):**
    *   A medida que gastas, registra cada transacción, asignándola a su categoría correspondiente.
    *   El sistema descontará automáticamente el monto del presupuesto de esa categoría.

4.  **Analiza y Ajusta (Pestañas "Resumen" y "Reportes"):**
    *   En el **Resumen**, obtén una vista rápida de tu situación actual.
    *   En **Reportes**, profundiza en los detalles con tablas comparativas y desgloses.
    *   Si es necesario, vuelve a **Planificación** y usa la función de **transferencia** para mover dinero entre categorías.

## 🛠️ Configuración y Opciones

El menú de configuración (ícono de engranaje ⚙️) te permite personalizar tu experiencia:

- **Cambiar Tema:** Alterna entre los modos claro y oscuro.
- **Modo Estricto:** Bloquea el registro de un gasto si excede tu saldo disponible, ayudándote a no gastar más de lo que tienes.
- **Estrategia de Cierre de Mes:** Elige tu método de rollover preferido (Resetear, Acumular Sobrante o Acumular Deuda).
- **Exportar/Importar Datos:** Realiza copias de seguridad de toda tu información en formato JSON (plano o cifrado) y restáurala cuando lo necesites.
- **Backups Locales (OPFS):** Si tu navegador es compatible, podrás guardar y restaurar backups directamente en tu dispositivo para mayor comodidad.

## 🎯 Metas: Cómo Calcula la Calculadora Inteligente
La calculadora de metas te ayuda a crear planes de ahorro realistas.
- **Entrada:** Analiza tu objetivo, progreso actual, ingresos y gastos promedio, y opcionalmente, una fecha límite o cuotas deseadas.
- **Salida:** Te sugiere un aporte mensual, calcula la fecha estimada de finalización y te informa sobre la viabilidad del plan.
- **Análisis de Viabilidad:** Si el aporte mensual requerido para una fecha específica supera tu disponible, la calculadora te lo indicará y te sugerirá una nueva fecha o un nuevo monto de aporte que sí puedas cumplir.
- **Colchón de Seguridad:** La calculadora reserva un pequeño porcentaje de tus ingresos como un "colchón de seguridad" para no proponer planes que te dejen sin margen de maniobra.

## 💻 Tech Stack

- **Framework:** Next.js (con App Router)
- **UI:** React, ShadCN UI
- **Estilos:** Tailwind CSS
- **Estado Global y Base de Datos:** React Context + **Dexie.js (IndexedDB)**
- **Formularios & Validación:** React Hook Form + **Zod**
- **IA:** Genkit + Google GenAI (Firebase)
- **Audio:** Web Audio API (`window.AudioContext`)
- **Iconos:** Lucide React
- **Gráficos:** Recharts

Este proyecto fue desarrollado en colaboración con el asistente de IA de **Firebase Studio**.

## 🧩 Instalación
Requisitos: Node.js 20.x o superior.

1.  Clona el repositorio.
2.  Instala las dependencias:
    ```bash
    npm install
    ```
3.  Ejecuta el servidor de desarrollo:
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:9002`.

### 📦 Scripts Disponibles

-   `npm run dev`: Inicia la aplicación en modo de desarrollo con Turbopack.
-   `npm run build`: Compila la aplicación para producción.
-   `npm run start`: Inicia un servidor de producción con la compilación previamente generada.
-   `npm run lint`: Ejecuta el linter de Next.js para revisar el código.

## 🗂️ Estructura del Proyecto
```
src/
├── app/              # Páginas de la aplicación (App Router de Next.js)
├── components/       # Componentes de React (UI y lógica de presentación)
│   ├── dashboard/    # Componentes específicos de cada pestaña del dashboard
│   ├── layout/       # Componentes estructurales (Header, AppShell, etc.)
│   └── ui/           # Componentes base de ShadCN (Button, Card, Input, etc.)
├── contexts/         # Contextos de React para el estado global (FinanceContext, TabsContext)
├── hooks/            # Hooks personalizados (useLocalStorage, useToast)
├── lib/              # Lógica de negocio, tipos y utilidades
│   ├── categories.ts # Definición de categorías de ingresos y gastos
│   ├── goal-calculator.ts # Lógica pura para la calculadora de metas
│   ├── types.ts      # Definiciones de tipos de TypeScript
│   └── utils.ts      # Funciones de utilidad (formato de moneda, etc.)
└── public/           # Archivos estáticos (imágenes, logo, etc.)
```

## 🔐 Datos y Copias de Seguridad
- **Persistencia Local:** Todos tus datos financieros se guardan directamente en **IndexedDB** a través de Dexie.js. Esto significa que tu información es privada, persistente y robusta.
- **Exportar/Importar JSON:** Desde el menú de configuración (⚙️), puedes exportar todos tus datos a un archivo JSON. Puedes elegir cifrarlo con una contraseña para mayor seguridad.
- **Backups OPFS:** Si el navegador soporta el Origin Private File System, se habilitarán las opciones de "Guardar copia local" y "Restaurar" en los ajustes.
- **Nota Importante:** Haz backups regularmente usando la función de exportar, especialmente si planeas limpiar la caché de tu navegador o cambiar de equipo.

## 🧭 Roadmap

- [x] Reemplazar `LocalStorage` con **Dexie.js (IndexedDB)** para un manejo de datos más robusto y performante.
- [ ] Implementar **cifrado opcional** en los archivos de backup (CSV).
- [ ] Explorar la **sincronización opcional y opt-in** entre dispositivos a través de un backend seguro.
- [ ] Añadir **tests de regresión** para las funciones críticas (cálculos de metas, presupuestos, etc.).

## 🐞 Known Issues

- En raras ocasiones, los tooltips o popovers pueden no renderizarse correctamente debido a que el Service Worker cachea chunks de código antiguos. La solución es **limpiar la caché del sitio y desregistrar el Service Worker** desde las herramientas de desarrollador del navegador.
- Los componentes que utilizan `react-hook-form` (como los de la pestaña de Planificación) requieren ser **Client Components** (`'use client'`). Esto es una restricción del App Router de Next.js.
- Errores de "Hydration Mismatch" en componentes de gráficos se solucionan renderizándolos exclusivamente en el cliente usando `useEffect`.

## 📄 Licencia

Distribuido bajo la licencia MIT. Ver `LICENSE` para más información.

---
*La app usa IndexedDB con transacciones, guarda en centavos y valida formularios con Zod. Los errores muestran toasts explicativos. Si el navegador soporta OPFS, se habilitan ‘Guardar copia local’ y ‘Restaurar’ en Ajustes.*
