# Fase 20.7 — Superficies secundarias + branding Prisma + gate final

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 20.

Estado: **completada / Gate 20.7 aprobado**.

Referencia visual congelada: `Juno002/Prisma@dc4310040f42cefd74cf41bad75152902e549c24`.

## Resultado final

Desde este gate:

```text
Prisma = producto visible
GlitchBudget Engine = único motor financiero
Modo Prisma = tema claro principal
Modo Neón = tema oscuro principal
```

Fase 20 queda completada. La transformación fue visual/branding; no hubo rewrite del motor financiero.

## Superficies secundarias cerradas

El barrido final cubre:

- cuentas;
- tarjetas/deuda;
- inversiones;
- categorías;
- Ajustes;
- App Lock;
- Auto-lock;
- persistent storage;
- backup/restore;
- backups cifrados;
- import confirmations;
- logros;
- estados vacíos;
- estado global de error;
- dialogs/utilidades asociadas;
- composición mobile/desktop.

Cuentas y tarjetas ya habían recibido su migración principal en 20.4; 20.7 las incluye en el gate final de paridad.

## Branding visible

Actualizado a **Prisma**:

- shell desktop;
- header móvil;
- metadata HTML;
- PWA manifest;
- Apple web-app title;
- pantalla App Lock;
- copy visible de seguridad/restores/inversiones;
- nuevos nombres de archivos descargados;
- logo SVG público;
- documentación de producto.

Nuevas descargas:

```text
prisma-backup-YYYY-MM-DD.json
prisma-encrypted-backup-YYYY-MM-DD.gbenc
```

## Compatibilidad intencional

El cambio de branding **no** renombra identificadores persistentes históricos.

Se conservan:

```text
GlitchBudgetDB
glitchbudget_balances_hidden_v1
glitchbudget_app_lock_v1
glitchbudget_auto_lock_v1
glitchbudget_* de preferencias/automatización
GlitchBudget encrypted backup
namespace histórico de copias OPFS
```

Esto evita crear una segunda IndexedDB, perder preferencias o volver incompatibles backups cifrados existentes.

## Persistencia y formatos

Sin cambios:

```text
Dexie v14
Backup JSON v13
Encrypted envelope v1
```

No hubo migración de schema ni modificación del contrato de restore.

## Arquitectura

El gate confirma:

- GlitchBudget Engine sigue siendo la única fuente financiera;
- UI no accede directamente a Dexie;
- UI no introduce fórmulas financieras alternativas;
- los commands/services/read models existentes siguen gobernando mutaciones y métricas;
- Prisma aporta lenguaje visual/branding, no dominio;
- ninguna cifra real procede de hardcodes de la maqueta Prisma.

## Capacidades protegidas

Se conservan:

- sonidos de ingreso/gasto;
- budget exceeded;
- goal complete;
- coin drop;
- achievement unlock;
- Framer Motion;
- confetti;
- reduced-motion behavior;
- gráficos de Reportes;
- hide amounts;
- App Lock;
- Auto-lock;
- persistent storage;
- backups normales/cifrados;
- offline/PWA.

## Browser E2E

El smoke final valida en Chrome/Chromium real:

1. branding Prisma en desktop;
2. branding Prisma en móvil;
3. shell responsive;
4. Home Prisma;
5. compositor global;
6. creación real de ingreso;
7. creación real de gasto;
8. Movimientos Prisma;
9. cuentas;
10. inversiones;
11. Logros;
12. Ajustes;
13. Categorías;
14. Privacidad y seguridad;
15. App Lock / Auto-lock;
16. persistent storage;
17. Copias de Seguridad;
18. Plan Prisma;
19. Presupuestos;
20. Metas;
21. Planificados;
22. Reportes Prisma;
23. gráficos;
24. rangos analíticos;
25. service worker;
26. recarga offline;
27. cero requests HTTP(S) financieros externos.

## Gate 20.7

```text
502/502 tests
npm run check ✅
npm run build ✅
npm run test:e2e ✅
Quality checks 36675832852 ✅
Quality checks 36675835726 ✅
```

E2E:

```text
Prisma branding
+ secondary surfaces
+ responsive shell
+ Home
+ Movimientos/composer
+ Plan
+ Reports/charts
+ movement mutation
+ navigation
+ offline reload
✅
```

## Cambios de schema

Ninguno.

## Migraciones

Ninguna nueva.

## Invariantes afectadas

Ninguna semántica financiera cambió.

## Limitaciones conocidas

- El nombre técnico/histórico **GlitchBudget Engine** permanece deliberadamente en arquitectura y compatibilidad.
- El repositorio GitHub continúa llamándose `Glitchbudget-pro`; 20.7 cambia el producto visible, no la identidad del repositorio.
- Identificadores persistentes históricos se mantienen deliberadamente.

## Cierre de Fase 20

**Fase 20 — Modo Prisma / transformación visual y branding: completada.**

Las etapas 20.1–20.7 tienen sus gates aprobados.
