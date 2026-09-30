# Fase 20.7.5 — Semantic Integrity & Security Hardening

Estado: **planificada / no iniciada**.

Fuente funcional única: `Roadmap septiembre 2026.txt`.

Esta fase fue aprobada el 30 sep 2026 después de una revisión externa del código y una verificación posterior contra `main`.

Ocurre después del baseline visual/branding aprobado en 20.7 y **antes de 20.8**.

## Por qué existe

20.8 empezará a comparar e interpretar patrimonio, deuda, flujo de caja y tendencias.

Antes de construir esa capa informativa hay que cerrar varias ambigüedades semánticas del núcleo:

- el modelo persistente admite `Debt.type = 'loan'`, pero el cálculo actual de posición solo incorpora tarjetas de crédito;
- la UI actual crea tarjetas, no préstamos, pero backups históricos pueden contener `loan`;
- `Debt.principal` tiene significados distintos según tipo de deuda;
- `DebtPayment.date` permite legado ISO datetime mientras el flujo actual trabaja con fecha local `YYYY-MM-DD`;
- el contrato de moneda está protegido hoy, pero debe quedar explícitamente cubierto antes de añadir comparaciones;
- el backup cifrado v1 merece una revisión de endurecimiento sin perder compatibilidad;
- los selectores de cuenta deben medirse con datasets grandes antes de introducir optimizaciones;
- los tests existentes necesitan un gate adicional de reconciliación financiera independiente de la implementación.

Regla central:

```text
no construir insights sobre semántica financiera ambigua
```

## Invariantes que no se pueden romper

Durante toda 20.7.5:

- importes persistidos siguen siendo enteros en unidades menores;
- compra con tarjeta = gasto + pasivo, sin reducir efectivo;
- pago de tarjeta = reduce efectivo + pasivo, sin crear gasto nuevo;
- transferencia = mueve dinero entre cuentas, no crea ingreso/gasto;
- planificación no mueve dinero;
- inversión financiada desde cuenta mueve líquido → inversión, no crea gasto;
- rendimiento proyectado no entra automáticamente en patrimonio real;
- UI no accede directamente a Dexie;
- UI no define fórmulas financieras canónicas;
- backups existentes siguen siendo legibles;
- offline y `connect-src 'none'` permanecen intactos;
- no se introduce red para seguridad, FX ni análisis.

---

## 20.7.5.1 — Debt semantics audit

### Objetivo

Determinar formalmente qué significa cada variante de `Debt` antes de modificar cálculos o persistencia.

### Auditar

Como mínimo:

- `src/domain/models.ts`;
- `src/domain/ledger.ts`;
- `src/lib/debt-service.ts`;
- `src/lib/accounts.ts`;
- `src/lib/transaction-service.ts`;
- `src/lib/backup-json.ts`;
- `src/components/dashboard/debts-tab.tsx`;
- read models/selectors que consuman deuda;
- migraciones Dexie;
- fixtures/backups históricos;
- tests existentes de tarjetas/deuda.

### Preguntas que deben quedar respondidas

1. ¿`loan` es una feature vigente, una feature incompleta o solo compatibilidad histórica?
2. ¿Cómo se determina el saldo pendiente de un préstamo?
3. ¿Qué representa `principal` para:
   - tarjeta;
   - préstamo?
4. ¿Qué movimientos reducen un préstamo?
5. ¿Cómo debe entrar un préstamo en:
   - pasivos;
   - patrimonio neto;
   - Reportes;
   - Home?
6. ¿Qué debe hacer la UI si importa un backup que contiene un `loan`?
7. ¿Qué datos históricos deben preservarse aunque la UI no permita crear nuevos préstamos?

### Entregable

Una matriz explícita:

```text
tipo de deuda
→ significado de campos
→ saldo canónico
→ impacto en net worth
→ acciones permitidas
→ representación UI
→ compatibilidad de backup
```

### Restricción

No hacer migración de datos ni “arreglar” `loan` antes de cerrar esta definición.

**Gate 20.7.5.1:** contrato de deuda explícito, documentado y cubierto por tests de contrato.

---

## 20.7.5.2 — Loans + Net Worth correctness

### Objetivo

Aplicar el contrato decidido en 20.7.5.1 para que ninguna deuda persistida pueda producir un patrimonio incorrecto.

### Si `loan` continúa soportado

Debe existir una fuente canónica para:

- saldo pendiente;
- pagos aplicados;
- pasivo total;
- impacto en patrimonio;
- estado activo/cerrado.

`selectPosition()` y cualquier read model de posición deben incluir correctamente el préstamo.

### Si `loan` queda como compatibilidad histórica

Debe definirse un comportamiento seguro y explícito para registros existentes/importados:

- nunca tratarlos como tarjeta;
- nunca ocultarlos silenciosamente de los pasivos;
- no permitir acciones incompatibles;
- conservar datos al exportar/restaurar;
- mostrar una representación coherente o una ruta de migración explícita.

### Tests mínimos

Crear fixtures deterministas para:

- tarjeta sin saldo;
- tarjeta con compra;
- tarjeta con pago;
- tarjeta con saldo a favor;
- préstamo activo;
- préstamo parcialmente pagado;
- préstamo cerrado;
- tarjeta + préstamo simultáneos;
- backup histórico con `loan`;
- net worth antes/después de pagos.

**Gate 20.7.5.2:** patrimonio y pasivos cuadran para todos los tipos de deuda que el sistema pueda persistir o restaurar.

---

## 20.7.5.3 — Debt model normalization

### Objetivo

Eliminar la ambigüedad de mantenimiento causada por usar `Debt.principal` con significados distintos.

### Problema actual

Conceptualmente:

```text
credit_card.principal ≈ límite aprobado
loan.principal        ≈ principal del préstamo
```

Una misma propiedad no debe obligar a UI/read models futuros a adivinar el significado por contexto.

### Estrategia preferida

Primero intentar resolverlo sin romper persistencia:

- read models discriminados;
- helpers/selectors con nombres explícitos;
- tipos discriminados derivados;
- funciones como:
  - `cardCreditLimit`;
  - `loanOriginalPrincipal`;
  - equivalentes canónicos.

### Si se requiere cambio persistente

Debe ser:

- migración Dexie explícita;
- versionada;
- testeada desde fixtures antiguos;
- compatible con backups anteriores;
- reversible a nivel de import/export mediante normalización;
- sin borrar ni recrear la DB.

### UI

Los componentes no deben volver a usar un campo ambiguo directamente para decidir:

- límite disponible;
- utilización;
- saldo;
- principal pendiente.

**Gate 20.7.5.3:** el significado de cada cantidad de deuda es inequívoco fuera de la capa de compatibilidad.

---

## 20.7.5.4 — Canonical financial dates

### Objetivo

Unificar el contrato temporal de movimientos financieros para evitar desplazamientos de día por zona horaria.

### Estado a revisar

- Income/Expense usan `YYYY-MM-DD`;
- flujo actual de pagos de deuda usa `localDate()`;
- `saveDebtPayment()` valida fecha local;
- el modelo histórico de `DebtPayment` documenta ISO;
- backup acepta `YYYY-MM-DD` o ISO datetime legado;
- ledger normaliza pagos mediante `.slice(0,10)`.

### Contrato objetivo

Para movimientos financieros nuevos:

```text
fecha financiera = YYYY-MM-DD local
```

Los timestamps técnicos pueden existir separadamente cuando hagan falta, pero no deben determinar silenciosamente el día contable.

### Trabajo

- corregir comentarios/tipos que aún describan datetime donde el contrato actual es fecha financiera;
- centralizar normalización de legacy ISO datetime;
- normalizar durante import/migration, no dispersar `.slice(0,10)` por selectores;
- impedir que nuevos pagos persistan datetime si el contrato es date-only;
- revisar ordenamiento/comparación por fecha.

### Tests de zona horaria

Cubrir al menos:

- UTC−4 alrededor de medianoche;
- ISO datetime que cae en fecha UTC distinta;
- fecha local ya canónica;
- restore legacy;
- pago creado por UI;
- comparación `through`.

**Gate 20.7.5.4:** ninguna operación financiera nueva puede cambiar de día por conversión UTC implícita.

---

## 20.7.5.5 — Currency invariant defense

### Objetivo

Convertir la protección actual de moneda en un invariant explícito del ledger/posición antes de introducir nuevas comparaciones.

### Estado actual a preservar

Hoy el sistema:

- crea cuentas operativas en moneda base;
- rechaza cuentas extranjeras en el flujo soportado;
- bloquea transferencias cross-currency sin conversión;
- bloquea restore incompatible;
- normaliza movimientos de cuenta a moneda/base;
- no consulta FX por internet.

### Trabajo

- consolidar tests existentes como contrato de posición;
- comprobar que `selectPosition()` nunca recibe silenciosamente activos heterogéneos desde un camino válido;
- decidir si el selector debe:
  - asumir precondición validada;
  - o rechazar explícitamente monedas mezcladas;
- documentar esa precondición;
- añadir fixture adversarial con dos monedas para que una futura feature FX no active una suma nominal accidental.

### Restricción

No implementar multi-moneda real en 20.7.5.

**Gate 20.7.5.5:** ningún camino soportado puede sumar nominalmente monedas diferentes como si fueran equivalentes.

---

## 20.7.5.6 — Encrypted Backup v2 assessment

### Objetivo

Reevaluar el endurecimiento criptográfico del backup cifrado sin romper archivos v1 existentes.

### Baseline

Actualmente:

```text
PBKDF2-HMAC-SHA-256
310 000 iteraciones
AES-256-GCM
salt aleatorio
nonce aleatorio
AAD autenticado
envelope v1
contraseña mínima 8 caracteres
```

### Trabajo

1. contrastar parámetros contra guía de seguridad vigente;
2. medir coste real en desktop y móvil razonable;
3. definir presupuesto de latencia aceptable para export/import;
4. evaluar:
   - mayor coste PBKDF2;
   - política de longitud de contraseña;
   - posibles alternativas disponibles en Web Crypto sin dependencias remotas;
5. diseñar envelope v2 solo si aporta una mejora concreta.

### Compatibilidad obligatoria

Si se crea v2:

- export nuevo puede usar v2;
- import debe seguir leyendo v1;
- archivos v1 no se reescriben automáticamente;
- error de contraseña/archivo manipulado sigue sin filtrar información útil al atacante;
- AAD sigue autenticando metadata relevante;
- no almacenar ni transmitir contraseña.

### Restricción

No subir iteraciones a un número arbitrario sin benchmark.

**Gate 20.7.5.6:** decisión documentada y, si procede, v2 implementado con compatibilidad completa hacia v1.

---

## 20.7.5.7 — Ledger performance baseline

### Objetivo

Medir antes de optimizar.

### Riesgo

`selectAccountEntries()` filtra colecciones completas por cuenta. El coste puede crecer de forma apreciable con muchos movimientos.

### Benchmark determinista

Medir escenarios como mínimo de:

- 1 000 movimientos;
- 10 000 movimientos;
- 50 000 movimientos;
- múltiples cuentas;
- combinación de ingresos, gastos, pagos y transferencias;
- lectura de posición;
- historial por cuenta.

Registrar:

- tiempo de selector;
- tiempo de read model agregado;
- memoria aproximada cuando sea práctico;
- comportamiento en CI sin convertir timings inestables en tests frágiles.

### Regla

```text
sin degradación medible
→ no optimizar

degradación medible
→ optimización mínima y testeada
```

Posibles estrategias solo si son necesarias:

- agrupar una vez por `accountId`;
- construir índices/read models intermedios;
- evitar filtrar N veces el mismo snapshot.

No introducir caches persistentes que creen una segunda fuente financiera.

**Gate 20.7.5.7:** existe baseline reproducible y cualquier optimización está justificada por medición.

---

## 20.7.5.8 — Independent financial reconciliation gate

### Objetivo

Complementar los tests escritos junto con la implementación mediante datasets “golden” cuyos resultados esperados se definan de antemano.

### Principio

```text
expected financial outcome
≠
copiar la fórmula de producción dentro del test
```

Los fixtures deben describir casos completos y resultados contables esperados explícitos.

### Datasets mínimos

Incluir combinaciones de:

- saldo inicial;
- ingreso;
- gasto en efectivo;
- gasto bancario;
- compra con tarjeta;
- pago de tarjeta;
- saldo a favor;
- transferencia;
- inversión financiada desde cuenta;
- préstamo según contrato 20.7.5.1;
- presupuesto;
- pago planificado pendiente/confirmado;
- meta;
- cambio de período.

### Cuadrar independientemente

Para cada dataset, verificar cuando aplique:

- efectivo;
- bancos;
- inversiones;
- líquido;
- pasivos;
- patrimonio neto;
- spending;
- debt payments;
- cash flow;
- transferencias neutrales;
- planning neutral;
- Reportes;
- Home.

### Validación manual opcional

Puede hacerse una reconciliación temporal con datos reales del usuario fuera del fixture del repositorio, pero:

- no guardar información personal en tests;
- no subir extractos reales;
- no convertir datos personales en dependencia del gate automático.

**Gate 20.7.5.8:** los principales invariantes cuadran contra resultados esperados independientes del código productivo.

---

## 20.7.5.9 — Final hardening gate

### Objetivo

Cerrar la fase solo cuando las correcciones semánticas, seguridad, compatibilidad y rendimiento estén reconciliadas.

### Validación obligatoria

```text
npm run check
npm run build
npm run test:e2e
```

Además:

- fixtures de deuda;
- net worth con todos los tipos persistibles;
- fechas locales/legacy;
- moneda base;
- backup JSON import/export round-trip;
- encrypted backup v1 compatibility;
- encrypted backup v2 si fue aprobado;
- migraciones antiguas;
- golden financial reconciliation;
- benchmark registrado;
- offline;
- `connect-src 'none'`;
- cero nuevas fórmulas financieras en UI;
- cero Dexie directo en UI.

### Entrega de cierre

Documentar:

1. archivos cambiados;
2. decisión final sobre `loan`;
3. semántica final de deuda;
4. contrato final de fechas;
5. cambios de schema, si hubo;
6. migraciones, si hubo;
7. formato(s) de backup soportados;
8. parámetros criptográficos vigentes;
9. resultados del benchmark;
10. golden datasets añadidos;
11. riesgos conocidos restantes.

**Gate 20.7.5:** integridad semántica cerrada antes de permitir 20.8.

## Fuera de alcance

20.7.5 no debe convertirse en una feature phase.

No añadir:

- préstamos nuevos en UI salvo que el contrato auditado demuestre que ya son una capacidad vigente que necesita representación correcta;
- multi-moneda real;
- sincronización bancaria;
- APIs FX;
- servidor;
- IA;
- cambios visuales de 20.8/20.9;
- optimizaciones sin benchmark.

## Secuencia

```text
20.7 baseline visual
↓
20.7.5 Semantic Integrity & Security Hardening
↓
20.8 Information Design + Deterministic Insights
↓
20.9 Premium UI Polish
↓
20.10 Repository Consolidation + Product README
```
