---
name: weight-driven-animation
description: >
  REQUIRED when creating, editing, reviewing, or calibrating animation intended
  to feel natural, grounded, weighty, impactful, or physically readable. Use
  for support, momentum, impacts, recovery, spins, falls, large props,
  keyframes, procedural or math-driven motion, Molang, hybrid authoring,
  editability, and motion-quality review. Use alongside rig- or format-specific
  skills.
---

# Weight-Driven Animation

Make motion read as mass moving through support, momentum, contact, and
recovery. Technical validity is not motion quality.

## Motion Contract

Default to animation that is:

- Grounded when a contact carries weight
- Deliberate before commitment and accelerating when control is lost
- Asymmetric in support, timing, and secondary response
- Readable from the target camera
- Layered from the primary mass into smaller delayed parts
- Smooth between expressive poses and sharp at meaningful contacts
- Editable as semantic control poses rather than baked noise
- Stable or neutral at interruption and transition boundaries

At every phase, answer:

```text
What carries the weight?
Where is the projected mass relative to that support?
What is moving deliberately, and what is following momentum?
What changes the velocity?
Where is the next contact or stable hold?
```

## Support and Balance

Declare the support state before posing detail:

- Supporting foot, hand, knee, seat, wall, weapon, or body surface
- Free contacts that may move
- Support polygon or contact point
- Planned support transfer
- Whether balance is stable, driven, or failing

Move the primary mass over the support before a deliberate action. Move it
outside the support polygon before an uncontrolled fall. A free foot may lift,
stagger, or trail; both feet must not drift while the body behaves as planted.

For a fixed local support point `q`, rotation `R`, scale `S`, and root
translation `t`, preserve the world point with:

```text
t = q - R * S * q
```

Use the actual contact point, not merely a nearby joint pivot. Convert the
solved translation through the target rig's coordinate rules. If the support
limb moves locally, include its full hierarchy in the solve.

Small contact deviations are acceptable only when they describe foot roll,
compression, rebound, or an authored support transfer.

## Motion Phase Grammar

Build complex actions from explicit phases:

| Phase | Purpose |
|---|---|
| Balance | Establish support and readable mass placement |
| Anticipation | Load the action with smaller opposite motion |
| Commit | Release the free side and make the action irreversible |
| Driven action | Accelerate and decelerate under control |
| Uncontrolled motion | Increase velocity as balance or control is lost |
| Contact/catch | Stop, redirect, or transfer momentum |
| Rebound/follow-through | Let secondary mass continue at lower amplitude |
| Settle/recovery | Re-establish support and transition safely |

Do not give every phase equal duration or velocity. The contrast between phases
creates weight.

## Velocity and Spacing

Pose values alone do not establish weight. Inspect the distance between poses
and the resulting velocity:

- Constant spacing reads mechanical unless the action is intentionally motorized
- Deliberate motion usually eases into and out of speed
- Uncontrolled falls usually accelerate into contact
- Heavy objects take time to start and require a visible deceleration or catch
- Sharp contacts need close keys before and after impact
- A settle should lose amplitude rather than repeat equal oscillations

Check adjacent transform deltas. One large step among small steps is a snap.
Matching loop endpoints is insufficient when incoming and outgoing velocity
disagree.

## Motion Layering

Author in this order:

1. Primary mass and readable silhouette
2. Support and weight transfer
3. Main action timing and contact
4. Counter-motion and balance limbs
5. Chest/head/appendage overlap
6. Translation and brief scale accents
7. Rebound, settle, and recovery

The parent mass changes first. Children and carried mass respond later unless
they initiate the action.

Useful delays at a 24 FPS authoring rate:

- Chest after hips: `1–2` frames
- Head after chest: `1–3` frames
- Free arm or leg: `1–3` frames
- Large prop follow-through: pose-dependent, often `1–3` frames

These are starting points, not fixed rules.

## Counterweight and Asymmetry

Use the free side to explain balance:

- Shift hips opposite a raised or extended limb
- Let the free arm react rather than freeze
- Offset mirrored limbs in timing, amplitude, or trajectory
- Counter-rotate the head when inherited torso motion obscures the target
- Keep the primary gesture larger than its counter-motion

Perfect mirroring and simultaneous keys remove the visual evidence of weight.

## Energy Without Chaos

High energy comes from contrast, timing, elevation, and silhouette—not from
putting every part at an extreme.

Choose one dominant action and make other motion support it:

- Primary gesture or mass: `100%` of the intended read
- Torso counter-motion: often `20–40%`
- Free limb reaction: often `25–50%`
- Head overlap: often `10–25%`, unless gaze is the action

These ratios are starting points. The invariant is hierarchy: secondary motion
must not compete with the focal action.

Use pose economy:

- One readable silhouette per phase
- One or two focal limbs at a time
- Quiet support limbs and brief readable holds
- Fewer simultaneous direction reversals
- Secondary frequency no faster than the primary action unless deliberately
  trembling, vibrating, or fluttering

For an excited jump:

```text
support -> compressed anticipation -> explosive takeoff
-> one readable airborne celebration pose
-> landing preparation -> compressed contact
-> one smaller rebound -> settle
```

Excitement should increase the jump height, timing contrast, facial/head intent,
and clarity of the celebration pose before it increases limb count or amplitude.
If the viewer cannot name the main pose, reduce secondary motion.

## Body and Limb Clearance

Body volumes are collision budgets, not absolute exclusion zones. Deep or
persistent interpenetration breaks the pose; a shallow overlap may be a useful
smear during fast motion.

A transient overlap is acceptable when:

- It occurs during a transition, not a readable hold or planted contact
- It remains shallow by default and exits along a clear trajectory
- It lasts roughly `1–2` frames at 24 FPS as a starting limit
- A deeper overlap is exceptional and limited to about one fast frame when it
  functions as a deliberate smear, never a readable pose
- The hand, foot, or prop does not appear stuck inside the body
- The resulting silhouette preserves the intended energy

For high-risk motion:

1. Choose the desired endpoint and the intended close-pass or clearance.
2. Solve toward that target instead of guessing Euler signs.
3. Check the full limb/prop volume and inherited transforms.
4. Sample interpolation to measure collision depth and duration.
5. Add controls that enter and exit quickly when a close pass supports the
   motion; move the path outward when overlap becomes deep or persistent.

Held poses need visible clearance. Fast celebration, attack, or smear poses may
briefly graze a body volume. Do not make every pose excessively safe when that
destroys the gesture's character.

Mirrored limbs must be checked independently. Camera, model inflation, and
Catmull-Rom curvature can change whether an overlap reads as energy or error.

### Close-Pass Curves

Do not fix clipping by inserting rapid safe-close-safe corrections across
adjacent frames. That creates a visible flinch.

Shape one continuous arc:

```text
clear entry -> closest approach -> clear exit
```

Use the fewest controls that preserve collision depth and duration. Give the
entry and exit enough time for continuous velocity; the closest approach may
be brief without becoming a sharp direction reversal. Sample acceleration as
well as collision.

## Impact and Compression

At impact:

1. Stop or redirect the primary mass.
2. Compress along the contact-normal axis for approximately `1–3` frames.
3. Let secondary parts continue for `1–3` frames.
4. Rebound once at lower amplitude.
5. Settle without equal repeated bounces.

Choose scale axes from the character's orientation at contact. A sideways body
may require a different local squash axis than an upright body. Preserve the
support point while scaling by including `S` in the contact solve.

Keep squash brief. A useful starting range is roughly `5–12%` compression for
stylized impact, adjusted to the rig and camera. Persistent scale looks rubbery.

Use dense or linear controls for exact contact and sparse smooth controls for
secondary overlap. Protect impact curves from interpolation overshoot through
the floor or support surface.

## Persistent Scale Transformations

A scale change can be mathematically smooth and still feel mechanically stiff.
Treat transformation scale as motion with acceleration, overshoot, correction,
and settle.

For a weight-driven or playful transformation:

```text
base -> accelerated growth -> small overshoot
-> smaller correction -> stable target
```

Overshoot should be measured against the scale delta, not absolute size. A
useful starting range is roughly `5–12%` beyond the intended delta.

For a reusable Molang bounce over `duration`:

```text
t = Math.clamp(q.anim_time / duration, 0, 1)
h = Math.hermite_blend(t)
p = h + (1-h) * 0.6 * (1-Math.cos(t*360))
scale = 1 + (target_scale-1) * p
```

This produces one overshoot and a damped correction, then holds exactly at
`p=1`. Use plain Hermite without the bounce term when the transformation is
intentionally mechanical or restrained.

Drive all related scale channels from the same scalar `p`. To exclude a child
from inherited parent scale, apply exact component-wise inverse compensation:

```text
child_scale = [1/parent_x, 1/parent_y, 1/parent_z]
```

Use the same `p` in both expressions so cancellation holds between authored
poses, not only at keys. Include scale in support/contact solves and choose
horizontal, vertical, and depth targets from the intended shape change.

Do not loop a constant-amplitude scale wave through the final hold. The target
must become stable after the settle.

## Recovery

Recovery is a new weighted action, not reverse playback:

- Show the foot, hand, or surface that supplies the push
- Curl or brace before extending
- Accelerate away from the ground or load
- Decelerate near standing or the final hold
- Add at most one useful overshoot and settle
- Keep support anchored until the body no longer depends on it

A character that simply rotates upright without a brace or push appears to
float.

### Damped Settle Curves

After the chosen rebound, recovery amplitude must decay toward the final pose.
For offset `d` from the final transform, use this as a diagnostic:

```text
|d_next| < |d_previous|
```

The exact vector need not shrink on every axis at every sample, but the
perceived envelope must. A normal weighted settle is:

```text
contact -> follow-through -> one smaller recoil -> neutral
```

Avoid repeated sign changes such as:

```text
large left -> small right -> large left -> right overshoot -> neutral
```

That sequence creates equal competing impulses rather than dissipation.

For Catmull-Rom recovery:

- Keep follow-through, recoil, and neutral controls progressively closer
- Use at most one intentional crossing of the final pose
- Add a nearby neutral control when the final tangent overshoots
- Make the final segment linear when exact damping matters more than a smooth
  tangent
- Inspect the composed world-space result; parent recovery plus child recovery
  can amplify a hand even when each local curve looks small

For procedural recovery, multiply oscillation by a monotonic envelope that
reaches zero. Do not keep a constant-amplitude wave running through the settle.

## Spins, Dizziness, and Falls

For spins:

- Ease angular speed instead of starting and stopping at full velocity
- Extend mass outward at speed and retract it during deceleration
- Lag torso, head, free limbs, clothing, and props
- Use pivot steps or a solved support point when grounded
- Avoid rotating two planted feet as one turntable

For dizziness:

- Alternate support with smaller leans
- Move or lift the free foot before changing support
- Reduce oscillation while balance returns
- Increase the final lean deliberately when balance fails

For falls:

- Move projected mass outside support
- Commit to the final support point
- Accelerate rotation or translation into contact
- Use a clear contact, compression, overlap, rebound, and settle

## Large Props and Weapons

Separate responsibilities:

- Body and supporting limb place the hand or grip
- Prop/item controls define the object's orientation around the grip
- Torso and free limbs counter the prop's momentum
- Head tracks the hand, target, or catch—not an arbitrary forward direction

During a one-handed flourish, keep the hand stable when the prop is meant to
spin in the grip. Rotate the prop control independently. Align the spin plane
outside the body and check clearance through the full rotation, not only at
cardinal poses.

A heavy prop may move quickly, but it still needs anticipation, shoulder and
waist reaction, a decelerating catch, and a stable finish.

## Choose an Authoring Mode

Do not assume every animation should be keyframed. Choose per channel and
responsibility:

| Mode | Best for | Avoid |
|---|---|---|
| Keyframes | Contacts, one-shots, asymmetry, specific silhouettes, catches, impacts | Baking continuous rhythm before it needs exact poses |
| Procedural/math | Repeating rhythm, reusable cadence, breathing, sway, follow-through, parameterized motion | Planted contacts or unique choreography driven by generic waves |
| Hybrid | Locomotion, layered combat, props, and motion needing both rhythm and authored contacts | Letting procedural and keyed layers fight over the same responsibility |

Hybrid is often the most weight-readable option: keyframe support and contact;
drive continuous rhythm and low-amplitude overlap mathematically.

## Molang and Math-Driven Motion

When the target supports Molang, use math as an authored motion system—not as
a shortcut that applies sine waves to every bone.

Molang trigonometric functions use degrees. For a loop of length `T` seconds:

```text
one cycle frequency = 360 / T
two-beat frequency  = 720 / T
phase               = q.anim_time * frequency
```

Example: one cycle and two grounded beats in a `0.6` second loop:

```text
cycle frequency = 600
beat frequency  = 1200
```

```json
{
  \"rotation\": [
    \"-Math.sin(q.anim_time*600)*40\",
    \"-Math.cos(q.anim_time*600+30)*6\",
    4
  ],
  \"position\": [
    0,
    \"Math.sin(q.anim_time*1200+15)*0.25\",
    0
  ]
}
```

The numbers remain design controls:

- Frequency defines cadence
- Amplitude defines range and apparent energy
- Phase offset defines overlap and counter-motion
- Bias defines the base pose
- Envelope defines when the motion starts, peaks, and stops

For a deliberate non-looping progression, use a clamped normalized phase and a
smooth envelope:

```text
u = Math.clamp((q.anim_time - start) / duration, 0, 1)
progress = Math.hermite_blend(u)
```

For a decaying procedural settle, multiply the oscillation by an envelope that
reaches zero:

```text
Math.sin(q.anim_time*720)
* (1 - Math.clamp(q.anim_time / 1.0, 0, 1))
* 8
```

The final value and velocity must match the transition contract. A procedural
driver that is visually neutral but still has nonzero velocity can pop when it
hands off.

### Weight-Driven Procedural Design

- Drive the largest mass with the clearest, lowest-frequency motion.
- Give children smaller amplitudes and delayed phase.
- Use two-beat vertical compression only when two contacts or loads occur per
  cycle.
- Bias hips or torso toward the current support instead of oscillating evenly
  around center.
- Gate or reduce free-limb motion during a planted contact.
- Let prop follow-through lag the hand or body driver.
- Use different amplitudes or phase offsets on mirrored limbs.
- Keep head motion subordinate to gaze and inherited torso motion.

Pure sinusoidal motion has constant periodic intent; weight often needs phase
changes, support changes, holds, contacts, and asymmetric recovery. Keyframe
those events or change the procedural envelope explicitly.

### Hybrid Pattern

Separate responsibilities:

```text
keyframes: support, foot paths, anticipation, contact, catch, impact, recovery
math:      cadence, breathing, sway, arm rhythm, head bob, prop follow-through
```

Compose math as a small additive layer around an authored pose. Do not let a
procedural driver overwrite a planted foot, a solved grip, or an impact pose.
If continuous contact or IK requires baking, bake only that constraint path and
keep other procedural or expressive controls editable.

## Editable Controls

Treat a keyframed animation as a control rig:

```text
support -> anticipation -> action -> contact/catch
-> rebound/follow-through -> settle/recovery
```

- Key a part when intent, support, velocity, or silhouette changes
- Use sparse smooth curves for expressive motion
- Add close controls around contacts, catches, overshoots, and direction changes
- Repeat controls only for intentional holds or protected boundary tangents
- Isolate dense samples to the exact constraint channel that requires them
- Do not key every part at every global timestamp

Reduce keys conservatively:

1. Change interpolation without deleting accepted poses.
2. Review at normal speed.
3. Simplify one part and channel at a time.
4. Preserve support changes, extremes, contacts, catches, impacts, rebounds,
   settles, and endpoints.
5. Revert any reduction that changes accepted timing, weight, contact, or
   silhouette.

Key count is a diagnostic, not a target. Mathematical curve error may be small
while perceived weight or overlap changes substantially.

Procedural controls must also remain editable:

- Keep frequency, amplitude, phase, bias, and envelope recognizable.
- Give each expression one primary responsibility.
- Reuse a shared phase or driver where the controller permits it.
- Avoid monolithic expressions that combine unrelated choreography phases.
- Keep keyed and procedural layers separate enough to tune independently.
- Do not bake math into dense keys until runtime, export, or a proven
  constraint requires it.

An unreadable formula is the procedural equivalent of keying every frame.

## Interpolation Choice

Use:

- Smooth sparse interpolation for expressive mass, arcs, and overlap
- Linear or dense samples for planted contacts and solved constraints
- Step interpolation only for deliberate instantaneous changes
- Procedural drivers for continuous rhythm that must remain reusable

Smooth interpolation is not automatically natural. Add controls where velocity
or contact must change sharply and inspect overshoot.

## Workflow

1. Identify camera, rig, hierarchy, contacts, and prop attachments.
2. Write the support and phase plan.
3. Choose keyframed, procedural, or hybrid authoring per channel.
4. Block primary silhouettes and contacts.
5. Establish velocity changes, cadence, phase, and envelopes.
6. Add counterweight and secondary delay.
7. Solve planted contacts, grips, and clearance.
8. Add brief impact scale and recovery.
9. Simplify controls conservatively without baking reusable math.
10. Load the actual animation and ask the user to review at normal speed.
11. Adjust from the user's motion-quality result.

## Common Failure Modes

| Symptom | Cause | Fix |
|---|---|---|
| Floaty | No support, acceleration contrast, contact, or settle | Declare support; sharpen velocity changes; add contact and recovery |
| Robotic | Mirroring, simultaneous keys, constant spacing | Offset timing/amplitude and vary velocity |
| Sliding | Root or parent motion ignores the support point | Solve the contact and author support transfer |
| Turntable spin | Constant yaw with planted feet and no lag | Ease speed, pivot support, and delay secondary mass |
| Weak impact | Uniform velocity or simultaneous stopping | Accelerate, compress, overlap, rebound once, settle |
| Rubber impact | Persistent or axis-wrong scale | Squash briefly along the contact normal |
| Stiff scale transformation | Smooth interpolation has no overshoot, correction, or settle | Drive scale with a shared bouncy envelope; overshoot the delta once, then hold the target |
| Floating recovery | Reverse playback without brace or push | Author a new supported recovery action |
| Jelly recovery | Rotation/position reverse repeatedly, Catmull overshoots, or parent and child rebounds stack | Keep one follow-through and one smaller recoil; damp toward neutral; inspect world-space motion |
| Limb remains in head/body | Overlap is deep, held, or lacks a clear exit | Limit shallow overlap to a fast transition; solve the exit path; sample collision duration |
| Prop clips body | Spin plane or grip path is not calibrated | Stabilize grip, orient the prop plane, check full-arc clearance |
| Hard to edit | Every frame/part is keyed | Keep semantic controls and isolate constraints |
| Simplification changes motion | Reduction is global or too aggressive | Restore accepted poses; reduce one channel at a time |
| Clearance correction flinches | Too many safe/close keys reverse the limb over a few frames | Use one entry-apex-exit arc with fewer controls and continuous velocity |
| Over-procedural | Every part uses the same wave or cadence | Keyframe support/events; vary amplitude and phase by responsibility |
| Procedural boundary pops | Cycle, envelope, value, or velocity does not close | Use whole cycles and zeroed envelopes; check handoff velocity |
| Math is hard to edit | Expressions mix frequency, phases, events, and constraints | Split drivers; expose meaningful parameters; keep responsibilities separate |
| Exaggerated or chaotic | Every part reaches an extreme or reverses independently | Choose one focal action; reduce secondary amplitude/frequency; add a readable hold |
| Smooth curve goes wild | Sparse extremes overshoot | Add a nearby control or make the contact segment linear |

## Validation Checklist

- Support and free contacts are declared for every grounded phase
- Primary mass stays over support until an authored commitment or fall
- Deliberate motion eases; uncontrolled motion accelerates appropriately
- Contacts stop or redirect momentum clearly
- Impact scale follows the contact-normal axis and settles quickly
- Persistent scale transformations use intentional acceleration and, when the
  style calls for it, one bounded overshoot and correction before a stable hold
- Children excluded from parent scale use the same driver with exact inverse
  component compensation
- Secondary motion is delayed, smaller, and ordered by hierarchy
- Recovery shows an anchored brace or push
- Recovery amplitude decays after the chosen rebound with at most one
  intentional neutral crossing
- Rotation, position, and inherited parent motion do not stack into repeated
  hand or limb reversals
- No limb or prop remains deeply embedded in a body volume; intentional shallow
  overlap is brief, transitional, and preserves the focal silhouette.
- Props remain attached, clear the body, and transfer momentum visibly
- Close-pass entry and exit form one smooth arc without a high-frequency
  clearance correction
- Loops close in value and velocity; one-shots end in a stable state
- Every retained key has a semantic or constraint role
- Dense keys are isolated to channels that require exact paths
- User-accepted timing, weight, contacts, and silhouettes survive reduction
- Authoring mode is chosen per channel instead of defaulting to keyframes
- Procedural frequency, amplitude, phase, bias, and envelope remain readable
- Loops complete whole math cycles; one-shot envelopes return value and
  velocity safely
- Procedural layers do not move planted contacts, solved grips, or keyed
  impacts
- One dominant action remains readable in every phase
- Secondary amplitude and frequency stay subordinate to the focal action
- High-energy animation uses pose contrast and holds rather than simultaneous
  extremes
- The user reviews the complete motion at normal speed

## Review Ownership

Operational checks can establish file validity, hierarchy, transforms, and
contacts. They cannot establish whether motion feels natural or weighty.

Load and select the animation, leave it ready to play, and ask the user to watch
a complete loop or one-shot at normal speed. Treat the user's response as the
motion-quality result. Do not claim acceptance from static poses, screenshots,
or transform dumps.
