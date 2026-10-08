# HUD Chat Map

## Primary source files

- `references/source-packs/modern-cloud-ui-reference/ui/hud_screen.json`
- `references/source-packs/modern-cloud-ui-reference/ui/chat_screen.json`
- `references/source-packs/modern-cloud-ui-reference/ui/scoreboards.json`
- `references/source-packs/rpg-server-ui-reference/ui/hud_screen.json`
- `references/source-packs/farm-ui-variants/FwnQgFaZsHs/ui/hud_screen.json`
- `references/source-packs/farm-ui-variants/FwnQgFaZsHs/ui/chat_screen.json`
- `references/source-packs/farm-ui-variants/gPiyv-DJxGw/ui/hud_screen.json`
- `references/source-packs/farm-ui-variants/gPiyv-DJxGw/ui/scoreboards.json`
- `references/source-packs/farm-ui-variants/z65tCLQRo0Q/ui/hud_screen.json`
- `references/source-packs/farm-ui-variants/z65tCLQRo0Q/ui/chat_screen.json`
- optional restricted neutral mirror: `references/restricted/advanced-ui-set-ui/restricted-suite/ui/phud/phud.json`
- optional restricted neutral mirror: `references/restricted/advanced-ui-set-ui/restricted-suite/ui/phud/sidebar.json`
- optional restricted neutral mirror: `references/restricted/advanced-ui-set-ui/restricted-suite/ui/phud/phone.json`
- optional restricted neutral HUD renderer relocation: `references/restricted/advanced-ui-set-ui/restricted-suite/ui/hud_screen.json`
- optional restricted neutral maze status HUD: `references/restricted/advanced-ui-set-ui/motion-form-gallery/ui/mai/custom_hud/maze.json`
- optional restricted neutral maze reward HUD: `references/restricted/advanced-ui-set-ui/motion-form-gallery/ui/mai/custom_hud/reward.json`

## Strong examples

- Modern Cloud UI Reference: custom chat panel, scoreboard split, title-driven HP bar
- RPG Server UI Reference: hp/xp/mp/lv/gold HUD, levelup actionbar image
- Farm UI variants: alternate HUD and chat pairings
- Chat protocol filtering: hide rendered chat rows whose `#text` contains a server-owned marker while preserving `#chat_visible`; see `mcbe-json-ui-master/references/topics/hud-chat/chat-message-filtering.md`.
- Java Locate Command chat helper: intercept `The nearest ... is at block ...` rows in `chat_screen.json`, reformat the row, and use an invisible `edit_box` to build `/tp @s <x> <y> <z>`; see `references/topics/hud-chat/java-locate-command-chat.md`.
- Déesse-style HUD menu reference: route a large HUD suite through `_ui_defs.json`, keep desktop and touch menu layouts separate, and bind overlays from shared toggle state; see `references/topics/hud-chat/deesse-style-hud-menu.md`.
- advanced-ui-set neutral reference: title-payload HUD router with separate actionbar, phone, sidebar, currency, loading, and wait widgets. Use `docs/60-advanced-ui-set-special-ui-reference.md` before opening raw restricted files.
- advanced-ui-set compact renderer reference: vanilla renderer relocation and actionbar fade without fully replacing hotbar or gameplay HUD. Use `docs/61-advanced-ui-set-file-pattern-routes.md` to route this separately from protocol HUD work.
- advanced-ui-set maze reference: status HUD, effect duration bars, cooldown overlays, reward overlays, and flip-book animation values. Use `docs/64-motion-form-hud-reference.md` before opening raw restricted files.

## Failure gates

### Channel and factory arbitration

- Build a sender table for title, subtitle, actionbar, and chat with tick/event timing and receiver factory.
- Decide whether features are simultaneous or exclusive. Simultaneous state needs one routed payload or proven independent channels; consecutive writes to one actionbar factory are replacement candidates, not composition.
- Receive each raw channel value once, then derive child properties. Duplicated global receivers and wholesale vanilla factory replacement require explicit evidence.

### Fixed-width protocol

- Record prefix, field order, byte-width rule, padding, sentinel, escaping, and total payload budget.
- Test ASCII, Korean, section-sign formatting, PUA/emoji, empty, zero, exact-boundary, and over-boundary values. Do not generalize a local 80-byte slot or observed failure length into a universal Bedrock limit.

### Chat row ownership

- Preserve the active vanilla `chat_grid_item` measurement and lifetime chain.
- A decoration should read the materialized sibling text by verified `source_control_name` and `resolve_sibling_scope`; it must not re-receive the chat collection.
- Keep one row-height owner and one wait/fade/destroy chain. Test normal, marked, multiline, sequential, scroll, fade, and expiration cases.

### Scoreboard correlation

- Treat `players_collection`, `scoreboard_scored_list_collection`, `scored_list_factory`, identity comparison, objective title, and server cleanup as one contract.
- Do not correlate separate collections by ordinal. Test at least two players with distinct scores plus leave/rejoin and offline-entry cleanup.
