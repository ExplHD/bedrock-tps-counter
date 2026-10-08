// data/scripts/main.ts
import {
  CommandPermissionLevel,
  CustomCommandParamType,
  CustomCommandStatus,
  Player,
  system,
  world
} from "@minecraft/server";
import {
  ActionFormData,
  CustomForm,
  MessageBox,
  MessageFormData,
  ModalFormData,
  ObservableBoolean,
  ObservableNumber,
  ObservableString
} from "@minecraft/server-ui";
var LOW_TPS_DEFAULT = 17;
var SPIKE_TPS_DEFAULT = 21;
var SAMPLE_INTERVAL_TICKS = 20;
var HISTORY_LIMIT = 300;
var IDEAL_TICK_MS = 50;
var DP = {
  seen: "exa:tps:seen",
  constant: "exa:tps:constant",
  colorize: "exa:tps:colorize",
  showMspt: "exa:tps:show_mspt",
  lowAlert: "exa:tps:low_alert",
  spikeAlert: "exa:tps:spike_alert",
  cooldownSec: "exa:tps:cooldown_sec",
  lowThreshold: "exa:tps:low_threshold",
  spikeThreshold: "exa:tps:spike_threshold"
};
var LEGACY_CONSTANT_KEY = "ph:tps_constant";
var DEFAULT_SETTINGS = {
  constant: false,
  colorize: true,
  showMspt: true,
  lowAlert: true,
  spikeAlert: true,
  cooldownSec: 15,
  lowThreshold: LOW_TPS_DEFAULT,
  spikeThreshold: SPIKE_TPS_DEFAULT
};
var memBools = /* @__PURE__ */ new Map();
var memNums = /* @__PURE__ */ new Map();
function memKey(player, key) {
  return `${player.id}::${key}`;
}
function readBool(player, key) {
  try {
    const value = player.getDynamicProperty(key);
    return typeof value === "boolean" ? value : void 0;
  } catch {
    return memBools.get(memKey(player, key));
  }
}
function writeBool(player, key, value) {
  try {
    player.setDynamicProperty(key, value);
  } catch {
    memBools.set(memKey(player, key), value);
  }
}
function readNum(player, key) {
  try {
    const value = player.getDynamicProperty(key);
    return typeof value === "number" ? value : void 0;
  } catch {
    return memNums.get(memKey(player, key));
  }
}
function writeNum(player, key, value) {
  try {
    player.setDynamicProperty(key, value);
  } catch {
    memNums.set(memKey(player, key), value);
  }
}
function fmtThreshold(value) {
  return String(Math.round(value));
}
function getSettings(player) {
  return {
    // Migrate the reference implementation's flag on read.
    constant: readBool(player, DP.constant) ?? readBool(player, LEGACY_CONSTANT_KEY) ?? DEFAULT_SETTINGS.constant,
    colorize: readBool(player, DP.colorize) ?? DEFAULT_SETTINGS.colorize,
    showMspt: readBool(player, DP.showMspt) ?? DEFAULT_SETTINGS.showMspt,
    lowAlert: readBool(player, DP.lowAlert) ?? DEFAULT_SETTINGS.lowAlert,
    spikeAlert: readBool(player, DP.spikeAlert) ?? DEFAULT_SETTINGS.spikeAlert,
    cooldownSec: readNum(player, DP.cooldownSec) ?? DEFAULT_SETTINGS.cooldownSec,
    lowThreshold: Math.round(
      readNum(player, DP.lowThreshold) ?? DEFAULT_SETTINGS.lowThreshold
    ),
    spikeThreshold: Math.round(
      readNum(player, DP.spikeThreshold) ?? DEFAULT_SETTINGS.spikeThreshold
    )
  };
}
function saveSettings(player, partial) {
  const next = { ...getSettings(player), ...partial };
  next.lowThreshold = Math.min(
    Math.max(Math.round(next.lowThreshold), 5),
    Math.round(next.spikeThreshold) - 1
  );
  next.spikeThreshold = Math.max(
    Math.min(Math.round(next.spikeThreshold), 40),
    next.lowThreshold + 1
  );
  next.cooldownSec = Math.min(Math.max(Math.round(next.cooldownSec), 5), 120);
  writeBool(player, DP.constant, next.constant);
  writeBool(player, LEGACY_CONSTANT_KEY, next.constant);
  writeBool(player, DP.colorize, next.colorize);
  writeBool(player, DP.showMspt, next.showMspt);
  writeBool(player, DP.lowAlert, next.lowAlert);
  writeBool(player, DP.spikeAlert, next.spikeAlert);
  writeNum(player, DP.cooldownSec, next.cooldownSec);
  writeNum(player, DP.lowThreshold, next.lowThreshold);
  writeNum(player, DP.spikeThreshold, next.spikeThreshold);
  return next;
}
function resetSettings(player) {
  saveSettings(player, { ...DEFAULT_SETTINGS });
}
var TPS = 20;
var samples = [];
var bootTime = Date.now();
var tickCount = 0;
var lastSampleTime = Date.now();
var sampleCount = 0;
var sessionMin = 20;
var sessionMax = 20;
var lowEvents = 0;
var spikeEvents = 0;
var lastLowAt = 0;
var lastSpikeAt = 0;
var POST_SPAWN_SETTLE_MS = 1e4;
var firstSpawnAt = 0;
var onlineIds = /* @__PURE__ */ new Set();
function engineReady() {
  if (onlineIds.size === 0) return false;
  if (firstSpawnAt === 0) return false;
  return Date.now() - firstSpawnAt >= POST_SPAWN_SETTLE_MS;
}
var lastAlertAt = /* @__PURE__ */ new Map();
function averageOfLast(count) {
  const slice = samples.slice(-count);
  if (slice.length === 0) return TPS;
  let sum = 0;
  for (const value of slice) sum += value;
  return sum / slice.length;
}
function gradeTps(tps) {
  if (tps > SPIKE_TPS_DEFAULT) return { tag: "SPIKE", color: "\xA7d" };
  if (tps >= 19) return { tag: "STABLE", color: "\xA7a" };
  if (tps >= LOW_TPS_DEFAULT) return { tag: "FAIR", color: "\xA7e" };
  if (tps >= 15) return { tag: "LOW", color: "\xA76" };
  return { tag: "CRITICAL", color: "\xA7c" };
}
function personalGrade(tps, s) {
  if (tps < s.lowThreshold) return { tag: "LOW", color: "\xA7c" };
  if (tps > s.spikeThreshold) return { tag: "SPIKE", color: "\xA7d" };
  return gradeTps(tps);
}
function formatDuration(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1e3));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor(totalSec % 3600 / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
function timeAgo(timestamp) {
  if (timestamp <= 0) return "never";
  const s = Math.floor((Date.now() - timestamp) / 1e3);
  if (s < 1) return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}
function countEntities(dimensionId) {
  try {
    return String(world.getDimension(dimensionId).getEntities().length);
  } catch {
    return "?";
  }
}
function buildDiagnostics() {
  const mspt = TPS > 0 ? 1e3 / TPS : 0;
  const lossPct = Math.max(0, (20 - TPS) / 20 * 100);
  const grade = gradeTps(TPS);
  const lines = [
    `\xA7l\xA7b
`,
    `Status: ${grade.color}${grade.tag}\xA7r \xA77(${TPS.toFixed(2)} TPS)${engineReady() ? "" : " \xA77(warming up)"}
`,
    `Effective: ${mspt.toFixed(1)} ms/tick \xA77(ideal ${IDEAL_TICK_MS}ms)
`,
    `Tick loss: ${lossPct.toFixed(1)}%
`,
    `Avg \u2014 5s: ${averageOfLast(5).toFixed(2)} \xB7 10s: ${averageOfLast(10).toFixed(2)}
`,
    `Avg \u2014 1m: ${averageOfLast(60).toFixed(2)} \xB7 5m: ${averageOfLast(HISTORY_LIMIT).toFixed(2)}
`,
    `Session min/max: ${sessionMin.toFixed(2)} / ${sessionMax.toFixed(2)} \xA77(${sampleCount} samples)
`,
    `Low events (<${LOW_TPS_DEFAULT}): ${lowEvents} \xA77(last ${timeAgo(lastLowAt)})
`,
    `Spike events (>${SPIKE_TPS_DEFAULT}): ${spikeEvents} \xA77(last ${timeAgo(lastSpikeAt)})
`,
    `Uptime: ${formatDuration(Date.now() - bootTime)} \xB7 tick ${system.currentTick}
`,
    `Players: ${world.getPlayers().length} \xB7 entities \u2014 ow:${countEntities("overworld")} ne:${countEntities("nether")} end:${countEntities("the_end")}
`
  ];
  return lines.join("\n");
}
function refreshPlayerHud(player) {
  const s = getSettings(player);
  if (!s.constant) return;
  const grade = personalGrade(TPS, s);
  const ms = TPS > 0 ? 1e3 / TPS : 0;
  const msPart = s.showMspt ? ` \xA78| \xA77${ms.toFixed(1)}ms` : "";
  const text = s.colorize ? `\xA7lTPS\xA7r ${grade.color}${TPS.toFixed(2)} \u25CF ${grade.tag}${msPart}` : `TPS ${TPS.toFixed(2)} ${grade.tag}${s.showMspt ? ` | ${ms.toFixed(1)}ms` : ""}`;
  try {
    player.onScreenDisplay.setActionBar(text);
  } catch {
  }
}
function maybeAlert(player, now) {
  const s = getSettings(player);
  const cooldownMs = s.cooldownSec * 1e3;
  if (s.lowAlert && TPS < s.lowThreshold) {
    const key = `${player.id}:low`;
    if (now - (lastAlertAt.get(key) ?? 0) >= cooldownMs) {
      lastAlertAt.set(key, now);
      player.sendMessage(
        `\xA7c[TPS] \xA7fLow TPS: \xA7c${TPS.toFixed(2)} \xA77(< ${fmtThreshold(s.lowThreshold)}). Server is lagging.`
      );
    }
  }
  if (s.spikeAlert && TPS > s.spikeThreshold) {
    const key = `${player.id}:spike`;
    if (now - (lastAlertAt.get(key) ?? 0) >= cooldownMs) {
      lastAlertAt.set(key, now);
      player.sendMessage(
        `\xA7d[TPS] \xA7fTPS spike: \xA7d${TPS.toFixed(2)} \xA77(> ${fmtThreshold(s.spikeThreshold)}). Clock catch-up detected.`
      );
    }
  }
}
function updateTPS() {
  const now = Date.now();
  const elapsedSec = (now - lastSampleTime) / 1e3;
  lastSampleTime = now;
  if (elapsedSec <= 0 || tickCount <= 0) {
    tickCount = 0;
    return;
  }
  TPS = tickCount / elapsedSec;
  tickCount = 0;
  sampleCount++;
  samples.push(TPS);
  if (samples.length > HISTORY_LIMIT) samples.shift();
  if (TPS < sessionMin) sessionMin = TPS;
  if (TPS > sessionMax) sessionMax = TPS;
  if (TPS < LOW_TPS_DEFAULT) {
    lowEvents++;
    lastLowAt = now;
    console.warn(`[TPS] Low TPS event: ${TPS.toFixed(2)}`);
  }
  if (TPS > SPIKE_TPS_DEFAULT) {
    spikeEvents++;
    lastSpikeAt = now;
    console.warn(`[TPS] TPS spike event: ${TPS.toFixed(2)}`);
  }
  for (const player of world.getPlayers()) {
    maybeAlert(player, now);
    refreshPlayerHud(player);
  }
  refreshLiveBindings();
}
function tickHandler() {
  if (!engineReady()) {
    tickCount = 0;
    lastSampleTime = Date.now();
    return;
  }
  tickCount++;
  if (tickCount % SAMPLE_INTERVAL_TICKS === 0) updateTPS();
}
var liveBindings = /* @__PURE__ */ new Map();
function bindLiveText(player, text, kind) {
  liveBindings.set(player.id, { player, text, kind });
}
function unbindLiveText(player) {
  liveBindings.delete(player.id);
}
function menuStatusText(player) {
  const s = getSettings(player);
  const grade = personalGrade(TPS, s);
  return `Current: ${grade.color}${TPS.toFixed(2)} TPS \u25CF ${grade.tag}\xA7r`;
}
function thresholdSummary(low, spike) {
  const ok = low < spike;
  return `${ok ? "\xA7a" : "\xA7c"}Low < ${fmtThreshold(low)} \xB7 Spike > ${fmtThreshold(spike)}${ok ? "" : " \xA7c(low must be below spike)"}`;
}
function refreshLiveBindings() {
  if (liveBindings.size === 0) return;
  for (const [id, binding] of liveBindings) {
    try {
      if (!binding.player.isValid) {
        liveBindings.delete(id);
        continue;
      }
      binding.text.setData(
        binding.kind === "diag" ? buildDiagnostics() : menuStatusText(binding.player)
      );
    } catch {
      liveBindings.delete(id);
    }
  }
}
var uiBusy = /* @__PURE__ */ new Set();
function dduiAvailable() {
  return typeof CustomForm === "function" && typeof MessageBox === "function";
}
function showExclusive(player, open) {
  if (uiBusy.has(player.id)) {
    player.sendMessage("\xA7e[TPS] Close the open dialog first.");
    return;
  }
  uiBusy.add(player.id);
  system.run(() => {
    if (!player.isValid) {
      uiBusy.delete(player.id);
      return;
    }
    let result;
    try {
      result = open();
    } catch (err) {
      uiBusy.delete(player.id);
      player.sendMessage(
        `\xA7c[TPS] Could not open the UI (${err instanceof Error ? err.message : String(err)}).`
      );
      return;
    }
    result.catch((err) => {
      player.sendMessage(
        `\xA7c[TPS] Could not open the UI (${err instanceof Error ? err.message : String(err)}).`
      );
    }).finally(() => {
      uiBusy.delete(player.id);
    });
  });
}
function openMainMenu(player) {
  if (!dduiAvailable()) {
    openLegacyMain(player);
    return;
  }
  const s = getSettings(player);
  showExclusive(player, async () => {
    const statusText = new ObservableString(menuStatusText(player));
    bindLiveText(player, statusText, "menu");
    try {
      const form = new CustomForm(player, "\xA7l\xA7bTPS Counter");
      form.spacer();
      form.label(statusText);
      form.spacer();
      form.label(
        `Monitor: ${s.constant ? "\xA7aON" : "\xA7cOFF"} \xA77\xB7 Alerts: ${s.lowAlert || s.spikeAlert ? "\xA7aON" : "\xA7cOFF"} \xA77\xB7 Cooldown: ${s.cooldownSec}s`
      );
      form.divider();
      form.button("\xA7lDiagnostics", () => {
        form.close();
        system.run(() => openDiagnostics(player));
      });
      form.button("\xA7lMonitor & Alerts", () => {
        form.close();
        system.run(() => openMonitorForm(player));
      });
      form.button("\xA7lThresholds", () => {
        form.close();
        system.run(() => openThresholdForm(player));
      });
      form.button("\xA7cReset my settings", () => {
        resetSettings(player);
        player.sendMessage(
          "\xA7a[TPS] Your settings were reset to defaults."
        );
        form.close();
      });
      form.closeButton();
      await form.show();
    } finally {
      unbindLiveText(player);
    }
  });
}
function openMonitorForm(player) {
  const s = getSettings(player);
  showExclusive(player, () => {
    const constant = new ObservableBoolean(s.constant, {
      clientWritable: true
    });
    const colorize = new ObservableBoolean(s.colorize, {
      clientWritable: true
    });
    const showMspt = new ObservableBoolean(s.showMspt, {
      clientWritable: true
    });
    const lowAlert = new ObservableBoolean(s.lowAlert, {
      clientWritable: true
    });
    const spikeAlert = new ObservableBoolean(s.spikeAlert, {
      clientWritable: true
    });
    const cooldown = new ObservableNumber(s.cooldownSec, {
      clientWritable: true
    });
    const form = new CustomForm(player, "\xA7l\xA7bMonitor & Alerts");
    form.header("Actionbar monitor");
    form.toggle("Constant monitor (actionbar)", constant);
    form.toggle("Colorize actionbar", colorize);
    form.toggle("Show ms/tick in actionbar", showMspt);
    form.divider();
    form.header("Low / spike warnings (chat)");
    form.toggle(
      `Warn on low TPS (< ${fmtThreshold(s.lowThreshold)})`,
      lowAlert
    );
    form.toggle(
      `Warn on TPS spike (> ${fmtThreshold(s.spikeThreshold)})`,
      spikeAlert
    );
    form.slider("Warning cooldown (seconds)", cooldown, 5, 120, {
      step: 5
    });
    form.divider();
    form.button("\xA7a\xA7lSave", () => {
      saveSettings(player, {
        constant: constant.getData(),
        colorize: colorize.getData(),
        showMspt: showMspt.getData(),
        lowAlert: lowAlert.getData(),
        spikeAlert: spikeAlert.getData(),
        cooldownSec: cooldown.getData()
      });
      player.sendMessage("\xA7a[TPS] Monitor settings saved.");
      form.close();
    });
    form.button("Back", () => {
      form.close();
      system.run(() => openMainMenu(player));
    });
    form.closeButton();
    return form.show();
  });
}
function openThresholdForm(player) {
  const s = getSettings(player);
  showExclusive(player, () => {
    const low = new ObservableNumber(s.lowThreshold, {
      clientWritable: true
    });
    const spike = new ObservableNumber(s.spikeThreshold, {
      clientWritable: true
    });
    const summary = new ObservableString(
      thresholdSummary(low.getData(), spike.getData())
    );
    low.subscribe((value) => {
      summary.setData(thresholdSummary(value, spike.getData()));
    });
    spike.subscribe((value) => {
      summary.setData(thresholdSummary(low.getData(), value));
    });
    const form = new CustomForm(player, "\xA7l\xA7bTPS Thresholds");
    form.label(
      `Defaults: low \xA7e${fmtThreshold(LOW_TPS_DEFAULT)} \xA77/ spike \xA7d${fmtThreshold(SPIKE_TPS_DEFAULT)}`
    );
    form.slider("Low TPS threshold", low, 5, 20, { step: 1 });
    form.slider("Spike TPS threshold", spike, 20, 40, { step: 1 });
    form.label(summary);
    form.divider();
    form.button("\xA7a\xA7lSave", () => {
      const next = saveSettings(player, {
        lowThreshold: low.getData(),
        spikeThreshold: spike.getData()
      });
      player.sendMessage(
        `\xA7a[TPS] Thresholds saved: low < ${fmtThreshold(next.lowThreshold)}, spike > ${fmtThreshold(next.spikeThreshold)}.`
      );
      form.close();
    });
    form.button("Back", () => {
      form.close();
      system.run(() => openMainMenu(player));
    });
    form.closeButton();
    return form.show();
  });
}
function openDiagnostics(player) {
  if (!dduiAvailable()) {
    openLegacyDiagnostics(player);
    return;
  }
  showExclusive(player, async () => {
    const diagText = new ObservableString(buildDiagnostics());
    bindLiveText(player, diagText, "diag");
    try {
      const box = new MessageBox(player, "\xA7l\xA7bTPS Diagnostics");
      box.body(diagText);
      box.button1("Back");
      box.button2("Close");
      const result = await box.show();
      if (result.selection === 0) {
        system.run(() => openMainMenu(player));
      }
    } finally {
      unbindLiveText(player);
    }
  });
}
function openLegacyMain(player) {
  const s = getSettings(player);
  const grade = personalGrade(TPS, s);
  showExclusive(player, () => {
    const form = new ActionFormData().title("TPS Counter").body(
      `Current TPS: ${TPS.toFixed(2)} (${grade.tag})
Monitor: ${s.constant ? "ON" : "OFF"} \xB7 Alerts: ${s.lowAlert || s.spikeAlert ? "ON" : "OFF"}`
    ).button("Diagnostics").button("Monitor & Alerts").button("Thresholds").button("Reset settings");
    return form.show(player).then((res) => {
      if (res.canceled || res.selection === void 0) return;
      if (res.selection === 0) openLegacyDiagnostics(player);
      else if (res.selection === 1) openLegacyMonitor(player);
      else if (res.selection === 2) openLegacyThresholds(player);
      else {
        resetSettings(player);
        player.sendMessage(
          "\xA7a[TPS] Your settings were reset to defaults."
        );
      }
    });
  });
}
function openLegacyMonitor(player) {
  const s = getSettings(player);
  showExclusive(player, () => {
    const form = new ModalFormData().title("Monitor & Alerts").toggle("Constant monitor (actionbar)", {
      defaultValue: s.constant
    }).toggle("Colorize actionbar", { defaultValue: s.colorize }).toggle("Show ms/tick in actionbar", { defaultValue: s.showMspt }).toggle(`Warn on low TPS (< ${fmtThreshold(s.lowThreshold)})`, {
      defaultValue: s.lowAlert
    }).toggle(`Warn on TPS spike (> ${fmtThreshold(s.spikeThreshold)})`, {
      defaultValue: s.spikeAlert
    }).slider("Warning cooldown (seconds)", 5, 120, {
      defaultValue: s.cooldownSec,
      valueStep: 5
    }).submitButton("Save");
    return form.show(player).then((res) => {
      if (res.canceled || !res.formValues) {
        system.run(() => openLegacyMain(player));
        return;
      }
      const v = res.formValues;
      saveSettings(player, {
        constant: v[0] === true,
        colorize: v[1] === true,
        showMspt: v[2] === true,
        lowAlert: v[3] === true,
        spikeAlert: v[4] === true,
        cooldownSec: typeof v[5] === "number" ? v[5] : s.cooldownSec
      });
      player.sendMessage("\xA7a[TPS] Monitor settings saved.");
    });
  });
}
function openLegacyThresholds(player) {
  const s = getSettings(player);
  showExclusive(player, () => {
    const form = new ModalFormData().title("TPS Thresholds").slider("Low TPS threshold", 5, 20, {
      defaultValue: s.lowThreshold,
      valueStep: 1
    }).slider("Spike TPS threshold", 20, 40, {
      defaultValue: s.spikeThreshold,
      valueStep: 1
    }).submitButton("Save");
    return form.show(player).then((res) => {
      if (res.canceled || !res.formValues) {
        system.run(() => openLegacyMain(player));
        return;
      }
      const v = res.formValues;
      const next = saveSettings(player, {
        lowThreshold: typeof v[0] === "number" ? v[0] : s.lowThreshold,
        spikeThreshold: typeof v[1] === "number" ? v[1] : s.spikeThreshold
      });
      player.sendMessage(
        `\xA7a[TPS] Thresholds saved: low < ${fmtThreshold(next.lowThreshold)}, spike > ${fmtThreshold(next.spikeThreshold)}.`
      );
    });
  });
}
function openLegacyDiagnostics(player) {
  showExclusive(player, () => {
    const form = new MessageFormData().title("TPS Diagnostics").body(buildDiagnostics()).button1("Back").button2("Close");
    return form.show(player).then((res) => {
      if (!res.canceled && res.selection === 0) openLegacyMain(player);
    });
  });
}
function asPlayer(origin) {
  const entity = origin.sourceEntity;
  return entity instanceof Player ? entity : void 0;
}
function failure(message) {
  return { status: CustomCommandStatus.Failure, message };
}
function showTps(origin) {
  const grade = gradeTps(TPS);
  const ms = TPS > 0 ? 1e3 / TPS : 0;
  const message = `Current TPS: ${grade.color}${TPS.toFixed(2)} ${grade.tag}\xA7r (${ms.toFixed(1)} ms/tick)${engineReady() ? "" : " \xA77(warming up)"}`;
  const player = asPlayer(origin);
  if (player) player.sendMessage(message);
  else world.sendMessage(message);
  console.log(`[TPS] ${message}`);
  return { status: CustomCommandStatus.Success };
}
function showTpsDiag(origin) {
  const report = buildDiagnostics();
  const player = asPlayer(origin);
  if (player) player.sendMessage(report);
  else world.sendMessage(report);
  return { status: CustomCommandStatus.Success };
}
function openTpsUi(origin) {
  const player = asPlayer(origin);
  if (!player) return failure("Only players can open the TPS UI.");
  system.run(() => openMainMenu(player));
  return { status: CustomCommandStatus.Success };
}
function setConstantMonitoring(origin, enabled) {
  const player = asPlayer(origin);
  if (!player) return failure("Only players can use this command.");
  saveSettings(player, { constant: enabled });
  player.sendMessage(
    `Constant TPS monitoring ${enabled ? "\xA7aenabled" : "\xA7cdisabled"}\xA7r.`
  );
  return { status: CustomCommandStatus.Success };
}
function setTpsAlert(origin, target, enabled) {
  const player = asPlayer(origin);
  if (!player) return failure("Only players can use this command.");
  const t = String(target).toLowerCase();
  if (t === "low") saveSettings(player, { lowAlert: enabled });
  else if (t === "spike") saveSettings(player, { spikeAlert: enabled });
  else if (t === "all") {
    saveSettings(player, { lowAlert: enabled, spikeAlert: enabled });
  } else {
    return failure(`Unknown target "${target}". Use low, spike, or all.`);
  }
  player.sendMessage(
    `\xA7a[TPS] ${t} alert${t === "all" ? "s" : ""} ${enabled ? "\xA7aenabled" : "\xA7cdisabled"}\xA7r.`
  );
  return { status: CustomCommandStatus.Success };
}
system.beforeEvents.startup.subscribe((init) => {
  const registry = init.customCommandRegistry;
  registry.registerCommand(
    {
      name: "exa:tps",
      description: "Shows the current ticks per second (TPS).",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false
    },
    showTps
  );
  registry.registerCommand(
    {
      name: "exa:tpsdiag",
      description: "Shows full TPS diagnostics: averages, min/max, low/spike events, entities.",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false
    },
    showTpsDiag
  );
  registry.registerCommand(
    {
      name: "exa:tpsui",
      description: "Opens the per-player TPS configuration UI.",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false
    },
    openTpsUi
  );
  registry.registerCommand(
    {
      name: "exa:constantmonitoring",
      description: "Toggles the real-time TPS actionbar monitor (per player).",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false,
      mandatoryParameters: [
        { type: CustomCommandParamType.Boolean, name: "enabled" }
      ]
    },
    setConstantMonitoring
  );
  registry.registerCommand(
    {
      name: "exa:tpsalert",
      description: "Toggles low/spike TPS chat warnings for yourself (target: low, spike, all).",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false,
      mandatoryParameters: [
        { type: CustomCommandParamType.String, name: "target" },
        { type: CustomCommandParamType.Boolean, name: "enabled" }
      ]
    },
    setTpsAlert
  );
});
system.run(() => {
  let seeded = false;
  for (const player of world.getPlayers()) {
    onlineIds.add(player.id);
    seeded = true;
  }
  if (seeded && firstSpawnAt === 0) {
    firstSpawnAt = Date.now() - POST_SPAWN_SETTLE_MS;
  }
});
world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  onlineIds.add(player.id);
  if (!initialSpawn) return;
  if (firstSpawnAt === 0) firstSpawnAt = Date.now();
  try {
    if (player.getDynamicProperty(DP.seen) === true) return;
    player.setDynamicProperty(DP.seen, true);
  } catch {
  }
  player.sendMessage([
    "\xA7l\xA7bLightweight TPS Counter\xA7r \u2014 check world/server TPS.",
    "\xA77Commands: \xA7f/exa:tps \xA77\xB7 \xA7f/exa:tpsdiag \xA77\xB7 \xA7f/exa:tpsui",
    " \xA77Or run \xA7f/exa:constantmonitoring true \xA77for a live actionbar readout."
  ]);
});
world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  onlineIds.delete(playerId);
  uiBusy.delete(playerId);
  liveBindings.delete(playerId);
  lastAlertAt.delete(`${playerId}:low`);
  lastAlertAt.delete(`${playerId}:spike`);
});
system.runInterval(tickHandler, 1);
export {
  TPS
};
