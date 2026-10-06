# Inicio rápido

[README en inglés](../../README.md) · [Clientes](../clients.md) · [Configuración](../configuration.md)

Integración MCP privada por stdio. La versión 1.0.0 aplica **19 selectores GET validados en 15 herramientas MCP** ([correspondencia](../../README.es.md#herramientas-de-esta-versión)). `read` y `read` + `sensitiveRead` exponen el mismo contrato completo; la lectura sensible no puede ampliar este límite. Advanced Search y todos los demás selectores excluidos, incluidas las escrituras, se rechazan antes de cualquier vista previa, auditoría o acceso de red. La política de release inmutable deniega escrituras y capacidades críticas antes del registro o la firma, sin herramientas ni vistas previas de escritura; se aplazan a una versión posterior. En Windows nativo, las comprobaciones de archivos token/JSON fallan de forma cerrada: ejecuta Node en un entorno Linux/WSL aprobado, con rutas absolutas de ese entorno, archivos del UID de ejecución Linux y un sistema de archivos que aplique los permisos exigidos. No desactives ni debilites las comprobaciones. El contrato fuente documenta API 6.1; la imagen arm64 actual superó las 19 recetas acotadas en lab 7.1.0 ([checkpoint de lab](../security/patched-runtime-lab-checkpoint.md)), sin validar todas las variantes; consulta la [validación de laboratorio](../lab-validation.md) y los [requisitos de versión estable](../stable-readiness.md). No existe publicación npm ni imagen distribuida.

Docker es la vía recomendada: incluye Node.js 24.18.1 mantenido por Alpine con OpenSSL 3.5.9 compartido, en una imagen `scratch` no root, sin shell ni listener. Compílala con la [receta de dos pasos](../docker.md#build); los archivos de imagen privados precompilados están previstos pero no publicados. El estado actual (lab arm64 19/19 superado, la coincidencia zlib y su revisión, el gate de seguridad amd64 pendiente) está en la [guía Docker](../docker.md#current-candidate-at-a-glance). Para el cliente, usa la ruta absoluta de Docker, `-i` sin TTY, `--pull=never` con el ID de imagen, `--log-driver=none`, `--read-only`, `--cap-drop=ALL`, `no-new-privileges` y tokens montados en solo lectura propiedad del UID de ejecución; consulta los [montajes de secretos](../configuration.md#container-secret-mounts) y el [ejemplo de cliente Docker](../../examples/docker.mcp.json). En Docker Desktop, el propietario debe superar `--check-config` sin relajar comprobaciones. Desactivar el registro de Docker no impide que el host MCP envíe resultados a su proveedor. Limita la salida al appliance con política de red y no uses red del host. Antes de distribuir una imagen derivada, revisa las obligaciones de licencia y avisos.

## Instalar una versión revisada

Las entregas se preparan como prereleases privadas de GitHub. Sigue [la guía de versiones](../releases.md): descarga una etiqueta explícita con `gh release download`, verifica `SHA256SUMS` e instala el `.tgz` con `npm install --ignore-scripts --omit=dev`. Usa después la ruta absoluta `node_modules/darktrace-mcp/dist/src/index.js` en el cliente. Esa prerelease alpha es histórica: es anterior al contrato de 15 herramientas y al runtime parcheado.

## Instalar desde el repositorio privado

Necesitas una sesión de GitHub CLI autorizada para acceder al repositorio, Node.js 22+ y npm.

> **OpenSSL del runtime.** Docker es la vía recomendada. Las releases oficiales de Node.js upstream examinadas el 2026-10-05 incluyen OpenSSL 3.5.8, afectado por CVE-2026-35189. Usar Node 22 o 24 **no** basta por sí solo para tener una instalación nativa parcheada. Para instalar en nativo, usa un runtime Node.js mantenido cuyo OpenSSL hayas verificado de forma independiente como **3.5.9 o posterior**, por ejemplo con `node -p 'process.versions.openssl'` y los registros de paquetes de tu distribución.

```sh
gh auth status
gh repo clone nuoframework/darktrace-mcp
cd darktrace-mcp
npm ci --ignore-scripts
npm run build
node dist/src/index.js --help
node dist/src/index.js --version
```

## Preparar credenciales y comprobar configuración

Pide a tu gestor de secretos aprobado que cree dos archivos separados fuera del repositorio: token público y token privado. Deben tener rutas absolutas, pertenecer al usuario que ejecuta Node, ser archivos regulares sin enlaces simbólicos, medir como máximo 4.096 bytes y tener permisos `0600` o más restrictivos. No pegues tokens en comandos, JSON, chat ni Git.

```sh
export DARKTRACE_URL='https://darktrace.example.internal'
export DARKTRACE_PUBLIC_TOKEN_FILE='/ruta/absoluta/privada/darktrace/token-publico'
export DARKTRACE_PRIVATE_TOKEN_FILE='/ruta/absoluta/privada/darktrace/token-privado'
export DARKTRACE_PROFILES='read'
export DARKTRACE_SENSITIVE_READ='false'
node dist/src/index.js --check-config
```

Los controles de propietario, permisos, tamaño y apertura sin enlaces se aplican a los archivos JSON/token que lee el servidor. Si usas `--env-file` de Node, Node lo carga antes del arranque: el servidor no valida ese archivo ni le aplica los límites de JSON/token. El operador debe protegerlo y verificarlo externamente, con propietario del operador, modo `0600` y ubicación fiable sin enlaces; solo debe contener ajustes no secretos y rutas de archivos token, nunca valores de tokens.

Node también aplica desde ese archivo `NODE_OPTIONS` (puede precargar código ejecutable) y `NODE_EXTRA_CA_CERTS` (amplía la confianza TLS) antes del servidor. Solo configúralas allí tras revisión explícita y protege la integridad del archivo como la de código ejecutable: es configuración de host confiable, sin garantía de aislamiento del servidor. Consulta la [configuración](../configuration.md).

La comprobación es local, sin llamadas al appliance: no valida autenticación, conectividad ni compatibilidad 7.1. Configura tu cliente con las rutas absolutas del ejecutable Node y `dist/src/index.js`, siguiendo la [guía de clientes](../clients.md). Para una CA privada usa `NODE_EXTRA_CA_CERTS`; no se permite desactivar TLS.

## Alcance y decisiones del operador

El inventario fuente conserva 79 operaciones como contabilidad de diseño; no describe la superficie activa de esta versión. Lectura es el único perfil aceptado: 15 herramientas y 19 selectores GET en ambos perfiles, sin expansión mediante lectura sensible. Se deniegan todas las operaciones de escritura y críticas, sin ejecución ni vistas previas; las escrituras se aplazan a una versión posterior. Email, exportación PCAP y transporte HTTP no están disponibles. La aprobación del modelo no es autorización.

En cualquier despliegue, incluso de solo lectura, los resultados pueden entrar en el contexto del cliente y del proveedor del modelo. Revisa elegibilidad organizativa, procesamiento, retención, residencia y reenvío de datos. `DARKTRACE_SENSITIVE_READ=true` no habilita Advanced Search ni amplía el límite validado.

Esta versión no tiene operaciones de escritura. Si una versión posterior revisada las habilita, trata los timeouts o la desconexión como un resultado desconocido y revisa el estado y la auditoría del appliance antes de actuar; nunca reproduzcas una solicitud POST/DELETE. Las pruebas offline no constituyen validación de seguridad ni aceptación de riesgos. Consulta [problemas frecuentes](../troubleshooting.md) y la [política de seguridad](../../SECURITY.md).

## Límites de salida y destino

Las vistas conservadoras definidas en código retienen hasta ocho campos principales. `minimized:true` y `unmodeledFieldsOmitted:true` indican proyección, sin garantizar eliminación de datos sensibles arbitrarios anidados. Los objetos desconocidos y mapas se resumen. La redacción cubre valores secretos conocidos y codificaciones soportadas de un paso, sin garantía para transformaciones arbitrarias. Los campos retenidos todavía pueden contener información sensible para el cliente/proveedor.

El conector fija una instantánea DNS de arranque. Los rangos NAT64 estándar (`64:ff9b::/96`, `64:ff9b:1::/48`), 6to4 (`2002::/16`) y Teredo (`2001::/32`) siempre se bloquean, incluso cuando aparentan apuntar a IPv4 pública. Una respuesta DNS prohibida deja el conector en fallo terminal hasta reiniciar el proceso; corregir DNS no reactiva el conector en ejecución. Los prefijos NAT64 propios de un operador no pueden detectarse genéricamente; siguen siendo necesarias allowlists exactas y revisión de la red. La evidencia de lab acotada no valida todos los despliegues, hosts ni configuraciones de red.
