# Resumen de seguridad

**Español** · [English](en/security.md)

[README](../README.md) · [Política de seguridad](../SECURITY.md) · [Configuración](configuration.md) · [Arquitectura](architecture.md)

Cómo protege el servidor tu appliance y tus datos, y cuáles son sus límites.

<a id="security-overview"></a>

Esta página explica las protecciones en términos prácticos. Las revisiones y los registros detallados están en [docs/security/](#registros-detallados).

<a id="what-the-server-does-for-you"></a>

## Qué hace el servidor por ti

| Protección | Qué significa |
|---|---|
| Tú eliges los permisos | Configuras los perfiles (`read`, `sensitive`, `write`, `critical`) al arrancar. El modelo no puede cambiarlos. La combinación `sensitive` y `write` (incluido `all`) solo arranca con `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true` |
| Vistas previas y aprobación de cambios | Las escrituras aceptan `dryRun:true`. Las acciones críticas necesitan esa vista previa, después `confirm:true` con su `previewId` de un solo uso y, por defecto, aceptar un diálogo del servidor. Una llamada crítica sin `confirm:true` se rechaza (`confirmation_required`). Omitir el diálogo (`DARKTRACE_CRITICAL_APPROVAL=host`) requiere `DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL=true` |
| Auditoría | Cada escritura, vista previa y rechazo escribe una línea JSON con cadena de hashes en stderr. Las lecturas sensibles no se auditan |
| Sin reintentos automáticos de cambios | Una escritura que agota el tiempo se declara de resultado desconocido y nunca se repite automáticamente. Las escrituras tienen límites de frecuencia; tres fallidas o desconocidas consecutivas bloquean todas las escrituras hasta reiniciar |
| Archivos de token protegidos | Deben ser privados (`0600`), pertenecer a tu usuario y no ser enlaces simbólicos |
| Un destino | Solo se conecta al appliance configurado, con TLS verificado. Los proxies y la desactivación de TLS impiden el arranque |
| Entrada y salida acotadas | Límites de tamaño, profundidad y frecuencia por llamada. Las respuestas se reducen a campos conocidos, se ocultan secretos y se escapan caracteres Unicode invisibles |
| Solo local | Transporte stdio. No abre ningún puerto de red |

<a id="what-it-cannot-do"></a>

## Qué no puede hacer

- **No impide que los datos lleguen al proveedor del modelo.** Cada resultado llega al cliente MCP y a su modelo. Revisa la idoneidad del proveedor, la retención y la residencia antes de conectar producción.
- **No puede confirmar que haya aprobado una persona.** Por defecto, las escrituras ordinarias dependen del aviso de permisos del cliente. Con `host`, reglas de «permitir siempre» o clientes que responden automáticamente, puede que ninguna persona vea la llamada.
- **No impide el traslado de datos entre perfiles.** Con `sensitive` y `write` activos, el modelo puede copiar datos sensibles a comentarios, descripciones de etiquetas o nombres. No hay seguimiento de contaminación de datos; los comentarios no se pueden borrar.
- **No convierte al modelo en fiable.** Los datos del appliance pueden incluir texto de un atacante (nombres de host, asuntos de correo). El servidor los marca como datos, pero pueden influir en el modelo. Mantén `critical` desactivado salvo que lo necesites y lee las vistas previas.
- **No supera los permisos del token.** Darktrace tiene la última palabra. Da al token solo los derechos que quieras delegar.
- **No protege una máquina comprometida.** Quien pueda ejecutar código como tu usuario puede leer los archivos de token.

<a id="lab-validation"></a>

## Validación de laboratorio

59 operaciones tienen evidencia de dos appliances distintos Darktrace 7.1.0 (2026-10-06): lab A en 1.1.0 y lab B en la campaña de huecos 1.1.1; en 6 es parcial (por ejemplo, Antigena manual solo con bloqueos `connection`, subredes solo con `label` y `uniqueHostnames`). El resto, incluidas todas las lecturas Darktrace/Email y las tres operaciones DELETE de etiquetas (se aplicaron, pero el gateway devolvió HTTP 502), figura como **sin validar en laboratorio**. Parte de la evidencia de escritura es anterior a los controles finales; la [campaña de cobertura](security/lab-gap-campaign-1.1.1.md) repitió los flujos críticos con ellos. La [referencia](tools.md) detalla cada operación y las [limitaciones conocidas](../CHANGELOG.md#known-limitations-in-110) explican qué no está cubierto. Prueba primero las escrituras en un appliance no productivo.

<a id="runtime-notes"></a>

## Notas sobre el runtime

- La imagen Docker usa Node.js 24 de Alpine con OpenSSL 3.5.9.
- Algunos binarios oficiales de Node.js examinados aún incluían OpenSSL 3.5.8 (CVE-2026-35189, procesamiento de certificados TLS). En instalaciones nativas comprueba `node -p 'process.versions.openssl'` y prefiere 3.5.9 o posterior.
- Los escaneos y su revisión de v1.0.0 están en la [guía Docker](docker.md#v100-image-at-a-glance-previous-release). No consta aún un escaneo de la imagen 1.1.0 ([estado](docker.md#110-image-verification-status)).

<a id="supply-chain-checks"></a>

## Comprobaciones de la cadena de suministro

El repositorio ejecuta CodeQL, ESLint con reglas de seguridad, Dependabot y OpenSSF Scorecard. Qué revisa cada uno y cómo interpretar los resultados: [comprobaciones de suministro](security/supply-chain-checks.md).

<a id="report-a-vulnerability"></a>

## Notificar una vulnerabilidad

Usa la notificación privada de GitHub indicada en [SECURITY.md](../SECURITY.md). No publiques tokens, datos del appliance ni detalles de explotación en issues.

<a id="detailed-records"></a>

## Registros detallados

Diseño y análisis de amenazas:

- [Modelo de amenazas](security/threat-model.md)
- [Decisiones de diseño](security/design-decisions.md)
- [Plan de pruebas de seguridad](security/security-test-plan.md)
- [Investigación de ataques MCP](security/mcp-attack-research.md)

Revisiones y puntos de control fechados, conservados como evidencia; algunos describen la versión anterior de solo lectura:

| Tema | Registros |
|---|---|
| Auditorías de código | [servidor](security/code-audit-server.md), [cliente](security/code-audit-client.md), [revisión final](security/final-code-review.md) |
| Revisiones de diseño | [1](security/design-review.md), [2](security/design-review-round2.md), [3](security/design-review-round3.md), [4](security/design-review-round4.md), [5](security/design-review-round5.md) |
| Defensas MCP | [resultados](security/mcp-defense-results.md), [revisión independiente](security/mcp-defense-independent-review.md), [aceptación de correcciones](security/mcp-corrections-acceptance.md), [resultados adversariales](security/adversarial-results.md) |
| Runtime corregido | [implementación](security/patched-runtime-implementation.md), [revisión independiente](security/patched-runtime-independent-review.md), [control de laboratorio](security/patched-runtime-lab-checkpoint.md) |
| Docker | [revisión final](security/docker-final-review.md), [volúmenes](security/docker-volume-review.md) |
| Revisión de versión estable | [revisión final](security/final-stable-gate-review.md), [capacidades](security/first-stable-capability-review.md) |
| Escrituras y 1.1.0 | [amenazas](security/threat-model-writes.md), [plan de pruebas](security/security-test-plan-writes.md), [diseño](security/design-review-writes.md), [código del cliente](security/code-review-writes-client.md), [pruebas adversariales](security/adversarial-results-writes.md), [campaña de laboratorio](security/final-lab-campaign-1.1.0.md), [valores fijados](security/release-pins-1.1.0.md), [revisión final 1.1.0](security/final-gate-review-1.1.0.md) |

Registros anteriores: [historial](history/README.md). [Índice completo de auditorías](security/README.md).
