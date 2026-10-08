---
name: mcbe-json-ui-debugging
description: Diagnose Bedrock JSON UI failures. Use when a screen or server form does not render, a control reference or property is rejected, a hover/input state is wrong, bindings or protocol text leak, or static checks disagree with Bedrock runtime.
---

# MCBE JSON UI Debugging

Diagnose from the exact failing control path outward. Do not patch the visible symptom before identifying the owning layer.

## Contract

- Input: failing screen, entry files, related UI/BP sender files, exact reproduction, Content Log, and target device/input method.
- Output: evidence-ranked root cause, smallest owning-layer fix, exact checks run, and runtime checks still pending.
- Success: registration, control resolution, collection ownership, bindings, visual state, input, assets, and runtime evidence are separated.

If `data/skill-tool-profiles.json` exists, read only the `mcbe-json-ui-debugging` entry. Confirm diagnostic commands exist before running them; unavailable checks stay unavailable.

## Workflow

1. Read `references/debugging-map.md` and classify the first target `[UI]` failure by its full control path.
2. Trace `_ui_defs.json` -> namespace -> route/factory -> inherited control -> collection/binding -> input mapping.
3. Compare the failing construct with the closest verified local or vanilla example; never invent a property or event name.
4. Fix the owning layer, re-run focused static checks, then request or inspect Bedrock interaction and a clean target Content Log.

## Required boundaries

- A parsed file or successful static preview is not Bedrock runtime proof.
- Separate unrelated Sound, Animation, and Script noise from the target UI failure.
- Preserve unresolved bindings and states as diagnostics; do not guess their values.
- Keep project-specific title tokens, namespaces, objectives, and hidden markers out of general rules.
