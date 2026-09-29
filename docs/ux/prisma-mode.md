# Prisma UI System — contrato visual de integración

Estado: **contrato de Fase 20**.

Referencia visual: `Juno002/Prisma@dc4310040f42cefd74cf41bad75152902e549c24`.

## Principio

Prisma no reemplaza el motor de GlitchBudget.

```text
Visual language: Prisma
Financial truth: GlitchBudget Engine
```

El repositorio Prisma es una referencia de diseño. Sus modelos financieros, commands, DB, backup, servidor y cifras demo no se consideran canónicos.

## Qué se preserva

- todas las funciones financieras existentes;
- gráficos y capacidad analítica;
- sonidos;
- animaciones y microinteracciones;
- feedback de ingreso/gasto;
- Modo Neón;
- offline/PWA;
- privacidad local;
- App Lock / Auto-lock;
- hide amounts;
- backups normales y cifrados;
- navegación funcional Resumen / Movimientos / Plan / Reportes.

## Qué cambia

- branding;
- densidad visual;
- jerarquía;
- tipografía;
- spacing;
- cards;
- layout;
- navegación visual;
- copy redundante;
- tratamiento de charts;
- estados visuales;
- coherencia móvil/escritorio.

## Regla de paridad

Una pantalla no se considera migrada cuando “se parece a Prisma”.

Se considera migrada cuando:

```text
apariencia Prisma
+ mismas capacidades
+ mismos datos
+ mismos commands
+ mismas métricas
+ mismos invariantes
```

## Temas

### Prisma

Tema claro principal. Debe sentirse limpio, espacioso y comercial.

### Neón

Tema oscuro principal. Reutiliza la personalidad luminosa de GlitchBudget sin crear una rama funcional.

Los dos temas comparten DOM semántico, datos y comportamiento siempre que sea razonable; las diferencias deben concentrarse en tokens/estilos.

## Gráficos

Los gráficos son parte del producto final.

Prisma debe mejorar su integración visual, no eliminarlos.

Los componentes de chart reciben métricas/read models ya calculados. Solo pueden resolver representación: escalas visuales, layout, legends, tooltips, labels, coordenadas y clamps gráficos.

No pueden definir significado financiero.

## Sonido y movimiento

Los sonidos existentes se preservan como feedback de interacción.

Las animaciones existentes también se preservan o adaptan al nuevo diseño.

Ambos deben respetar las preferencias de accesibilidad existentes, incluyendo reducción de movimiento donde aplique.

## Branding final

Hasta 20.7, GlitchBudget sigue siendo el nombre técnico/histórico del proyecto durante la transición.

En el Gate 20.7:

```text
nombre visible final = Prisma
```

El branding no obliga a renombrar persistencia interna.

Especialmente, no cambiar `GlitchBudgetDB` únicamente por estética: un rename de IndexedDB puede crear otra base y aparentar pérdida de datos.

## Fuente de datos prohibida

Nunca presentar como datos reales las cifras demo del repositorio Prisma, incluyendo presupuestos, porcentajes, perfiles, planificados o reportes hardcoded.

Toda cifra financiera visible en la app final debe provenir del motor GlitchBudget o estar marcada inequívocamente como ejemplo dentro de una superficie de ayuda/demo.
