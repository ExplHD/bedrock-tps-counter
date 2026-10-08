---
name: mcbe-json-ui-samples
description: Mine working Minecraft Bedrock JSON UI packs into traceable patterns while preserving source tier, license, revision, and redistribution limits. Use for sample comparison or corpus-backed pattern extraction, not unsupported copying.
---

# MCBE JSON UI Samples

Extract the smallest reusable pattern from configured RP/BP evidence.

## Contract

- Input: source ID or pack root, target screen or behavior, intended output visibility, and the pattern question.
- Output: source validation status, selected evidence files, dependency trace, extracted pattern, source tier, and redistribution decision.
- Success: the pattern remains traceable to its source and dependencies, private inputs stay local-only, and no unsupported promotion or redistribution occurs.

## Workflow

1. Read [references/source-evidence-workflow.md](references/source-evidence-workflow.md).
2. In `data/skill-tool-profiles.json`, find the record in `profiles` whose `skill` is `mcbe-json-ui-samples`; the file is not keyed by skill name.
3. If `tools/skill-doctor.mjs` exists, inspect the profile and every selected tool status first. Never execute a stage marked `planned` or unavailable.
4. For external research sources, inspect the source/revision/license record with an available registered tool or directly read the configured evidence. Download only selected pinned sources within the user's authorization and never execute their code. When all corpus stages are implemented and their inputs exist, use the fixed order: `sources.validate` -> `source.scan` -> `catalog.build` -> `design.search`.
5. Before opening a large checkout, use the available design or pattern search and open only the selected case's evidence paths. If no index exists, search the relevant source narrowly. A retrieved case is static pattern evidence, not runtime proof.
6. If the pipeline is unavailable, perform read-only analysis of already configured evidence and report that no corpus or catalog artifact was generated.
7. Route selected geometry to `mcbe-json-ui-visual-design` or `mcbe-json-ui-ir-authoring`; route RP/BP dependencies to `mcbe-json-ui-addon-integration`.

## Boundaries

When present, `tools/design-library.mjs context --style ID --role inventory` retrieves small source-backed pattern cards; `data/bedrock-source-patterns.json` and `docs/73-bedrock-source-review.md` hold the reviewed BP→RP→response traces. Verify the selected paths against `config/design-research-lock.json`; avoid opening the full corpus for a single pattern. New source snapshots do not replace older compatibility fixtures without a separate review.

- Development packs and local asset libraries are read-only inputs.
- `quarantine` sources are local search evidence only and never automatic recommendations.
- `local-only`, `metadata-only`, and `prohibited` content must not be copied into public output.
- A statically working sample is not automatically `gold`; runtime evidence is required for that tier.
