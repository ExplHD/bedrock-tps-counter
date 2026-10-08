---
name: blockbench-workflow
description: >
  REQUIRED when opening, controlling, or navigating the Blockbench desktop app,
  opening a model or geometry file in Blockbench, importing Bedrock animation
  JSON, selecting animations, moving through the animation timeline, or
  previewing animation poses. Covers reliable Electron UI control and the
  Blockbench runtime APIs used when native file dialogs are inaccessible.
---

# Blockbench Workflow

Operate the real Blockbench desktop application. Do not claim that a model or
animation is open from file inspection alone.

This skill covers application operation, navigation, animation import, and
preview verification. For animation design or calibration, also load the
project's animation-specific skill.

## Required Tools

Before the first Blockbench UI action in a task:

1. Read `xd://browser`.
2. Locate the executable with `which blockbench`.
3. Resolve a symlink when necessary with `readlink -f`.
4. Drive Blockbench through the `browser` device, not shell keystroke tools.

Blockbench is an Electron application. The browser device can launch it and
control its Chromium page.

## Open Blockbench

Launch the resolved executable and pass the requested model path as an
argument. Use an absolute path for the model.

```json
{
  "action": "open",
  "name": "blockbench",
  "app": {
    "path": "/opt/blockbench/blockbench",
    "args": [
      "--no-sandbox",
      "/absolute/path/to/model.geo.json"
    ]
  },
  "viewport": {
    "width": 1600,
    "height": 1000,
    "scale": 1
  },
  "dialogs": "accept",
  "wait_until": "domcontentloaded",
  "timeout": 60
}
```

Do not hard-code `/opt/blockbench/blockbench` without resolving the installed
binary first.

After opening, call `tab.observe()`. Confirm the window title or visible project
tab identifies the requested model.

## Recovery Dialog

Blockbench may show a recovery prompt before it processes a model passed on the
command line.

Preserve unrelated work:

1. Choose **Recover**, not **Discard**.
2. In the recovery list, choose **Select None**.
3. Select only the newest entry corresponding to the requested model.
4. Leave **Discard all others** unchecked.
5. Choose **Confirm**.
6. Verify the title becomes `<model name> - Blockbench`.

Never recover, overwrite, or discard unrelated projects merely to reach the
requested model.

If the requested model is not in recovery, cancel the recovery selection and
open the requested path normally. Do not guess based only on a similar filename.

## Navigate Workspaces

Blockbench's primary workspaces are visible text controls:

- `Edit`
- `Paint`
- `Animate`

Use the actual control, then verify `Modes.selected.id`:

```js
await tab.click('text/Animate');
await new Promise(resolve => setTimeout(resolve, 500));
return await tab.evaluate(() => Modes.selected.id);
```

Expected result for animation work:

```text
animate
```

The menu bar changes with the selected workspace. In Animate mode it normally
contains `Animation`, `Keyframe`, and `Timeline`.

For discovery, prefer:

```js
return await tab.observe();
```

For menu structure that accessibility output omits:

```js
return await tab.evaluate(() =>
  [...document.querySelectorAll('#menu_bar .menu_bar_point')]
    .map(element => element.innerText)
);
```

Use visible controls for navigation. Runtime APIs are appropriate for file
import and deterministic preview positioning where Electron native dialogs or
real-time playback are unreliable.

## Import a Bedrock Animation File

### Why the Menu Alone Is Unreliable

The Animate menu's **Import Animations** item calls an Electron native file
dialog. Puppeteer's `page.waitForFileChooser()` does not receive that dialog.
Waiting for it can time out and kill the controlled tab worker.

Do not use `page.waitForFileChooser()` for Blockbench's animation import.

### Reliable Import

Use Node access in the outer browser-run scope to read the requested file, then
call Blockbench's animation codec inside `tab.evaluate()`.

Use `tab.evaluate()`, not raw `page.evaluate()`. Blockbench globals such as
`AnimationCodec`, `Undo`, and `Animation` are available in the application
world exposed by `tab.evaluate()`.

```js
const fs = await import('node:fs/promises');
const path = '/absolute/path/to/file.animation.json';
const content = await fs.readFile(path, 'utf8');

return await tab.evaluate(({path, content}) => {
  const codec = AnimationCodec.getCodec();
  if (!codec) throw new Error('No animation codec is active');

  Undo.initEdit({animations: []});
  const imported = codec.loadFile({path, content}, null);
  Undo.finishEdit('Import animations', {animations: imported});

  imported[0]?.select();

  return imported.map(animation => ({
    name: animation.name,
    length: animation.length,
    loop: animation.loop,
    path: animation.path
  }));
}, {path, content});
```

This imports every animation in the requested file without opening the native
selection dialog.

Do not import unrelated animation files. Use only paths named by the user or
required by the current task.

### Duplicate Imports

Before importing, inspect current paths and names:

```js
return await tab.evaluate(() =>
  Animation.all.map(animation => ({
    name: animation.name,
    path: animation.path
  }))
);
```

If the exact file is already loaded, do not load a duplicate copy. Select the
existing animation or use the active codec's reload behavior when the file
changed.

## Select and Preview an Animation

Enter Animate mode, select by exact identifier, set a deterministic timeline
position, and force a preview update:

```js
return await tab.evaluate(({name, time}) => {
  const animation = Animation.all.find(item => item.name === name);
  if (!animation) throw new Error(`Animation not loaded: ${name}`);
  if (time < 0 || time > animation.length) {
    throw new Error(`Preview time ${time} is outside 0..${animation.length}`);
  }

  animation.select();
  Timeline.setTime(time);
  Animator.preview();

  return {
    name: Animation.selected?.name,
    time: Timeline.time,
    length: animation.length,
    loop: animation.loop
  };
}, {name: 'animation.example.idle', time: 0.5});
```

For play/pause, Blockbench exposes a toggle:

```js
await tab.evaluate(() => BarItems.play_animation.click());
```

Real-time timeline advancement may be throttled when Electron is backgrounded.
Use explicit `Timeline.setTime()` samples for deterministic verification. Do
not treat a throttled timer as evidence that the animation failed to import.

## Verify the Actual Surface

An import is complete only when all of these checks pass:

1. Blockbench is in Animate mode.
2. `Animation.all` contains the expected identifiers.
3. Imported lengths, loop modes, and source paths match the requested file.
4. Selecting an animation updates `Animation.selected`.
5. `Timeline.setTime()` reaches representative times.
6. `Animator.preview()` changes the corresponding bone transforms.
7. A Blockbench screenshot shows the model, animation list, selected animation,
   and representative pose.

Example transform check:

```js
return await tab.evaluate(() => {
  const bone = name => Group.all.find(group => group.name === name)?.mesh;
  return {
    selected: Animation.selected?.name,
    time: Timeline.time,
    rootPosition: bone('root')?.position?.toArray(),
    rootRotation: bone('root')?.rotation?.toArray(),
    waistRotation: bone('waist')?.rotation?.toArray()
  };
});
```

Take a screenshot only after selecting the requested animation and timeline
position. Read the saved image and inspect the rendered pose; a screenshot path
alone is not visual verification.

## User Motion Review

Operational checks may confirm that Blockbench loaded the correct file,
animation identifier, length, loop mode, timeline, and bone transforms. They do
not establish that motion looks smooth, weighty, readable, or stylistically
correct.

For animation-motion work in this project:

1. Load and select the requested animation.
2. Set the timeline to its start and leave Blockbench ready to play.
3. Ask the user to press Play and watch at least one complete loop or one-shot
   at normal speed.
4. Ask whether it is smooth, still choppy, or smooth but stylistically wrong.
5. Treat the user's response as the motion-quality result.

Do not claim visual motion quality from JSON validation, transform dumps,
static timeline samples, or screenshots. Those remain useful for operational
diagnosis only.

## Failure Recovery

- If `browser open` fails because another Blockbench process owns the app
  session, preserve the existing process. Ask the user to close it only when the
  browser device cannot attach or operate it safely.
- If a browser action times out while an Electron native dialog is open, do not
  retry the same Puppeteer file-chooser strategy. Reopen the managed Blockbench
  session and use `AnimationCodec.loadFile()`.
- If the browser device loses its managed tab, close only the session it
  launched. Never kill an unverified Blockbench PID.
- If animation globals are missing, verify the model format supports Bedrock
  animation and enter Animate mode before retrying.

## Completion Checklist

- Requested model visibly open in Blockbench.
- Animate workspace selected when importing or previewing animations.
- Only the requested animation file imported.
- No duplicate animation entries introduced.
- Expected identifiers, lengths, loop modes, and paths observed in Blockbench.
- Requested animation selected at its start and ready to play.
- User asked to review the complete motion at normal speed.
- Motion quality left unclaimed until the user responds.
- Unrelated recovery projects left untouched.
