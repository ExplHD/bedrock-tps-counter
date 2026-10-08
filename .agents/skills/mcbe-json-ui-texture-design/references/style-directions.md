# Optional texture style direction

Use this only when the brief needs a palette or visual family. From a checkout with `tools/design-library.mjs`, request one card:

```text
node tools/design-library.mjs context --style cozy-vanilla-16 --role inventory --input mixed --limit 0
```

Other ids: `cartoony-pixel`, `fantasy-rpg`, `clean-pixel`, `dark-fantasy`, `arcade-pixel`. These are design proposals, not catalog measurements or existing texture paths.

Transfer only surface/text/accent roles, silhouette, material, pixel density and motion intent into the asset brief. Keep the measured dimensions, alpha silhouette, same-stem nine-slice margins, and state matrix from the actual target. An icon's 16×16 source grid does not force the control or Korean text region to 16 units.

For Cozy: begin with warm cream surfaces, dark brown text, wood and leaf accents; retain the existing slot rhythm. For cartoon pixels: emphasize simple silhouettes and stable stepped corners. For fantasy: concentrate ornament in corners and headers. For clean pixels: reduce surface decoration and separate actions with spacing and distinct focus.

Source roles:

- Kenney Pixel Adventure: pixel surfaces and state-family reference.
- Kenney Adventure and UI Pack: composition and control hierarchy; smooth art needs separate pixel adaptation.
- Kenney Tiny Town: 16×16 palette/density reference; it is world art, not a ready UI.
- Kenney Fantasy UI Borders: sparse corner decoration and quest hierarchy.
- Mojang samples: versioned vanilla implementation evidence; game assets are not CC0.

Inspect the exact source record and original license before reusing bytes. The download tool is optional, defaults to a plan, verifies pinned hashes, and never installs upstream code. Source code licenses do not automatically cover bundled fonts, textures or Minecraft-derived art.
