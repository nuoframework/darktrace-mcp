# Revisión independiente de la capacidad de solo lectura de la primera versión estable

**Estado:** revisión independiente con pruebas sintéticas. Fecha: 2026-10-05. Revisor: trabajador despachado (tarea `task_e072f01bb764`).

**Qué no hice:**
- No usé secretos reales ni la API, y no delegué en agentes nativos.
- No cambié la fuente ni fijé el oráculo, y no hice commits.
- Solo creé este archivo.

## Decisión

| Elemento | SHA-256 | Decisión |
|---|---|---|
| Checkpoint de fuente | `7104f8c4518d45f090e471a5c3412bfcebe4bdda54c6d3b543581510ba460be8` | **ACEPTADO**: la denegación inmutable de escrituras es correcta y tiene cero sumideros |
| Contrato candidato `/private/tmp/darktrace-read-only-0mbihxf6/mcp-tool-contracts-first-stable.candidate.json` | `1adf0108cdd6e7c925943be8c46808e11a6ac0f5c9b83e80b08a24eb9f09e19d` | **ACEPTADO** como contrato exacto y completo de esta fuente, con read27 `49e37f62…` y sensitive28 `71de9e47…`, más tres perfiles rechazados. Se acepta con el hallazgo **SC-01 (Bajo, exactitud)**, que conviene corregir antes de publicar la versión estable (§4). |
| Fixture alfa histórico | `37b5af95de1786ecce1b8762e12d2d63e577f171511a9db4964518b13a917f72` | Conservado byte a byte |

Que el root fije el contrato y ejecute las gates completas (suites funcional y de seguridad, Linux Node22/24, Docker y paquete) le corresponde a él. Esta revisión **no** sustituye esas gates.

## 1. Procedencia y entorno

- **Snapshot externo propio:** copia del workspace sin `.git`, `dist` ni `node_modules`, con los `node_modules` del snapshot limpio del piloto, cuyos lockfiles son idénticos. Su agregado de fuente es exactamente `7104f8c4…` antes y después de `npm run build` (salida 0).
- **Entorno:** Node v24.14.1 en macOS arm64.
- **Configuración de las pruebas:** sintética, con tokens falsos y `baseUrl` `https://127.0.0.1`, que el conector rechaza antes de abrir un socket. Los procesos hijo se ejecutaron con `--import test/security/diagnostic-guard.mjs`.

## 2. Revisión del código (diff `4f6ef96c…` → `7104f8c4…`)

- **`policy/release-capability.ts` (`39cb390e…`):** `RELEASE_CAPABILITY` está congelado (`write:false`, `writeCritical:false`) y `releaseAllowsOperation` solo admite `status==='implemented' && tier==='read'`. No recibe entradas, entorno, versión ni flags.
- **`policy/guard.ts`:** `isEligible` aplica el predicado antes que cualquier perfil. En `callTool`, `authorize` se ejecuta **antes** de validar y de `requiresPreview`, y otra vez justo antes del dispatch. Por tanto, ninguna operación no lectora puede devolver una preview ni llegar a la auditoría o al cliente. El código dormido de preview crítica y del resultado desconocido de escritura es inalcanzable en producción.
- **`config/schema.ts` y `config/load.ts`:**
  - `assertReleaseProfiles` rechaza `write` y `writeCritical` a `true` (con `boolean()` estricto, de modo que los valores no booleanos también fallan). Se aplica **antes** de la superposición de archivo y entorno y de nuevo en `parseConfig`.
  - `DARKTRACE_PROFILES` con `write` se rechaza.
  - `DARKTRACE_WRITE_CRITICAL=true` acaba en el rechazo final.
  - Los mensajes son fijos y no reflejan valores.
- **`server/stdio.ts`:** `productionOperationDescriptors` es una lista congelada de solo `operationId`, `method` y `pathTemplate` de las operaciones permitidas. El cliente de producción ya no recibe todos los descriptores no críticos. `testOnly` sigue sin ampliar nada.
- **Otros archivos:** `index.ts` ajusta el texto de ayuda, sin flags nuevos; `coverage/report.ts` añade `releaseEligible` y `releaseCapability` sin cambiar los recuentos del catálogo.

## 3. Pruebas independientes

| Prueba | Resultado |
|---|---|
| Comparación de contratos (`stable-probe.mjs`) | Las listas read y read+sensitive del candidato son **idénticas en JSON** a las del fixture alfa. Mi propia canonicalización (claves ordenadas de forma recursiva, orden de arrays preservado, SHA-256 del JSON UTF-8) reproduce `49e37f62…` y `71de9e47…`. Cada herramienta tiene exactamente nombre, descripción, `inputSchema` y anotaciones, con `readOnlyHint:true` y `destructiveHint:false`. Solo hay dos contratos y la metadata de capacidad es `false/false`. |
| Captura en vivo de `tools/list` del hijo de producción (`dist/src/index.js` con guard) | Coincide con el SHA del candidato en 6 configuraciones: sin `profiles`, alias explícitos a `false`, `DARKTRACE_PROFILES=read`, `sensitiveRead` en archivo, `DARKTRACE_SENSITIVE_READ=true` y `sensitive` con `WRITE_CRITICAL=false`. Las cuatro primeras dan read27 y el resto sensitive28. Sin marcadores de efectos prohibidos. |
| Rechazo al arranque (11 variantes) | `write:true` en archivo; `writeCritical` solo; los dos juntos; **`write:true` en archivo oculto por `DARKTRACE_PROFILES=read`**; `DARKTRACE_PROFILES=read,write` y `=write`; `DARKTRACE_WRITE_CRITICAL=true`; `write:"true"`; `write:1`; `writeCritical:true` en archivo con el entorno a `false`; y `--check-config` con `write:true`. Todas salen con exit 1, sin respuesta MCP ni `tools/list` y sin efectos según el guard. **Total de las dos últimas filas: 84/84.** |
| Configuración falsificada en proceso (`forged-probe.mjs` con guard) | `parseConfig` devuelve `write` y `writeCritical` a `false` en un objeto congelado; `RELEASE_CAPABILITY` no se puede mutar. Con `profiles` falsificados (`write`, `writeCritical`, `export` y `email` a `true`), `eligibleTools` publica 28 herramientas solo de lectura, o 27 sin `sensitiveRead`. Para las **22 operaciones no lectoras** (9 medium, 7 high, 6 critical), `isEligible` es `false` y `authorize` lanza error. Por cada herramienta, con `dryRun` ausente, `true` o `false`, y con `confirm`/`hostApproval`: siempre `isError`, sin `dryRun` ni `parameterNames` y sin canarios. **0 peticiones y 0 auditorías.** |
| Techo del cliente de producción | Los descriptores son de solo lectura, están congelados y su número coincide con las operaciones permitidas (39: 38 GET y 1 POST de Advanced Search). `createHttpClient(base,{operations:productionOperationDescriptors})` rechaza los 22 `operationId` no lectores, sin DNS, HMAC ni socket según el guard. **163/163.** |
| Tests dirigidos del worker de implementación en mi snapshot | 7 archivos: **45/45** correctos, 0 fallos y 0 omitidos |
| Archivo alfa (`test/historical/alpha-read-write`) | Los 10 archivos de `provenance.json` coinciden byte a byte en tres puntos: SHA registrado, copia `.txt` y original en el snapshot exacto de `4f6ef96`. Están fuera de la detección activa (`.txt`). La procedencia registra la fuente `4f6ef96c…` y el fixture `37b5af95…`. |
| Denegaciones activas más estrictas | Comparé cada archivo activo con su copia alfa. Las aserciones eliminadas son exactamente las positivas de escritura (ejecución, IDs de auditoría, content-type de formularios, preview). Se sustituyen por bucles que exigen error, ausencia de `dryRun`, 0 peticiones y 0 auditorías con perfiles falsificados. Los recuentos de tests se mantienen (por ejemplo, `mcp-defense` pasa de 173 a 176 aserciones y `policy-sinks` queda en 64). `test/contract/read-only-release.test.ts` (`93050ec9…`) cubre de forma exhaustiva las 22 operaciones denegadas, el techo de descriptores y la cobertura. |

## 4. Hallazgos

| ID | Sev | Hallazgo | Recomendación |
|---|---|---|---|
| **SC-01** | Bajo (exactitud, no seguridad) | Las 27 descripciones de read27, y las 28 de sensitive28, mantienen la frase genérica alfa "Writes default to a preview; dryRun:false is required for eligible medium/high…". Ningún `inputSchema` expone `dryRun` y las escrituras se deniegan, pero el texto que ve el modelo describe una capacidad que esta versión no tiene. | Antes de publicar la versión estable, cambiar esa frase en el código por una que diga que esta versión es solo de consulta, generar un **candidato nuevo** y someterlo a revisión independiente. Si el root decide publicar con el texto actual, debe documentarlo como limitación conocida. Este candidato es el contrato exacto de `7104f8c4` y queda aceptado como tal. |
| SC-02 | Info | En `test/unit/policy.test.ts`, las cuatro pruebas de reemplazo tienen el mismo cuerpo y usan solo `darktrace_update_device`, así que hay poca diversidad. La cobertura exhaustiva está en `read-only-release.test.ts` y en mis sondas. | Opcional: parametrizar por tier. |
| SC-03 | Info | La garantía cubre el límite MCP compilado de producción. El cliente HTTP genérico sigue pudiendo firmar POST/DELETE con descriptores propios, que es lo que prueban los tests de bajo nivel, como declara la propuesta. | Mantener esta frontera documentada. |

## 5. Pendiente

- El root fija el fixture estable y actualiza MR04 en una tarea aparte.
- Faltan las suites funcional y de seguridad completas sobre `7104f8c4`, así como Linux Node22/24, Docker (imagen reconstruida), paquete y evidencia de release (owner del segundo worker o del packaging).
- Falta la campaña de lectura del root con el harness `72e13efd…` y un manifiesto nuevo.

No se acepta ningún riesgo de forma genérica.

## 6. Addendum 2026-10-05: corrected checkpoint `d4d3f78c` and closure of SC-01

Delta review limited to the correction of SC-01 (task `task_b03b0c8c7270`). The decision above on `7104f8c4…` and `1adf0108…` stands as historical evidence and is not rewritten.

| Element | SHA-256 | Decision |
|---|---|---|
| Corrected source (`/private/tmp/darktrace-release-description-1uibjurc`) | `d4d3f78c3a8e6668fcab76b483d6ec5d13a20e34b3f08853651f2039a985fb87` | **ACCEPTED** |
| New full candidate `mcp-tool-contracts-first-stable.candidate.json` | `ea31d70a484c0d0353cb8651edc4b6a4ab13798c096056e8cdcf68e78324707f` | **ACCEPTED** |
| read27 contract | `6ce22e568592b27281d14b1fd7361f80da1e0daf7bb2888c892458cc9f532e68` | Accepted |
| sensitive28 contract | `def9a8db53e2fc4d000257d865a2da5c2453c30285e6fb61244ce02c57434a6b` | Accepted |

**Evidence (independent, synthetic, no Docker, secrets or network):**

- **Source delta:** `diff -r` of `src/` between the accepted snapshot `7104f8c4…` and the new one shows **a single line** in `src/tools/index.ts`. The description template replaces "Writes default to a preview; dryRun:false is required for eligible medium/high execution." with "This release exposes consultation operations only; write actions are unavailable." Policy, configuration, descriptors, schemas and the rest of the template are identical. The "Critical actions are preview-only…" tail only applies to tools with a critical operation, which are not published in this release.
- **Candidate delta (`ea31d70a…` vs `1adf0108…`):** the 55 descriptions (27 + 28) differ **only** by that exact replacement. Names, order, `inputSchema`, annotations, key structure, `canonicalization`, `releaseCapability`, `alphaFixtureSha256` and `rejectedProfiles` are identical. No description retains "Writes default" or `dryRun`. My compact canonicalization reproduces `6ce22e56…` and `def9a8db…`.
- **Production capture:** I built my own snapshot whose `src/` is byte-identical to the new one (aggregate `d4d3f78c…`). The production child's `tools/list` (`dist/src/index.js` with `diagnostic-guard`) **matches the new candidate** in the 6 supported configurations. The 11 write variants remain rejected at startup, with no side effects. **102/102** checks pass, including tamper negatives: altering a description, reverting the sentence, the schema, an annotation, the order, a name, removing a tool or duplicating one all change the hash.
- **No regression in the guard:** the forged-configuration probe on the new build passes **163/163**, with 22 non-read operations denied, no preview, 0 requests and 0 audits.

**SC-01: CLOSED.** The descriptions no longer advertise unavailable write capabilities. SC-02 and SC-03 remain informational, unchanged.

**No oracle has been pinned.** The root pins the fixture and authorizes the full gates (functional and security suites, Linux, Docker, package) on `d4d3f78c`.
