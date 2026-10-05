# Revisión de huecos a partir de las fuentes aportadas por el usuario

**Estado:** comparación documental de tres fuentes con la investigación previa y con la fuente final. Fecha: 2026-10-05. Revisor: trabajador despachado (tarea `task_555093a19f37`).

**Qué se compara:**
- Investigación previa: `mcp-attack-research.md` (MR-01 a MR-08).
- Fuente final: `d72e89282f7369e382ea2b40fc3d665d584721723e148540b7fcb38eb6023430`.
- Revisión de las defensas: `mcp-defense-independent-review.md` (IR-01 a IR-03).

**Resultado:** aparecen **3 vectores nuevos aplicables**, todos de severidad Baja o Baja-Media (UG-01 a UG-03). El resto ya estaba cubierto o no aplica a un servidor stdio sin escucha. Lo que no pruebo lo marco como **propuesto**.

## 1. Acceso a las fuentes

| Fuente | URL | Acceso | Límite |
|---|---|---|---|
| HackTricks, *AI MCP Servers* | https://hacktricks.wiki/en/AI/AI-MCP-Servers.html | La URL responde **302** a `tollbit.hacktricks.wiki`, una pasarela de acceso; el root obtuvo **402**. **No intenté eludirla.** Leí la fuente pública oficial upstream: https://raw.githubusercontent.com/HackTricks-wiki/hacktricks/master/src/AI/AI-MCP-Servers.md | La copia upstream de `master` puede diferir de la página publicada. No muestra fecha de actualización. |
| OWASP MCP Top 10 | https://github.com/owasp/www-project-mcp-top-10 (y `/tree/main/2025`) | Leída | Los nombres de los archivos de `/2025` dicen **MCP06 "Intent-Flow-Subversion"**, mientras que el resumen del README que obtuve llamaba a MCP06 "Prompt Injection via Contextual Payloads". No lo verifiqué palabra por palabra, así que cito MCP06 por su archivo. |
| OWASP MCP Security Cheat Sheet | https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html | Leída (todas las secciones y la lista de qué hacer y qué no) | — |

## 2. Comparación de vectores

**Leyenda:**
- **CUBIERTO:** hay una prueba o control existente.
- **N/A:** el vector requiere HTTP u OAuth, una escucha, o es un producto ajeno.
- **NUEVO:** un hueco aplicable no recogido antes.

| Vector (fuente) | Aplicabilidad aquí | Estado | Evidencia / ID |
|---|---|---|---|
| Tool poisoning, descripciones y esquema completo como superficie de inyección (CS §2, HT 1, OWASP MCP03) | Las descripciones son código fijo y los esquemas, estrictos (`additionalProperties:false`) | CUBIERTO | MR-04 (contratos y hashes), sondeo P1 de `mcp-attack-research` |
| Rug pull: definiciones aprobadas ayer que cambian hoy (CS §2 y §9) | Las herramientas no cambian en tiempo de ejecución (`listChanged:false`) | CUBIERTO en el servidor | MR-04; integración en `build-evidence` DEFERRED |
| Inyección indirecta mediante datos devueltos (CS §12, HT 2, MCP06/MCP10) | Sí | CUBIERTO parcialmente | ST-06.INJECTION, vistas minimizadas ST-09, MR-01. **Hueco IR-01** (selectores de variación y otros invisibles). El CS dice que quitar etiquetas y detectar patrones es solo complementario, coherente con no afirmar resistencia semántica. |
| Shadowing entre servidores (CS §8) | Residual del host | PENDIENTE | MR-08 (guía no publicada todavía) |
| Exfiltración por canales legítimos y exceso de permisos (CS) | Sí | CUBIERTO | MR-06 (`sensitiveRead` y escritura excluyentes), ST-07, ST-08 |
| Ejecución de código antes del primer prompt desde la configuración del repositorio y secuestro de variables (`PATH`, `BASH_ENV`, `LD_PRELOAD`) (HT 3) y CVE-2025-54136 "MCPoison" (HT 10) | **Sí, a nivel de host.** `docs/clients.md:11` recomienda usar el ejemplo como `.mcp.json` en la raíz del proyecto. Una configuración versionada en un repositorio puede cambiarse en un commit o PR y apuntar a otro comando con otro entorno. Las variables del cargador nativo (`LD_PRELOAD`, `DYLD_*`) actúan antes de Node y el servidor no puede detectarlas. | **NUEVO, UG-01** | El sondeo de `mcp-defense-independent-review` muestra que `LD_PRELOAD` y `DYLD_INSERT_LIBRARIES` se aceptan, como era de esperar con un operador de confianza |
| Backdoor en la cadena de suministro con el mismo nombre y esquema (HT 4, caso de postmark-mcp) | Sí: dependencias de runtime y de build | CUBIERTO parcialmente | SRI y shrinkwrap con exactamente 3 dependencias (`verify-release`), distribución privada en tgz (MR-03). En modo local del harness, **IR-03** (`node_modules` sin verificar) |
| Typosquatting y nombres exactos de paquete (CS §9) | Sí | CUBIERTO | MR-03 |
| Sustitución de una imagen de contenedor por tag mutable (CS §3 y §9, HT 15 sobre redirección de registro) | **Sí.** `examples/docker.mcp.json` y `configuration.md:120` usan el tag mutable `darktrace-mcp:local` sin `--pull=never`. Cualquier rebuild o retag local cambia la imagen que lanza el host. Por defecto, `docker run` intenta descargar si falta. El harness, en cambio, exige un digest. | **NUEVO, UG-02** | `examples/docker.mcp.json` (`fd6ef3fa…`) |
| Inyección de comandos, `Function()` y RCE en configuración (HT 8 y 13, MCP05) | El servidor no ejecuta comandos ni evalúa configuración: JSON estricto, sin `eval` | N/A en el producto | ST-02/14 JSON, config estricta |
| Puentes localhost, Inspector, AutoJack y WebSocket (HT 7–9) | Sin escucha (ST-16). El Inspector solo importa si se usa en desarrollo. | N/A, más guía | MR-08 (fijar ≥0.14.1, pendiente) |
| Confused deputy OAuth, token passthrough, `Origin`/`Host` en HTTP (CS §6, HT 6, MCP07) | Sin OAuth ni HTTP | N/A | ST-16, ST-03/07/09/16.ENV |
| BOLA/IDOR por JSON-RPC directo (HT 12) | Sí | CUBIERTO | ST-07.MATRIX (llamadas directas a herramientas ocultas), MR-05 |
| Pinning del certificado o identidad criptográfica del servidor (CS §6) | Aplica de forma opcional: hoy se verifica con CA, SNI y pinning DNS, sin pinning SPKI | **NUEVO, UG-03** (Info o Bajo) | Diseño ARCH §5.3 |
| Integridad y replay de mensajes (CS §7, "Message Tampering and Replay") | HMAC con ventana de ±30 min del appliance (TM-03); el MCP sobre stdio no lo necesita | CUBIERTO como residual | TM-03; el CS dice que la firma de mensajes es opcional |
| Registrar las llamadas con los parámetros completos (CS §10) | **Divergencia deliberada:** la auditoría guarda 5 campos sin parámetros (privacidad, ARCH §5.6) | Documentado, no es un hueco | ST-13. La decisión tiene que quedar explícita frente al CS (ver UG-03, nota) |
| Contrabando en marketplaces de skills y relleno masivo (HT 5 y 15) | No hay skills. Los límites de salida (60k) y entrada (64 KiB) acotan el relleno. | N/A o CUBIERTO | ST-11.OUTPUT, ST-11.FRAMES |
| Herramientas de pentest como MCP-ASD/Burp (HT 14) | Metodología para transportes HTTP, SSE o WebSocket | N/A | — |

## 3. Vectores nuevos aplicables (propuestos, no implementados)

| ID | Sev | Vector y evidencia | Mitigación propuesta | Prueba o fixture sintético propuesto (con `diagnostic-guard`: cero DNS, firmas, sockets y credenciales) | Owner sugerido |
|---|---|---|---|---|---|
| **UG-01** | **Bajo-Medio** (host) | Configuración del host versionada en el repositorio (`.mcp.json`) que puede cambiar el comando o el entorno sin que se vuelva a pedir aprobación (HT 3 y 10, CVE-2025-54136 citado por HackTricks; CS §11: "Re-prompt for consent when tool definitions change", "Show the exact command"). `docs/clients.md:11` recomienda justamente el `.mcp.json` en la raíz del proyecto. | Guía: preferir la configuración de usuario (`~/.claude.json`, `--scope user`) con rutas absolutas al artefacto verificado. No incluir esta configuración en repositorios compartidos, o, si se hace, revisar cualquier cambio de `command`, `args` o `env` como cambio de código. Advertir de que el servidor no puede detectar `LD_PRELOAD`, `DYLD_*`, `BASH_ENV` ni preloads de Node. | Prueba documental: el escáner de MR-03 marca `.mcp.json` versionado como "requiere revisión" y exige la advertencia junto a cualquier recomendación de configuración de proyecto. No requiere red. | docs (owner de guías). Decisión: root. |
| **UG-02** | Bajo | Ejemplo de Docker con tag mutable y descarga implícita (CS §3 y §9; supply chain MCP04) | En `examples/docker.mcp.json` y `configuration.md`, añadir `--pull=never` y referenciar la imagen por ID o digest local (`darktrace-mcp@sha256:…` o el ID de `docker image inspect`), igual que hace el harness | Prueba estática en `validate-examples`: cualquier ejemplo `docker run` debe incluir `--pull=never` y una referencia `@sha256:` o un ID de imagen. Sin Docker Engine. | Docker/docs (Luna, que ya tiene Docker final en curso) |
| **UG-03** | Info | Pinning SPKI opcional, recomendado por el CS como "Verify server identity via certificate pinning", y divergencia de auditoría frente al CS §10 | Propuesta de diseño, no requisito: una lista opcional `instance.spkiPins` validada en `checkServerIdentity`. Registrar en ARCH que la auditoría sin parámetros es una divergencia deliberada del CS por privacidad. | Si se implementa: prueba TLS local con una CA sintética y un pin incorrecto → 0 bytes firmados. | arquitectura y root |

## 4. Límites

- **HackTricks:** solo leí su copia pública upstream; la página publicada está detrás de una pasarela (402) y no la eludí.
- **Fuentes:** las resumí con una herramienta de lectura web. Las afirmaciones literales que importan están citadas o se pueden contrastar en las URLs.
- **CVE:** no verifiqué de forma independiente los que cita HackTricks (CVE-2025-54136, CVE-2025-64755, CVE-2025-58444, CVE-2025-59528, CVE-2025-8943); los atribuyo a HackTricks. Ninguno afecta al código de este servidor.
- **Qué se probó:** las pruebas que ejecuté están en `mcp-defense-independent-review.md`. Lo de este documento son propuestas.
- No se accedió al laboratorio, no se leyeron credenciales y no se acepta ningún riesgo.
