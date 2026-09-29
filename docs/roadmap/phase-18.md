# Fase 18 — Backup 2.0 y migraciones permanentes

Fuente funcional única: `Roadmap septiembre 2026.txt`, Fase 18.

Este documento **no redefine el roadmap**. Solo divide su alcance en cinco checkpoints verificables para mantener el mismo método de ejecución usado en Fases 16 y 17.

## Alcance del roadmap

Fase 18 exige:

- que cada nueva tabla quede cubierta por `export`, `import`, `restore`, `validation` y `migration tests`;
- que cada backup lleve `schemaVersion`, `appVersion` y `exportedAt`;
- mostrar un resumen del contenido antes de una importación destructiva y pedir confirmación;
- crear un backup local automático antes de una importación destructiva cuando OPFS esté disponible;
- nunca resolver incompatibilidades de migración mediante `db.clear()` ni recreando desde cero la base del usuario.

---

# Iteraciones acordadas

## 18.1 — Contrato y versionado de Backup 2.0

Objetivo: separar explícitamente versión de formato, versión de esquema y versión de aplicación.

Debe:

- conservar compatibilidad de lectura con backups legacy;
- mantener `v` como versión del formato JSON;
- añadir `schemaVersion` al backup nuevo;
- añadir `appVersion` al backup nuevo;
- conservar `exportedAt`;
- definir qué número representa cada versión;
- rechazar metadata futura/incompatible de forma explícita;
- no adelantar cobertura automática de tablas ni preview destructivo.

Contrato inicial acordado para esta iteración:

```text
v             = versión del formato JSON
schemaVersion = versión de esquema Dexie que originó el backup
appVersion    = versión real de package.json
exportedAt    = instante ISO-8601 de exportación
```

18.1 puede elevar el formato JSON si es necesario para hacer obligatoria esta metadata sin romper backups anteriores.

---

## 18.2 — Cobertura automática de tablas

Objetivo: impedir que una nueva tabla quede olvidada fuera del sistema de backup.

Debe establecer un inventario canónico de tablas y asegurar automáticamente su presencia en:

```text
export
import
restore
validation
migration tests
```

El gate debe fallar si Dexie incorpora una tabla nueva sin cobertura correspondiente.

No asumir que una tabla nueva puede ignorarse porque esté vacía.

---

## 18.3 — Preview y confirmación de import

Objetivo: mostrar qué contiene el archivo **antes** de una restauración destructiva.

Debe producir un resumen equivalente a:

```text
4 accounts
423 transactions
7 budgets
3 goals
2 cards
1 investment
```

El resumen debe calcularse a partir del backup validado antes de tocar datos y mostrarse en la confirmación de import.

Debe aplicarse de forma coherente a JSON normal y backup cifrado una vez descifrado/validado.

---

## 18.4 — Backup OPFS automático pre-import

Objetivo: crear una red de seguridad local antes de reemplazar datos.

Cuando OPFS esté disponible:

```text
validar archivo a importar
→ crear backup local automático del estado actual
→ solo si el backup local termina correctamente, ejecutar import destructivo
```

Debe quedar documentado qué ocurre cuando OPFS no está disponible y cómo se informa al usuario sin fingir que existe una copia.

---

## 18.5 — Migraciones permanentes + hardening + gate final

Objetivo: cerrar Fase 18 con garantías permanentes de preservación.

Debe verificar como mínimo:

- migraciones incrementales;
- ninguna migración de producción resuelve incompatibilidades mediante `db.clear()`;
- ninguna migración recrea desde cero la DB del usuario;
- fixtures/migration tests preservan tablas y datos históricos;
- nueva tabla sin backup coverage hace fallar el gate;
- metadata de versión compatible/incompatible;
- preview de import;
- backup OPFS pre-import;
- restore JSON y cifrado;
- compatibilidad legacy;
- documentación y Definition of Done.

Al cerrar 18.5:

- registrar versiones finales;
- registrar limitaciones;
- cerrar formalmente Fase 18;
- detenerse antes de Fase 19 hasta autorización explícita.

---

# Invariantes de toda Fase 18

Durante 18.1–18.5:

- `Roadmap septiembre 2026.txt` sigue siendo la única fuente funcional de verdad;
- no perder compatibilidad legacy sin una razón documentada;
- no usar `db.clear()` como estrategia de migración de incompatibilidades;
- no recrear desde cero la base del usuario como migración;
- import destructivo debe validar antes de escribir;
- backup JSON normal y backup cifrado deben seguir compartiendo el mismo contrato financiero interno;
- seguridad local de Fase 17 no debe degradarse;
- no avanzar a Fase 19 antes de completar 18.5 y su gate.

# Estado actual

```text
18.1 — Contrato y versionado             ⏳ en ejecución
18.2 — Cobertura automática de tablas    ⏳ pendiente
18.3 — Preview + confirmación             ⏳ pendiente
18.4 — Backup OPFS pre-import            ⏳ pendiente
18.5 — Migraciones + hardening + gate    ⏳ pendiente
```
