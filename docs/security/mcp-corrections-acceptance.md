# Aceptación independiente de las correcciones IR-01, IR-02 e IR-03 y de UG-01, UG-02 y MR-08

**Estado:** revisión independiente de las correcciones. Fecha: 2026-10-05. Revisor: trabajador despachado (tarea `task_64526a254134`).

**Qué no hice:**
- No edité código, pruebas, el harness, Docker, el README ni versiones, y no hice commits.
- No accedí al laboratorio, no hice llamadas a la API real y no leí configuraciones, tokens ni capturas.
- Lo único que leí fuera del repositorio fue el manifiesto no secreto que el coordinador autorizó.

**Veredicto:**
- **IR-01:** cerrado.
- **IR-02:** cerrado.
- **IR-03:** cerrado tras un hallazgo bloqueante de esta ronda. El primer freeze vinculaba 4 paquetes; la traza mostró 9 más en el proceso padre. El owner lo corrigió y ahora vincula 14, que revalidé.
- **UG-01, UG-02 y MR-08:** cerrados en su alcance documental.
- **Abierto:** solo información residual (§5). La imagen Docker **no** queda aceptada (el escaneo de vulnerabilidades está en remediación por el segundo worker).
- No se acepta ningún riesgo ni se afirma resistencia universal a la inyección de prompts.

## 1. Snapshot congelado y evidencia

| Elemento | Valor y verificación |
|---|---|
| Fuente de producción (`sourceHashes` de `src/`, JSON compacto ordenado) | `eadfe11732bd6c9bfa89cbfbbb2dc530d86e6984ad285576aab49b4dfc01d917`. Recalculado por mí en el workspace, en mi copia y en el snapshot limpio del root (`/private/tmp/darktrace-mcp-ir-live-pilot`): **coincide**. |
| `test/security/mcp-defense.test.mjs` | `ce7f63514613f432ac68ab61bc3aefebb3ecdb788474042749a5adb17f10367e` (coincide) |
| Harness IR-03 (freeze final, 14 paquetes) | `scripts/lab-read-smoke.mjs` `c9d2dbb6ed623ff4e1a5673ffedd93c389c74a658b650db05adc23a46bf0bb4b`; `docs/lab-validation.md` `de9e68d0363a091a3dbffcd1080712ce93752fee2c82efed887e8c6710587de1`. Los freezes de 4 paquetes (`0ec2ba87…`) y de 13 (`c6c49bf4…`) quedaron retirados. |
| Recibos del coordinador (no repetidos) | Node24 `2026-10-05T17-38-27-890Z.json`: 324 casos, **321 PASSED, 0 FAIL, 3 BLOCKED** (macOS no deja crear el bit setgid), seis TLS reales. Linux Node22.23.3 `linux-node22-2026-10-05T17-38-34-552Z.json`: **324/324 PASSED**. |

**Pruebas que ejecuté yo** (Node v24.14.1, Darwin arm64, sin red externa ni credenciales, en copias dentro del directorio temporal de la sesión):

| Prueba | Resultado |
|---|---|
| `node test/security/run-defense-isolated.mjs` sobre una copia `eadfe117…` | Salida 0: **86/86 dirigidas y 106/106 estándar**. El recibo `mcp-defense-2026-10-05T17-44-56-039Z.json` quedó solo en la copia. |
| `ir-probe.mjs` sobre el `dist` compilado de esa copia | Ver IR-01 e IR-02 en §2 |
| Traza de carga de módulos con `module.registerHooks`, `diagnostic-guard` precargado e imports absolutos desde el snapshot limpio, en solo lectura | Ver IR-03 en §2 |
| Negativos del harness: copia del snapshot limpio con el harness y la documentación finales, manifiesto schema 2 generado con el **generador Python documentado** (`b9aabc26…`, 14 árboles, modo 0600, fuera de la copia), `node --import diagnostic-guard` y una ruta de configuración inexistente | Ver IR-03 en §2 |

## 2. Cierre por hallazgo

| ID | Corrección revisada | Mis pruebas | Estado |
|---|---|---|---|
| **IR-01** | `src/shape/output.ts` (`38d50128…`) añade a la lista explícita `U+FE00-FE0F`, `U+E0100-E01EF`, `U+061C`, `U+2028/2029`, `U+00AD`, `U+034F`, `U+115F`, `U+1160`, `U+3164`, `U+FFA0`, `U+180E` y `U+FFF9-FFFB` (482 puntos en total) y mantiene el escape visible, el indicador y las colisiones que fallan cerradas | Los 16 puntos que fallaban en la revisión anterior ahora se neutralizan. Un payload de selectores tras un emoji se marca `changed:true`. Un emoji normal y `café é` no cambian. 86/86 dirigidas pasan. | **CERRADO** (lista explícita; ver residual informativo en §5) |
| **IR-02** | `schema.ts` (`3c2a4be4…`) rechaza `NODE_USE_SYSTEM_CA` siempre que esté definida; `log.ts` (`9080a65f…`) la nombra como variable fija | Los valores `1`, `0`, vacío y `true` se rechazan con `variable=NODE_USE_SYSTEM_CA`; `NODE_EXTRA_CA_CERTS` sigue permitido | **CERRADO** |
| **Helper NATIVE-WARNING** (Linux Node22) | `mcp-defense.test.mjs:252-263`: acepta **una sola** línea literal inicial, `Cannot open directory /etc/ssl/certs to load OpenSSL certificates.\n`, **solo** con plataforma `linux`, versión mayor 22 y valor `'1'`; después exige JSON íntegro. Los negativos cubren valores vacío, 0 y canario, darwin y Node24, prefijo repetido, otra ruta, texto arbitrario, sufijo y añadido final. El escaneo de canarios recorre **todo** stderr, junto con el marcador de efectos prohibidos, `exit 1`, stdout vacío y claves exactas. | Lectura del código y 86/86 dirigidas | **ACEPTADO.** No debilita los oráculos ni oculta otras advertencias. |
| **IR-03** | Primer freeze (`0ec2ba87…`, 4 paquetes): **lo bloqueé**. La traza mostró que el padre carga además `cross-spawn`, `which`, `isexe`, `path-key`, `shebang-command`, `shebang-regex`, `eventsource`, `eventsource-parser` y `pkce-challenge`; `cross-spawn` y `which` son los que lanzan el hijo. Lo envié como `msg_d1b9fb940b6f` y el root lo aceptó (`msg_0b63c1293a62`). Freeze final (`c9d2dbb6…`): `dependencyNames` contiene exactamente esos 13 más `jose`. El árbol completo de cada paquete se hashea antes de importar el SDK, con presupuestos de 4096 archivos, 64 MiB en total, 8 MiB por archivo, 20 s, profundidad 32 y 4096 directorios, sin symlinks ni archivos especiales y con mapas `Object.create(null)`. | La traza del hijo de producción solo carga `core`, `server` y `zod`, todos vinculados. **Negativos:** alterar `cross-spawn/index.js`, `which/package.json`, `jose/package.json`, `isexe/index.js`, `eventsource-parser/package.json`, `zod/package.json` o `dist/src/index.js`; añadir un archivo extra en `pkce-challenge`; meter un symlink en `shebang-regex`; quitar `path-key/package.json`; o poner el manifiesto en 0644: los 11 casos dan **`DIST_NOT_REVIEWED`**. Las líneas base, sin tocar y tras restaurar, pasan la verificación y terminan en `CONFIG_OR_INITIALIZE_FAILED` porque la configuración no existe, con `runtimeManifestSha256 b9aabc26…`. | **CERRADO** |
| **Docker del harness** | `dockerFlags`: `--rm --init --pids-limit=64 --memory=256m --pull=never --log-driver=none --read-only --cap-drop=ALL --security-opt=no-new-privileges`. Imagen fijada por digest. Se comprueban los hashes de `/app/dist/src` con `--network=none` **antes** de montar secretos. Limpieza con stop, kill y `rm --force`, verificando que no queda nada. | Revisión estática; Docker no se ejecutó. Mi aviso de que la documentación no estaba alineada (`msg_bd2ed5f3dde3`) quedó corregido: la línea 262 incluye ahora `--init --pids-limit=64 --memory=256m`. | **ACEPTADO de forma estática.** La imagen **no** queda aceptada (el escaneo está en remediación). |
| **UG-01** | `docs/clients.md:11` y `:40`: preferir el ámbito de usuario y revisar comandos, argumentos y entorno del `.mcp.json` del workspace | Revisión documental | **CERRADO** (documental) |
| **UG-02** | `examples/docker.mcp.json`: `--pull=never` y la imagen sustituida por `REPLACE_WITH_IMAGE_ID_FROM_DOCKER_INSPECT`; README, `configuration.md:121` y `clients.md:62` indican el ID exacto `sha256:` | Revisión documental | **CERRADO** (documental) |
| **MR-08** | `docs/clients.md:7`: usar un host o perfil MCP dedicado y revisar los demás servidores si el perfil es compartido. Las guías no mencionan el Inspector, así que no hace falta fijar su versión. | Revisión documental | **CERRADO** (documental) |

## 3. Límites de las pruebas propias

- No ejecuté TLS real, Docker Engine, Linux, Node22 ni el laboratorio. Me apoyo en los recibos del coordinador.
- El harness suprime su propio stderr, así que el marcador de `diagnostic-guard` no se ve en sus ejecuciones. La garantía en los negativos es que fallan antes de importar el SDK o de lanzar el hijo.
- En las líneas base, el hijo de producción (sin guard) termina al no encontrar la configuración, antes de cualquier resolución de red.
- El manifiesto anterior del root (`/private/tmp/darktrace-mcp-ir-reviewed-runtime.json`, `73768de0…`) es de 4 árboles y el harness final lo rechaza; no debe usarse.
- El nuevo manifiesto del root, `/private/tmp/darktrace-mcp-ir14-reviewed-runtime.json`, **es byte a byte idéntico** al que generé yo de forma independiente: SHA-256 `b9aabc2681019d1e64184fc077899a816e8529be94f451803a6962ca002a99fb`, schema 2, 42 archivos de fuente, 25 de runtime y 14 árboles. Tiene modo 0600, `nlink 1` y propietario el UID actual. El snapshot del piloto contiene el harness `c9d2dbb6…` y la documentación `de9e68d0…`.
- Esto acepta el binding de IR-03 para el piloto. **No** autoriza el laboratorio: esa decisión es del root.

## 4. Siguiente gate en vivo: límites del harness (recomendación; no implementado)

**Observación del coordinador:** los metadatos `get_models`, `tags`, `components`, `metrics` y `enums` devolvieron HTTP 200, pero se rechazan por `too_large` con el límite del harness de 32 KiB y 8192 caracteres. Es un límite deliberadamente inferior al del producto (2 MiB y 60 000 caracteres), no una incompatibilidad de la API.

Propuesta, siguiendo el principio de mínimo dato:

1. **Una tabla fija y revisada de límites por operación**, con techo menor o igual al valor por defecto del producto, fijada como variables de entorno de solo bajada del hijo:
   - `get_status` y `enums`: 32 KiB / 8 192.
   - `tags` y `components`: 256 KiB / 30 000.
   - `models` y `metrics`: 1 MiB / 60 000.
   - Nunca más de 2 MiB / 60 000.
   
   La tabla forma parte del código revisado del harness y su SHA-256 se emite en el informe.
2. **Sin autoincremento ni reintentos.** Un `too_large` se registra como resultado; repetir con otro nivel exige una nueva ejecución decidida explícitamente por el operador y un nivel ya presente en la tabla. Se mantienen 1 GET por operación, ejecución secuencial, `MAX_GET_RETRIES=0`, `MAX_PAGES=1` y los perfiles de solo lectura.
3. **El informe del padre no cambia:** solo booleanos de forma, códigos fijos y tiempos, sin cuerpos, recuentos, nombres ni IDs. Los IDs que se reutilizan entre operaciones viven solo en memoria.
4. **Descubrimiento de dispositivos:** `get_devices` con `count=1` y **sin** `seensince` es aceptable como inventario mínimo para obtener un único `did` para las operaciones dependientes. Debe ser un GET acotado por el esquema del producto (`count` entre 1 y 1000), pasar por la vista minimizada y no emitir hostname ni IP en el informe. No es un escaneo. Es de sensibilidad media, así que conviene mantenerlo en una fase separada y aprobada.
5. **`/filtertypes` responde 302:** el rechazo de la redirección es correcto y debe seguir así. Registrar solo el estado (redirección rechazada) sin exponer `Location`, y clasificarlo como un hueco de compatibilidad entre el contrato 6.1 y 7.1, que se analiza contra la especificación local sin seguir la redirección.

## 5. Residual y pendientes

- **Informativo (IR-01):** 47 code points de la categoría `Cf` quedan fuera de la lista explícita, una decisión documentada. Entre ellos `U+206A-206F`, `U+0600-0605`, `U+06DD`, `U+070F`, `U+0890-0891`, `U+08E2`, `U+110BD`, `U+13430…`, `U+1BCA0-1BCA3` y `U+1D173-1D17A`. Sugerencia para una ronda futura: añadir al menos `U+206A-206F`, `U+1BCA0-1BCA3` y `U+1D173-1D17A`, que son invisibles y *default-ignorable*. No bloquea, porque la decisión no pretende cobertura total.
- **Pendientes:**
  - Manifiesto de 14 árboles para el piloto.
  - Remediación y aceptación de la imagen Docker.
  - Ejecuciones del laboratorio 7.1 y del proveedor.
  - ST-15 sobre el artefacto final.
  - Ninguno se da por cerrado aquí.
