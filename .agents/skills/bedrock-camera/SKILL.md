---
name: bedrock-camera
description: Use when implementing or debugging Minecraft Bedrock Script API cameras, camera.setCamera, camera.playAnimation, cinematic ability shots, camera anchors, yaw rotation, or player-centered camera framing.
---

# Bedrock Camera

Use this skill for reliable Minecraft Bedrock camera work with `@minecraft/server`, especially cinematic active abilities using `player.camera.setCamera` and `player.camera.playAnimation`.

## Core Lessons

- Build camera shots from a clear anchor point, usually the player body center.
- Do not anchor player-focused cinematics to an orb, hand particle, projectile, or other effect unless that effect is the subject.
- Calibrate with static `setCamera` shots first, then convert working points to `playAnimation`.
- Log camera offsets relative to the anchor while tuning, not absolute world coordinates.
- `camera.playAnimation` needs explicit rotation keyframes if the camera should keep facing the player/anchor.
- Camera yaw math is in degrees, not radians.
- Do not emit duplicate keyframe timestamps; Bedrock rejects rotation frames too close together.
- After `playAnimation` ends, Bedrock can display the original `setCamera` position again until `camera.clear()`. Set the final camera position at animation end to avoid snapping back.

## Anchor Selection

For player-centered shots, use player body center:

```ts
function cameraAnchor(origin: Vector3): Vector3 {
  return {
    x: origin.x,
    y: origin.y + 1.35,
    z: origin.z,
  };
}
```

Common mistake:

```ts
// Bad for player-centered framing: this centers the orb/hand, not the player.
const anchor = hollowPurpleChargeLocation(origin, direction, right);
```

## Direction Basis

Build camera locations from the player view direction:

```ts
const direction = normalizeDirection(player.getViewDirection());
const forward = getHorizontalDirection(direction);
const right = { x: -forward.z, y: 0, z: forward.x };
```

Use offsets relative to the anchor:

```ts
function cameraLocationFromAnchor(anchor: Vector3, forward: Vector3, right: Vector3, distance: number, sideOffset: number, height: number): Vector3 {
  return {
    x: anchor.x + forward.x * distance + right.x * sideOffset,
    y: anchor.y + height,
    z: anchor.z + forward.z * distance + right.z * sideOffset,
  };
}
```

Offset meanings:

- `distance`: forward/back relative to where the player is facing. Negative means behind the player.
- `sideOffset`: left/right relative to player facing.
- `height`: vertical offset from the anchor.

## Static First, Animation Second

When a camera looks wrong, stop animating. Test fixed shots first:

```ts
player.camera.setCamera("minecraft:free", {
  location: cameraLocation,
  facingLocation: anchor,
});
```

Log only anchor-relative offsets:

```ts
console.warn(`camera ${name} offset=(${(cameraLocation.x - anchor.x).toFixed(2)}, ${(cameraLocation.y - anchor.y).toFixed(2)}, ${(cameraLocation.z - anchor.z).toFixed(2)})`);
```

Once the fixed points are correct, use those same computed points in `playAnimation`.

## Top And Bottom Shots

For true top-down and bottom-up shots, use pure vertical offsets from the player anchor:

```ts
{ name: "top", forwardOffset: 0, sideOffset: 0, verticalOffset: 4.2 }
{ name: "bottom", forwardOffset: 0, sideOffset: 0, verticalOffset: -2.6 }
```

Do not run collision correction for pure vertical calibration shots unless you intentionally want them clamped. Collision correction can move a bottom shot upward and make it no longer centered.

## Safe Camera Correction

Use collision correction for side, front, and behind shots where clipping into terrain is likely. Allow bypassing it per shot:

```ts
interface CameraShot {
  readonly name: string;
  readonly forwardOffset: number;
  readonly sideOffset: number;
  readonly verticalOffset: number;
  readonly collisionSafe: boolean;
}

function getCameraLocation(player: Player, forward: Vector3, right: Vector3, anchor: Vector3, shot: CameraShot): Vector3 {
  const desired = cameraLocationFromAnchor(anchor, forward, right, shot.forwardOffset, shot.sideOffset, shot.verticalOffset);
  if (!shot.collisionSafe) return desired;
  return getSafeIntroCameraLocation(player, anchor, desired);
}
```

## playAnimation Pattern

Call `setCamera` first to establish the camera preset and starting position:

```ts
player.camera.setCamera("minecraft:free", {
  location: cameraLocations[0],
  facingLocation: anchor,
});
```

Then animate:

```ts
const spline = new CatmullRomSpline();
spline.controlPoints = cameraLocations;

player.camera.playAnimation(spline, {
  totalTimeSeconds,
  animation: {
    progressKeyFrames,
    rotationKeyFrames,
  },
});
```

Important: `setCamera` remains the underlying camera after animation. If you clear later than animation end, the view can appear to snap back to the initial `setCamera` location. Set the final camera point at animation end.

## Rotation Keyframes

Every camera point should have a rotation facing the subject anchor:

```ts
function cameraRotationToFace(cameraLocation: Vector3, targetLocation: Vector3): Vector3 {
  const dx = targetLocation.x - cameraLocation.x;
  const dy = targetLocation.y - cameraLocation.y;
  const dz = targetLocation.z - cameraLocation.z;
  const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
  return {
    x: (Math.atan2(dy, horizontalDistance) * 180) / Math.PI,
    y: (Math.atan2(dx, dz) * 180) / Math.PI + 180,
    z: 0,
  };
}
```

Yaw interpolation must use degrees:

```ts
function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

function shortestAngleDelta(from: number, to: number): number {
  return normalizeAngle(to - from + 180) - 180;
}

function closestCameraRotation(rotation: Vector3, previousRotation: Vector3): Vector3 {
  return {
    x: rotation.x,
    y: previousRotation.y + shortestAngleDelta(previousRotation.y, rotation.y),
    z: rotation.z,
  };
}
```

Common mistake:

```ts
// Wrong: camera yaw is degrees, not radians.
return ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
```

## Hold Keyframes

To make the camera stay on a shot before moving, use two keyframes with the same value at different times. Do not duplicate timestamps.

Bedrock rejects rotation frames if the time between them is too small, for example:

```text
Time between rotation frames must be greater than 0.05
```

Use helpers that replace duplicate timestamps:

```ts
function addProgressKeyFrame(keyFrames: { timeSeconds: number; alpha: number }[], tick: number, alpha: number): void {
  const timeSeconds = tick / TicksPerSecond;
  if (keyFrames[keyFrames.length - 1]?.timeSeconds === timeSeconds) {
    keyFrames[keyFrames.length - 1] = { timeSeconds, alpha };
    return;
  }
  keyFrames.push({ timeSeconds, alpha });
}

function addRotationKeyFrame(keyFrames: { timeSeconds: number; rotation: Vector3 }[], tick: number, rotation: Vector3): void {
  const timeSeconds = tick / TicksPerSecond;
  if (keyFrames[keyFrames.length - 1]?.timeSeconds === timeSeconds) {
    keyFrames[keyFrames.length - 1] = { timeSeconds, rotation };
    return;
  }
  keyFrames.push({ timeSeconds, rotation });
}
```

## Prevent Snapback Before Clear

If `playAnimation` ends at tick `N` and `camera.clear()` runs later, set the final camera shot at tick `N`:

```ts
function holdFinalCameraShot(player: Player, anchor: Vector3, finalCameraLocation: Vector3, animationTicks: number): void {
  system.runTimeout(() => {
    if (!player.isValid) return;
    if (!player.camera.isValid) return;
    player.camera.setCamera("minecraft:free", {
      location: finalCameraLocation,
      facingLocation: anchor,
    });
  }, animationTicks);
}
```

## Practical Debug Checklist

When a Bedrock camera shot is wrong:

1. Confirm the anchor is the intended subject.
2. Log relative offsets from the anchor.
3. Test with `setCamera` only.
4. Bypass collision correction for pure vertical top/bottom shots.
5. Convert static points to `playAnimation` only after framing is correct.
6. Add rotation keyframes for every point.
7. Use degree yaw normalization.
8. Avoid duplicate keyframe timestamps.
9. Hold the final camera after animation ends if clear is delayed.

## Verification

After editing TypeScript under `data/scripts/`, run:

```bash
bun run tsc --project ./data/scripts --skipLibCheck
```

Fix only errors introduced by the camera change.
