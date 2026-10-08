---
name: minecraft-player-animation
description: >
  REQUIRED when creating, editing, reviewing, or calibrating Minecraft Bedrock
  vanilla-player animations. Use for Blockbench animation work, emotes,
  locomotion, combat poses, jumps, flips, root/waist/body hierarchy, mirrored
  limbs, procedural Molang motion, interpolation, blending, pivots, and player
  animation JSON.
---

# Minecraft Bedrock Player Animation

Create expressive vanilla-player animations with a bouncy, readable,
weight-driven style.

## Skill Composition

For natural, grounded, weighty, impactful, or editable motion, also load
`weight-driven-animation`. That skill owns support planning, momentum, impact,
recovery, prop weight, keyframe editability, and motion-quality review.

This skill owns Minecraft-specific hierarchy, pivots, coordinate conversion,
player geometry solvers, Molang timing, animation contracts, and controller
boundaries.

## Vanilla Player Hierarchy

Mojang's `geometry.humanoid.custom` uses this relevant hierarchy:

```text
root                     pivot [0, 0, 0]
├── waist                pivot [0, 12, 0]
│   └── body             pivot [0, 24, 0]
│       ├── head         pivot [0, 24, 0]
│       ├── rightArm     pivot [-5, 22, 0]
│       │   └── rightItem pivot [-6, 15, 1]
│       └── leftArm      pivot [5, 22, 0]
├── rightLeg             pivot [-1.9, 12, 0]
└── leftLeg              pivot [1.9, 12, 0]
```

Source:
`https://github.com/Mojang/bedrock-samples/blob/main/resource_pack/models/entity/humanoid.custom.geo.json`

### Bone Responsibilities

| Bone | Primary use | Avoid |
|---|---|---|
| `root` | Whole-player lean, shared translation, squash/stretch | Large upper-body-only poses; 360-degree turns around the ground pivot |
| `waist` | Hip-level torso lean, side bend, weight shift, upper-body rotation | Expecting legs to follow automatically |
| `body` | Small chest twist and secondary accents | Large compound rotations or large Z bends |
| `head` | Looking, anticipation, drag, counter-rotation | Ignoring inherited waist/body motion |
| Arms | Gesture/action silhouette and overlap | Rotation-only movement with no shoulder or weight response |
| Legs | Stance, contact, stride, tuck | Simple mirrored sine waves when contact matters |

Choose the narrowest parent that should carry the motion:

- Whole body including legs: `root`
- Upper body around hips: `waist`
- Chest, head, and arms only: `body`
- One limb only: that limb bone

Large `body` motion can visibly separate the torso from the legs because
`body` pivots at Y `24`. Use `waist` for primary torso motion. Keep body Z
side-bend modest; approximately `2–8` degrees is a useful starting range.

### Body and Head Scale Compensation

`head` and both arms inherit `body` scale. To enlarge the torso/upper body
without visibly scaling the head, drive `body.scale` with `[sx, sy, sz]` and
drive `head.scale` from the exact inverse:

```text
head.scale = [1/sx, 1/sy, 1/sz]
```

Use the same Molang progress expression for both. `hat` inherits the compensated
head and remains unchanged with it. Compensating only authored endpoints is
insufficient because interpolation can resize the head between keys.

Non-uniform parent scale can change child spacing and apparent rotation. Check
arms, sleeves, head, hat, torso/leg seams, and the composed pose throughout the
transition.

## Held Item Anchor

`rightItem` is the held-item anchor under `rightArm`. In the vanilla player
geometry its pivot is `[-6, 15, 1]`; attachable geometries commonly mirror a
`rightArm -> rightItem -> weapon` hierarchy.

Separate these responsibilities:

- `rightArm`: shoulder, elbow-less arm silhouette, and primary hand position
- `leftArm`: supporting hand position for two-handed weapons
- `rightItem`: weapon direction around the primary hand
- Weapon child bone: model-specific resting orientation

Do not force the arms behind the player merely to point the blade. First pose
the hands, then rotate `rightItem` to aim the weapon.

For a two-handed weapon:

1. Make the hand endpoints touch or stack along the handle.
2. Keep the arm positions within a visually safe shoulder-detachment cap.
3. Rotate `rightItem` independently until the blade follows the intended
   chamber, slash, thrust, or overhead direction.
4. Preserve the hand relationship while `rightItem` changes direction.
5. Include `rightItem` transforms in combo bridge-pose equality.

### Confirmed Vanilla Two-Hand Convergence

In Blockbench with the standard player geometry, the confirmed inward signs
are:

| Channel | Right arm | Left arm |
|---|---:|---:|
| Rotation Y | Negative | Positive |
| Position X | Positive | Negative |

The opposite Y pairing rotates the hand endpoints outward. The opposite
position-X pairing makes the arms wider and can detach the shoulders.

These signs were confirmed at a forward pitch around X `-90` and an overhead
pitch around right X `-120` / left X `-110`. Magnitudes remain pose-dependent:
combining overhead Y `-35/+35` with position X `+3/-3` already crosses the
hands, so a touching grip for that pose requires less than `3` units.

Recalibrate magnitudes when geometry proportions, arm pivots, or handle
placement differ. Never treat the current touching offset as a universal cap.

### Exact Hand-Endpoint Solver

For known geometry, solve the hand endpoints mathematically instead of
guessing a position ladder.

For the standard arms:

```text
Bedrock pivots:
rightArm [-5, 22, 0]
leftArm  [ 5, 22, 0]

Blockbench-imported pivots:
rightArm [ 5, 22, 0]
leftArm  [-5, 22, 0]

local pivot-to-bottom-face-center vectors:
rightArm v = [ 1, -10, 0]
leftArm  v = [-1, -10, 0]
```

The arm pivot is not centered on the four-unit-wide cube. Do not use
`[0,-10,0]`; that aligns the arm axes but leaves a visible gap between the
actual hand faces.

Blockbench mirrors geometry pivot X, animation position X, and animation
rotation X/Y during Bedrock import. With Bedrock animation rotation
`[rx, ry, rz]` and position `[px, py, pz]`:

```text
rotation_imported = [-rx, -ry, rz]
position_imported = [-px, py, pz]

handFaceCenter = pivot_imported
               + position_imported
               + R_ZYX(rotation_imported) * v_hand
```

Choose target hand-face centers along the weapon handle. For stacked hands,
preserve the intended Y separation and align X/Z. After calculating each
unshifted face center `h0` and target `t`, solve the Bedrock position:

```text
px = h0.x - t.x
py = t.y - h0.y
pz = t.z - h0.z
```

The X formula differs because Blockbench negates animation position X on
import.

Example overhead starting rotations:

```text
rightArm [-120, -35, 0]
leftArm  [-110,  35, 0]
```

For the standard geometry, aligning the actual bottom-face centers to the same
X/Z while keeping their natural vertical stack yields approximately:

```text
rightArm position [ 0.6406, 0, -0.3017]
leftArm position  [-0.6406, 0,  0.3017]

right face center [0.2113, 27.0000, -7.9694]
left face center  [0.2113, 25.4202, -7.9694]
```

For animated attacks:

1. Author the desired right/left arm X curves.
2. At each sample, choose inward Y values (right negative, left positive) that
   minimize unshifted X/Z separation without exceeding the visual rotation
   limit.
3. Solve both position vectors from the actual face centers.
4. Bake rotations and positions together at `1/48` or `1/96` second spacing
   when continuous grip matters.
5. Include matching final/start samples across combo clips.

This is a geometry-derived method, not a universal constant. Recompute it when
pivots, cube bounds, Euler order, or model proportions change. Use Blockbench
preview as a smoke test of the calculation, not as the primary search method.

Calibrate `rightItem` independently with `+X`, `-X`, `+Y`, `-Y`, `+Z`, and
`-Z` probes. Record the visible blade direction for each sign. Item-axis
mapping depends on the attachable's child-bone orientation and cannot be
inferred safely from arm-axis mapping.

First-person and third-person item transforms are separate design domains.

### Player Limb Clearance

The standard visible body volumes are approximately:

```text
head:  X [-4, 4], Y [24, 32], Z [-4, 4]
body:  X [-4, 4], Y [12, 24], Z [-2, 2]
```

Treat inflated outer layers as larger volumes. Clearance is not binary:

- Held overhead poses should clear the head volume
- A fast transition may use shallow edge overlap for roughly `1–2` frames at
  24 FPS
- A deeper hand-center overlap may last about one frame only when it reads as
  a deliberate smear
- The hand-face center must not remain inside the head or torso
- The arm must exit along a readable path rather than appear stuck

For overhead arms, the outward starting signs are:

| Channel | Right arm | Left arm |
|---|---:|---:|
| Rotation Y | Positive | Negative |
| Position X | Negative | Positive |

Use smaller outward magnitudes for a deliberate close pass and larger values
for a held V-shaped pose. Do not reuse the inward two-hand convergence signs
without checking the result.

Solve both hand endpoints, include the arm cube, and sample high-risk
Catmull-Rom intervals around `1/48` spacing. Measure both depth and consecutive
collision samples. Inherited waist/body rotation changes world-space results.

Use one Catmull-Rom entry, closest-approach, and exit sequence for an intentional
close pass. Avoid clusters of alternating outward/inward keys; they create a
visible arm flinch even when collision duration is technically safe.

## Blockbench and Bedrock Coordinates

Blockbench's Bedrock animation importer converts channels internally:

- Rotation X is inverted.
- Rotation Y is inverted.
- Position X is inverted.
- Position Y and Z are not inverted by the importer.

Source:
`https://github.com/JannisX11/blockbench/blob/master/js/formats/bedrock/bedrock_animation.js`

Do not manually invert exported JSON merely to make internal gizmo values look
familiar. Judge the rendered geometry.

Blockbench applies this conversion to numeric keyframes, but it does not
rewrite Molang string expressions. A numeric X/Y value and an equivalent
procedural expression can therefore preview with different sign behavior.
Calibrate procedural direction in Minecraft runtime and never invert a Molang
source expression solely to correct its Blockbench preview direction.

### Calibrate an Unknown Model

Before complex animation, isolate one bone and test:

```text
+X, -X, +Y, -Y, +Z, -Z
```

Use a neutral gap between phases. Record:

```text
bone:
input sign:
visible direction relative to the player:
pivot quality:
children that followed:
```

For the standard vanilla player in Blockbench, a useful starting observation
for `rightArm` is:

| Input | Visible motion |
|---|---|
| `+X` | Toward the player's back |
| `-X` | Forward |
| `+Y` | Toward the player's right |
| `-Y` | Toward the player's left |
| `+Z` | Opens outward to the right |
| `-Z` | Closes into the body |

Confirm mirrored limbs independently. Mirror pose intent, not numbers blindly.

Changing the whole-body travel direction does not invert limb-local axis
meaning. Keep a forward right-arm reach on negative X even when waist, root,
or leg pitch changes sign. Positive right-arm X still drives the arm backward.

## Minecraft Ground Contacts

Use `weight-driven-animation` to declare support and phase intent. For the
standard player geometry, use the exact contact solver below to keep a foot
fixed while `root` rotates or scales.

### Exact Support-Foot Solver

For a full-body lean, fall, or recovery, rotating `root` around its center
causes the feet to slide. Keep a selected foot point fixed by solving root
translation from the rotation.

Use the foot bottom-face center, not the leg pivot at Y `12`.

```text
Bedrock foot-bottom centers:
right foot [-1.9, 0, 0]
left foot  [ 1.9, 0, 0]

Blockbench-imported centers:
right foot [ 1.9, 0, 0]
left foot  [-1.9, 0, 0]
```

Let:

```text
q = imported support point relative to root
R = imported root rotation matrix at the sample
S = imported root scale matrix at the sample
t = imported root translation
```

Keep the support point fixed:

```text
t = q - R * S * q
```

For unit scale, `S` is identity and the formula reduces to `t = q - R*q`.
Convert imported translation back to Bedrock animation position:

```text
position_json = [-t.x, t.y, t.z]
```

For a right-foot-anchored side fall with root Z rotation `-90` degrees:

```text
q = [1.9, 0, 0]
t = [1.9, 1.9, 0]
position_json = [-1.9, 1.9, 0]
```

This moves the root around the foot rather than dragging the foot around the
root.

Apply the solver at every baked sample during the anchored phase. Use
`R_ZYX` for compound rotations. For a yawing spin, solve around the active
pivot foot and switch support only at an authored step.

The simple formula assumes the support leg has no local rotation or position.
Keep its local channels fixed during the anchored phase. If the support leg
must move, include its complete bone transform and the actual contact point in
the solve.

Small deviations after contact are allowed for intentional compression,
rebound, or foot roll. They must occur after the contact reads and settle back
to a stable support.

### Minecraft Motion Ranges

Follow `weight-driven-animation` for phase timing, impact, overlap, spins,
falls, and recovery. Useful Minecraft starting ranges:

- Waist translation: `0.2–1.5` units
- Waist roll: `2–10` degrees
- Waist/body yaw: `4–15` degrees
- Body Z side-bend: approximately `2–8` degrees
- Arm translation: `0.1–1.2` units
- Root grounded bounce: `0.2–2` units

Brief scale accents:

```text
load/impact: [1.02–1.05, 0.95–0.98, 1]
release:     [0.98–0.99, 1.02–1.04, 1]
neutral:     [1, 1, 1]
```

Choose the impact scale axis after inherited rotation. Include scale in the
support solve so the contact does not slide.

## Timing and Interpolation

Use timing grids deliberately:

| Purpose | Typical spacing |
|---|---|
| Expressive authored poses | `1/24` second (`0.0417`) |
| Stylized contact curves | Around `1/18` second (`0.0556`) |
| Baked constraints/trajectories | `1/48` or `1/96` second only when necessary |

### Editable Bedrock Curves

Follow `weight-driven-animation` for semantic pose controls and conservative
key reduction. The sections below define the Bedrock interpolation forms used
to implement those curves.

### Catmull-Rom

Use Catmull-Rom for sparse expressive bones:

```json
"0.25": {
  "post": [-70, 18, -28],
  "lerp_mode": "catmullrom"
}
```

Good candidates:

- Waist and chest
- Head
- Arms
- Root squash/position arcs
- Sparse leg poses without planted contact

Check overshoot. Catmull-Rom can push an arm, head, or scale beyond authored
values.

### Linear Dense Keys

Use plain linear values for baked contact or constraint paths:

```json
"0.3333": [48.3, 0, 0]
```

Dense keys are justified when they preserve:

- Foot planting
- A leg orbit around a flip axis
- An IK result
- A path that sparse interpolation visibly distorts

Do not add 50 keys to an expressive arm that only needs six poses.

### Procedural Molang

Use Molang for continuous rhythm and reusable drivers:

- Arm swing
- Waist bounce
- Body yaw
- Head bob/roll
- Cape follow-through
- A continuous flip angle

Bedrock trigonometric functions use degrees. For a loop of length $T$ seconds:

```text
one-cycle frequency = 360 / T
two-beat frequency  = 720 / T
```

For a `0.6` second run:

```text
one cycle = q.anim_time * 600
two beats = q.anim_time * 1200
```

## Locomotion Recipe

Use a hybrid system rather than applying sine waves to every bone.

### Procedural Upper Body

Example for a `0.6` second run:

```json
"root": {
  "rotation": [12, 0, 0]
},
"waist": {
  "rotation": [0, 0, "-Math.cos(q.anim_time*600+45)*5"],
  "position": [0, "Math.sin(q.anim_time*1200+12)*1.0-0.7", 0.8]
},
"body": {
  "rotation": [0, "Math.cos(q.anim_time*600+40)*12", 0]
},
"head": {
  "rotation": [
    "-10+Math.cos(q.anim_time*1200)*5",
    "Math.sin(q.anim_time*600+40)*4",
    "-Math.cos(q.anim_time*600-45)*5"
  ]
},
"rightArm": {
  "rotation": [
    "-Math.sin(q.anim_time*600)*55+4",
    "-Math.cos(q.anim_time*600+40)*12",
    6
  ]
},
"leftArm": {
  "rotation": [
    "Math.sin(q.anim_time*600)*55+4",
    "-Math.cos(q.anim_time*600+40)*12",
    -6
  ]
}
```

This creates:

- One arm/body cycle per stride
- Two waist/head vertical beats per stride
- Arm Y counter-rotation against body yaw
- Head counter-lean and secondary motion

### Explicit Legs

Author each leg with rotation and Y/Z position keys:

1. Contact
2. Compression
3. Push-off
4. Passing pose
5. Forward swing
6. Next contact

Offset the other leg by half a cycle, but preserve deliberate asymmetry. Verify:

```text
right(0.0) == right(T)
left(0.0)  == left(T)
right(T/2) approximately matches left(0.0)
left(T/2) approximately matches right(0.0)
```

The result should read as feet following paths, not pendulums attached to hips.

### Smooth Locomotion Gate

- Use loop-closing Molang or sparse Catmull-Rom for continuous waist, body,
  head, and arm rhythm; sparse plain arrays create linear velocity corners.
- Author leg contact, compression, push-off, passing, swing, and next contact
  explicitly.
- Use `1/24` spacing or denser for linear leg paths; move toward `1/48` only
  when contact still steps.
- Check adjacent deltas for isolated snaps.
- Close both values and boundary velocity. Procedural frequency multiplied by
  `animation_length` must equal an integer multiple of `360` degrees.
- Ask the user to play a complete loop at normal speed; static poses and valid
  endpoints do not establish smoothness.

## Jump Recipe

Use a short anticipation and overlapping recovery:

```text
0.00       neutral
0.04–0.12 squash and crouch
0.12–0.25 stretch/release
0.25–0.50 airborne silhouette
0.50–0.90 limb settle
remaining  stable hold or blend window
```

Recommended layers:

- Root squash around `[1.03, 0.97, 1]`
- Body or waist down `0.3–0.8` units during crouch
- Head anticipation before takeoff
- Arms move down before moving up
- Legs use slightly different timing, position, and stretch values
- Recover scale quickly; do not hold stretched geometry in the air

## One-Sided Gesture Recipe

For a right-hand wave:

1. Shift/bend `waist` toward the player's left.
2. Add a smaller body twist.
3. Counter-roll the head so it stays readable.
4. Raise the right arm with anticipation and a small position arc.
5. Add a delayed, lower-amplitude left-arm counter-motion.
6. Bias the stance toward the supporting leg.
7. Synchronize small waist bounce with each hand swing.
8. Recover waist, head, both arms, legs, and scale together.

Do not bend the whole torso toward the waving hand. The opposite-side
counterweight is what makes the gesture feel balanced.

## Combat Gesture Recipe

For a stylized jab/cross sequence:

```text
neutral -> guard -> chamber -> extension -> short hold -> recoil -> guard
```

Layer each strike:

- Root scale compresses before extension and rebounds on release.
- Waist position drops during chamber and rises slightly on extension.
- Waist Y rotates with the punching shoulder.
- Body adds only a smaller chest twist.
- Head counter-rotates to keep the target in view.
- Punching arm translates slightly during extension.
- Guard arm reacts instead of freezing.
- Legs and waist shift weight toward the supporting side.
- Alternate strike timings and amplitudes; avoid perfect left/right copies.

Use Catmull-Rom for sparse pose channels. Add a closer key near full extension
if overshoot makes the fist arc past the target.

## Waist-Driven Backflip Recipe

For the standard player, prefer an X-axis flip around the hip line instead of
rotating the ground-pivoted root.

### Rotation Driver

Drive waist X from `0` to `-360` with a delayed standard Hermite smoothstep:

```text
u = clamp((anim_time - start) / duration, 0, 1)
angle = -360 * hermite_blend(u)
```

Equivalent Molang:

```text
-360 * Math.hermite_blend(
  Math.clamp((q.anim_time - start) / duration, 0, 1)
)
```

This uses the engine's ordinary Hermite blend directly. It is monotonic and
has zero velocity at both endpoints. Add any overshoot as an explicitly
authored settle pose rather than hiding it inside a custom polynomial.

### Root Motion

- Do not rotate `root` through 360 degrees.
- Keep root X/Z position zero for an in-place backflip.
- Use a Y-only jump arc.
- For the standard player, a peak around `8–10` units is a practical starting
  point when flipping around the Y `12` hip line.
- Add brief takeoff and landing squash.

### Legs

`rightLeg` and `leftLeg` are root children, not waist children. They must follow
the same accumulated flip angle independently.

For an X-axis backflip, waist and leg pivots share Y `12`, Z `0`, so the pivot
line is already aligned with the flip axis. Bake leg X rotations through the
same `-360` progression and add asymmetric tuck offsets. Small leg position
and stretch accents can improve the silhouette; large corrective X/Z paths
should not be necessary.

For a different flip axis, the leg pivots may not lie on the rotation axis.
Bake the required position trajectory or use a suitable parent bone rather
than guessing a root orbit.

### Expressive Choreography

- Swing arms backward during crouch.
- Throw arms through takeoff.
- Use asymmetric arm poses during the tuck.
- Let head lead/tuck, then counter-move before landing.
- Finish the main rotation before the clip ends.
- Use the remaining time for overshoot settle, landing compression, and
  neutral recovery.

At completion:

```text
waist rotation: visually neutral -360
leg rotations:  visually neutral -360
root position:  [0,0,0]
root scale:     [1,1,1]
local body/head/arm channels: neutral
```

## Layering and Controllers

Separate animation responsibilities when the runtime permits composition:

1. Rotation or locomotion driver
2. Authored silhouette/choreography
3. Procedural follow-through or airborne motion

Benefits:

- Reusable timing drivers
- Cleaner authored clips
- Easier interruption and blending
- No frozen hold while still airborne

If a single Blockbench clip is required, preserve the same conceptual layers
in separate bones/channels.

Keep ordinary fall animation separate from a flip. A flip may transition into
fall follow-through, but it should not permanently replace the normal fall
pose.

## Animation Contracts

### Combo Sequences

- Treat chained attacks as one continuous motion split across clips.
- The final third-person pose of attack N MUST equal the initial third-person
  pose of attack N+1 for waist, body, head, arms, arm positions, legs, and any
  persistent item transform.
- Do not force an intermediate combo stage to reach neutral before the next
  attack can begin. Its recovery may continue toward neutral as the fallback
  when no follow-up input arrives.
- Let the final combo stage complete its full recovery to neutral.
- If the runtime hands off before the nominal clip end, match the pose at the
  actual handoff time instead.
- Keep first-person combo design independent when it uses different poses.

#### Attack Recovery and Input Buffers

Every attack clip needs motion after its contact frame. A clip that ends at
contact or follow-through will snap when the controller stops it.

Separate these intervals:

```text
anticipation -> fast contact -> follow-through -> recovery buffer -> neutral
                                \-> buffered next attack
```

- **Recovery buffer:** authored time after follow-through that decelerates the
  body, arms, and held item toward a stable bridge or neutral pose.
- **Input buffer:** runtime window that records the next attack before the
  current clip is ready to hand off.
- Contact may remain nearly immediate for Minecraft combat while the clip
  continues long enough to recover smoothly.
- If no follow-up is queued, play the recovery buffer through neutral and then
  blend to the ordinary player state.
- If a follow-up is queued, transition during the recovery buffer at a declared
  handoff time rather than waiting for neutral or cutting from the contact pose.
- Match the outgoing handoff pose and incoming first pose for waist, body,
  head, arms, arm positions, persistent item transforms, and any controlled
  lower-body bones.
- Match boundary velocity as well as transform values. Use a damped recovery
  for a stop; preserve compatible outgoing velocity for the next swing.
- Keep combo-reset duration at least as long as the authored recovery/input
  window. A shorter runtime timer silently discards valid follow-up inputs.
- `query.any_animation_finished` should mean the recovery has completed, not
  merely that the damage/contact frame occurred.
- When legs are intentionally omitted from attack clips, preserve that
  lower-body passthrough across every combo stage and bridge.

### Non-Looping Clips

- Start affected channels at neutral unless blending from a known stance.
- Use anticipation, action, optional hold, and recovery.
- End local rotation/position channels at `[0,0,0]`.
- End scale at `[1,1,1]`.
- A completed `-360` rotation is visually neutral.
- Leave enough settle time for interruption or controller blending.

### Loops

- First and final explicit values MUST match exactly.
- Procedural frequencies MUST complete whole cycles at `animation_length`.
- Duplicate the final explicit key; do not rely on implicit wrapping.
- Check the boundary at normal speed.
- Keep head, waist, arms, and leg contacts phase-compatible.

### Mirroring

- Mirror visual intent, not raw numbers.
- X often keeps the same sign for forward/back motion.
- Y/Z frequently need opposite signs for visual symmetry.
- Offset timing or amplitude so mirrored limbs do not feel robotic.

## Blockbench Workflow

Use `blockbench-workflow` for application control and load the same production
animation file used at runtime. Do not create a duplicate preview animation.

For routine animation delivery:

1. Load the actual player geometry and attachable hierarchy.
2. Import and select the exact production animation.
3. Leave the timeline at the animation start, ready for playback.
4. Ask the user to play the complete animation at normal speed and report
   pose, clipping, smoothness, weight, timing, and style feedback.

Do not perform iterative screenshot sampling, camera-angle review, visual
clearance review, or motion-quality judgment on the user's behalf unless the
user explicitly requests assistant review. Static screenshots and transform
dumps are not substitutes for playback.

Technical validation may confirm that JSON parses, the requested animation
imports, identifiers and bone targets resolve, and scripted/runtime references
match. Treat the user's visual feedback as ground truth. After applying that
feedback, return the same production animation ready to play and ask the user
to review again instead of independently re-verifying its appearance.

Axis calibration, contact solving, and collision measurement are
implementation tools. Use them when authoring or diagnosing a specific
reported problem, not as routine post-change visual verification.

## Minecraft Failure Modes

| Symptom | Cause | Fix |
|---|---|---|
| Torso detaches from legs | Large `body` rotation around Y `24` | Put primary torso motion on `waist`; keep `body` secondary |
| Flip orbits | Ground-pivoted root rotation with guessed compensation | Flip around `waist`; bake sibling legs around the same axis |
| Flip sinks | Rotation center too low or jump arc too small | Use the hip line and enough Y clearance |
| Run reads as fast walk | Weak cadence, silhouette, compression, or lift | Add two-beat bounce and explicit leg paths |
| Grounded motion slides | Root rotation/scale ignores the support point | Solve `t = q - R*S*q`; freeze or fully solve the support limb |
| Weapon clips the player | Grip or item spin plane is not calibrated | Stabilize the hand, calibrate `rightItem`, and check the complete arc |
| Hand stays in head/torso | Overlap is deep, persists beyond a quick transition, or has no readable exit | Author close-pass entry/exit controls and measure collision duration |
| Clearance correction flinches | Alternating safe/close keys are packed too tightly | Use one smooth entry-apex-exit Catmull arc |
| Head scales with torso | `body` scale is inherited without inverse head compensation | Drive `head.scale` with the exact component-wise reciprocal using the same progress expression |
| Catmull-Rom goes wild | Sparse extremes overshoot | Add a nearby control, reduce the extreme, or make that segment linear |

## Minecraft Validation Checklist

- **Structure:** JSON parses; identifier, length, bone names, and key times are
  valid.
- **Hierarchy:** the narrowest correct Minecraft bone owns the motion; geometry
  stays connected.
- **Endpoints:** loops close; Molang cycles are whole; one-shots recover local
  transforms and scale.
- **Contacts:** foot points use the actual geometry and remain fixed under
  root rotation and scale.
- **Items:** hand placement, `rightItem`, weapon orientation, and full-arc
  clearance are calibrated independently.
- **Limb clearance:** held hands and arm cubes clear head/torso volumes;
  intentional shallow overlap is limited to a brief transition with a clear
  exit.
- **Close-pass curves:** collision entry and exit use one smooth arc without
  rapid outward/inward corrections.
- **Interpolation:** Catmull-Rom overshoot is controlled; dense linear paths
  remain isolated to exact constraints.
- **Scale inheritance:** compensated children remain visually unchanged through
  the complete parent-scale transition, not only at endpoints.
- **Runtime:** Blockbench preview, controller blending, first-person behavior,
  and Minecraft runtime behavior are reported separately.
- **Motion quality:** apply the `weight-driven-animation` validation and user
  review contract.
