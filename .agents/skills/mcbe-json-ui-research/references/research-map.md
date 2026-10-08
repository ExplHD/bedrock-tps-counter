# Research Map

## Use local sample packs when

- the question is about how packs are actually assembled
- the user wants a working pattern to copy
- the answer depends on Script API or server-driven text protocols

Primary included sources:

- `references/source-packs/modern-cloud-ui-reference/`
- `references/source-packs/farm-ui-variants/`
- `references/source-packs/rpg-server-ui-reference/`

## Use official sample screens when

- the question is about vanilla screen files
- the question is about official `_ui_defs.json` structure
- the task needs a vanilla example for a screen

Primary upstream:

- <https://github.com/Mojang/bedrock-samples/tree/main/resource_pack/ui> — Mojang sample structure; obey `LICENSE.md` and pin the revision used.
- <https://learn.microsoft.com/en-us/minecraft/creator/reference/content/jsonuireference/examples/jsonuilist?view=minecraft-bedrock-stable> — Microsoft JSON UI reference index; availability may require sign-in.

## Use community reference docs when

- the question is about bindings, operators, techniques, or best practices
- the user needs explanation of JSON UI behavior
- the task needs a known reusable technique such as preserved titles

Primary pages (community-maintained behavior evidence, not Mojang runtime guarantees):

- <https://wiki.bedrock.dev/json-ui/json-ui-documentation>
- <https://wiki.bedrock.dev/json-ui/json-ui-intro>
- <https://wiki.bedrock.dev/json-ui/best-practices>
- <https://wiki.bedrock.dev/json-ui/preserve-title-texts>
- <https://wiki.bedrock.dev/json-ui/modifying-server-forms>
- <https://wiki.bedrock.dev/json-ui/buttons-and-toggles>

## Use Ztech when

- the question is about vanilla textures or icons
- the question is about whether a vanilla file exists
- the task needs current vanilla asset names

Primary upstream:

- <https://github.com/Mojang/bedrock-samples/tree/main/resource_pack> — official sample pack and first authority for current stable examples.
- <https://github.com/ZtechNetwork/MCBVanillaResourcePack> — versioned community mirror used only after pinning a release/commit and cross-checking the target game version.

## Use external example repositories when

- the task needs a minimal reusable example
- the local packs are too complex for the current need
- the user wants a builder-style control example

Primary sources:

- `references/external/json-ui-examples/`
- `references/external/EasyUIBuilder/`
- `references/external/Chest-UI/`
- `references/external/bedrock-json-ui-editor/`
- `references/external/bedrock-wiki-json-ui/`
