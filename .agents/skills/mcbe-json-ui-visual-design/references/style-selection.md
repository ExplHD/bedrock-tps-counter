# Style selection and game UI decisions

Use only when choosing a visual direction or improving a game's interface. A binding-only repair does not need this reference. Styles are authored proposals informed by reviewed sources; their numbers are not measured Bedrock geometry.

## Select one direction

| Style id | Direction | Useful for |
| --- | --- | --- |
| `cartoony-pixel` | Stepped corners, warm light surfaces, clear silhouettes, small single-shot animation | Shop, rewards, cheerful menus |
| `fantasy-rpg` | Parchment, restrained wood/metal frames, title ribbon, regular slots | Inventory, quests, character, adventure shop |
| `clean-pixel` | Quiet flat surfaces, thin pixel edge, strong hierarchy and whitespace | Settings, dense inventories, menus |
| `cozy-vanilla-16` | Vanilla-like repeated slots, warm cream/wood/leaf colors, crisp 16×16 icons | Cozy inventory, town shop, quests |
| `dark-fantasy` | Dark panels, thin ornamental corners, high-contrast quest text | Quest log, character screens |
| `arcade-pixel` | Clear score/reward hierarchy, bright accent, brief result feedback | Rewards and compact HUD |

Keep one base direction; borrow at most one accent when it serves the brief. “16×16” describes an icon/texture starting grid, not every control or text box. Bright pastel backgrounds still need dark readable text. A clean smooth GUI reference does not establish pixel-art density.

## Small context first

If the checkout contains these tools, run from its root:

```text
node tools/design-library.mjs styles
node tools/design-library.mjs context --style cozy-vanilla-16 --role inventory,shop --input mixed
```

The result contains a proposed palette, edge/motion rules, input and screen checks, up to two source-backed patterns, and reuse limits. `--limit 0` omits pattern cards; `--max-chars` caps output. Read one selected source with `sources --source ID` only when the decision needs more evidence. `skills` lists the reviewed external design methods; [design-skill-adapters.md](design-skill-adapters.md) explains how to apply one.

If the tools are absent, use the table as an explicitly new design proposal, inspect the user's actual textures/screens, and keep unknown measurements unresolved. Do not infer that an external archive or style is installed in the target RP.

When visual comparison helps, run `node tools/design-board.mjs --styles cozy16,fantasy-rpg --out workspace/style-review`. Open its standalone `index.html` to compare colors, states, narrow cards and long Korean text. The shared inventory/shop specimen is a proposal, not an RP renderer; `--role` changes review checks only. Output is a compact path list, and existing files require explicit `--overwrite`. Load this tool only through `--needs design-board` or `style-comparison`.

## Make a short game UI brief

1. State the player's next action, its urgency, and the RP/BP owners of displayed data.
2. Name the main regions: title/context, collection/body, details, primary action, and back/close. Preserve the source screen's required shell.
3. List supported states: default, hover/focus, pressed, selected, disabled, empty, loading, error. Selection and focus are separate.
4. Specify initial focus, directional/tab order, close/back, return focus and scrolling. Touch must work without hover.
5. Record type roles and available text boxes; test long Korean, English and unbroken identifiers at the actual scale. Do not shrink text to make an evaluation pass.
6. Choose surface, text, accent, success, danger and focus colors. Check rendered contrast and use a second cue besides color. Verify nine-slice corners and nearest/integer scaling for pixel surfaces.
7. Use movement to explain an event. Provide a static alternative; do not move reading text or a target during interaction.

Review hierarchy, readability, spacing, state distinction, input reachability, asset consistency and motion. For each concern record the observed defect, one edit, and the evidence to recheck. An aesthetic score cannot replace runtime input or BP result evidence.

Further device-specific guidance: Microsoft [text display](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/101), [navigation](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/112), [focus/context](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/113), [motion](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/117). Their physical/screen pixel guidance must be calibrated to the actual Bedrock device and GUI scale.
