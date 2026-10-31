const lang = game.i18n.lang === "de" ? "de" : "en";

const dict = {
    de: {
        noTarget: "Das Ziel konnte nicht ermittelt werden.",
        firstLatch: (name, target) => `<b>${name}</b> verbeißt sich in <b>${target}</b>!`,
        autoDamage: (name, target, bonus) => `<b>${name}</b> beißt sich tiefer in <b>${target}</b> fest!<br>(Schadensbonus ist nun +${bonus} TP)`,
        prefix: "Verbissen",
        traitName: "Biss"
    },
    en: {
        noTarget: "Could not resolve target.",
        firstLatch: (name, target) => `<b>${name}</b> locks onto <b>${target}</b>!`,
        autoDamage: (name, target, bonus) => `<b>${name}</b> bites deeper into <b>${target}</b>!<br>(Damage Bonus is now +${bonus} HP)`,
        prefix: "Locked on",
        traitName: "Bite"
    }
}[lang];

const cfg = {
    icon: "systems/dsa5/icons/categories/ability_animal.webp",
    condition: "fixated",
    parryKey: "system.meleeStats.parry",
    dodgeKey: "system.status.dodge.gearmodifier",
    damageKey: `@trait.${dict.traitName}.system.damage.value`,
    flagScope: "world",
    flagUuid: "targetUuid",
    flagBonus: "verbissenBonus",
    flagName: "targetName"
};

const attackerActor = arguments[0]; 
const def = arguments[3]?.defender;   

const victimActor = def?.testResult?.actor || game.actors.get(def?.speaker?.actor);

if (!victimActor || !attackerActor) return ui.notifications.warn(dict.noTarget);

const victimName = victimActor.token?.name || victimActor.name;
const victimUuid = victimActor.uuid; 
const attackerName = attackerActor.token?.name || attackerActor.name;

const existingEffects = attackerActor.effects.filter(e => e.name.startsWith(dict.prefix));
let matchedEffect = existingEffects.find(e => e.getFlag(cfg.flagScope, cfg.flagUuid) === victimUuid);

const effectsToDelete = existingEffects.filter(e => e !== matchedEffect);
if (effectsToDelete.length > 0) {
    for (const oldEff of effectsToDelete) {
        const oldUuid = oldEff.getFlag(cfg.flagScope, cfg.flagUuid);
        if (oldUuid) {
            const oldVictim = fromUuidSync(oldUuid);
            if (oldVictim) oldVictim.removeCondition(cfg.condition).catch(console.error);
        }
    }
    await attackerActor.deleteEmbeddedDocuments("ActiveEffect", effectsToDelete.map(e => e.id));
}

const onRemoveScript = `
    const tUuid = effect.getFlag("${cfg.flagScope}", "${cfg.flagUuid}");
    if (tUuid) {
        const tActor = fromUuidSync(tUuid);
        if (tActor) {
            tActor.removeCondition("${cfg.condition}").catch(console.error);
        }
    }
`;

if (!matchedEffect) {
    await victimActor.addCondition(cfg.condition);

    const attackerEffectData = {
        name: `${dict.prefix} (${victimName})`,
        img: cfg.icon,
        duration: { rounds: 2, startRound: game.combat?.round, startTurn: game.combat?.turn },
        changes: [
            { key: cfg.parryKey, mode: 2, value: "-99" },
            { key: cfg.dodgeKey, mode: 2, value: "-99" },
            { key: cfg.damageKey, mode: 2, value: "0" }
        ],
        flags: {
            [cfg.flagScope]: { 
                [cfg.flagBonus]: 1, 
                [cfg.flagUuid]: victimUuid, 
                [cfg.flagName]: victimName
            }
        },
        system: { advancedFunction: 2, macroArgs: { onRemove: onRemoveScript } }
    };

    await attackerActor.createEmbeddedDocuments("ActiveEffect", [attackerEffectData]);

    ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: attackerActor }),
        content: dict.firstLatch(attackerName, victimName)
    });

} 
else {
    let currentBonus = matchedEffect.getFlag(cfg.flagScope, cfg.flagBonus) || 1;
    const targetName = matchedEffect.getFlag(cfg.flagScope, cfg.flagName) || "Opfer";

    await attackerActor.updateEmbeddedDocuments("ActiveEffect", [{ 
        _id: matchedEffect.id, 
        [`flags.${cfg.flagScope}.${cfg.flagUuid}`]: null
    }]);
    await attackerActor.deleteEmbeddedDocuments("ActiveEffect", [matchedEffect.id]);

    ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: attackerActor }),
        content: dict.autoDamage(attackerName, targetName, currentBonus)
    });

    const attackerEffectData = {
        name: `${dict.prefix} (${victimName})`,
        img: cfg.icon,
        duration: { rounds: 2, startRound: game.combat?.round, startTurn: game.combat?.turn },
        changes: [
            { key: cfg.parryKey, mode: 2, value: "-99" },
            { key: cfg.dodgeKey, mode: 2, value: "-99" },
            { key: cfg.damageKey, mode: 2, value: String(currentBonus) }
        ],
        flags: {
            [cfg.flagScope]: { 
                [cfg.flagBonus]: currentBonus + 1, 
                [cfg.flagUuid]: victimUuid, 
                [cfg.flagName]: victimName
            }
        },
        system: { advancedFunction: 2, macroArgs: { onRemove: onRemoveScript } }
    };

    await attackerActor.createEmbeddedDocuments("ActiveEffect", [attackerEffectData]);
}
