# Revisión de diseño de seguridad: ronda 5 (verificación final)

**Estado:** revisión independiente de los documentos de diseño únicamente. Fecha: 2026-10-05. Revisor: trabajador despachado (tarea `task_e85cdc70400c`).

**Veredicto:**
- **R4-01 está cerrado.** Los cambios están en ARCH §5.1, el apartado de credenciales del TM, las filas TM-02/TM-03 y ST-02.
- Los **38 hallazgos conocidos siguen cerrados**, sin regresiones.
- **Hallazgos abiertos en el diseño base: 0.**
- Hay un nuevo hallazgo **Bajo (R5-01)**, y está **fuera del diseño base**: la guía de operador `docs/configuration.md`, que mantiene otro trabajador, recomienda un archivo `--env-file` de Node que no está cubierto por la política de archivos seguros.

**Cierre de diseño no es validación.** "Cerrado" significa que los documentos fijan un único requisito coherente y comprobable. **Ninguna prueba ST se ha ejecutado**, el laboratorio 7.1 sigue pendiente, no existen artefactos de publicación y no se acepta ningún riesgo (§6).

## 1. Alcance y método

| Entrada | Estado |
|---|---|
| ARCH `docs/architecture.md` | Árbol de trabajo, 393 líneas |
| TM `docs/security/threat-model.md` | 125 líneas |
| STP `docs/security/security-test-plan.md` | 54 líneas |
| DD `docs/security/design-decisions.md` | 117 líneas |
| API `docs/api-contract.md` | 195 líneas. Solo para conteos y trazabilidad. |
| Informes históricos de las rondas 1–4 | **Sin cambios.** Los SHA-256 coinciden con DD:5: ronda 1 `2008a5ca…`, ronda 2 `f17f1027…`, ronda 3 `567d3f1a…`, ronda 4 `6f79f4d1…`. |

**Método:** leí directamente los pasajes corregidos y usé la matriz de DD solo como índice. Busqué en todo el diseño base términos obsoletos o contradictorios. Repetí las comprobaciones mecánicas de §5.

**Fuera de alcance:** no audité código fuente, no ejecuté pruebas, no llamé a la API real, no lancé agentes ni hice commits. `docs/configuration.md` lo leí solo para comprobar que es coherente con R4-01.

**Bandeja Orca:** la comprobé al empezar y antes de cerrar. No había entregas FIFO pendientes (`deliveryId: null`, `count: 0`), así que no hubo nada que confirmar con ACK.

## 2. Verificación de R4-01

**Hallazgo original:** el archivo JSON de configuración podía llevar `auth.privateToken` en línea y fijar la política de seguridad, pero el diseño base no le exigía reglas de archivo seguro.

| Requisito comprobado | Evidencia exacta | Resultado |
|---|---|---|
| Todo JSON de operador, también la política sin secretos, se abre con `O_NOFOLLOW \| O_NONBLOCK`. | ARCH:88; TM:87 | Cumple |
| El descriptor abierto se valida: archivo regular, propietario el UID actual, modo 0600 o más estricto, sin bits de grupo, mundo, ejecución ni especiales. | ARCH:88; TM:87; TM-02 (TM:106) | Cumple |
| Límite de 65.536 bytes para JSON, aplicado durante una lectura acotada antes de `JSON.parse`, aunque el archivo crezca. Los archivos de token siguen con 4.096 bytes. | ARCH:86, 88; TM:85, 87; ST-02 (STP:18): límite y +1, cero entradas al parser | Cumple |
| Se rechazan symlinks, FIFOs, propietario o modo inseguros, tamaño excesivo y falta de soporte de apertura segura, **antes** de firmar, resolver DNS o abrir red. Nunca se omite un flag en silencio. | ARCH:88; TM:87; STP:18 | Cumple |
| Los tokens `auth.publicToken`/`auth.privateToken` en línea solo se aceptan desde un JSON que pasa los controles. Se mantiene la exclusividad entre token directo y archivo de token. | ARCH:88; TM:87; STP:18 (casos canario y de conflicto) | Cumple |
| Arranque, `--check-config` y `doctor` aplican la misma política. Los valores nunca aparecen en logs ni diagnósticos. | ARCH:88, 169–171; TM:87, 89; STP:18, 30 | Cumple |
| La manipulación de la política mediante un JSON inseguro está modelada como amenaza y como oráculo de prueba. | TM-03 (TM:107, "tampered JSON security policy … R4-01"); STP:18 ("a tampered policy never takes effect") | Cumple |
| La guía de operador está alineada. | `docs/configuration.md:16` (64 KiB). Se corrigió la discrepancia de 1.000.000 bytes registrada en DD. | Alineada |

**R4-01: Cerrado (diseño).** La implementación y la evidencia de ST-02 siguen pendientes.

## 3. Regresión de los 38 hallazgos

Comprobé tres cosas:
- Las invariantes clave siguen presentes en ARCH: el bloqueo de DNS ante un fallo, la auditoría opcional de vistas previas, los diagnósticos fuera de línea, `NO_PROXY`, la ausencia del campo `confirm`, la vista previa de exactamente cuatro campos, `maxRetryAfterMs`, la lista permitida de IPs canónicas, el gate de publicación procedimental, `blocked (S5)` y `boundedInput`.
- La búsqueda de términos obsoletos no encuentra restos activos de: `vitest`, `4.6.5`, una vista previa firmada, plazo total de 60 s, `Retry-After` de 30 s, "startup snapshot", un resultado `denied`, `createMcpHandler` o tokens bearer. Las únicas apariciones son descripciones de amenazas, como TM-08 ("Model sets `confirm:true`"), o casos de rechazo, como ST-16.
- R4-01 añade reglas sin relajar ninguna anterior. En concreto, F12 y R2-04 se refuerzan con `O_NONBLOCK`.

| Grupo | Resultado |
|---|---|
| B1–B8 (8) | Siguen cerrados |
| F1–F15 (15) | Siguen cerrados |
| R2-01–R2-10 (10) | Siguen cerrados |
| R3-01–R3-04 (4) | Siguen cerrados |
| R4-01 (1) | Cerrado en esta ronda |
| **Total** | **38 de 38 cerrados** |

## 4. Nuevo hallazgo

| ID | Sev | Hallazgo | Evidencia | Corrección concreta | Responsable |
|---|---|---|---|---|---|
| **R5-01** | Bajo (guía de operador, fuera del diseño base) | **`docs/configuration.md:7` recomienda pasar un archivo de entorno con el `--env-file=/absolute/private/operator.env` de Node.** Node lee ese archivo antes de que arranque el servidor, así que no le aplica ninguno de los controles de R4-01: ni `O_NOFOLLOW`, ni propietario, ni modo 0600, ni límite de tamaño. Si contiene `DARKTRACE_PRIVATE_TOKEN` o ajustes de política, se saltan los controles de archivo seguro que ARCH:88 exige para todo archivo de configuración de operador. El texto dice "Prefer files containing only non-secret settings/token paths", pero es una preferencia, no una prohibición. Además choca con el espíritu de ARCH:347 y TM:85, que rechazan `--env-file` para el token privado en Docker. | `docs/configuration.md:7`; ARCH:86, 88, 347; TM:85, 87 | **Opción A:** que la guía diga que un `--env-file` de Node **nunca** debe contener valores de token; solo ajustes no secretos y rutas `*_TOKEN_FILE`. Además debe ser propiedad del operador con modo 0600, y dejar claro que el servidor **no** puede verificarlo. **Opción B:** quitar la recomendación. Opcionalmente, añadir a ARCH §5.1 una frase: el entorno cargado con `--env-file` de Node se trata como entorno de host del operador de confianza y no está cubierto por la política de archivos seguros del servidor. | Trabajador de documentación de usuario (`ctx_6a5ef9a482d9`). Opcionalmente, el propietario de la arquitectura. |

**No se encontraron otras contradicciones relevantes para la seguridad dentro del diseño base.**

## 5. Comprobaciones mecánicas

| Comprobación | Resultado |
|---|---|
| Enlaces y anclas locales en los 5 documentos base | **161 enlaces, 0 rotos** (coincide con DD) |
| Inventario | **79** = 57 lectura + 9 medio + 7 alto + 6 crítico |
| Lectura vía POST / alta sensibilidad / correo | **2 / 11 / 14** |
| Filas: API / TM / ST | **79 / 17 / 16** |
| Filas de cierre en DD | **38 de 38**, cada ID aparece exactamente una vez |
| Checksums históricos | Los 4 sin cambios |

## 6. Gates pendientes (no resueltos por ningún documento)

| Gate | Estado |
|---|---|
| Pruebas de seguridad ST-01–16 en el commit exacto | **NO EJECUTADAS.** No se afirma ningún resultado. |
| Implementación del contrato documentado | **Pendiente.** El código y las pruebas del cliente siguen en desarrollo. Incluye: política de archivos JSON y token, caché de fallo DNS terminal, división entre auditoría opcional y obligatoria, rechazo de proxy, diagnósticos fuera de línea, envoltorio de entrada, informe de cobertura por parámetro. |
| Firma S1 y comportamiento de Darktrace 7.1; S4/S5/S6/S9 | **Laboratorio autorizado pendiente.** Las formas siguen bloqueadas. |
| Elegibilidad del proveedor del modelo | Decisión del operador u organización pendiente. |
| Artefactos (shrinkwrap, árbol instalado, SHA-256, SBOM, atestación, digest de imagen y montajes) | **Pendientes.** Repositorio privado, sin publicación. |
| Activación de escrituras medium/high | Gate procedimental (ST-07/12/13 más autorización de laboratorio). No se aplica en tiempo de ejecución. |
| Exportación, correo, HTTP, aprobación de acciones críticas | Fuera del diseño base. Cada uno requiere su propia revisión. |
| Riesgos residuales | **Ninguno aceptado.** |

## 7. Veredicto final de alcance

- **Diseño base:** 38 hallazgos conocidos, **38 cerrados, 0 abiertos.** No quedan bloqueantes de diseño.
- **R5-01 (Bajo):** es una corrección de la guía de operador. Debe aplicarse antes de publicar esa guía, pero no reabre ningún hallazgo del diseño base.
- **La fase de modelado puede considerarse cerrada para el diseño base.** Esto no autoriza a declarar el sistema seguro ni a activar ninguna capacidad bloqueada: la validación sigue dependiendo de los gates externos de §6.
