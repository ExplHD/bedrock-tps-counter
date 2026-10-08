# Local final-RP renderer and MCP

## Exactness gate

Before measuring text or proposing coordinate changes, collect all of the following:

- an installed vanilla profile with `status: available`, version, fingerprint, and target-RP-first resolution;
- its Minecraft font profile with `status: available`; a system fallback is a blocking `FONT_UNAVAILABLE`, not a substitute;
- pinned, offline upstream compatibility evidence for anchors, imports, nine-slice behavior, and serialization; each required fixture must be committed `baseline-verified` or reviewed `local-capture-verified`, never unresolved `pending-local`;
- the target device profile: viewport, GUI scale, safe area, and logical size;
- a project-bound screenshot calibration ID derived from at least three non-collinear correspondences.

If any item is missing, continue only as diagnosis. Preserve unresolved values and do not claim pixel accuracy, fit text by eye, or guess replacement coordinates.

## CLI

```powershell
node tools/upstream-compat.mjs --strict --captures workspace/upstream-captures
npm run final-rp:render -- <rpRoot> --fixture <fixture.json> --out <preview.png> --viewport 480x270
npm run inspector -- --rp <rpRoot>
npm run mcp
```

Use `--vanilla-root references/upstreams/MCBVanillaResourcePack` when the screen inherits vanilla controls or uses vanilla textures. The target RP stays authoritative.

`final-rp:render` uses the integrated v2 engine by default, auto-discovers installed vanilla/font assets when possible, and records the profile fingerprint in its report. Use `--states`, `--hover`, and `--pressed` for the complete state matrix. Its PNG still does not execute Bedrock or replace screenshot calibration. `--engine legacy` is regression-only.

The fixture uses `title`, `body`, `buttons`, `hoveredIndex`, `pressedIndex`, and `focusedIndex`. Each button record should include its real index, text, texture, and texture file system.

Keep the default fixture's interaction indices `null`. Render each interactive family with an explicit index and require different PNG hashes when its visible state should change. Equal hashes across visibly different default/hover/pressed requests are a renderer or state-dispatch failure, not evidence that the UI is stable.

For state-content persistence, compare semantic controls and bindings. A default/hover/pressed background texture change with the same label and icon controls is expected styling; report content loss only when a semantic label/icon or its binding disappears or changes incompatibly.

Render the qualified registered screen or form root at the target logical viewport before thumbnail reduction. Do not substitute a child panel and call it the form. Cache keys must cover the screen source, inherited sources, fixture, state, viewport, renderer revision, and resolved asset fingerprints. After changing state, wait for render completion and compare the final image hash rather than an intermediate frame. If a local server may be stale, verify its revision endpoint or start a fresh port.

Trace `_ui_defs.json -> screen -> route -> modifications -> final root`. Record whether modifications were applied and whether the fixture matches the source family, expected route/root, collection names, materialized item minimum, and required indices. A skipped required fixture is unavailable, not passing evidence.

For fast/thumbnail analysis, require explicit capability flags. If per-control pixels, masks, silhouettes, or source alpha were omitted, a validator that needs them must return `PIXEL_METRICS_UNAVAILABLE` or an equivalent unavailable state. Separate render completion, nonblank pixels, inspection capability, and validation result.

## Engine-backed custom renderers

Treat `type: "custom"` controls whose `renderer` is supplied by the Bedrock engine as a separate capability boundary. Common examples include `live_player_renderer` and `paper_doll_renderer`.

- If the offline renderer does not implement that engine renderer, emit a blocking `RUNTIME_CUSTOM_RENDERER_UNAVAILABLE` diagnostic containing the control and renderer names.
- Preserve the control's resolved rectangle and provenance in the report, but do not draw a placeholder or silently convert it to a generic group.
- A blank offline region is diagnostic-only. It does not prove that Bedrock will leave the region blank, and it cannot be used to reject a source-valid custom renderer.
- Do not replace the custom renderer with a 2D icon merely to make the preview nonblank. Use a Bedrock screenshot and the target Content Log to verify the model, pose, cursor tracking, clipping, and stacking order.
- A screen containing an unavailable required custom renderer cannot reach `final-pack-static-visual` completeness for that region. Other independently rendered regions may still be inspected as partial evidence.

## MCP tools

- `mcbe_ui_open_project`
- `mcbe_ui_resolve_screen`
- `mcbe_ui_render_screen`
- `mcbe_ui_render_states`
- `mcbe_ui_inspect_control`
- `mcbe_ui_validate_layout`
- `mcbe_ui_validate_state_textures`
- `mcbe_ui_measure_reference`
- `mcbe_ui_compare_screenshot`
- `mcbe_ui_search_examples`
- `mcbe_ui_propose_corrections`
- `mcbe_ui_calibrate_renderer`
- `mcbe_ui_measure_text`
- `mcbe_ui_validate_upstream_compatibility`

Probe the required request, not merely the advertised tool list. A missing dependency, target file, installed font asset, or calibration input blocks the affected evidence level; do not simulate it.

Render a state matrix with `mcbe_ui_render_states`, then validate state textures. Compare an actual Bedrock screenshot only after calibration. Correction proposals must reference server-issued evidence IDs and the current project revision, include old/new values and property origins, and remain read-only until the user explicitly authorizes an edit. Geometry proposals target source IR when it exists.

Screenshot evidence also requires nonempty required regions, a minimum root-match score, minimum IoU, maximum residual, calibration ID, screenshot/render hashes, and matching project revision. Empty regions, placeholder device provenance, stale reports, or low-quality matches cannot issue correction evidence.

MCP render output must be outside the RP. External editor exports may be used as pinned compatibility fixtures, never as screenshot calibration or runtime proof.

## Evidence labels

1. `structural-static`: parsing, references, registration, and pack linkage only.
2. `final-pack-static-visual`: complete final-RP root rendered with resolved dependencies, source-complete fixture, requested inspection capability, and nonblank expected pixels.
3. `calibrated-screenshot-comparison`: comparison to one identified capture with thresholds, regions, calibration, revision, and artifact hashes.
4. `bedrock-runtime-visual`: Bedrock rendered the target screen and the target UI Content Log is clean.
5. `bedrock-runtime-interaction`: required hover, click, focus, input, collection, animation, and sender-response scenarios passed.

Each level proves only its own capability. A later-looking tool output such as `report.ok` or an evidence ID does not skip a missing prerequisite.
