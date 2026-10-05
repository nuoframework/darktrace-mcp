# Inicio rápido

[README en inglés](../../README.md) · [Clientes](../clients.md) · [Configuración](../configuration.md)

Integración MCP privada por stdio, con Node.js 22+. En Windows nativo, las comprobaciones de archivos token/JSON fallan de forma cerrada: ejecuta Node en un entorno Linux/WSL aprobado, con rutas absolutas de ese entorno, archivos del UID de ejecución Linux y un sistema de archivos que aplique los permisos exigidos. No desactives ni debilites las comprobaciones. El contrato fuente documenta API 6.1; la instancia objetivo de laboratorio 7.1 **NO ESTÁ VALIDADA**. No existe publicación npm ni imagen distribuida.

## Instalar una versión revisada

Las entregas se preparan como prereleases privadas de GitHub. Sigue [la guía de versiones](../releases.md): descarga una etiqueta explícita con `gh release download`, verifica `SHA256SUMS` e instala el `.tgz` con `npm install --ignore-scripts --omit=dev`. Usa después la ruta absoluta `node_modules/darktrace-mcp/dist/src/index.js` en el cliente. Incluye SBOM de runtime verificable, sin afirmar attestation ni validación del appliance 7.1, proveedor o Docker.

## Instalar desde el repositorio privado

Necesitas una sesión de GitHub CLI autorizada para acceder al repositorio.

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

El inventario contiene 79 operaciones: 54 ejecutables según perfil, cinco vistas previas críticas, 19 bloqueadas y una excluida. Lectura es el perfil predeterminado. Las escrituras de riesgo medio/alto requieren opt-in del operador y siguen usando `dryRun:true` por defecto; las vistas previas son locales y no firman ni envían solicitudes. La ejecución crítica está bloqueada permanentemente en esta base. Email, exportación PCAP y transporte HTTP no están disponibles. La aprobación del modelo no es autorización.

En cualquier despliegue, incluso de solo lectura, los resultados pueden entrar en el contexto del cliente y del proveedor del modelo. Revisa elegibilidad organizativa, procesamiento, retención, residencia y reenvío de datos. Advanced Search necesita una evaluación adicional antes de activar `DARKTRACE_SENSITIVE_READ=true`.

Si una escritura termina con timeout o desconexión, su resultado puede ser desconocido. No la reintentes automáticamente; revisa el estado y la auditoría del appliance. Las pruebas offline no constituyen validación de seguridad ni aceptación de riesgos. Consulta [problemas frecuentes](../troubleshooting.md) y la [política de seguridad](../../SECURITY.md).

## Límites de salida y destino

Las vistas conservadoras definidas en código retienen hasta ocho campos principales. `minimized:true` y `unmodeledFieldsOmitted:true` indican proyección, sin garantizar eliminación de datos sensibles arbitrarios anidados. Los objetos desconocidos y mapas se resumen; Advanced Search omite el contenido de `@message` y `@fields`. La redacción cubre valores secretos conocidos y codificaciones soportadas de un paso, sin garantía para transformaciones arbitrarias. Los campos retenidos todavía pueden contener información sensible para el cliente/proveedor.

El conector fija una instantánea DNS de arranque. Los rangos NAT64 estándar (`64:ff9b::/96`, `64:ff9b:1::/48`), 6to4 (`2002::/16`) y Teredo (`2001::/32`) siempre se bloquean, incluso cuando aparentan apuntar a IPv4 pública. Una respuesta DNS prohibida deja el conector en fallo terminal hasta reiniciar el proceso; corregir DNS no reactiva el conector en ejecución. Los prefijos NAT64 propios de un operador no pueden detectarse genéricamente; siguen siendo necesarias allowlists exactas y revisión de la red. El pinning en una red privada real y el appliance siguen sin validación.
