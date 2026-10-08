---
name: attachable-uv-rotation
description: Use when creating or baking Minecraft Bedrock attachable geometry, held-item models, or static model previews whose consumer does not preserve per-face uv_rotation. Converts 90-degree and 270-degree face UV rotations into thin static proxy planes while preserving the rendered UV orientation.
---

# Convert attachable UV rotation to static planes

Minecraft Bedrock attachable geometry does not reliably support per-face `uv_rotation`. When an attachable, held-item model, baked geometry, or static preview contains a face with `uv_rotation` of 90 or 270 degrees, replace that face with a `.001`-thick proxy cube. Rotate the proxy geometry so the face renders with the original UV orientation.

Do not apply this conversion to ordinary source geometry when its renderer already preserves `uv_rotation`. Do not use this mapping for 0-degree or 180-degree rotation. Treat cubes with their own rotations or pivots, and cubes with negative dimensions, as unsupported until their transform composition has been validated visually.

## Invariants

The proxy must:

- retain the original face key;
- retain the original UV rectangle;
- copy signed `uv_size` values unchanged;
- remove `uv_rotation` from the copied face;
- contain only the affected face;
- preserve the source bone's animated and material parent chain.

Never normalize or flip the signs in `uv_size`.

## Validated face mapping

The angle columns correspond to source `uv_rotation` values of 90 and 270 degrees.

| Source face | Proxy plane | Rotation axis | 90 | 270 |
| --- | --- | --- | ---: | ---: |
| north | native north plane | Z | +90 | -90 |
| south | native south plane | Z | -90 | +90 |
| east | west plane at `ox - t` | X | +90 | -90 |
| west | east plane at `ox + sx` | X | -90 | +90 |
| up | native up plane | Y | +90 | -90 |
| down | native down plane | Y | -90 | +90 |

Rotation signs are face-dependent. Do not replace this table with one generic sign rule. East and west use proxy faces on opposite physical planes.

## Geometry calculations

For source origin `O = [ox, oy, oz]`, source size `S = [sx, sy, sz]`, center `C`, and proxy thickness `t`:

```text
C = O + S / 2 = [cx, cy, cz]
t = .001
```

Use these proxy dimensions:

```text
north/south: [sy, sx, t]
east/west:   [t, sz, sy]
up/down:     [sz, t, sx]
```

Use these proxy origins, with rotation pivot `C`:

```text
north: [cx - sy/2, cy - sx/2, oz]
south: [cx - sy/2, cy - sx/2, oz + sz - t]
east:  [ox - t,     cy - sz/2, cz - sy/2]
west:  [ox + sx,    cy - sz/2, cz - sy/2]
up:    [cx - sz/2, oy + sy - t, cz - sx/2]
down:  [cx - sz/2, oy,          cz - sx/2]
```

Apply the axis and signed angle from the mapping table. A native plane means the retained proxy face lies on the source face's physical plane.

## Validation

Before using the conversion in production:

1. Build native and converted fixtures for every affected face at both 90 and 270 degrees.
2. Confirm the face key, UV rectangle, and signed `uv_size` are unchanged.
3. Confirm only `uv_rotation` was removed from the copied face data.
4. Check proxy dimensions, physical planes, pivot, axis, and angle against the mapping table.
5. Compare every native and converted pair visually in Blockbench with the real texture.
6. Validate the resulting attachable or held-item model in Minecraft.

If a converted model regresses, remove the new conversion for that model. Do not change the global sign mapping as a shortcut.
