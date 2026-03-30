# 💰 GlitchBudget Pro

**GlitchBudget Pro** es una aplicación de finanzas personales moderna y potente, diseñada para ofrecer un control total sobre tu dinero. Construida con Next.js, React, ShadCN UI y Tailwind CSS, esta herramienta te permite planificar, registrar y analizar tus finanzas de una manera intuitiva y visual.

## ✨ Características Principales

- **Dashboard Interactivo:** Un resumen visual de tu salud financiera con KPIs clave adaptables a dispositivos móviles, gráficos de gastos y estado de tus presupuestos.
- **Modo Minimalista ("Serious Mode"):** Una interfaz ultra-limpia, en escala de grises y sin distracciones para quienes prefieren un enfoque profesional y sobrio en sus finanzas.
- **Estrategias de Ahorro Rápidas:** Alterna el objetivo de ahorro general entre un 0% (sin forzar), 5%, 10% o 20% con un solo toque desde tu resumen mensual.
- **Gestión de Ingresos:** Define tu ingreso base (sueldo) y registra fácilmente ingresos adicionales o regalos.
- **Planificación Inteligente:**
    - **Presupuestos por Categoría:** Asigna límites de gasto mensuales a diferentes categorías y observa tu progreso en tiempo real con iconos personalizados.
    - **Metas de Ahorro con Calculadora Inteligente:** Crea objetivos de ahorro y recibe sugerencias realistas basadas en tu capacidad financiera.
- **Registro Detallado de Gastos:** Clasifica tus gastos como fijos, variables u ocasionales. Incluye soporte para **Tarjetas de Crédito** con seguimiento de deudas.
- **Reportes de Crédito Avanzados:** Visualiza el estado de tus tarjetas, días restantes para el corte y fechas de pago de forma automática.
- **Gamificación & Logros:** Sistema de logros persistentes como el modo **"Monje Financiero"**, que premia la disciplina extrema (gastos < 20% de ingresos) con banners dinámicos.
- **Cierre de Mes Automatizado (Rollover):** Configura cómo se deben tratar los excedentes o déficits de tus presupuestos al pasar al siguiente mes.
- **Transferencias Flexibles:** Mueve fondos entre tus presupuestos de diferentes categorías a mitad de mes.
- **Reportes Visuales:** Gráficos Sankey, Donas y barras comparativas con bordes dinámicos que se adaptan automáticamente a cualquier tema visual.
- **Personalización Extrema:** Elige entre más de **35 iconos financieros** para tus categorías personalizadas, con persistencia total en base de datos.
- **Interfaz Mobile-First:** Diseño optimizado para controles táctiles con **Tarjetas Expandibles** en lugar de tablas pesadas, eliminando el scroll horizontal innecesario.
- **IA Integrada (Opcional):** Análisis bajo demanda de tus finanzas (Gemini) para evitar consumo excesivo de tokens y ofrecer valor real cuando lo solicites.
- **Glassmorphism UI:** Una experiencia visual premium con componentes translúcidos, sombras dinámicas y gradientes finamente trabajados.
- **Interactividad Sonora (8-bit):** Respuestas auditivas retro (Web Audio API) al realizar registros financieros o completar metas.
- **Persistencia de Datos Local-First:** Toda tu información se guarda de forma segura en **Dexie (IndexedDB)** directamente en tu navegador.

## 🚀 Flujo de Usuario Principal

El diseño de la aplicación sigue un ciclo financiero lógico:

1.  **Define tus Ingresos (Pestaña "Ingresos"):** Establece tu ingreso principal y extras.
2.  **Planifica (Pestaña "Planificación"):** Crea presupuestos y define metas de ahorro inteligentes.
3.  **Gestiona tus categorías (Ajustes ⚙️):** Personaliza tus categorías con iconos específicos antes de empezar a registrar.
4.  **Registra tus Gastos (Pestaña "Movimientos"):** Usa el botón de registro rápido para añadir gastos fijos o variables.
5.  **Monitorea (Reportes):** Revisa el estado de tus tarjetas de crédito y tu progreso mensual.

## 🛠️ Configuración y Opciones

El menú de configuración (ícono de engranaje ⚙️) centraliza el control:

- **Cambiar Tema:** Alterna entre Claro, Oscuro y el modo **Serious**.
- **Gestión de Categorías:** Crea categorías personalizadas eligiendo un icono del catálogo de Lucide (Cine, Café, Viajes, etc.).
- **Modo Estricto:** Bloquea el registro de un gasto si excede tu saldo disponible.
- **Estrategia de Rollover:** (Resetear, Acumular Sobrante o Acumular Deuda).
- **Copia de Seguridad:** Exportar/Importar JSON cifrado y Backups locales vía **OPFS**.

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
