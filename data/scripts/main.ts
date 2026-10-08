import {
    CommandPermissionLevel,
    CustomCommandParamType,
    CustomCommandStatus,
    Player,
    system,
    world,
} from "@minecraft/server";
import type {
    CustomCommandOrigin,
    CustomCommandResult,
} from "@minecraft/server";
import {
    ActionFormData,
    CustomForm,
    MessageBox,
    MessageFormData,
    ModalFormData,
    ObservableBoolean,
    ObservableNumber,
    ObservableString,
} from "@minecraft/server-ui";

// ---------------------------------------------------------------------------
// Lightweight TPS Counter — TPS engine, low/spike detection, diagnostics,
// per-player DDUI (Data-Driven UI) configuration with legacy-form fallback,
// and custom commands.
// ---------------------------------------------------------------------------

/** Below this TPS a sample counts as a LOW event. */
const LOW_TPS_DEFAULT = 17;
/** Above this TPS a sample counts as a SPIKE event. */
const SPIKE_TPS_DEFAULT = 21;
/** Ticks per TPS sample window (~1 second at full tick rate). */
const SAMPLE_INTERVAL_TICKS = 20;
/** Samples kept for rolling averages (300 ≈ 5 minutes). */
const HISTORY_LIMIT = 300;
/** Ideal tick length in ms. */
const IDEAL_TICK_MS = 50;

/** Dynamic-property keys for per-player settings. */
const DP = {
    seen: "exa:tps:seen",
    constant: "exa:tps:constant",
    colorize: "exa:tps:colorize",
    showMspt: "exa:tps:show_mspt",
    lowAlert: "exa:tps:low_alert",
    spikeAlert: "exa:tps:spike_alert",
    cooldownSec: "exa:tps:cooldown_sec",
    lowThreshold: "exa:tps:low_threshold",
    spikeThreshold: "exa:tps:spike_threshold",
} as const;

/** Legacy key from the reference implementation (migrated on read). */
const LEGACY_CONSTANT_KEY = "ph:tps_constant";

interface TpsPlayerSettings {
    constant: boolean;
    colorize: boolean;
    showMspt: boolean;
    lowAlert: boolean;
    spikeAlert: boolean;
    cooldownSec: number;
    lowThreshold: number;
    spikeThreshold: number;
}

const DEFAULT_SETTINGS: TpsPlayerSettings = {
    constant: false,
    colorize: true,
    showMspt: true,
    lowAlert: true,
    spikeAlert: true,
    cooldownSec: 15,
    lowThreshold: LOW_TPS_DEFAULT,
    spikeThreshold: SPIKE_TPS_DEFAULT,
};

// ---------------------------------------------------------------------------
// Per-player storage (dynamic properties, in-memory fallback if unavailable)
// ---------------------------------------------------------------------------

const memBools = new Map<string, boolean>();
const memNums = new Map<string, number>();

function memKey(player: Player, key: string): string {
    return `${player.id}::${key}`;
}

function readBool(player: Player, key: string): boolean | undefined {
    try {
        const value = player.getDynamicProperty(key);
        return typeof value === "boolean" ? value : undefined;
    } catch {
        return memBools.get(memKey(player, key));
    }
}

function writeBool(player: Player, key: string, value: boolean): void {
    try {
        player.setDynamicProperty(key, value);
    } catch {
        memBools.set(memKey(player, key), value);
    }
}

function readNum(player: Player, key: string): number | undefined {
    try {
        const value = player.getDynamicProperty(key);
        return typeof value === "number" ? value : undefined;
    } catch {
        return memNums.get(memKey(player, key));
    }
}

function writeNum(player: Player, key: string, value: number): void {
    try {
        player.setDynamicProperty(key, value);
    } catch {
        memNums.set(memKey(player, key), value);
    }
}

/** Thresholds are whole numbers (DDUI displays integers). */
function fmtThreshold(value: number): string {
    return String(Math.round(value));
}

function getSettings(player: Player): TpsPlayerSettings {
    return {
        // Migrate the reference implementation's flag on read.
        constant:
            readBool(player, DP.constant) ??
            readBool(player, LEGACY_CONSTANT_KEY) ??
            DEFAULT_SETTINGS.constant,
        colorize: readBool(player, DP.colorize) ?? DEFAULT_SETTINGS.colorize,
        showMspt: readBool(player, DP.showMspt) ?? DEFAULT_SETTINGS.showMspt,
        lowAlert: readBool(player, DP.lowAlert) ?? DEFAULT_SETTINGS.lowAlert,
        spikeAlert:
            readBool(player, DP.spikeAlert) ?? DEFAULT_SETTINGS.spikeAlert,
        cooldownSec:
            readNum(player, DP.cooldownSec) ?? DEFAULT_SETTINGS.cooldownSec,
        lowThreshold: Math.round(
            readNum(player, DP.lowThreshold) ?? DEFAULT_SETTINGS.lowThreshold,
        ),
        spikeThreshold: Math.round(
            readNum(player, DP.spikeThreshold) ??
                DEFAULT_SETTINGS.spikeThreshold,
        ),
    };
}

function saveSettings(
    player: Player,
    partial: Partial<TpsPlayerSettings>,
): TpsPlayerSettings {
    const next: TpsPlayerSettings = { ...getSettings(player), ...partial };
    // Clamp thresholds into sane ranges and keep low < spike.
    next.lowThreshold = Math.min(
        Math.max(Math.round(next.lowThreshold), 5),
        Math.round(next.spikeThreshold) - 1,
    );
    next.spikeThreshold = Math.max(
        Math.min(Math.round(next.spikeThreshold), 40),
        next.lowThreshold + 1,
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

function resetSettings(player: Player): void {
    saveSettings(player, { ...DEFAULT_SETTINGS });
}

// ---------------------------------------------------------------------------
// TPS engine
// ---------------------------------------------------------------------------

/** Current TPS (kept as a named export for compatibility). */
export let TPS = 20;

const samples: number[] = [];
const bootTime = Date.now();
let tickCount = 0;
let lastSampleTime = Date.now();
let sampleCount = 0;
let sessionMin = 20;
let sessionMax = 20;
let lowEvents = 0;
let spikeEvents = 0;
let lastLowAt = 0;
let lastSpikeAt = 0;

/**
 * A 20-tick sample should take ~1s. If one takes longer than this, the game
 * was paused (singleplayer pause stops ticks but not the wall clock) or hit
 * a one-off hitch: drop that single window and hold the last TPS instead of
 * reporting a bogus near-zero reading. Repeated stretched windows mean
 * genuine sustained lag and are recorded normally.
 */
const MAX_SAMPLE_SEC = 3;
/** Consecutive over-long sample windows (see above). */
let gapStreak = 0;
/**
 * Max normal gap between two consecutive ticks. A single larger gap means
 * the game was frozen mid-window (e.g. singleplayer pause menu stops ticks
 * but not the wall clock). Uniform lag spreads across every tick instead, so
 * this catches pauses of any length >= this without hiding real lag.
 */
const MAX_TICK_GAP_SEC = 0.5;
/** Wall-clock time of the previous tick (0 = not yet seen). */
let lastTickTime = 0;
/** Set when the current sample window contains a frozen tick-gap. */
let taintedWindow = false;

/**
 * Grace after the first player spawns before samples count. Covers world
 * boot + chunk settle so loading time never counts as TPS loss/spike.
 */
const POST_SPAWN_SETTLE_MS = 10_000;
/** Epoch ms of the first initial spawn (0 = fresh boot, nobody joined yet). */
let firstSpawnAt = 0;
/** Ids of players currently in the world (spawn seen, no leave yet). */
const onlineIds = new Set<string>();

/** True once the world is past boot/settle with at least one player loaded. */
function engineReady(): boolean {
  if (onlineIds.size === 0) return false;
  if (firstSpawnAt === 0) return false;
  return Date.now() - firstSpawnAt >= POST_SPAWN_SETTLE_MS;
}

/** Per-player last alert timestamps (epoch ms), keyed `${id}:low|spike`. */
const lastAlertAt = new Map<string, number>();

function averageOfLast(count: number): number {
    const slice = samples.slice(-count);
    if (slice.length === 0) return TPS;
    let sum = 0;
    for (const value of slice) sum += value;
    return sum / slice.length;
}

interface TpsGrade {
    tag: string;
    color: string;
}

function gradeTps(tps: number): TpsGrade {
    if (tps > SPIKE_TPS_DEFAULT) return { tag: "SPIKE", color: "§d" };
    if (tps >= 19) return { tag: "STABLE", color: "§a" };
    if (tps >= LOW_TPS_DEFAULT) return { tag: "FAIR", color: "§e" };
    if (tps >= 15) return { tag: "LOW", color: "§6" };
    return { tag: "CRITICAL", color: "§c" };
}

/** Grade using a player's personal thresholds first. */
function personalGrade(tps: number, s: TpsPlayerSettings): TpsGrade {
    if (tps < s.lowThreshold) return { tag: "LOW", color: "§c" };
    if (tps > s.spikeThreshold) return { tag: "SPIKE", color: "§d" };
    return gradeTps(tps);
}

function formatDuration(ms: number): string {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function timeAgo(timestamp: number): string {
    if (timestamp <= 0) return "never";
    const s = Math.floor((Date.now() - timestamp) / 1000);
    if (s < 1) return "just now";
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ago`;
}

function countEntities(dimensionId: string): string {
    try {
        return String(world.getDimension(dimensionId).getEntities().length);
    } catch {
        return "?";
    }
}

/** Full diagnostics report shared by the command and the UI. */
function buildDiagnostics(): string {
    const mspt = TPS > 0 ? 1000 / TPS : 0;
    const lossPct = Math.max(0, ((20 - TPS) / 20) * 100);
    const grade = gradeTps(TPS);
    const lines = [
        `§l§b\n`,
        `Status: ${grade.color}${grade.tag}§r §7(${TPS.toFixed(2)} TPS)${engineReady() ? "" : " §7(warming up)"}\n`,
        `Effective: ${mspt.toFixed(1)} ms/tick §7(ideal ${IDEAL_TICK_MS}ms)\n`,
        `Tick loss: ${lossPct.toFixed(1)}%\n`,
        `Avg — 5s: ${averageOfLast(5).toFixed(2)} · 10s: ${averageOfLast(10).toFixed(2)}\n`,
        `Avg — 1m: ${averageOfLast(60).toFixed(2)} · 5m: ${averageOfLast(HISTORY_LIMIT).toFixed(2)}\n`,
        `Session min/max: ${sessionMin.toFixed(2)} / ${sessionMax.toFixed(2)} §7(${sampleCount} samples)\n`,
        `Low events (<${LOW_TPS_DEFAULT}): ${lowEvents} §7(last ${timeAgo(lastLowAt)})\n`,
        `Spike events (>${SPIKE_TPS_DEFAULT}): ${spikeEvents} §7(last ${timeAgo(lastSpikeAt)})\n`,
        `Uptime: ${formatDuration(Date.now() - bootTime)} · tick ${system.currentTick}\n`,
        `Players: ${world.getPlayers().length} · entities — ow:${countEntities("overworld")} ne:${countEntities("nether")} end:${countEntities("the_end")}\n`,
    ];
    return lines.join("\n");
}

function refreshPlayerHud(player: Player): void {
    const s = getSettings(player);
    if (!s.constant) return;
    const grade = personalGrade(TPS, s);
    const ms = TPS > 0 ? 1000 / TPS : 0;
    const msPart = s.showMspt ? ` §8| §7${ms.toFixed(1)}ms` : "";
    const text = s.colorize
        ? `§lTPS§r ${grade.color}${TPS.toFixed(2)} ● ${grade.tag}${msPart}`
        : `TPS ${TPS.toFixed(2)} ${grade.tag}${s.showMspt ? ` | ${ms.toFixed(1)}ms` : ""}`;
    try {
        player.onScreenDisplay.setActionBar(text);
    } catch {
        // Player may be mid-transition; skip this sample.
    }
}

function maybeAlert(player: Player, now: number): void {
    const s = getSettings(player);
    const cooldownMs = s.cooldownSec * 1000;
    if (s.lowAlert && TPS < s.lowThreshold) {
        const key = `${player.id}:low`;
        if (now - (lastAlertAt.get(key) ?? 0) >= cooldownMs) {
            lastAlertAt.set(key, now);
            player.sendMessage(
                `§c[TPS] §fLow TPS: §c${TPS.toFixed(2)} §7(< ${fmtThreshold(s.lowThreshold)}). Server is lagging.`,
            );
        }
    }
    if (s.spikeAlert && TPS > s.spikeThreshold) {
        const key = `${player.id}:spike`;
        if (now - (lastAlertAt.get(key) ?? 0) >= cooldownMs) {
            lastAlertAt.set(key, now);
            player.sendMessage(
                `§d[TPS] §fTPS spike: §d${TPS.toFixed(2)} §7(> ${fmtThreshold(s.spikeThreshold)}). Clock catch-up detected.`,
            );
        }
    }
}

function updateTPS(): void {
    const now = Date.now();
    const elapsedSec = (now - lastSampleTime) / 1000;
    lastSampleTime = now;
    if (elapsedSec <= 0 || tickCount <= 0) {
        tickCount = 0;
        taintedWindow = false;
        return;
    }
    // Tainted either by one frozen tick-gap mid-window (pause menu) or by an
    // over-long window overall. Only the first consecutive one is dropped, so
    // genuine sustained lag is still recorded.
    const tainted = taintedWindow || elapsedSec > MAX_SAMPLE_SEC;
    taintedWindow = false;
    if (tainted) {
        gapStreak++;
        if (gapStreak === 1) {
            // Single gap after normal sampling: pause/hitch, not real TPS.
            console.warn(
                `[TPS] Discarded tainted sample after ${elapsedSec.toFixed(1)}s window (pause/hitch); holding ${TPS.toFixed(2)} TPS.`,
            );
            tickCount = 0;
            return;
        }
    } else {
        gapStreak = 0;
    }
    TPS = tickCount / elapsedSec;
    tickCount = 0;
    sampleCount++;
    samples.push(TPS);
    if (samples.length > HISTORY_LIMIT) samples.shift();
    if (TPS < sessionMin) sessionMin = TPS;
    if (TPS > sessionMax) sessionMax = TPS;

    // Global low/spike event accounting (fixed thresholds).
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

function tickHandler(): void {
    const now = Date.now();
    if (!engineReady()) {
        // World still loading/settling, or nobody online: drop this window so
        // boot time never counts as a TPS loss/spike event or pollutes stats.
        tickCount = 0;
        lastSampleTime = now;
        lastTickTime = now;
        taintedWindow = false;
        return;
    }
    if (lastTickTime > 0 && (now - lastTickTime) / 1000 > MAX_TICK_GAP_SEC) {
        taintedWindow = true;
    }
    lastTickTime = now;
    tickCount++;
    if (tickCount % SAMPLE_INTERVAL_TICKS === 0) updateTPS();
}

// ---------------------------------------------------------------------------
// Live DDUI bindings — text observables kept in sync on every TPS sample,
// so open dialogs update in real time with no manual refresh.
// ---------------------------------------------------------------------------

type LiveKind = "menu" | "diag";

interface LiveBinding {
    player: Player;
    text: ObservableString;
    kind: LiveKind;
}

/** Live text bindings for currently open DDUI dialogs, keyed by player id. */
const liveBindings = new Map<string, LiveBinding>();

function bindLiveText(
    player: Player,
    text: ObservableString,
    kind: LiveKind,
): void {
    liveBindings.set(player.id, { player, text, kind });
}

function unbindLiveText(player: Player): void {
    liveBindings.delete(player.id);
}

/** Main-menu status line, refreshed live while the menu is open. */
function menuStatusText(player: Player): string {
    const s = getSettings(player);
    const grade = personalGrade(TPS, s);
    return `Current: ${grade.color}${TPS.toFixed(2)} TPS ● ${grade.tag}§r`;
}

/** Threshold-form summary line, refreshed live as the sliders move. */
function thresholdSummary(low: number, spike: number): string {
    const ok = low < spike;
    return `${ok ? "§a" : "§c"}Low < ${fmtThreshold(low)} · Spike > ${fmtThreshold(spike)}${ok ? "" : " §c(low must be below spike)"}`;
}

/** Push the latest TPS data into every open DDUI dialog. */
function refreshLiveBindings(): void {
    if (liveBindings.size === 0) return;
    for (const [id, binding] of liveBindings) {
        try {
            if (!binding.player.isValid) {
                liveBindings.delete(id);
                continue;
            }
            binding.text.setData(
                binding.kind === "diag"
                    ? buildDiagnostics()
                    : menuStatusText(binding.player),
            );
        } catch {
            liveBindings.delete(id);
        }
    }
}

// ---------------------------------------------------------------------------
// UI — DDUI (Data-Driven UI: CustomForm / MessageBox) first,
// legacy server-ui forms as fallback
// ---------------------------------------------------------------------------

/** Players with a dialog currently open (DDUI allows one per player). */
const uiBusy = new Set<string>();

function dduiAvailable(): boolean {
    return typeof CustomForm === "function" && typeof MessageBox === "function";
}

/** Run an async UI opener exclusively per player, releasing on settle. */
function showExclusive(player: Player, open: () => Promise<unknown>): void {
    if (uiBusy.has(player.id)) {
        player.sendMessage("§e[TPS] Close the open dialog first.");
        return;
    }
    uiBusy.add(player.id);
    system.run(() => {
        if (!player.isValid) {
            uiBusy.delete(player.id);
            return;
        }
        let result: Promise<unknown>;
        try {
            result = open();
        } catch (err) {
            uiBusy.delete(player.id);
            player.sendMessage(
                `§c[TPS] Could not open the UI (${err instanceof Error ? err.message : String(err)}).`,
            );
            return;
        }
        result
            .catch((err: unknown) => {
                player.sendMessage(
                    `§c[TPS] Could not open the UI (${err instanceof Error ? err.message : String(err)}).`,
                );
            })
            .finally(() => {
                uiBusy.delete(player.id);
            });
    });
}

function openMainMenu(player: Player): void {
    if (!dduiAvailable()) {
        openLegacyMain(player);
        return;
    }
    const s = getSettings(player);
    showExclusive(player, async () => {
        const statusText = new ObservableString(menuStatusText(player));
        bindLiveText(player, statusText, "menu");
        try {
            const form = new CustomForm(player, "§l§bTPS Counter");
            form.spacer();
            form.label(statusText);
            form.spacer();
            form.label(
                `Monitor: ${s.constant ? "§aON" : "§cOFF"} §7· Alerts: ${s.lowAlert || s.spikeAlert ? "§aON" : "§cOFF"} §7· Cooldown: ${s.cooldownSec}s`,
            );
            form.divider();
            form.button("Diagnostics", () => {
                form.close();
                system.run(() => openDiagnostics(player));
            });
            form.button("Monitor & Alerts", () => {
                form.close();
                system.run(() => openMonitorForm(player));
            });
            form.button("Thresholds", () => {
                form.close();
                system.run(() => openThresholdForm(player));
            });
            form.button("Reset my settings", () => {
                resetSettings(player);
                player.sendMessage(
                    "§a[TPS] Your settings were reset to defaults.",
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

function openMonitorForm(player: Player): void {
    const s = getSettings(player);
    showExclusive(player, () => {
        const constant = new ObservableBoolean(s.constant, {
            clientWritable: true,
        });
        const colorize = new ObservableBoolean(s.colorize, {
            clientWritable: true,
        });
        const showMspt = new ObservableBoolean(s.showMspt, {
            clientWritable: true,
        });
        const lowAlert = new ObservableBoolean(s.lowAlert, {
            clientWritable: true,
        });
        const spikeAlert = new ObservableBoolean(s.spikeAlert, {
            clientWritable: true,
        });
        const cooldown = new ObservableNumber(s.cooldownSec, {
            clientWritable: true,
        });
        const form = new CustomForm(player, "§l§bMonitor & Alerts");
        form.header("Actionbar monitor");
        form.toggle("Constant monitor (actionbar)", constant);
        form.toggle("Colorize actionbar", colorize);
        form.toggle("Show ms/tick in actionbar", showMspt);
        form.divider();
        form.header("Low / spike warnings (chat)");
        form.toggle(
            `Warn on low TPS (< ${fmtThreshold(s.lowThreshold)})`,
            lowAlert,
        );
        form.toggle(
            `Warn on TPS spike (> ${fmtThreshold(s.spikeThreshold)})`,
            spikeAlert,
        );
        form.slider("Warning cooldown (seconds)", cooldown, 5, 120, {
            step: 5,
        });
        form.divider();
        form.button("§a§lSave", () => {
            saveSettings(player, {
                constant: constant.getData(),
                colorize: colorize.getData(),
                showMspt: showMspt.getData(),
                lowAlert: lowAlert.getData(),
                spikeAlert: spikeAlert.getData(),
                cooldownSec: cooldown.getData(),
            });
            player.sendMessage("§a[TPS] Monitor settings saved.");
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

function openThresholdForm(player: Player): void {
    const s = getSettings(player);
    showExclusive(player, () => {
        const low = new ObservableNumber(s.lowThreshold, {
            clientWritable: true,
        });
        const spike = new ObservableNumber(s.spikeThreshold, {
            clientWritable: true,
        });
        const summary = new ObservableString(
            thresholdSummary(low.getData(), spike.getData()),
        );
        low.subscribe((value) => {
            summary.setData(thresholdSummary(value, spike.getData()));
        });
        spike.subscribe((value) => {
            summary.setData(thresholdSummary(low.getData(), value));
        });
        const form = new CustomForm(player, "§l§bTPS Thresholds");
        form.label(
            `Defaults: low §e${fmtThreshold(LOW_TPS_DEFAULT)} §7/ spike §d${fmtThreshold(SPIKE_TPS_DEFAULT)}`,
        );
        form.slider("Low TPS threshold", low, 5, 20, { step: 1 });
        form.slider("Spike TPS threshold", spike, 20, 40, { step: 1 });
        form.label(summary);
        form.divider();
        form.button("§a§lSave", () => {
            const next = saveSettings(player, {
                lowThreshold: low.getData(),
                spikeThreshold: spike.getData(),
            });
            player.sendMessage(
                `§a[TPS] Thresholds saved: low < ${fmtThreshold(next.lowThreshold)}, spike > ${fmtThreshold(next.spikeThreshold)}.`,
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

function openDiagnostics(player: Player): void {
    if (!dduiAvailable()) {
        openLegacyDiagnostics(player);
        return;
    }
    showExclusive(player, async () => {
        const diagText = new ObservableString(buildDiagnostics());
        bindLiveText(player, diagText, "diag");
        try {
            const box = new MessageBox(player, "§l§bTPS Diagnostics");
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

// --- Legacy fallback forms (pre-DDUI clients) ---

function openLegacyMain(player: Player): void {
    const s = getSettings(player);
    const grade = personalGrade(TPS, s);
    showExclusive(player, () => {
        const form = new ActionFormData()
            .title("TPS Counter")
            .body(
                `Current TPS: ${TPS.toFixed(2)} (${grade.tag})\nMonitor: ${s.constant ? "ON" : "OFF"} · Alerts: ${s.lowAlert || s.spikeAlert ? "ON" : "OFF"}`,
            )
            .button("Diagnostics")
            .button("Monitor & Alerts")
            .button("Thresholds")
            .button("Reset settings");
        return form.show(player).then((res) => {
            if (res.canceled || res.selection === undefined) return;
            if (res.selection === 0) openLegacyDiagnostics(player);
            else if (res.selection === 1) openLegacyMonitor(player);
            else if (res.selection === 2) openLegacyThresholds(player);
            else {
                resetSettings(player);
                player.sendMessage(
                    "§a[TPS] Your settings were reset to defaults.",
                );
            }
        });
    });
}

function openLegacyMonitor(player: Player): void {
    const s = getSettings(player);
    showExclusive(player, () => {
        const form = new ModalFormData()
            .title("Monitor & Alerts")
            .toggle("Constant monitor (actionbar)", {
                defaultValue: s.constant,
            })
            .toggle("Colorize actionbar", { defaultValue: s.colorize })
            .toggle("Show ms/tick in actionbar", { defaultValue: s.showMspt })
            .toggle(`Warn on low TPS (< ${fmtThreshold(s.lowThreshold)})`, {
                defaultValue: s.lowAlert,
            })
            .toggle(`Warn on TPS spike (> ${fmtThreshold(s.spikeThreshold)})`, {
                defaultValue: s.spikeAlert,
            })
            .slider("Warning cooldown (seconds)", 5, 120, {
                defaultValue: s.cooldownSec,
                valueStep: 5,
            })
            .submitButton("Save");
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
                cooldownSec: typeof v[5] === "number" ? v[5] : s.cooldownSec,
            });
            player.sendMessage("§a[TPS] Monitor settings saved.");
        });
    });
}

function openLegacyThresholds(player: Player): void {
    const s = getSettings(player);
    showExclusive(player, () => {
        const form = new ModalFormData()
            .title("TPS Thresholds")
            .slider("Low TPS threshold", 5, 20, {
                defaultValue: s.lowThreshold,
                valueStep: 1,
            })
            .slider("Spike TPS threshold", 20, 40, {
                defaultValue: s.spikeThreshold,
                valueStep: 1,
            })
            .submitButton("Save");
        return form.show(player).then((res) => {
            if (res.canceled || !res.formValues) {
                system.run(() => openLegacyMain(player));
                return;
            }
            const v = res.formValues;
            const next = saveSettings(player, {
                lowThreshold: typeof v[0] === "number" ? v[0] : s.lowThreshold,
                spikeThreshold:
                    typeof v[1] === "number" ? v[1] : s.spikeThreshold,
            });
            player.sendMessage(
                `§a[TPS] Thresholds saved: low < ${fmtThreshold(next.lowThreshold)}, spike > ${fmtThreshold(next.spikeThreshold)}.`,
            );
        });
    });
}

function openLegacyDiagnostics(player: Player): void {
    showExclusive(player, () => {
        const form = new MessageFormData()
            .title("TPS Diagnostics")
            .body(buildDiagnostics())
            .button1("Back")
            .button2("Close");
        return form.show(player).then((res) => {
            if (!res.canceled && res.selection === 0) openLegacyMain(player);
        });
    });
}

// ---------------------------------------------------------------------------
// Custom commands
// ---------------------------------------------------------------------------

function asPlayer(origin: CustomCommandOrigin): Player | undefined {
    const entity = origin.sourceEntity;
    return entity instanceof Player ? entity : undefined;
}

function failure(message: string): CustomCommandResult {
    return { status: CustomCommandStatus.Failure, message };
}

function showTps(origin: CustomCommandOrigin): CustomCommandResult {
    const grade = gradeTps(TPS);
    const ms = TPS > 0 ? 1000 / TPS : 0;
    const message = `Current TPS: ${grade.color}${TPS.toFixed(2)} ${grade.tag}§r (${ms.toFixed(1)} ms/tick)${engineReady() ? "" : " §7(warming up)"}`;
    const player = asPlayer(origin);
    if (player) player.sendMessage(message);
    else world.sendMessage(message);
    console.log(`[TPS] ${message}`);
    return { status: CustomCommandStatus.Success };
}

function showTpsDiag(origin: CustomCommandOrigin): CustomCommandResult {
    const report = buildDiagnostics();
    const player = asPlayer(origin);
    if (player) player.sendMessage(report);
    else world.sendMessage(report);
    return { status: CustomCommandStatus.Success };
}

function openTpsUi(origin: CustomCommandOrigin): CustomCommandResult {
    const player = asPlayer(origin);
    if (!player) return failure("Only players can open the TPS UI.");
    system.run(() => openMainMenu(player));
    return { status: CustomCommandStatus.Success };
}

function setConstantMonitoring(
    origin: CustomCommandOrigin,
    enabled: boolean,
): CustomCommandResult {
    const player = asPlayer(origin);
    if (!player) return failure("Only players can use this command.");
    saveSettings(player, { constant: enabled });
    player.sendMessage(
        `Constant TPS monitoring ${enabled ? "§aenabled" : "§cdisabled"}§r.`,
    );
    return { status: CustomCommandStatus.Success };
}

function setTpsAlert(
    origin: CustomCommandOrigin,
    target: string,
    enabled: boolean,
): CustomCommandResult {
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
        `§a[TPS] ${t} alert${t === "all" ? "s" : ""} ${enabled ? "§aenabled" : "§cdisabled"}§r.`,
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
            cheatsRequired: false,
        },
        showTps,
    );

    registry.registerCommand(
        {
            name: "exa:tpsdiag",
            description:
                "Shows full TPS diagnostics: averages, min/max, low/spike events, entities.",
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false,
        },
        showTpsDiag,
    );

    registry.registerCommand(
        {
            name: "exa:tpsui",
            description: "Opens the per-player TPS configuration UI.",
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false,
        },
        openTpsUi,
    );

    registry.registerCommand(
        {
            name: "exa:constantmonitoring",
            description:
                "Toggles the real-time TPS actionbar monitor (per player).",
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false,
            mandatoryParameters: [
                { type: CustomCommandParamType.Boolean, name: "enabled" },
            ],
        },
        setConstantMonitoring,
    );

    registry.registerCommand(
        {
            name: "exa:tpsalert",
            description:
                "Toggles low/spike TPS chat warnings for yourself (target: low, spike, all).",
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false,
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "target" },
                { type: CustomCommandParamType.Boolean, name: "enabled" },
            ],
        },
        setTpsAlert,
    );
});

// ---------------------------------------------------------------------------
// Player lifecycle + tick loop
// ---------------------------------------------------------------------------

system.run(() => {
    // Seed players already present. A script-only /reload re-evaluates this
    // module without re-firing initial playerSpawn for them, so without this
    // the engine would wait forever. A world already running needs no boot
    // settle, so backdate past the grace period.
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
        // Storage unavailable; still show the intro.
    }
    player.sendMessage([
        "§l§bLightweight TPS Counter§r — check world/server TPS.",
        "§7Commands: §f/exa:tps §7· §f/exa:tpsdiag §7· §f/exa:tpsui",
        " §7Or run §f/exa:constantmonitoring true §7for a live actionbar readout.",
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
