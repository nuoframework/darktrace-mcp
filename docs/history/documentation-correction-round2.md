# Corrección documental D1/D2

Alcance: [revisión documental independiente](../security/documentation-review.md), hallazgos bajos D1 y D2. Cambios limitados a configuración, guía de clientes, quickstarts inglés/español y este informe; ningún histórico, código, manifiesto o prueba modificado.

- **D1:** [configuración](../configuration.md) y ambos quickstarts explican que Node aplica `NODE_OPTIONS` y `NODE_EXTRA_CA_CERTS` desde `--env-file` antes del servidor. Las opciones pueden precargar código y ampliar la confianza TLS; requieren revisión explícita y protección de integridad equivalente a código ejecutable. El archivo es configuración de host confiable, sin garantía de sandbox del servidor. Se mantienen las restricciones previas: sin tokens y protección externa, sin controles de archivo JSON/token aplicables al env-file.
- **D2:** [clientes](../clients.md) sustituye la formulación ambigua de Windows por fallo cerrado explícito para archivos token/JSON en Windows nativo. La ruta de configuración de Desktop en Windows pertenece al host, no demuestra compatibilidad del servidor. Linux/WSL requiere sus propias rutas absolutas, UID de ejecución y un sistema de archivos que aplique los permisos. Un launcher revisado debe iniciar Node Linux; no se propone desactivar controles ni usar rutas Windows como rutas Linux. Configuración y ambos quickstarts son coherentes con esta distinción.

Las sugerencias sobre troubleshooting y `.env.example` en la revisión quedan fuera del ownership de este dispatch; no se editaron. La explicación completa queda en las guías autorizadas. No se ejecutaron builds, pruebas de runtime, WSL, Node con precargas ni llamadas al laboratorio. Este informe verifica coherencia documental, no seguridad de código ni compatibilidad de plataforma.

## Evidencia

Se leyó la revisión y se ejecutó:

```sh
rg -n 'env-file|NODE_OPTIONS|NODE_EXTRA_CA_CERTS|Windows|WSL|Linux|runtime|absolute' docs/configuration.md docs/clients.md docs/getting-started.md docs/es/getting-started.md
```

La verificación mecánica comprueba destinos y anclas de enlaces locales, fences equilibrados y ausencia de espacios finales en los cinco documentos del alcance. No se modificaron ejemplos ni se usaron secretos. La bandeja FIFO se comprueba y confirma antes de cerrar el dispatch.

Resultado: **30 enlaces locales/anclas válidos**, cinco documentos con fences equilibrados y sin espacios finales; eliminada la frase ambigua de Windows y presentes ambos ajustes de Node en las tres guías de configuración/inicio.
