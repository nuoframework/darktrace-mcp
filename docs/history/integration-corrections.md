# Correcciones de auditoría del servidor

Fecha: 2026-10-05. Se implementaron SA-01 a SA-06, la defensa de ejecución G4 y la ampliación AD-03 de minimización de salida de [la auditoría independiente](../security/code-audit-server.md). Typecheck pasa; la suite completa de la instantánea aislada pasa **101/101** y las nuevas pruebas de corrección pasan **12/12**, sin fallos, cancelaciones, skips ni todos. Dos builds reproducen exactamente catalogue, mapping, listas/vistas de respuesta y coverage.

Este informe supera las afirmaciones afectadas de [integration-report.md](integration-report.md), que se conserva sin editar. Los resultados son evidencia de implementación offline; no aprueban ST, laboratorio 7.1 ni publicación.

## Cambios y oráculos

| Hallazgo | Corrección actual | Evidencia |
|---|---|---|
| SA-01 | El evento fijo `startup_error` puede añadir `variable` únicamente para un primer token exacto en una lista blanca code-owned, procedente de `ConfigValidationError`. Nunca se refleja el mensaje, valor, ruta ni nombre desconocido. | Proceso real en startup, doctor y check-config con `HTTPS_PROXY` y perfiles inválidos: salida 1, stdout vacío y stderr solo event/ts/variable, sin canarios de URL, usuario, contraseña, perfil ni tokens; errores libres y nombres/rutas desconocidos no reciben variable. |
| SA-02 | Las operaciones con parámetro de ruta requerido que identifica el recurso no reciben la ventana de una hora. El lookup por `pbid` conserva solo el identificador; los rangos enviados se siguen validando y las colecciones conservan su default. | `get_modelbreaches_pbid` produce query vacía sin tiempo; admite límite exacto de siete días y rechaza siete días más 1 ms. Coverage registra omisión sin default para su starttime/endtime. |
| SA-03 | Las reglas string code-owned agrupan selector, aplicación y descripción; se registran sobre el esquema Zod resultante y coverage copia ese registro, en vez de adivinar los refinements de JSON Schema. Incluye IP literal, UTC/calendario, count/limit/size decimal, offset/page decimal, listas y máximos documentados de texto; timeframe también lleva registro y hash declara su validación adicional. | Toda regla registrada de parámetros/body se compara con coverage; las comprobaciones custom directas necesitan registro. IP inválida, 2026-02-30, count 1001, offset 100001 y el techo documental de texto se rechazan. 40 entradas tienen `additionalRules` con ID/descripción y `additionalRule` legible. |
| SA-04 | `z.toJSONSchema(...,{io:'input'})` en tools/list; también en coverage. | Handshake/lista real mediante SDK InMemoryTransport: operation/dryRun con default no se anuncian obligatorios en herramienta de una operación y omitir dryRun conserva preview. |
| SA-05 | `src/api/tool-groups.json` contiene los 79 IDs y sus grupos, incluido null para la operación excluida. El generador exige correspondencia exacta con el inventario y ya no lee architecture Markdown ni expande abreviaturas de prosa. | Generador compilado ejecutado en carpeta mínima sin architecture Markdown produce 79 filas con el mapping code-owned; catalogue conserva su hash histórico. |
| SA-06 | `capabilities.tools.listChanged:false` se configura mediante la API del SDK, sin alterar internals. | `Client.getServerCapabilities()` tras handshake observa false. |
| G4 | Una dependencia de prueba solo se admite si el objeto tiene una propiedad propia testOnly con el booleano literal true; rechazo antes de leer client o crear transporte. El entrypoint mantiene `runStdio(cfg)` sin segundo argumento. | False, ausencia, string, número, null y true heredado se rechazan sin tocar el getter del cliente. AST del entrypoint verifica una única llamada con cfg y sin imports de pruebas. |
| AD-03 / minimización de salida | Listas de campos code-owned por operación en response-fields.json, derivadas de schemas de respuesta 6.1 locales y congeladas como política de código. El generador compila un árbol explícito tipado en response-views.generated.json, separado del catálogo de permisos. Se proyecta después de ctx.shape y antes de redacción/salida. Unknown fields se descartan; objetos/maps no tipados y variantes incompatibles devuelven resumen fijo sin valores. Advanced Search excluye @message y mapas @fields; fields del caller nunca decide la allowlist. | Cuatro oráculos nuevos: status conserva version no confiable y omite unknown/rawMailBody/credentials; una transformación no puede añadir claves; Advanced Search omite claves extra anidadas, mapas y raw telemetry aunque se soliciten; estructuras sin vista no reflejan canarios. Las 79 filas de coverage describen outputView. |

Coverage conserva **79 filas de operación** (59 implemented, 19 blocked y una excluded) y **418 entradas** de parámetros/body/variantes/campos decodificados (383 accepted y 35 blocked). Los estados no equivalen a herramientas ejecutables; las formas temporales desconocidas y las operaciones bloqueadas siguen rechazadas, y validatedOn permanece vacío.

La afirmación histórica de que todas las reglas ajenas a JSON Schema estaban declaradas era incompleta (SA-03). El registro actual recoge los refinements string implementados y sus descripciones desde el validador; los controles entre campos, de entrada, de ruta, de policy y de hash se mantienen como controles distintos. No se afirma que JSON Schema por sí solo exprese toda la validación.

## Comandos y resultados exactos

Copia aislada: `/private/tmp/darktrace-sa-ctx_ab921972672d`, con src/test/scripts/docs/openapi, package.json y ambos tsconfig copiados del workspace, y node_modules enlazado a las dependencias instaladas. Node **v24.14.1**. Los builds escriben en esta copia; se persisten en el workspace las vistas generadas y el coverage ya verificados.

| Comando | Cwd | Resultado |
|---|---|---|
| `npm run typecheck` | workspace | Salida 0; tsc sin errores, repetido después de persistir coverage. |
| `npm test > /private/tmp/darktrace-sa-test.log 2>&1` | copia aislada | Salida 0; build y 101/101 pruebas; 0 fallos/cancelled/skipped/todo; 1237.183208 ms. |
| `node --test dist/test/contract/corrections.test.js dist/test/mcp/corrections.test.js dist/test/contract/response-view.test.js > /private/tmp/darktrace-sa-regression.log 2>&1` | copia aislada | Salida 0; 12/12; 0 fallos/cancelled/skipped/todo; 904.000375 ms. |
| `npm run build > /private/tmp/darktrace-sa-build2.log 2>&1` | copia aislada | Salida 0; segundo build sin cambiar sus inputs. |
| `cp /private/tmp/darktrace-sa-ctx_ab921972672d/src/api/response-views.generated.json src/api/response-views.generated.json` | workspace | Salida 0; vistas generadas persistidas. |
| `cp /private/tmp/darktrace-sa-ctx_ab921972672d/src/coverage/report.generated.json src/coverage/report.generated.json` | workspace | Salida 0; coverage durable persistido. |

Captura de hashes antes del segundo build (ejecutada con python3 en la copia):

```python
from pathlib import Path
import hashlib,json
files=['src/api/catalogue.generated.json','src/api/tool-groups.json','src/api/response-fields.json','src/api/response-views.generated.json','dist/src/api/response-views.generated.json','src/coverage/report.generated.json','dist/src/coverage/report.generated.json']
Path('/private/tmp/darktrace-sa-rebuild-before.json').write_text(json.dumps({f:hashlib.sha256(Path(f).read_bytes()).hexdigest() for f in files},indent=2))
```

Comparación después del segundo build (misma ubicación):

```python
from pathlib import Path
import json,hashlib
expected=json.loads(Path('/private/tmp/darktrace-sa-rebuild-before.json').read_text())
for file,digest in expected.items():assert hashlib.sha256(Path(file).read_bytes()).hexdigest()==digest,file
print('Two builds reproduce catalogue, tool mapping, response fields/views and source/compiled coverage')
print(json.dumps(expected,indent=2))
```

Salida 0, sin diferencias entre los dos builds. El JSON de vistas fuente y compilado es semánticamente igual (comparación de JSON parseado), aunque tsc cambia su formato: digest fuente 0b8870f9611af5ba26e7c004f36f4feff9e0212e3bfb0e7110e98465de487838; compilado 180038582a5f979935f5fd9fafe03167e3ecdc7a2750f5e8ea7a79fa15253d7f. Source y compiled coverage tienen el digest `861e2e5cddf65c30f3e939acf7716334c2a774f7aa6fe1c66a24cec20a98bde2`.

## Fuente exacta verificada

Los hashes siguientes se compararon entre workspace e instantánea compilada y probada; todos coinciden. El catalogue fue regenerado sin diferencia de contenido. Las listas de salida son intencionalmente conservadoras (hasta ocho campos principales por vista ordinaria; excepciones explícitas para status y Advanced Search), no una garantía de semántica 7.1. Los objetos tipados anidados tienen claves del schema local; maps dinámicos carecen de una vista y se resumen. Variantes ambiguas usan una vista compatible con el tipo raíz, pudiendo omitir detalles de otras variantes.

El conjunto completo de fuentes .ts/.json/.mjs bajo src/scripts/test de la instantánea queda en `/private/tmp/darktrace-sa-snapshot-hashes.json`; su SHA-256 agregado, calculado sobre el JSON de ese mapping ordenado y con separadores compactos, es `d605473bbb6df64f5809c457f9a0df1ad34c225051868c110b202660654817d1`.

| Archivo | SHA-256 |
|---|---|
| `src/index.ts` | `64e05f41266823334c396eeef9d1e7e82cb3cb61e9af2aa86157d4f892775a9c` |
| `src/observability/log.ts` | `e6b3b3d350f2e1471c8965ee636bcb1b6e5ae7b93f61b66da003de27bd9e3b3d` |
| `src/server/createServer.ts` | `c01c3ad73e993ae398ba5525bbdc28d34d4265a9e884d13e7488d4060a0b3fbc` |
| `src/server/stdio.ts` | `a8148519a52cb3455de0ae336c1115af5afcd32c5ca161d10b49dcd3ea2463ed` |
| `src/api/operations.ts` | `90370737c78280459a84f5a5fc68b06a3e815b8e74a7c46ca578a4d6a671c8fd` |
| `src/api/validation.ts` | `265a84f9d6c9858121ea00e532858f2f0357bb4a762343718dfcaf87ca560c40` |
| `src/api/tool-groups.json` | `2990cc20fd6ee8c821937f465a028878b1c3893558f27d0aaf9666673eb9e94f` |
| `src/api/response-view.ts` | `c79148dd35414520ac500af0c9d8e6b4c3c0873e61cb1789fdfd0d6e917961f6` |
| `src/api/response-fields.json` | `1e42be59faf7d66aa68a99bb5dc1ba010cda2e18830f45c13aecabcd19e35941` |
| `src/api/response-views.generated.json` | `0b8870f9611af5ba26e7c004f36f4feff9e0212e3bfb0e7110e98465de487838` |
| `src/api/catalogue.generated.json` | `592f9bc1863b23042b1a7c00bb61e113dd019f8d5e73746c6a728e7be87a0f6e` |
| `src/tools/index.ts` | `1c5710ca3e9aeb8f3f974ce8c8714e5ea3243619c8d2e0362e6ca1254ecf9849` |
| `src/coverage/report.ts` | `de8133ab11cbbbca0b3fd9edcdd3a8d94b33893a3156dcf2bcbba36f70c246e5` |
| `src/coverage/report.generated.json` | `861e2e5cddf65c30f3e939acf7716334c2a774f7aa6fe1c66a24cec20a98bde2` |
| `scripts/generate-catalogue.ts` | `c6ccaac505e683b3247ab1e45db56b486de0cf13cd1e45e548af418d675bb72c` |
| `test/contract/corrections.test.ts` | `8b5037dc505f492a97a8dcd021b3a29152e3158bea07c424fd1d4a8246a9b558` |
| `test/contract/response-view.test.ts` | `ca2b068777b1b8d1f7e0587e55f5e38aa44ddc618e873e9444cbfbb877c8ace9` |
| `test/mcp/corrections.test.ts` | `d20a61e540873de3d2051eac50adf16eef6a23bc7bc78d9603c1f0ac0047cb15` |
| `test/unit/policy.test.ts` | `aaa6e264a0d62df23b4c2b4e031ea6d20ce32f0712401b03629c54f9cb7d8857` |

## Coordinación y límites de evidencia

Se notificó estabilidad API/source al dispatch adversarial por Orca; se retiró la primera estabilidad al recibir AD-03 y se notificó una nueva tras implementar y probar las vistas. La campaña independiente confirmó AD-03 Medio antes de esta corrección; este informe registra la corrección local y sus oráculos, y su revalidación independiente sigue bajo su propietario. No se modificó client/config/shape, test/security, guías ni el informe histórico; CA sigue bajo Luna y el adversarial bajo su propietario. Los hashes del conjunto completo identifican la versión de cliente/config incorporada a esta instantánea; estos resultados no declaran terminadas sus correcciones posteriores ni la validación adversarial independiente.

No hubo laboratorio, credenciales reales, commits, publicación ni despliegue. Node 22, ST-01..16 en commit exacto, compatibilidad y autorización del appliance 7.1, verificación de artefactos y elegibilidad del proveedor siguen fuera de esta evidencia. Los canarios y fixtures usados son sintéticos. Las herramientas críticas siguen siendo preview-only; email/export y las formas no revisadas siguen bloqueadas.
