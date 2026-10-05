# Auditoría independiente de código: cliente HTTPS, firma, configuración y redacción

**Estado:** auditoría de código del alcance indicado. Fecha: 2026-10-05. Auditor: trabajador despachado (tarea `task_27ff3889dc99`).

**Veredicto:**
- **No hay defectos Críticos, Altos ni Medios en el alcance.**
- Hay **6 defectos Bajos** (CA-01 a CA-06) y **1 inexactitud Baja en la guía de usuario** (CA-07).
- Hay **5 huecos de evidencia** (G1 a G5), separados de los defectos.

Los controles principales del diseño están implementados en el código y se comportan como se espera en las pruebas sintéticas: anclaje DNS, TLS verificado, rechazo de proxy, redirecciones y orígenes ajenos, firma HMAC con los mismos bytes que se envían, archivos JSON y token con apertura segura, plazo total, presupuesto acumulado de bytes, cola y límite de tasa.

**Esto no es una aprobación de seguridad.** Las pruebas propias del repositorio y mis reproducciones son evidencia offline. No sustituyen ST-03/ST-04 con sockets TLS reales, la auditoría de `server/api/policy/coverage` ni la validación en el laboratorio 7.1. No se acepta ningún riesgo.

## 1. Alcance, instantánea y método

**Dentro del alcance:** `src/client/*`, `src/config/*`, `src/shape/redact.ts`, `test/unit/{client-http,client-network,config,signer}.test.ts`, y como referencia el diseño base (ARCH, TM, ST).

**Fuera del alcance**, porque se integran en paralelo: `src/server`, `src/api`, `src/policy`, `src/coverage`, `src/observability`, `src/tools`. Cuando un control depende de ellos lo marco como hueco de evidencia (§4), no como defecto.

**Hashes SHA-256 del alcance auditado:**

| Archivo | SHA-256 |
|---|---|
| `src/client/errors.ts` | `aff074a0446fe29823e1c66e855785f58b5ef941f92e6f5a614020dcfc923ce3` |
| `src/client/httpClient.ts` | `7f9b81580b3ebc0291b09e8396ef1d606d9436556f9a654c5c1615897471ce2f` |
| `src/client/httpsConnector.ts` | `5302d4313d5281803a54dcbdf79571546c12156e2d93033155b61bb8b574a768` |
| `src/client/signer.ts` | `267ad8ba85ac16d9f144911863e38568ccb50886ee2f96e69772a62129ac094d` |
| `src/config/address.ts` | `348fadac6a3bd17e14b1e5ffad957c83295bba181e55246511a881f816d7f3ab` |
| `src/config/load.ts` | `d8960b429b4174069748cacc864459abd46f54c3e7e04740c894ed94be604065` |
| `src/config/schema.ts` | `ef80f7c5a15c9666d24631786c31a25e609d53c779f14beb3341e777451b0e3f` |
| `src/shape/redact.ts` | `bd9acabc7239064aeaf211351acb27a44abece66774980d5bcb54d8e2edc7d1e` |
| `test/unit/client-http.test.ts` | `6c27a0b94163a2437250edfcc90faaebf83786d1cc8d3d198223cc35fa94e738` |
| `test/unit/client-network.test.ts` | `fa15fbe0a3bf755a7f445607f2a4fe87cfb1e31d40bf62472955c7293806845a` |
| `test/unit/config.test.ts` | `5fbb46ea533a33ba27fa442b73ce79b40bcf4781ae290165b6f2f045590036c0` |
| `test/unit/signer.test.ts` | `b6262be6001b6e1dd856831388e508888a278be9fdaf01478ded3fe42addf7c9` |

**Método:**
- Leí línea a línea los 1.857 líneas de fuente del alcance.
- Compilé una **copia aislada** del repositorio en el directorio temporal de la sesión (sin `.git` ni `dist`) con `tsc`. Hubo errores de tipos solo en `test/mcp/stdio.test.ts`, que está fuera del alcance; la compilación emitió igualmente.
- Ejecuté las 4 suites del alcance con las variables de proxy y `NODE_OPTIONS` eliminadas: **42 pruebas, 42 pasan**. La cifra de "69 pruebas" del encargo incluye suites fuera del alcance; no asumo nada sobre ellas.
- Escribí reproducciones sintéticas offline (`repro.mjs` en la copia aislada) con conectores falsos y tokens centinela. No hubo red externa, laboratorio ni secretos reales. No modifiqué código, pruebas ni guías.

## 2. Controles verificados sin defecto

| Área | Evidencia en código | Resultado |
|---|---|---|
| **Anclaje DNS** | `httpsConnector.ts:59-91` resuelve A y AAAA. `:106-129` valida **cada** respuesta, normaliza IPv4 mapeada, aplica la allowlist exacta y congela el snapshot. `:131-153` hace que el lookup del Agent devuelva solo el snapshot y rechace otro hostname. `:186-225` comparte la inicialización y **cachea el fallo como terminal**, sin nuevas consultas. | Correcto. Ver CA-02 sobre el caso de abort. |
| **TLS** | `httpsConnector.ts:37-44, 233-242`: `rejectUnauthorized:true` explícito, `servername` con el nombre DNS configurado y `checkServerIdentity` contra ese nombre (o la IP SAN). Usa un `Agent` dedicado, nunca el global ni `fetch`. | Correcto |
| **SSRF y origen** | `schema.ts:178-226` exige origen HTTPS sin credenciales, ruta ni query, y rechaza IP no canónicas o numéricas alternativas. `httpClient.ts:116-143` registra solo operaciones de código y excluye email, la operación obsoleta y S6. `:157-173` codifica los parámetros de ruta y bloquea traversal. `:584-587` y `httpsConnector.ts:230` exigen el mismo origen. Las respuestas 3xx se rechazan sin seguirlas (`:601-604`). | Correcto |
| **Proxy y entorno** | `schema.ts:116-138` rechaza `NODE_TLS_REJECT_UNAUTHORIZED=0`, las 8 variantes de proxy aunque estén vacías, `NODE_USE_ENV_PROXY` y los flags de bypass en `execArgv` y `NODE_OPTIONS`. Se invoca en `load.ts:152` y en `httpClient.ts:442`. Los mensajes dan solo el nombre de la variable. | Correcto |
| **Firma HMAC y bytes enviados** | `signer.ts:132-175`: el modo de firma es explícito y sin fallback. El cuerpo JSON se firma con los mismos bytes que se envían. El formulario usa una única representación codificada. Se rechazan caracteres de control, por lo que no se puede inyectar texto en el mensaje firmado. `httpClient.ts:531-535` bloquea S4, S5 y S6 antes de firmar. | Correcto |
| **Archivos de configuración y token** | `load.ts:25-105`: abre con `O_RDONLY\|O_NOFOLLOW\|O_NONBLOCK`; `fstat` sobre el descriptor comprueba archivo regular, UID actual y modo sin bits de grupo, mundo, ejecución ni especiales. Límites 64 KiB y 4 KiB, con lectura acotada a límite+1 y detección de crecimiento. Windows falla de forma cerrada. Errores sin valores. | Correcto. Ver CA-05. |
| **Conflictos de fuentes** | `load.ts:161-186`: `DARKTRACE_URL` frente a `DARKTRACE_BASE_URL`; variable de entorno frente a JSON para las rutas de token; token directo frente a archivo de token; variables `DARKTRACE_*` desconocidas o prohibidas rechazadas. `schema.ts:284`: `writeCritical` sin `write` es error. Email, export, HTTP y `assumeVersion` se rechazan. | Correcto |
| **Plazo, cola, tasa, bytes y reintentos** | `httpClient.ts:550-556`: un único plazo desde la admisión. `:288-328`: semáforo de 4 en vuelo y 16 en cola. `:562-568`: ventana de 120 intentos por minuto, con cada intento contado. `:357-390, 557`: bytes en el cable acumulados entre intentos, `Content-Length` comprobado y `Accept-Encoding: identity` con compresión inesperada rechazada. `:392-419`: un `Retry-After` inválido o mayor que el techo o que el plazo restante significa **no reintentar**. Solo se reintenta GET, nunca POST ni DELETE. | Correcto. Ver CA-01. |
| **Fugas** | `errors.ts`: los mensajes son fijos y nunca incluyen cuerpo, token ni firma. Toda excepción interna se convierte en `DarktraceApiError`. | Correcto en el alcance |
| **Puntos de inyección de pruebas** | `httpClient.ts:435-439`: cualquier dependencia inyectada exige `testOnly:true`. La ruta de producción (`src/server/stdio.ts:14`) llama a `createHttpClient(cfg,{operations})` sin `testOnly`. | Correcto. Ver G4. |

## 3. Defectos

| ID | Sev | Defecto y línea | Prerrequisitos y explotación | Corrección | Prueba requerida |
|---|---|---|---|---|---|
| **CA-01** | Bajo | **La clasificación de errores TLS está incompleta, así que se reintentan GET tras un fallo TLS.** `httpClient.ts:421-425` reconoce `CERT_*`, `ERR_TLS_*` y unos pocos códigos más, pero **no** `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, `UNABLE_TO_GET_ISSUER_CERT`, `INVALID_CA` ni otros códigos de verificación de OpenSSL. Esos errores caen en la rama de reintento de `:639-647`. Esto contradice ARCH §5.3 ("No retries on … TLS failure"). **Reproducido:** un conector falso que lanza `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` produce **3 intentos**; con `CERT_HAS_EXPIRED` hay 1. | Requiere un MITM o una CA privada mal configurada. **No se envían bytes firmados**, porque el TLS falla antes de HTTP. El efecto se limita a 2 handshakes extra por llamada y al consumo del presupuesto de tasa. | Invertir la lógica: reintentar **solo** con una lista de códigos transitorios previos a la respuesta (`ECONNRESET`, `ECONNREFUSED`, `ETIMEDOUT`, `EPIPE`, `ECONNABORTED`, `ENETUNREACH`, `EHOSTUNREACH`). Cualquier otro código, incluidos todos los de verificación TLS, no se reintenta. | ST-03/ST-12 parametrizadas con los códigos de verificación de OpenSSL: `attempts === 1` y cero firmas extra. |
| **CA-02** | Bajo (discrepancia entre diseño y código) | **Un abort del primer llamante se cachea como fallo terminal de DNS.** `httpsConnector.ts:192-213` resuelve con la señal del **primer** llamante, y en `:211-213` un abort se registra como `failure`. Si se cancela esa primera llamada, o su plazo vence mientras el DNS es lento, el cliente queda deshabilitado hasta reiniciar el proceso, y los llamantes concurrentes con señales válidas también fallan. La prueba `client-network` "aborting initial DNS…" fija este comportamiento como esperado. En cambio, ARCH:106 solo cachea como terminal un fallo de **resolución o validación**. | Requiere que el host cancele la primera llamada (por ejemplo, `notifications/cancelled`) o que el DNS tarde más que el plazo restante. El modelo no lo controla directamente. Es un problema de disponibilidad, no de confidencialidad ni integridad. | Elegir una de dos opciones y alinear código, diseño y pruebas. **(a)** Documentar en ARCH §5.3, TM y ST-04 que un abort durante la inicialización también es terminal; es la opción más conservadora y ya está implementada. **(b)** Ejecutar la inicialización con una señal propia del proceso, acotada por `timeoutMs` e independiente de cada llamante, y cachear solo fallos del resolver o de validación. | ST-04: abort del primer llamante con un segundo llamante concurrente; el resultado esperado debe coincidir con la opción elegida. |
| **CA-03** | Bajo | **Redacción latente defectuosa en exportaciones no usadas en producción.** `shape/redact.ts:26-62`: `redactSecrets` y `redactJsonString` reinterpretan cada cadena como JSON, lo que **altera texto no secreto** (`"1.0"` pasa a `"1"`, `"[1, 2]"` a `"[1,2]"`, `"true "` a `"true"`). Además asignan la clave `__proto__` sobre un objeto normal, con lo que la clave desaparece y cambia el prototipo. **Reproducido:** la salida hereda `polluted=1`. En producción solo se usa `redactString` (vía `observability/redact.ts:1`), que no tiene el problema. Las dos funciones solo las importa `test/unit/client-http.test.ts:7`. | Haría falta que alguien empiece a usar estas funciones en salidas de herramientas o logs. No es explotable hoy. | Eliminar `redactSecrets` y `redactJsonString`, o hacerlas conservadoras con el tipo (sin reinterpretar JSON y con salidas `Object.create(null)`). Ajustar la prueba "literal token redaction". | Prueba de propiedad: las cadenas sin secretos quedan idénticas byte a byte y `__proto__` no cambia el prototipo. |
| **CA-04** | Bajo (endurecimiento) | **La política de destinos no reconoce IPv4 incrustada en IPv6.** `address.ts:45-60` no deniega IPv4-compatible (`::7f00:1`), NAT64 (`64:ff9b::/96`, por ejemplo `64:ff9b::a9fe:a9fe`), 6to4 (`2002::/16`), `::ffff:0:0/96` ni el obsoleto `fec0::/10`. El IPv4 se deniega `0/8`, `127/8`, `169.254/16` y `≥224`; `100.100.100.200` (metadatos de Alibaba Cloud) no está cubierto. **Reproducido:** todas esas direcciones dan `forbidden=false`. | Requiere que el DNS de arranque devuelva esas respuestas (envenenamiento o resolver malicioso) **sin** allowlist explícita. TLS sigue verificando el certificado del hostname configurado, así que no se envía una petición firmada salvo que el destino presente un certificado válido para el appliance. El riesgo residual es la conexión o handshake hacia el destino traducido. | Extraer el IPv4 incrustado en `::/96`, `64:ff9b::/96`, `64:ff9b:1::/48`, `2002::/16` y `::ffff:0:0/96` y aplicarle las reglas de IPv4. Denegar `fec0::/10`. Valorar añadir `100.100.100.200`. | ST-04: tabla de esas direcciones con cero conexiones y cero firmas. |
| **CA-05** | Bajo | **`DARKTRACE_CONFIG_FILE` admite rutas relativas.** `load.ts:165-166` las acepta, mientras que las rutas de token exigen ruta absoluta (`load.ts:87`) y la guía pide ruta absoluta. Una ruta relativa se resuelve contra el directorio de trabajo del host (en apps GUI, variable). | Requiere que el operador use una ruta relativa y que exista un archivo distinto en ese directorio. Los controles de propietario y modo 0600 siguen aplicándose, por lo que el riesgo es cargar una política no prevista, no leer archivos ajenos. | Exigir `path.isAbsolute` también para el archivo de configuración, con error saneado. | ST-02: ruta relativa rechazada en arranque, `--check-config` y `doctor`. |
| **CA-06** | Bajo | **La vista previa del cliente devuelve nombres de campo del llamante y previsualiza operaciones que no se pueden ejecutar.** `httpClient.ts:513-521` (`send(...,{dryRun:true})`) construye `parameterNames` con las claves de query y body **tal como las da el llamante**, en lugar de los nombres permitidos por el descriptor que exige ARCH:139. Además previsualiza formas bloqueadas antes de comprobar las reglas de forma. **Reproducido:** `delete_tags_entities` (S5) con query devuelve una vista previa con `"ignore previous instructions"` en `parameterNames`, mientras que la ejecución da `invalid_request`. | Requiere que la capa de herramientas o política pase claves sin validar a la vista previa del cliente. Esa capa está fuera del alcance (ver G3). El efecto es un eco de texto controlado por el modelo y una vista previa engañosa de una forma bloqueada, sin firma ni red. | En el cliente, filtrar `parameterNames` contra los nombres permitidos del descriptor y aplicar las reglas S4/S5/S6 **antes** de devolver la vista previa. Alternativa: eliminar la vista previa del cliente "legacy" y dejarla solo en la capa de política. | ST-07/ST-08: vista previa de forma bloqueada rechazada y claves no permitidas rechazadas o filtradas. |
| **CA-07** | Bajo (guía de usuario) | **La guía describe mal una allowlist JSON vacía.** `docs/configuration.md:32` dice "Empty JSON allowlists deny destinations", pero el código (`schema.ts:231`) **rechaza el arranque** con un array vacío. **Reproducido:** `instance.destinationAllowlist must not be empty`. Ambos comportamientos son cerrados por defecto, pero el texto es inexacto. | Ninguno. Es un problema de documentación. | Cambiar el texto a "Empty allowlists are a startup configuration error". | Ninguna. |

## 4. Huecos de evidencia (no son defectos)

| ID | Hueco | Qué falta |
|---|---|---|
| G1 | **No hay prueba de conector con TLS y sockets reales.** `client-network.test.ts` comprueba el objeto de opciones TLS y usa conectores o resolvers inyectados. No hay servidor TLS local con CA privada, nombre incorrecto, IP SAN ni verificación de que el socket se conecta a la IP anclada. | Las pruebas de integración ST-03/ST-04 exigidas por el plan, con un mock TLS local aislado. |
| G2 | **La redacción de producción está fuera del alcance.** Está en `src/observability/redact.ts` y `src/tools`. | Incluirla en la auditoría de server/tools/observability. |
| G3 | **La lista de nombres permitidos en la vista previa y las reglas de política dependen de `src/api` y `src/policy`.** | Auditoría de política (ST-07/ST-08), relevante para CA-06. |
| G4 | **`runStdio` acepta un parámetro `test` con `testOnly:true`** (`src/server/stdio.ts:12-14`). No verifiqué que el punto de entrada de producción nunca lo pase. | Comprobarlo en la auditoría del servidor. |
| G5 | **No hay prueba para `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` (CA-01), direcciones IPv6 con IPv4 incrustada (CA-04) ni ruta de configuración relativa (CA-05).** | Añadir las pruebas indicadas en §3. |

## 5. Cierre documental D1/D2

| ID | Estado | Evidencia |
|---|---|---|
| D1 (`NODE_OPTIONS` y `NODE_EXTRA_CA_CERTS` en `--env-file`) | **Cerrado en las guías principales; incompleto en dos sitios.** | Corregido en `docs/configuration.md:11` y `docs/es/getting-started.md:36`. `docs/troubleshooting.md:9` y `.env.example` **no** mencionan `NODE_OPTIONS` ni `NODE_EXTRA_CA_CERTS`. Recomiendo replicar una frase en ambos. |
| D2 (Windows nativo en la guía de clientes) | **Cerrado** | `docs/clients.md:36`: "native Windows token/config-file checks currently fail closed" y uso de Linux/WSL. |

## 6. Conclusión y pendientes

- **Resultado:** 0 defectos Críticos, Altos o Medios. 6 Bajos de código (CA-01 a CA-06) y 1 Bajo de guía (CA-07). Para CA-02 hay que decidir la opción (a) o (b).
- **Pendientes que este informe no resuelve:**
  - las correcciones y sus pruebas;
  - G1 a G5;
  - la auditoría de `server/api/policy/coverage/observability/tools`;
  - las pruebas ST-01 a ST-16 en el commit exacto;
  - la validación de firma y comportamiento en el laboratorio 7.1;
  - la verificación de artefactos y la elegibilidad del proveedor.
- **No se aprueba ni se acepta ningún riesgo.**
