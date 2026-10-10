const lang = game.i18n.lang === "de" ? "de" : "en";
const dict = {
    de: {
        noActor: "Kein Akteur gefunden.",
        noTarget: "Bitte markiere genau ein Ziel für den Angriff.",
        notConfigured: "Die Drôlina ist nicht konfiguriert (keine Waffe zugewiesen).",
        noWeapon: "Die zugewiesene Waffe wurde nicht im Inventar gefunden.",
        noSkill: "Talent 'Körperbeherrschung' nicht gefunden.",
        fumbleMsg: (name, dmg) => `<b>${name}</b> hat im falschen Moment zugegriffen! Der Dolch fällt zu Boden und verursacht <b>${dmg} TP</b>.`,
        successMsg: (name, weapon) => `<b>${name}</b> löst die Drôlina aus und zückt <b>${weapon}</b>!`,
        perceptionSkill: "Sinnesschärfe",
        twoHandedCTs: ["Zweihandschwerter", "Zweihandhiebwaffen", "Stangenwaffen"]
    },
    en: {
        noActor: "No actor found.",
        noTarget: "Please target exactly one token for the attack.",
        notConfigured: "The Drôlina is not configured (no weapon assigned).",
        noWeapon: "The assigned weapon was not found in the inventory.",
        noSkill: "Skill 'Body Control' not found.",
        fumbleMsg: (name, dmg) => `<b>${name}</b> grabbed at the wrong moment! The dagger falls to the ground and deals <b>${dmg} DP</b>.`,
        successMsg: (name, weapon) => `<b>${name}</b> triggers the Drôlina and draws <b>${weapon}</b>!`,
        perceptionSkill: "Perception",
        twoHandedCTs: ["Two-Handed Swords", "Two-Handed Impact Weapons", "Polearms"]
    }
}[lang];

const sourceActor = item?.parent || actor;
if (!sourceActor) return ui.notifications.warn(dict.noActor);

const targets = Array.from(game.user.targets);
if (targets.length !== 1) return ui.notifications.warn(dict.noTarget);

const targetToken = targets[0];
const targetActor = targetToken.actor;
if (!targetActor) return;

const FLAG_SCOPE = "dsa5-suncoast";
const FLAG_KEY = "drolinaSetup";
const setup = item.getFlag(FLAG_SCOPE, FLAG_KEY);

if (!setup || !setup.daggerId) return ui.notifications.warn(dict.notConfigured);

const weapon = sourceActor.items.get(setup.daggerId);
if (!weapon) return ui.notifications.warn(dict.noWeapon);

const isOffHand = setup.hand === "off";
const bodyControlLoc = game.i18n.has("LocalizedIDs.bodyControl") ? _loc("LocalizedIDs.bodyControl") : "Körperbeherrschung";
const bodyControlSkill = sourceActor.items.find(i => i.type === "skill" && i.name === bodyControlLoc);

if (!bodyControlSkill) return ui.notifications.error(dict.noSkill);

const skillSetupData = await sourceActor.setupSkill(bodyControlSkill.toObject(), { skipDialog: true }, sourceActor.sheet?.getTokenId());
const testResult = await sourceActor.basicTest(skillSetupData);
const successLevel = testResult?.result?.successLevel ?? 0;
const qualityStep = testResult?.result?.qualityStep ?? 0;

const updates = [];
const equippedItems = sourceActor.items.filter(i => 
    ["meleeweapon", "rangeweapon", "shield"].includes(i.type) && i.system.worn?.value && i.id !== weapon.id
);

for (const eq of equippedItems) {
    const isTwoHanded = eq.system.worn?.requiresBothHands || dict.twoHandedCTs.includes(eq.system.combatskill?.value);
    if (isTwoHanded || eq.system.worn?.offHand === isOffHand) {
        updates.push({ _id: eq.id, "system.worn.value": false });
    }
}

if (successLevel > 0) {
    updates.push({
        _id: weapon.id,
        "system.worn.value": true,
        "system.worn.offHand": isOffHand,
        "system.parent_id": "0" 
    });

    await sourceActor.updateEmbeddedDocuments("Item", updates);
    await item.unsetFlag(FLAG_SCOPE, FLAG_KEY);

    const successChatMsg = await ChatMessage.create(game.dsa5.apps.DSA5_Utility.chatDataSetup(dict.successMsg(sourceActor.name, weapon.name)));

    const penalty = Math.floor(qualityStep / 2);
    const resistModifier = -penalty;

    const perceptionSkill = targetActor.items.find(i => i.type === "skill" && (i.name === dict.perceptionSkill || i.name === _loc("LocalizedIDs.perception")));
    const skillName = perceptionSkill?.name || dict.perceptionSkill;

    const resistData = {
        skill: skillName,
        mod: resistModifier,
        effect: { name: item.name, _id: item.id },
        target: {
            id: targetActor.id,
            name: targetActor.name,
            img: targetToken.document.texture?.src || targetActor.img
        },
        token: targetToken.id,
        systemEffect: "surprised"
    };

    const mode = game.settings.get("core", "messageMode") || "public";

    const templateHtml = await renderTemplate("systems/dsa5/templates/chat/roll/resist-roll.hbs", {
        resist: resistData,
        id: successChatMsg.id,
        mode
    });
    await ChatMessage.create(game.dsa5.apps.DSA5_Utility.chatDataSetup(templateHtml));

    const updatedWeapon = sourceActor.items.get(weapon.id);
    const weaponSetupData = await sourceActor.setupWeapon(updatedWeapon.toObject(), "attack", { skipDialog: false }, sourceActor.sheet?.getTokenId());
    await sourceActor.basicTest(weaponSetupData);

} else {
    updates.push({ _id: weapon.id, "system.parent_id": "0" });
    await sourceActor.updateEmbeddedDocuments("Item", updates);
    await item.unsetFlag(FLAG_SCOPE, FLAG_KEY);

    const dmgRoll = await new Roll("1d3").evaluate();
    
    if (typeof sourceActor.applyDamage === "function") {
        await sourceActor.applyDamage(dmgRoll.total);
    }

    const msgData = game.dsa5.apps.DSA5_Utility.chatDataSetup(dict.fumbleMsg(sourceActor.name, dmgRoll.total));
    
    const whisperTargets = game.users.filter(u => u.isGM).map(u => u.id);
    if (!whisperTargets.includes(game.user.id)) {
        whisperTargets.push(game.user.id);
    }
    msgData.whisper = whisperTargets;

    ChatMessage.create(msgData);
}
