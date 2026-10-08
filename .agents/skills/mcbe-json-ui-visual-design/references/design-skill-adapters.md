# External design Skill adapters

Use this when a new screen needs a visual direction, a game interface needs clearer priorities, or a design critique needs a second perspective. Load only the matching card. These are reviewed source materials, not installed Skills or Bedrock implementation authorities.

The checkout's `data/design-skill-sources.json` records pinned commits, license files, source hashes, exact line evidence, and adoption decisions. Downloaded originals remain in the ignored research workspace. No source code needs to run for these adapters.

## Choose one starting point

| Source id | Use for | Bedrock adaptation | Keep out of the implementation |
| --- | --- | --- | --- |
| `game-ui-design` | Player decisions, combat versus menu density, complete states, genre | Name the player's next action, then choose information order and supported states. Keep gameplay authority in BP/server code. | Promises of drag/drop, remapping, or live events without target-version evidence. |
| `game-ui-ux` | Safe areas, focus, controller navigation, screen return | Specify input ownership, initial/return focus, back behavior, and viewport policy; test the requested devices. | Its absolute-pixel prohibition, Godot/Unity APIs, and assumed engine screen stack. This kit's solved IR still owns pixel geometry. |
| `ui-ux-pro-max` | Style and palette candidates, visual density, small targeted searches | Select shape, material, color roles, and contrast intent, then translate them into existing RP textures and measured IR. | CSS/GSAP/Google Fonts, vector-only asset rules, browser pixel thresholds, and web performance ratings treated as Bedrock guarantees. |
| `frontend-design` | Subject-specific composition and visual critique | Compare a short palette/type-role/layout proposal against the user's references. Keep purposeful emphasis and readable action text. | Web hero structures, CSS implementation, arbitrary font replacement, or novelty that contradicts the user's chosen style. |

`game-ui-design`, `game-ui-ux`, and `ui-ux-pro-max` are **adapt** sources. `frontend-design` is **reference-only**: use its critique questions without adding its workflow to every task.

## Apply the selected card

1. Record the source id and the specific design decision it informed. A changed palette alone does not establish a new screen structure.
2. Route geometry to `mcbe-json-ui-ir-authoring`, surface assets to `mcbe-json-ui-texture-design`, and game/input behavior to its existing form, HUD, or addon owner.
3. Verify concrete properties, glyphs, assets, collections, and events using the target Bedrock evidence. External design guidance does not establish a supported property or successful interaction.

Do not import the full external Skill, CSV catalog, or engine examples into default context. Use a compact selected result and open its original evidence only for a disputed design decision.

## Pinned evidence and licenses

- [Game UI Design: decisions, density, states, and inputs, lines 11–17](https://github.com/jeremylongworth-source/AgentSkills/blob/45f314d2a3d3201dd5a0304a3a4f3a5f23a905a2/skills/game-ui-design/SKILL.md#L11-L17). MIT; copyright Jeremy Longworth.
- [Game UI/UX: layout, safe area, focus, and updates, lines 35–52](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/d4b0e35550c55ae70bdfcab4ef5a0e94610438a9/skills/disciplines/game-ui-ux/SKILL.md#L35-L52). Apache-2.0; retain its `LICENSE` and `NOTICE` when redistributing source material.
- [UI UX Pro Max: scoped queries and result review, lines 51–63](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/823b0a14d3539b5d78c0efb614426a4fab5983ec/.claude/skills/ui-ux-pro-max/SKILL.md#L51-L63). MIT; copyright Next Level Builder. Its mobile [vector-only recommendation, lines 3–16](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/823b0a14d3539b5d78c0efb614426a4fab5983ec/.claude/skills/ui-ux-pro-max/references/pro-rules.md#L3-L16) is intentionally excluded from the Bedrock adapter.
- [Frontend Design: brief precedence, plan, and critique, lines 45–59](https://github.com/anthropics/skills/blob/33375500bcea98d610eb30ce10ac4e59b89c390d/skills/frontend-design/SKILL.md#L45-L59). Apache-2.0 under the Skill's own `LICENSE.txt`.

These license records cover the reviewed files. Linked fonts, icon collections, engines, or other assets keep their own rights and are not bundled by this adapter.
