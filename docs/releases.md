# Versiones y distribución

**Español** · [English](en/releases.md)

[README](../README.md) · [Primeros pasos](getting-started.md) · [Cambios](../CHANGELOG.md)

Dónde se publica cada versión, cómo verificarla y cómo preparar una release reproducible.

<a id="releases-and-distribution"></a>

> Para instalar, usa el [asistente](getting-started.md): `npx -y @nuoframework/darktrace-mcp@1.1.2 setup`. Esta página explica los canales y el procedimiento del propietario. v1.0.0 contiene la compilación anterior de solo lectura (15 herramientas); la API completa y los perfiles del README se distribuyen desde 1.1.0.

<a id="112-candidate"></a>

## 1.1.2

1.1.2 distribuye lo fusionado en `main` después de 1.1.1 ([cambios](../CHANGELOG.md#112--2026-10-06)): asistente Docker autoservicio, pregunta de dirección sin valor guardado, `uninstall`, plugin Claude Code con estructura de marketplace Codex, firmas de archivos con procedencia SLSA, alternativa npm fijada, pruebas basadas en propiedades, correcciones CodeQL e imagen con zlib 1.3.2-r1. La API, contratos y evidencia de laboratorio son los de 1.1.1. Los [valores fijados 1.1.2](security/release-pins-1.1.2.md) recogen las comprobaciones y vinculación de bytes. [Limitaciones actuales](../CHANGELOG.md#known-limitations-in-112). La evidencia de 1.1.1 y 1.1.0 siguiente es histórica.

<a id="release-status-2026-10-06"></a>

## Estado de publicación (2026-10-06)

**1.1.2 está publicada** en npm, ghcr y [GitHub Release](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.2), comprobado el 2026-10-06. La [publicación](https://github.com/nuoframework/darktrace-mcp/actions/runs/37536315754) terminó correctamente a partir de `126e5ea`; la release se publicó a las 21:56:59 UTC. Los ejemplos se fijan a 1.1.2. Las secciones de 1.1.1 y 1.1.0 conservan sus propios digests históricos.

<a id="112-publication-in-progress-2026-10-06"></a>

## 1.1.2 publicada (2026-10-06)

1.1.2 está publicada en [npm con atestación de procedencia](https://registry.npmjs.org/@nuoframework%2fdarktrace-mcp/1.1.2), ghcr y [GitHub Release v1.1.2](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.2). Es la primera release cuyos archivos firma `release.yml` (un `<asset>.sigstore.json` por archivo) y atestigua con SLSA. La [ejecución 37536315754](https://github.com/nuoframework/darktrace-mcp/actions/runs/37536315754) publicó desde la etiqueta: sus ocho trabajos pasaron. El paquete publicado es idéntico byte a byte al candidato local de `release:prepare` recogido en los [valores fijados](security/release-pins-1.1.2.md) (`e8454c85…fe6a`).

| Archivo o comprobación | Valor |
|---|---|
| Commit de release (fusión de su PR) | `126e5ea88224dbbac3b24608f745c38a3d380b7b`, etiqueta `v1.1.2` ([PR #20](https://github.com/nuoframework/darktrace-mcp/pull/20)) |
| CI sobre el commit de release (`ci.yml`, ambos trabajos Docker) | [37536315729](https://github.com/nuoframework/darktrace-mcp/actions/runs/37536315729): Node 22/24 offline, lint y Docker amd64/arm64 correctos; el trabajo `docker-gates` de publicación consumió estos resultados |
| npm `@nuoframework/darktrace-mcp@1.1.2` | `dist.shasum` `b83bb7b6a1eae79f8bd67c66459901a2a5f13098`, `dist.integrity` `sha512-TIdr8PaJ3/OtItU008JNS+Wq2eRTNkflMhPp+bG3fDl4R+XcZLhRoBdUhEqwmXlKJDoFQ30Wcp0WKv6Fev7E3Q==`, SHA-256 del paquete `e8454c85012cf67ae39190f439974af74beda935ea7261db3ee73b6c8c71fe6a`; [atestación npm](https://registry.npmjs.org/-/npm/v1/attestations/@nuoframework%2fdarktrace-mcp@1.1.2) (SLSA v1) |
| Digest del índice ghcr `ghcr.io/nuoframework/darktrace-mcp:1.1.2` | `sha256:fa261c2f7423fa79c66b0b5ddf74d6d8bb53b59a64608dda869959b43900d9ee`; manifiestos de imagen linux/amd64 `sha256:e5735fe678c341ace7b15a6ec5b727866f49ca0538c891ef9b98869e23390ac5` y linux/arm64 `sha256:b79158894172fefa8cd48ee215528e516b9ce2262e099dca1cbcb86961f71493`. Los digests enviados por arquitectura de las notas (`8a7f06cb…`, `2967fab0…`) corresponden a los índices que incluyen las atestaciones buildx |
| GitHub Release `Darktrace MCP v1.1.2` | [v1.1.2](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.2), publicada 2026-10-06T21:56:59Z: `nuoframework-darktrace-mcp-1.1.2.tgz`, `darktrace-mcp-1.1.2.mcpb` (SHA-256 `a6bed56e7fd3dcf891a4f13d5c516baeaf701dbec11e47247bd83b7135c67478`), `SHA256SUMS`, SBOM, evidencia, 11 firmas `<asset>.sigstore.json`, `darktrace-mcp-1.1.2.intoto.jsonl` y `darktrace-mcp-1.1.2.provenance.sigstore.json` |
| Atestación GitHub (procedencia) | [attestations/53354910](https://github.com/nuoframework/darktrace-mcp/attestations/53354910); constan correctas tanto `gh attestation verify nuoframework-darktrace-mcp-1.1.2.tgz --repo nuoframework/darktrace-mcp --signer-workflow nuoframework/darktrace-mcp/.github/workflows/release.yml --source-ref refs/tags/v1.1.2` como la variante `--bundle`. `cosign verify-blob` (3.1.3) verifica paquete, `.mcpb` y `SHA256SUMS` con la identidad `.../release.yml@refs/tags/v1.1.2` |
| Valores fijados y comprobación Docker local | [release-pins-1.1.2.md](security/release-pins-1.1.2.md) |
| Seguridad macOS arm64 (Node 24.14.1), origen de la release | [`2026-10-06T21-20-32-905Z.json`](../test/security/evidence/2026-10-06T21-20-32-905Z.json), SHA-256 `dc8d1373…0f13`: 1.150 subcasos, 1.147 correctos, 3 omisiones de plataforma; origen `d6d76aa9…6e30` |
| Seguridad Linux arm64 (Node 24.18.1), comprobación Docker local | [`release-1.1.2-linux-arm64-2026-10-06T21-24-16-470Z.json`](../test/security/evidence/release-1.1.2-linux-arm64-2026-10-06T21-24-16-470Z.json), SHA-256 `8f845606…550c`: 1.150 subcasos, todos correctos, ninguna omisión; imagen `sha256:9d71b972…6a23` |

<a id="published-111-2026-10-06"></a>
<a id="111-candidate"></a>

## 1.1.1 publicada (2026-10-06)

1.1.1 está publicada en [npm](https://registry.npmjs.org/@nuoframework%2fdarktrace-mcp/1.1.1), ghcr y [GitHub Release v1.1.1](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.1) (`.mcpb`, paquete npm, `SHA256SUMS`, SBOM y evidencia; las firmas se pueden añadir después con `sign-release.yml`). Digest del índice ghcr: `sha256:a1e3944426eddae0e1fa13db0f58a380ae601562dcd4dd93f1767fa42a98a1e1`, con linux/amd64 y linux/arm64. Comprobaciones y bytes en los [valores fijados 1.1.1](security/release-pins-1.1.1.md) y la [campaña de huecos](security/lab-gap-campaign-1.1.1.md).

<a id="published-110-2026-10-06"></a>

## 1.1.0 publicada (2026-10-06)

1.1.0 se publicó en [npm con atestación de procedencia](https://registry.npmjs.org/@nuoframework%2fdarktrace-mcp/1.1.0), ghcr y [GitHub Release v1.1.0](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.0). Incluye `.mcpb`, paquete npm, `SHA256SUMS`, SBOM del runtime y evidencia. Estado comprobado el 2026-10-06; las revisiones fechadas conservan su alcance y hallazgos originales.

Digest del índice ghcr: `sha256:dd79adb2dfe78134fa9721508a1f46776ed1736158dcf0b7f54e1dd0bca2d511`, con manifiestos linux/amd64 y linux/arm64. Usa `ghcr.io/nuoframework/darktrace-mcp@sha256:dd79adb2dfe78134fa9721508a1f46776ed1736158dcf0b7f54e1dd0bca2d511` para descargar y configurar clientes. Los ID por plataforma no son intercambiables con digests de manifiesto del registro.

<a id="distribution-channels-110-and-later"></a>

## Canales de distribución (desde 1.1.0)

| Canal | Nombre | Quién lo produce |
|---|---|---|
| npm público | [`@nuoframework/darktrace-mcp`](https://www.npmjs.com/package/@nuoframework/darktrace-mcp), solo versiones exactas | `publish-npm`: publica el paquete verificado de `release:prepare` con [publicación de confianza npm](https://docs.npmjs.com/trusted-publishers) (OIDC, `id-token: write`) y `--provenance --access public` |
| GitHub Container Registry público | `ghcr.io/nuoframework/darktrace-mcp:<version>`, linux/amd64 + linux/arm64; fija digest | `publish-ghcr` (compilación nativa por arquitectura y envío por digest) y `publish-ghcr-manifest` (etiqueta `<version>`; nunca se mueve `latest`) |
| Archivos de GitHub Release | `nuoframework-darktrace-mcp-<version>.tgz`, `darktrace-mcp-<version>.mcpb`, `SHA256SUMS`, SBOM y evidencia; desde la primera release posterior a 1.1.1: `<asset>.sigstore.json` por archivo, `darktrace-mcp-<version>.intoto.jsonl` y `darktrace-mcp-<version>.provenance.sigstore.json` | `github-release`: firmas cosign sin claves persistentes y procedencia SLSA sobre bytes verificados ([verificación](#verifying-release-signatures-and-provenance)) |
| MCP Registry | `io.github.nuoframework/darktrace-mcp` ([`server.json`](../server.json), `mcpName` en `package.json`) | Propietario mediante `mcp-publisher` |

npm y GitHub Release reciben los mismos bytes del paquete; `SHA256SUMS` y `verification.json` de `prepare` los describen. `npx` se usa una vez para el arranque inicial: `setup` instala una copia fija y escribe rutas absolutas, por lo que los clientes configurados con el asistente no arrancan desde el registro.

Las comprobaciones 1.1.0 fijan seis contratos de perfiles (incluido `read+sensitive+write`, AD-W-18) y dos variantes de descripción de aprobación. Los [registros](security/release-pins-1.1.0.md) contienen cifras y vinculación final de bytes. La revisión independiente del contrato completo regenerado exigida por [E11](CHANGES-core.md#811-exceptions-and-open-conflicts) consta como ACCEPT en la [revisión final 1.1.0 §1.5](security/final-gate-review-1.1.0.md#15-e11-independent-review-of-the-full-api-contract-fixture-o).

<a id="110-evidence-files"></a>

### Archivos de evidencia 1.1.0

Cada registro está ligado a sus bytes de origen y runtime; consulta la [revisión final](security/final-gate-review-1.1.0.md) y las [decisiones fechadas del propietario](security/owner-decisions-1.1.0.md). Publicar no elimina los riesgos residuales.

| Evidencia | Archivo | Alcance |
|---|---|---|
| Seguridad Linux arm64 (Node 24.18.1) | [`release-1.1.0-linux-arm64-2026-10-06T12-43-25-292Z.json`](../test/security/evidence/release-1.1.0-linux-arm64-2026-10-06T12-43-25-292Z.json), SHA-256 `cd71cecd…dad9` | 1.150 subcasos, todos correctos; origen `5b1208f1…fdc503e` |
| Seguridad macOS arm64 (Node 24.14.1) | [`release-1.1.0-macos-arm64-2026-10-06T13-06-41-906Z.json`](../test/security/evidence/release-1.1.0-macos-arm64-2026-10-06T13-06-41-906Z.json), SHA-256 `5699ae23…0736` | 1.150 subcasos, 1.147 correctos, 3 omitidos por plataforma (modos setgid) |
| Registro anterior, sustituido | [`2026-10-06T11-44-04-525Z.json`](../test/security/evidence/2026-10-06T11-44-04-525Z.json) | Antes de V-W-01: 6 fallos POST Advanced Search |
| Valores fijados y Docker local | [release-pins-1.1.0.md](security/release-pins-1.1.0.md) | Valores CI/verificación, hashes de `release:prepare`, imagen arm64 `sha256:7e5a2a41…6aad` |
| Laboratorio tras controles de escritura | [final-lab-campaign-1.1.0.md](security/final-lab-campaign-1.1.0.md) | 50 herramientas listadas; lecturas, búsqueda POST, vista previa `post_tags`, `confirmation_required`, flujo crítico de intel feed |
| Prueba de firma | [lab-signing-evidence.md](security/lab-signing-evidence.md) y [JSON](security/evidence/lab-signing-evidence-2026-10-06T09-17-38-944Z.json) | Formas de firma aceptadas por 7.1.0 |
| Resultados por operación | [CHANGES-core §6](CHANGES-core.md#6-live-lab-validation-darktrace-710-2026-10-06) y [herramientas](tools.md) | En 1.1.0: 56 operaciones con evidencia, 11 parciales; Email sin validar |

Evidencia adicional:

| Evidencia | Registro | Alcance |
|---|---|---|
| CI del commit de publicación | [37497433186](https://github.com/nuoframework/darktrace-mcp/actions/runs/37497433186), commit `f95e798bf3ed3f0dcedb91ff86e84849f1b12acb` | Correctos Node 22/24 offline, lint y Docker nativo amd64/arm64 |
| Decisiones sobre riesgos | [Propietario, 2026-10-06](security/owner-decisions-1.1.0.md) | Aceptación de riesgos específicos; no los elimina |
| Archivos publicados | [v1.1.0](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.0) | `.mcpb`, paquete, `SHA256SUMS`, SBOM y evidencia |

No consta aquí un escaneo de vulnerabilidades del runtime 1.1.0. CI acredita las imágenes compiladas que probó; ghcr se recompila por separado. Las [limitaciones](../CHANGELOG.md#known-limitations-in-110) siguen declaradas en las notas.

<a id="release-naming"></a>

### Nombres de releases

Convención única: etiqueta `vX.Y.Z` y título `Darktrace MCP vX.Y.Z` (por ejemplo `v1.1.1` y `Darktrace MCP v1.1.1`). Las preliminares incluyen sufijo, como `v1.2.0-rc.1`; solo sus títulos pueden añadir ` — subtítulo breve`. `github-release` obtiene `VERSION` quitando la `v` inicial y pasa `--title "Darktrace MCP v${VERSION}"`. Las releases existentes siguen esa convención.

<a id="verifying-release-signatures-and-provenance"></a>

### Verificar firmas y procedencia

Desde la primera release posterior a 1.1.1, `github-release` firma cada archivo y atestigua su procedencia antes de crear la release ([funcionamiento](security/supply-chain-checks.md#release-signing-and-provenance)):

- `<asset>.sigstore.json`: archivo [Sigstore](https://www.sigstore.dev/) sin claves persistentes, creado por `cosign sign-blob` (certificado, firma y entrada del registro de transparencia), uno por archivo incluido `SHA256SUMS`. La identidad del certificado es `https://github.com/nuoframework/darktrace-mcp/.github/workflows/release.yml@refs/tags/v<version>`.
- `darktrace-mcp-<version>.intoto.jsonl`: declaración SLSA v1 de procedencia de compilación, con cada archivo como sujeto (sobre in-toto DSSE, una línea).
- `darktrace-mcp-<version>.provenance.sigstore.json`: la misma declaración con su material de verificación, tal como la escribe `actions/attest` y la guarda la API de atestaciones de GitHub.

Descarga el archivo y su firma o procedencia; después:

```sh
# Procedencia (GitHub CLI 2.49 o posterior): compilado por release.yml desde la etiqueta
gh attestation verify nuoframework-darktrace-mcp-<version>.tgz --repo nuoframework/darktrace-mcp \
  --signer-workflow nuoframework/darktrace-mcp/.github/workflows/release.yml --source-ref refs/tags/v<version>
# Misma comprobación con el archivo descargado en lugar de la API
gh attestation verify nuoframework-darktrace-mcp-<version>.tgz --repo nuoframework/darktrace-mcp \
  --bundle darktrace-mcp-<version>.provenance.sigstore.json
# Firma (cosign 3.x): archivo, identidad exacta del workflow y emisor OIDC GitHub
cosign verify-blob --bundle nuoframework-darktrace-mcp-<version>.tgz.sigstore.json \
  --certificate-identity https://github.com/nuoframework/darktrace-mcp/.github/workflows/release.yml@refs/tags/v<version> \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  nuoframework-darktrace-mcp-<version>.tgz
# Declaración de procedencia (archivos, constructor y commit de origen)
jq -r .payload darktrace-mcp-<version>.intoto.jsonl | base64 -d | jq .
```

`--certificate-identity-regexp '^https://github.com/nuoframework/darktrace-mcp/\.github/workflows/release\.yml@refs/tags/v'` acepta cualquier etiqueta de ese workflow. Ambas herramientas comprueban la cadena de certificados Sigstore y el registro de transparencia. `sha256sum -c SHA256SUMS` sigue comprobando los bytes; verificar `SHA256SUMS.sigstore.json` autentica el archivo de sumas.

Las versiones anteriores (`v0.1.0-alpha.0`, `v1.0.0`, `v1.1.0`, `v1.1.1`) se pueden firmar después mediante `sign-release.yml`. Sus archivos usan la identidad `.../.github/workflows/sign-release.yml@refs/heads/main`, acreditan la firma de los bytes publicados en esa fecha y no aportan procedencia de compilación.

<a id="signing-a-release-published-before-112-owner-once-per-tag"></a>

### Firmar una release anterior a 1.1.2 (propietario, una vez por etiqueta)

1. Actions → **Sign an existing release** → *Run workflow*, con la etiqueta, por ejemplo `v1.1.1`; o `gh workflow run sign-release.yml -f tag=v1.1.1`.
2. Descarga los archivos, los comprueba con `SHA256SUMS`, firma los que todavía no tienen firma, verifica y sube solo los nuevos `<asset>.sigstore.json`. No modifica archivos existentes ni notas: se puede repetir.
3. Repite para `v1.1.0`, `v1.0.0` y `v0.1.0-alpha.0`. Signed-Releases de Scorecard promedia las cinco últimas releases con archivos; las cuatro necesitan firma para mejorar la puntuación completa ([estado](security/supply-chain-checks.md#status-and-accepted-gaps-score-67-at-0e4d64f-2026-10-06)).

<a id="publishing-a-version-owner"></a>

### Publicar una versión (propietario)

1. Fija la misma `version` en `package.json`, `package-lock.json`, `npm-shrinkwrap.json`, `manifest.json` y `server.json`; actualiza `CHANGELOG.md`, confirma el cambio y crea/envía `v<version>` en el commit revisado. `release.yml` rechaza una etiqueta que no coincida con el paquete.
2. `prepare` hace instalación limpia, comprobación de tipos, pruebas, batería de seguridad, dos compilaciones reproducibles y verificación del paquete. Solo después se ejecutan `publish-npm` y `publish-ghcr*` con entradas verificadas.
   - **Propagación npm.** `publish-npm` falla si falla `npm publish`, según su código de salida. La visibilidad puede tardar minutos; consulta `npm view <package>@<version> --registry https://registry.npmjs.org` cada 30 s hasta 15 min y guarda el resultado. Si sigue sin verse, emite aviso, registra SHA-1 del paquete cotejado e integridad SHA-512 y termina correctamente.
   - **GitHub Release.** `github-release` corre si `prepare`, `docker-gates`, `pack-mcpb` y `publish-ghcr-manifest` pasan y `publish-npm` no falla. El retraso de visibilidad no bloquea; un fallo de publicación sí. Vuelve a consultar npm antes de redactar las notas, que indican `published` con el registro o `published, pending registry propagation` con hash e integridad.
3. **Publicador de confianza npm (una vez).** En npmjs.com: paquete → Settings → Trusted publisher → GitHub Actions; organización `nuoframework`, repositorio `darktrace-mcp`, workflow `release.yml`, sin entorno, permitir `npm publish`. Hasta configurarlo (por ejemplo, primera publicación), usa como alternativa un secreto de repositorio `NPM_TOKEN`, granular, solo publicación y limitado al paquete, e imprime aviso; elimina el secreto cuando funcione el publicador de confianza. Ambos caminos generan procedencia.
4. **Visibilidad ghcr (una vez).** El primer envío crea el paquete privado. En Packages de la organización, haz público `darktrace-mcp` y confirma el enlace al repositorio (la imagen lleva `org.opencontainers.image.source`). Copia el digest del resumen `publish-ghcr-manifest` o del archivo `ghcr-image-digest` a las notas.
5. **Archivos de release.** Normalmente `github-release` la crea con título `Darktrace MCP v<version>`. Alternativa manual solo si no se ejecutó, por ejemplo por un fallo npm resuelto después: descarga `darktrace-mcp-release-candidate`, verifica `SHA256SUMS`, compila la extensión desde la etiqueta (`npm ci --ignore-scripts && npm run pack:mcpb`), crea un borrador con `gh release create v<version> --title "Darktrace MCP v<version>" --verify-tag --draft --notes-file release-notes.md <assets>` e inspecciónalo antes de publicarlo. Si solo falló registrar npm, suele bastar repetir los trabajos fallidos. Antes de crear manualmente, confirma visibilidad con `npm view @nuoframework/darktrace-mcp@<version> --registry https://registry.npmjs.org`.
6. **MCP Registry.** Tras publicar npm (el registro comprueba `mcpName` del paquete):

```sh
curl -L "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz" | tar xz mcp-publisher
./mcp-publisher validate server.json
./mcp-publisher login github
./mcp-publisher publish
```

   `login github` demuestra la propiedad de `io.github.nuoframework`; en CI, `login github-oidc` con `id-token: write` lo hace sin navegador. Comprueba `https://registry.modelcontextprotocol.io/v0.1/servers/io.github.nuoframework%2Fdarktrace-mcp/versions/latest`.

7. **Plugin.** Solo tras confirmar la versión con `npm view @nuoframework/darktrace-mcp@<version>`: cambia `version` en ambos manifiestos del plugin, fija la dependencia en `claude-plugin/package.json` y regenera `claude-plugin/package-lock.json` según la [guía](plugin-distribution.md#bump-the-pinned-version-at-each-release). Actualiza la referencia npm en `claude-plugin/mcp.json`, `claude-plugin/README.md` y la guía de investigación; ejecuta `claude plugin validate --strict ./claude-plugin` y `claude plugin validate .`, y fusiona en `main`. Claude Directory sigue esa rama y vuelve a analizar; no fijes una versión antes de que exista en npm porque fallaría toda instalación. [Distribución](plugin-distribution.md).

<a id="openssf-badge-placeholders"></a>

## Insignias OpenSSF

Las antiguas etiquetas estáticas **OpenSSF Scorecard: pending** y **OpenSSF Best Practices: pending** no eran puntuaciones, registros ni certificaciones. Las insignias actuales de ambos README enlazan al resultado público y al proyecto Best Practices 15261; no se afirma aquí una puntuación ni un nivel de cumplimiento.

Las insignias npm y GitHub Release usan datos en directo de Shields.io. 1.1.0 está publicada en ambos canales. CI enlaza a `ci.yml`; el último resultado no sustituye los registros por commit anteriores.

Los logotipos de clientes se cotejaron con el [catálogo Simple Icons](https://simpleicons.org) y la [lista de nombres](https://github.com/simple-icons/simple-icons/blob/develop/slugs.md) el 2026-10-06: `anthropic`, `cursor`, `windsurf`, `opencode`, `googlegemini`, `docker`. Codex y VS Code usan insignias sin icono porque `openai` y `visualstudiocode` no estaban en esa instantánea. El runtime usa `nodedotjs`. Nombres y logos indican compatibilidad, no respaldo.

<a id="openssf-best-practices-registration-owner-one-time"></a>

### Registro OpenSSF Best Practices (propietario, una vez)

1. Entra en [bestpractices.dev](https://www.bestpractices.dev/) con la cuenta GitHub administradora y elige **Get Your Badge Now** → añade `https://github.com/nuoframework/darktrace-mcp`.
2. Responde a los criterios «passing». Las pruebas suelen estar en `SECURITY.md`, `CONTRIBUTING.md`, `LICENSE`, `CHANGELOG.md`, workflows CI (pruebas, `lint`, CodeQL) y [cadena de suministro](security/supply-chain-checks.md) (análisis estático y actualizaciones).
3. El proyecto está registrado con ID 15261 (`https://www.bestpractices.dev/projects/15261`); ambos README enlazan su insignia. Usa el ID real de `https://www.bestpractices.dev/projects/<id>` y el resultado público de `scorecard.yml` en `main`; no uses marcadores estáticos para aparentar resultados.
4. Ambos README son entradas de publicación; cualquier cambio modifica los valores fijados de la release.

<a id="v100-previous-release-private"></a>

## v1.0.0 (versión anterior, privada)

Usa la [release privada v1.0.0](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.0.0). Se recomienda Docker: descarga el archivo de tu arquitectura y `SHA256SUMS`, verifica y ejecuta `docker load`. [Instalación Docker](docker.md#install-options). También incluye paquete nativo, seguridad/procedencia, registros CI nativos completos y un archivo de evidencia del paquete que conserva los ficheros auxiliares originales. Las sumas cubren todos los archivos descargables.

La primera estable ofrece 15 herramientas de lectura con 19 GET validados. CI nativa amd64/arm64 pasó 130 funcionales y 325 de seguridad sin omisiones. Los ID, hashes y resultados de aplicabilidad de vulnerabilidades están en las notas bilingües. No usa npm ni registro público. Etiquetas y archivos alfa anteriores permanecen inalterados.

<a id="historical-alpha-installation-and-preparation"></a>

## Instalación y preparación alfa históricas

Lo siguiente describe la alfa inmutable anterior, no la estable actual. Para v1.0.0, usa lo indicado arriba.

Los archivos `v0.1.0-alpha.0` publicados son evidencia histórica inmutable. En ese punto, la candidata era `0.1.0-alpha.0` y se proponía `0.1.0`; los sustituye la preparación v1.0.0 revisada por separado. El alcance de la primera estable propuesta era lectura soportada, con escrituras para otra entrega. [Evidencia de preparación](history/release-preparation.md#historical-release-direction-and-docker-smoke) y [registro Docker anterior](history/release-preparation-docker-mcp.md).

Era el procedimiento de distribución privada de `nuoframework/darktrace-mcp`. `0.1.0-alpha.0` usa etiqueta `v0.1.0-alpha.0`. En aquel procedimiento, scripts y workflows no creaban releases: el propietario publicaba tras revisión independiente de origen y archivos. `package.private:true` seguía activo; sin publicación npm ni de contenedores.

<a id="install-a-reviewed-version"></a>

## Instalar una versión revisada

Para este procedimiento histórico necesitas Node.js 22+, npm y GitHub CLI autenticada con acceso privado. Elige una etiqueta revisada explícita, nunca una preliminar implícita «latest». Descarga en un directorio nuevo:

```sh
mkdir darktrace-mcp-v0.1.0-alpha.0
cd darktrace-mcp-v0.1.0-alpha.0
gh release download v0.1.0-alpha.0 --repo nuoframework/darktrace-mcp \
  --pattern 'darktrace-mcp-0.1.0-alpha.0.tgz' --pattern SHA256SUMS \
  --pattern '*.json' --pattern release-notes.md
shasum -a 256 -c SHA256SUMS
npm init -y
npm install --ignore-scripts --omit=dev ./darktrace-mcp-0.1.0-alpha.0.tgz
npm ls --omit=dev --all
node node_modules/darktrace-mcp/dist/src/index.js --version
node node_modules/darktrace-mcp/dist/src/index.js --help
```

Coteja la suma con el registro revisado del propietario por tu canal organizativo de confianza. Una suma junto a un archivo reemplazado no autentica su origen. Las tres dependencias fijadas requieren registro; el paquete llega de GitHub Release privada. Sus SRI npm están en shrinkwrap y SBOM. El bloqueo generado permite después `npm ci --ignore-scripts --omit=dev`.

Prepara tokens separados y protegidos según [primeros pasos](getting-started.md), y ejecuta `node node_modules/darktrace-mcp/dist/src/index.js doctor`. Solo comprueba configuración local, sin red. En los [ejemplos de cliente](clients.md), usa rutas absolutas a Node y al `node_modules/darktrace-mcp/dist/src/index.js` instalado; el runtime no necesita fuentes ni dependencias de desarrollo.

`runtime-sbom.cdx.json` enumera aplicación y tres bibliotecas con versiones exactas, licencias, SHA-256/SHA-512 reales y SRI npm. `runtime-files.sha256.json` recoge hashes instalados, incluidas licencias. Es inventario, no garantía de seguridad, firma o atestación. Para la alfa usa el verificador de su checkout revisado, no uno posterior que exija otra evidencia. Reproduce con `npm run release:verify -- /absolute/path/package.tgz /absolute/private/verification` y compara SBOM e inventario byte a byte. Instala y descarga dependencias sin hooks, comprueba SRI y ejecuta ayuda/versión/doctor solo con credenciales locales sintéticas.

<a id="owner-preparation-and-publication"></a>

## Preparación y publicación por el propietario

Desde el origen final revisado, con Node 22+ y Python 3.11+ para TOML, usa un directorio vacío fuera del checkout y sus alias simbólicos:

```sh
npm run release:prepare -- /absolute/private/darktrace-mcp-release
cd /absolute/private/darktrace-mcp-release
shasum -a 256 -c SHA256SUMS
```

En el punto histórico descrito, el script generaba contratos `tools/list` completos para cuatro perfiles con `test/security/mcp-contracts.mjs`, los comparaba con MR-04 sin reescribirla, repetía tras la segunda compilación e incluía `mcp-tool-contracts.json` y hashes de perfiles. SHA-256 de aquella instantánea: `37b5af95de1786ecce1b8762e12d2d63e577f171511a9db4964518b13a917f72`; cambiarla requiere revisión independiente. Los nueve archivos figuraban en `SHA256SUMS`.

El script compila una copia aislada, comprueba tipos, pruebas estándar y seguridad, compara dos compilaciones/paquetes, valida ejemplos, rechaza entradas fuera de la lista de runtime y verifica una instalación vacía de producción. No confirma cambios, etiqueta, envía ni publica. Revisa logs y `build-evidence.json`, incluidas omisiones y hashes. Recompila tras cambiar fuentes empaquetadas, README, metadatos o shrinkwrap. El inventario liga YAML, `docs/operation-inventory.json`, fuentes/scripts/pruebas/ejemplos, tsconfigs, paquete/bloqueos, ambos README, guías inspeccionadas y SVG originales. `README.en.md` se permite y verifica explícitamente como archivo normal modo 0644, hasta 1 MiB, idéntico al origen y a la instalación; `README.md` es el español predeterminado. Dockerfile, `.dockerignore` y SVG solo son evidencia de origen, no entran en npm; no se copian ni resumen capturas raster. Protege el ref revisado con reglas del repositorio y limita publicación al propietario; el repositorio no demuestra que esos ajustes remotos estén configurados.

Tras preparar, repite la comprobación de integridad de archivos auxiliares desde el mismo checkout revisado:

```sh
node scripts/verify-release.mjs /absolute/private/darktrace-mcp-release/darktrace-mcp-0.1.0-alpha.0.tgz /absolute/private/darktrace-mcp-release --check-evidence
```

Verifica nueve sumas, bytes completos MR-04 y su referencia fijada, vinculación de compilación/origen/archivo/seguridad e instalador, sin instalar, usar red ni reescribir evidencia. Rechaza evidencia, contratos o sumas ausentes/modificados. Es integridad frente al checkout revisado, no autenticación ni compatibilidad. Para reproducir instalador/SBOM, coloca `mcp-tool-contracts.json` revisado en un directorio externo nuevo, compila el checkout correspondiente y ejecuta el verificador normal; compara con la candidata aprobada.

En la alfa, `.github/workflows/release.yml` era una preparación manual de solo lectura, limitada a `refs/tags/v*` existentes que coincidieran con `v` + versión del paquete; omitía ejecuciones por rama. Subía un archivo candidato de siete días, no una release. CI configuraba Node 22/24; configurar un trabajo no acredita haberlo ejecutado. Publicar era una acción manual del propietario sobre etiqueta revisada y protegida. Patrón histórico: **no lo repitas para sustituir la alfa publicada**. Cualquier entrega nueva necesita versión/etiqueta revisada y archivos aprobados por separado:

```sh
gh release create v0.1.0-alpha.0 --repo nuoframework/darktrace-mcp \
  --verify-tag --draft --prerelease --title '0.1.0-alpha.0 — private offline alpha' \
  --notes-file release-notes.md \
  darktrace-mcp-0.1.0-alpha.0.tgz SHA256SUMS runtime-sbom.cdx.json \
  runtime-files.sha256.json source-files.sha256.json build-evidence.json verification.json security-receipt.json release-notes.md mcp-tool-contracts.json
```

Inspecciona archivos y sumas del borrador antes de publicarlo. En aquel punto, ningún workflow tenía `contents:write`, credenciales de registro, `id-token:write` ni permisos de publicación. [`--verify-tag`](https://cli.github.com/manual/gh_release_create) rechaza etiquetas ausentes. Los [revisores obligatorios de entornos privados](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments) requieren un plan GitHub adecuado; no se verificaron plan ni protecciones remotas. Nombrar un entorno no impone aprobación. En ese punto histórico no se produjeron ni afirmaron atestaciones. Ahora `github-release` añade firmas y procedencia; `sign-release.yml` puede firmar versiones anteriores ([verificación](#verifying-release-signatures-and-provenance)).

<a id="version-100"></a>

## Versión 1.0.0

La `0.1.0-alpha.0` publicada es historia inmutable, anterior a las 15 herramientas/19 selectores y al runtime corregido.

`1.0.0` usa Node.js 24.18.1 de Alpine con OpenSSL compartido 3.5.9 (corrección CVE-2026-35189) en arm64 y amd64. [Guía Docker](docker.md#v100-image-at-a-glance-previous-release).

- **CI:** [37423665585](https://github.com/nuoframework/darktrace-mcp/actions/runs/37423665585), commit `2adb84b`, pasó Node 22/24 offline y Docker nativo amd64/arm64, 130 + 325 pruebas sin omisiones. La etiqueta puede apuntar a un commit posterior solo documental con producción, compilación y documentos distribuidos idénticos.
- **Laboratorio:** el 2026-10-06 arm64 `sha256:8cd85604…` pasó [19/19 consultas](security/patched-runtime-lab-checkpoint.md). Laboratorio cerrado. 1.0.0 solo difiere en el literal de versión y no se repitió en vivo.
- **Escaneos:** Grype conserva High CVE-2026-85091 (zlib 1.3.2) y Medium CVE-2024-9410 (`ada`). La revisión independiente de ambas arquitecturas determinó que zlib está afectada pero fuera de la ruta de ejecución vulnerable, y `ada` es coincidencia de nombres. zlib no está corregida: Alpine 3.24 aún no tenía paquete. No se afirma cero CVE.
- **Archivos:** imágenes Docker por arquitectura, paquete npm y `SHA256SUMS`; hashes e ID en las notas.
- **Despliegue:** evalúa tratamiento, retención, residencia e idoneidad del proveedor en cada entorno.

Las vistas son conservadoras y proceden del código: hasta ocho campos principales seleccionados y resúmenes de objetos/mapas desconocidos. No garantizan eliminar todo campo sensible anidado arbitrario.

<a id="incremental-delivery-cadence"></a>

## Cadencia incremental

1. `0.1.0-alpha.0`: alfa privada offline con origen revisado, paquete verificado, sumas y SBOM; seguían pendientes las pruebas de appliance/proveedor.
2. Primera estable prevista como `1.0.0`: 15 herramientas de lectura, solo tras aceptar las comprobaciones. En ese plan, los metadatos seguían en `0.1.0-alpha.0` hasta un cambio coordinado; el objetivo no era una decisión de disponibilidad.
3. Una entrega posterior podía añadir escrituras tras revisar por separado compatibilidad, controles y riesgos. Una etiqueta de versión no exime de una comprobación.

Cada entrega usa etiqueta inmutable nueva, notas propias, archivos verificados y carencias explícitas. No reemplaces los archivos publicados por otra compilación. No se prometen fechas ni publicación automática.
