---
name: mcbe-json-ui-vanilla-assets
description: Verify and use vanilla Minecraft Bedrock texture and icon paths for JSON UI. Use when Codex must confirm `textures/ui/*`, item icon atlas entries, block icon atlas entries, vanilla screen file names, or explain how to find and apply the correct vanilla asset source without hallucinating nonexistent paths. Use official Mojang samples first and a pinned vanilla resource mirror only as search evidence.
---

# MCBE JSON UI Vanilla Assets

Use this when the task needs a confirmed vanilla texture path, current vanilla screen file lookup, or an explanation of how to search the Bedrock vanilla pack correctly.

## Contract

- Input: requested visual role or identifier, asset class, and target Bedrock resource revision when known.
- Output: verified vanilla path or atlas key with evidence, or an explicit not-found result and custom-asset fallback.
- Success: every returned path exists in the selected mirror/index and revision uncertainty is disclosed.

If `data/skill-tool-profiles.json` exists, read only the `mcbe-json-ui-vanilla-assets` entry. Use an index command only when both the command and index exist; otherwise inspect the configured vanilla source directly.

## Workflow

1. Read `references/vanilla-map.md`.
2. Use official Mojang samples as implementation evidence and the pinned Ztech mirror only to search asset paths missing from the official sample tree.
3. Decide whether the target is a UI texture, item icon, block icon, or screen file.
4. Search the correct upstream location:
   - `textures/ui/`
   - `textures/item_texture.json`
   - `textures/terrain_texture.json`
   - `ui/`
5. Return only verified paths or verified file names.
6. If the path is not found, say it is not verified and recommend shipping a custom texture instead of guessing.

## Hard rules

- Never invent Bedrock texture paths.
- Do not treat old handwritten icon notes as stronger than the upstream pack tree.
- Do not call Ztech a Mojang authority or silently prefer it over conflicting official/runtime evidence.
