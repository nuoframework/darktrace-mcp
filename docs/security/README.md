# Evidencia de seguridad

[README](../../README.md) · [Resumen de seguridad](../security.md) · [Herramientas](../tools.md) · [Versiones](../releases.md)

Índice de las revisiones, campañas y decisiones que sustentan las afirmaciones de seguridad.

Los documentos originales se conservan **en inglés**, con sus fechas, alcance y resultados. Son registros de auditoría; una aprobación histórica no certifica versiones posteriores. Empieza por la revisión final de tu versión y consulta sus hashes y riesgos residuales. Los JSON de [evidence/](evidence/) contienen los registros estructurados citados por las campañas.

| Archivo | Qué contiene |
|---|---|
| [adversarial-results-writes.md](adversarial-results-writes.md) | Resultados de las pruebas adversariales de escrituras. |
| [adversarial-results.md](adversarial-results.md) | Resultados de las pruebas adversariales iniciales. |
| [client-corrections.md](client-corrections.md) | Correcciones del cliente HTTP tras la revisión. |
| [client-remediation-notes.md](client-remediation-notes.md) | Notas de corrección de firma, peticiones y límites del cliente HTTP. |
| [code-audit-client.md](code-audit-client.md) | Auditoría del código del cliente HTTP. |
| [code-audit-server.md](code-audit-server.md) | Auditoría del código del servidor MCP. |
| [code-review-writes-client.md](code-review-writes-client.md) | Revisión del cliente HTTP para operaciones de escritura. |
| [design-decisions.md](design-decisions.md) | Decisiones de diseño y límites de confianza. |
| [design-review-round2.md](design-review-round2.md) | Segunda revisión del diseño. |
| [design-review-round3.md](design-review-round3.md) | Tercera revisión del diseño. |
| [design-review-round4.md](design-review-round4.md) | Cuarta revisión del diseño. |
| [design-review-round5.md](design-review-round5.md) | Quinta revisión del diseño. |
| [design-review-writes.md](design-review-writes.md) | Revisión independiente del diseño de escrituras. |
| [design-review.md](design-review.md) | Primera revisión independiente del diseño. |
| [docker-final-review.md](docker-final-review.md) | Revisión final de la imagen y ejecución Docker. |
| [docker-volume-review.md](docker-volume-review.md) | Revisión del montaje y protección de volúmenes Docker. |
| [documentation-review.md](documentation-review.md) | Revisión de afirmaciones y ejemplos de documentación. |
| [email-api-observed.md](email-api-observed.md) | Esquemas observados en la consola Email; no acredita validación MCP. |
| [execution-permissions-checkpoint.md](execution-permissions-checkpoint.md) | Punto de control de permisos de ejecución. |
| [final-code-review.md](final-code-review.md) | Revisión final del código. |
| [final-gate-review-1.1.0.md](final-gate-review-1.1.0.md) | Comprobación final de publicación de 1.1.0 y riesgos residuales. |
| [final-lab-campaign-1.1.0.md](final-lab-campaign-1.1.0.md) | Campaña de laboratorio ligada a la entrega 1.1.0. |
| [final-stable-gate-review.md](final-stable-gate-review.md) | Revisión de los requisitos de la primera versión estable. |
| [first-stable-artifact-finalization.md](first-stable-artifact-finalization.md) | Cierre de los archivos de la primera estable. |
| [first-stable-capability-review.md](first-stable-capability-review.md) | Revisión del alcance funcional de la primera estable. |
| [first-stable-coordinator-decision.md](first-stable-coordinator-decision.md) | Decisión de coordinación sobre la primera estable. |
| [first-stable-documentation-finalization.md](first-stable-documentation-finalization.md) | Cierre de la documentación de la primera estable. |
| [first-stable-release-helpers-review.md](first-stable-release-helpers-review.md) | Revisión de los scripts de publicación de la primera estable. |
| [lab-campaign-inventory-review.md](lab-campaign-inventory-review.md) | Revisión del inventario de pruebas de laboratorio. |
| [lab-email-validation.md](lab-email-validation.md) | Pruebas Email bloqueadas por HTTP 403 y requisitos pendientes. |
| [lab-gap-campaign-1.1.1.md](lab-gap-campaign-1.1.1.md) | Campaña 1.1.1 que amplía cobertura y delimita los resultados parciales. |
| [lab-harness-review.md](lab-harness-review.md) | Revisión del banco de pruebas de laboratorio. |
| [lab-signing-evidence.md](lab-signing-evidence.md) | Evidencia de los formatos y bytes de firma aceptados en laboratorio. |
| [mcp-attack-research-round2.md](mcp-attack-research-round2.md) | Segunda ronda de investigación de ataques MCP. |
| [mcp-attack-research.md](mcp-attack-research.md) | Investigación de amenazas y ataques MCP. |
| [mcp-corrections-acceptance.md](mcp-corrections-acceptance.md) | Aceptación de las correcciones de defensa MCP. |
| [mcp-defense-independent-review.md](mcp-defense-independent-review.md) | Revisión independiente de las defensas MCP. |
| [mcp-defense-results.md](mcp-defense-results.md) | Resultados de las comprobaciones de defensa MCP. |
| [mcp-invisible-ca-corrections.md](mcp-invisible-ca-corrections.md) | Correcciones de caracteres invisibles y confianza de certificados. |
| [mcp-user-sources-gap-review.md](mcp-user-sources-gap-review.md) | Revisión de carencias sobre entradas y fuentes del usuario. |
| [node22-regression.md](node22-regression.md) | Registro de regresión con Node.js 22. |
| [owner-decisions-1.1.0.md](owner-decisions-1.1.0.md) | Decisiones fechadas del propietario sobre riesgos de 1.1.0. |
| [patched-runtime-documentation-checkpoint.md](patched-runtime-documentation-checkpoint.md) | Control documental del runtime corregido. |
| [patched-runtime-implementation.md](patched-runtime-implementation.md) | Implementación del runtime corregido. |
| [patched-runtime-independent-review.md](patched-runtime-independent-review.md) | Revisión independiente del runtime corregido. |
| [patched-runtime-lab-checkpoint.md](patched-runtime-lab-checkpoint.md) | Pruebas de laboratorio del runtime corregido. |
| [read-campaign-final-review.md](read-campaign-final-review.md) | Revisión final de la campaña de lecturas. |
| [read-compatibility-corrections.md](read-compatibility-corrections.md) | Correcciones de compatibilidad de lecturas. |
| [read-compatibility-repair-plan.md](read-compatibility-repair-plan.md) | Plan de reparación de compatibilidad de lecturas. |
| [read-only-release-proposal.md](read-only-release-proposal.md) | Propuesta histórica de entrega de solo lectura. |
| [release-pins-1.1.0.md](release-pins-1.1.0.md) | Hashes, contratos y registros fijados para 1.1.0. |
| [release-pins-1.1.1.md](release-pins-1.1.1.md) | Hashes, contratos y registros fijados para 1.1.1. |
| [release-pins-1.1.2.md](release-pins-1.1.2.md) | Actualización de valores fijados para el siguiente conjunto de cambios. |
| [release-review-final.md](release-review-final.md) | Revisión final de la preparación de publicación. |
| [release-review.md](release-review.md) | Revisión inicial de la preparación de publicación. |
| [response-view-overrides-docker-checkpoint.md](response-view-overrides-docker-checkpoint.md) | Pruebas Docker de los ajustes de vistas de respuesta. |
| [response-view-overrides-independent-review.md](response-view-overrides-independent-review.md) | Revisión independiente de los ajustes de vistas de respuesta. |
| [response-view-overrides-lab-checkpoint.md](response-view-overrides-lab-checkpoint.md) | Pruebas de laboratorio de los ajustes de vistas de respuesta. |
| [restored-access-lab-checkpoint.md](restored-access-lab-checkpoint.md) | Registro de laboratorio tras recuperar acceso autorizado. |
| [security-test-plan-writes.md](security-test-plan-writes.md) | Plan de pruebas de seguridad para escrituras. |
| [security-test-plan.md](security-test-plan.md) | Plan de pruebas de seguridad inicial. |
| [supply-chain-checks.md](supply-chain-checks.md) | Controles de dependencias, análisis estático y cadena de suministro. |
| [threat-model-writes.md](threat-model-writes.md) | Modelo de amenazas de escrituras y acciones críticas. |
| [threat-model.md](threat-model.md) | Modelo de amenazas inicial y fronteras de confianza. |
| [validated-consultations-docker-checkpoint.md](validated-consultations-docker-checkpoint.md) | Control Docker de las consultas validadas. |
| [validated-consultations-documentation-checkpoint.md](validated-consultations-documentation-checkpoint.md) | Control documental de las consultas validadas. |
| [validated-consultations-final-candidate-review.md](validated-consultations-final-candidate-review.md) | Revisión final de la candidata de consultas validadas. |
| [validated-consultations-github-checkpoint.md](validated-consultations-github-checkpoint.md) | Control de GitHub y CI de las consultas validadas. |
| [validated-consultations-implementation.md](validated-consultations-implementation.md) | Implementación del alcance de consultas validadas. |
| [validated-consultations-independent-review.md](validated-consultations-independent-review.md) | Revisión independiente de las consultas validadas. |
| [validated-consultations-lab-checkpoint.md](validated-consultations-lab-checkpoint.md) | Pruebas de laboratorio de las consultas validadas. |
| [validated-consultations-migration-review.md](validated-consultations-migration-review.md) | Revisión de la migración de consultas y evidencia. |
| [validated-consultations-package-checkpoint.md](validated-consultations-package-checkpoint.md) | Control del paquete de consultas validadas. |
| [validated-consultations-platform-gates.md](validated-consultations-platform-gates.md) | Comprobaciones por plataforma de las consultas validadas. |
| [validated-consultations-release-helpers.md](validated-consultations-release-helpers.md) | Scripts de preparación de la entrega de consultas validadas. |
| [validated-consultations-release-plan.md](validated-consultations-release-plan.md) | Plan de publicación de consultas validadas. |
| [validated-consultations-test-migration.md](validated-consultations-test-migration.md) | Migración de pruebas al alcance de consultas validadas. |
| [review-roles.md](review-roles.md) | Registro del cambio a roles neutrales en atribuciones de revisión, sin alterar resultados ni evidencia técnica. |
