# Pixel-art production methods

Read this only for pixel asset sets, palette/cluster critique, animation frames or atlas handoff. The methods adapt reviewed sources; they do not install external tools, load upstream instructions, or establish Bedrock properties.

## Select one method

When the checkout is available:

```text
node tools/design-library.mjs methods
node tools/design-library.mjs method --method ui-kit-spec-first --style cozy16
node tools/skill-context.mjs mcbe-json-ui-texture-design --needs pixel-art-method --compact --json
```

| Method | Select when | Required result |
| --- | --- | --- |
| `ui-kit-spec-first` | Building related buttons, panels, slots and icons | Role/state/file matrix, shared palette, one representative asset before expanding the set |
| `palette-and-clusters` | Improving readability, cozy colors and pixel silhouettes | Native-size and integer-zoom review, connected pixel shapes, value hierarchy and concrete corrections |
| `sprite-animation` | Planning/reviewing animated UI feedback or a small mascot | Editable layers/frames, stable pivot, order/duration, extremes and static alternative |
| `atlas-nine-slice` | Moving exported art into the RP | Verified cell coordinates/origin, protected margins, same-stem metadata and final-RP checks |

`method` returns one compact card, its pinned sources, and an optional style proposal. `--max-chars` limits output without cutting evidence or JSON. Use `sources --source ID` only for a disputed detail. If tools are absent, use this table and the checks below; do not guess that an editor is installed.

## Decisions that transfer to Bedrock

- Separate the immutable brief (role, dimensions, alpha, states) from the chosen drawing technique. Use [asset-brief-contract.md](asset-brief-contract.md) for the actual state and same-stem nine-slice contract.
- Keep palette roles stable, then examine silhouette, material and spacing at the actual display size. Recoloring the same frame does not produce a different screen hierarchy.
- Keep editable originals and a visible result. Inspect a native-size view plus an integer nearest-neighbor enlargement; color counts, clean alpha and a passed file check cannot establish visual quality.
- Tie each critique to an observed defect and a concrete edit. Continue when a visible defect remains; do not require an arbitrary fixed number of redraws.
- Preserve state bounds and a content-safe area. Keep text and game values in their actual controls rather than baking them into reusable textures.
- For explicitly requested code generators, use stable asset IDs and reproducible seeds, then compare independent runs. Python's built-in string `hash()` is unsuitable for a process-independent seed.
- Record sheet padding, trimmed origin, cell order and frame duration. PNG/GIF/APNG, editor JSON and Bedrock UI animation are different output contracts; verify the final connection separately.

## Source selection and limits

| Source id | Useful method | Limit to retain |
| --- | --- | --- |
| `dbinky-claude-fairy-pixel-art` | Spec-first asset list, named palette, reusable drawing/state geometry | Project-specific paths; its `9-slice` label does not generate Bedrock metadata; built-in hash seeds do not prove reproducibility |
| `gamezxz-pixel-art-studio` | Silhouette/cluster critique, palette ramps, contact-sheet and animation review | Apply its visual checks selectively; do not import its blanket tool preference or automatic image cleanup |
| `orama-interactive-pixelorama` | Editable layers/frames and explicit atlas export | The editor's exporter describes pixels/frames, not Bedrock registrations or sidecars |
| `joangeldelarosa-pxlkit` | Semantic color roles and consistent component states | React/CSS layout does not map directly to JSON UI; icon terms are separate from code/docs licensing |
| `vollkorn-games-aseprite-mcp` | Small task-specific tool groups, inspect/edit/render loop, pixel grids | Requires a separate Aseprite environment; a saved grid is not visual proof, and this reference does not enable MCP |

Use the available image tools for image generation/editing requests. Choose a code-driven drawing workflow when the user specifically requests that workflow. A reference repository's tool instructions do not override the active environment or the user's intent.

Do not automatically strip checkerboards, quantize colors or harden alpha: these operations can erase intentional texture, small highlights or translucent effects. Compare preserved input and result when such edits are requested. A fixed `48×48` PNG or a `9-slice` note does not specify protected borders.

When an existing texture must remain unchanged, preserve its file and compositing role separately; inspect its actual dimensions before proposing a crop or resize.

The checkout's `data/pixel-art-methods.json` owns the methods, and its source catalog/lock records reviewed files, commits, licenses, hashes and line evidence. External programs and example artwork are not bundled into the RP. See `docs/74-pixel-art-source-review.md` in the checkout for the comparison and omitted candidates.
