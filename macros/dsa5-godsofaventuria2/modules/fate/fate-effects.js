import { DSA5GodsMenuConfig } from './config.js';
import { REGEN_BLESSING_CONFIG } from './fate-context.js';

export const DEMON_SCHIP_REGEN_ID = 'demonSchipRegen';
const REGEN_BLESSING_QUERY = `${DSA5GodsMenuConfig.MODULE_ID}.applyRegenBlessing`;
const pendingRegenBlessings = new Set();

const DEMON_REMOVALS = {
    Amazeroth: { auto: ['confusion'] },
    Heskatet: { auto: ['confusion'] },
    Aphasmayra: { auto: ['paralyzed'] },
    Lolgramoth: { auto: ['paralyzed'] },
    Aphestadil: { auto: ['stunned'] },
    Charyptoroth: { auto: ['stunned'] },
    Belhalhar: { auto: ['inpain'] },
    Belkelel: { auto: ['inpain'] },
    Blakharaz: { auto: ['feared'] },
    Thargunitoth: { auto: ['feared'] },
    Agrimoth: { auto: ['heat'] },
    Nagrach: { auto: ['cold'] },
    Mishkara: { auto: ['sick', 'poisoned'], manualLevels: 3 },
    Asfaloth: { manualLevels: 3 },
    Tasfarel: { manualLevels: 3 },
};

export function getDemonConditionRemovals(specialKey) {
    const entry = DEMON_REMOVALS[specialKey];
    return {
        autoConditions: [...(entry?.auto || [])],
        manualLevels: entry?.manualLevels || 0,
    };
}

export async function applyDemonConditionRemovals(actor, autoConditions, manualReductions) {
    for (const cond of autoConditions) {
        const effect = actor.hasCondition(cond);
        if (effect) {
            const amount = effect.system?.condition?.value || effect.getFlag('dsa5', 'value') || 1;
            await actor.removeCondition(cond, amount, false);
            ui.notifications.info(_loc('GodsMenu.FateTab.ConditionRemovedFull', { name: effect.name }));
        }
    }

    for (const [id, amount] of Object.entries(manualReductions)) {
        if (amount > 0) {
            const effectName = actor.effects.find((e) => Array.from(e.statuses).includes(id))?.name || id;
            await actor.removeCondition(id, amount, false);
            ui.notifications.info(_loc('GodsMenu.FateTab.ConditionRemovedPartial', { name: effectName, amount }));
        }
    }
}

export async function applyDemonSchipRegen(actor) {
    if (!actor?.addCondition) return;
    await actor.addCondition(DEMON_SCHIP_REGEN_ID, 1, false, false);
}

export async function clearDemonSchipRegen(actor) {
    if (!actor?.hasCondition?.(DEMON_SCHIP_REGEN_ID)) return;
    await actor.removeCondition(DEMON_SCHIP_REGEN_ID, 0, false, true);
}

async function executeRegenBlessingUpdates({ key, casterId, messageId, allocations }) {
    const cfg = REGEN_BLESSING_CONFIG[key];
    if (!cfg || !Array.isArray(allocations)) return { ok: false, reason: 'invalid' };

    const lockKey = `${messageId}:${key}`;
    if (pendingRegenBlessings.has(lockKey)) return { ok: false, reason: 'alreadyUsed' };
    pendingRegenBlessings.add(lockKey);

    try {
        const msg = game.messages.get(messageId);
        if (!msg || msg.flags?.dsa5?.rollRequest?.finalized) return { ok: false, reason: 'finalized' };

        const currentSpecials = foundry.utils.getProperty(msg, 'flags.data.fateSpecialUsed') || [];
        if (currentSpecials.includes(key)) return { ok: false, reason: 'alreadyUsed' };

        await msg.update({ 'flags.data.fateSpecialUsed': [...currentSpecials, key] });

        let remaining = cfg.maxTotal;
        const applied = [];
        for (const entry of allocations) {
            if (remaining <= 0 || entry.actorId === casterId) continue;
            const amount = Math.clamp(Math.trunc(Number(entry.amount) || 0), 0, Math.min(cfg.maxPerTarget, remaining));
            if (amount <= 0) continue;

            const target = game.actors.get(entry.actorId);
            if (!target || !cfg.filterTarget(target)) continue;

            const current = Number(foundry.utils.getProperty(target, cfg.prop)) || 0;
            await target.update({ [cfg.prop]: current + amount });
            remaining -= amount;
            applied.push({ actorId: target.id, name: target.name, amount });
        }

        return { ok: true, applied };
    } finally {
        pendingRegenBlessings.delete(lockKey);
    }
}

export async function applyRegenBlessing(payload) {
    if (game.user.isGM) return executeRegenBlessingUpdates(payload);

    const activeGM = game.users.activeGM;
    if (!activeGM) return { ok: false, reason: 'noGM' };

    if (typeof activeGM.query === 'function') {
        try {
            return await activeGM.query(REGEN_BLESSING_QUERY, payload);
        } catch {
            return { ok: false, reason: 'noGM' };
        }
    }

    game.socket.emit(DSA5GodsMenuConfig.SOCKET, { type: 'applyRegenBlessing', ...payload });
    return { ok: true, applied: payload.allocations };
}

function registerRegenBlessingQuery() {
    if (CONFIG.queries) CONFIG.queries[REGEN_BLESSING_QUERY] = executeRegenBlessingUpdates;
}
registerRegenBlessingQuery();
Hooks.once('init', registerRegenBlessingQuery);

DSA5GodsMenuConfig.registerSocketHandler('applyRegenBlessing', async (payload) => {
    if (!game.users.activeGM?.isSelf) return;
    await executeRegenBlessingUpdates(payload);
});

Hooks.on('preUpdateActor', (actor, changes, options) => {
    const next = foundry.utils.getProperty(changes, 'system.status.fatePoints.value');
    if (next == null) return;
    if (Number(next) > Number(actor.system.status.fatePoints.value || 0)) {
        options.dsa5ClearDemonSchipRegen = true;
    }
});

Hooks.on('updateActor', async (actor, _changes, options, userId) => {
    if (userId !== game.user.id) return;
    if (!options?.dsa5ClearDemonSchipRegen) return;
    await clearDemonSchipRegen(actor);
});
