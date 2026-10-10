const lang = game.i18n.lang === "de" ? "de" : "en";
const dict = {
    de: {
        noActor: "Kein Akteur gefunden.",
        noTarget: "Bitte markiere genau ein Ziel für den Angriff.",
        notConfigured: "Der Springarm ist nicht konfiguriert (keine Waffe zugewiesen).",
        noWeapon: "Die zugewiesene Waffe wurde nicht im Inventar gefunden.",
        noSkill: "Talent 'Körperbeherrschung' nicht gefunden",
        fumbleMsg: (name, dmg) => `<b>${name}</b> hat im falschen Moment zugegriffen! Der Dolch fällt zu Boden und verursacht <b>${dmg} SP</b>.`,
        successMsg: (name, weapon) => `<b>${name}</b> löst den Mechanismus aus und zückt <b>${weapon}</b>!`,        
        twoHandedCTs: ["Zweihandschwerter", "Zweihandhiebwaffen", "Stangenwaffen"]
    },
    en: {
        noActor: "No actor found.",
        noTarget: "Please target exactly one token for the attack.",
        notConfigured: "The item is not configured (no weapon assigned).",
        noWeapon: "The assigned weapon was not found in the inventory.",
        noSkill: "Skill 'Body Control' not found.",
        fumbleMsg: (name, dmg) => `<b>${name}</b> grabbed at the wrong moment! The dagger falls to the ground and deals <b>${dmg} DP</b>.`,
        successMsg: (name, weapon) => `<b>${name}</b> triggers the mechanism and draws <b>${weapon}</b>!`,
        twoHandedCTs: ["Two-Handed Swords", "Two-Handed Impact Weapons", "Polearms"]
    }
}[lang];

const sourceActor = item?.parent || actor;
if (!sourceActor) return ui.notifications.warn(dict.noActor);

const targets = Array.from(game.user.targets);
if (targets.length !== 1) return ui.notifications.warn(dict.noTarget);

const targetActor = targets[0].actor;
const FLAG_SCOPE = "dsa5-riverlands";
const FLAG_KEY = "SpringarmSetup"; 
const setup = item.getFlag(FLAG_SCOPE, FLAG_KEY);

if (!setup || !setup.daggerId) return ui.notifications.warn(dict.notConfigured);

const weapon = sourceActor.items.get(setup.daggerId);
if (!weapon) return ui.notifications.warn(dict.noWeapon);

const isOffHand = setup.hand === "off";

const requiredSkillLoc = _loc("LocalizedIDs.bodyControl");

const requiredSkill = sourceActor.items.find(i => i.type === "skill" && i.name === requiredSkillLoc);

if (!requiredSkill) return ui.notifications.error(dict.noSkill);

const skillSetupData = await sourceActor.setupSkill(requiredSkill.toObject(), { skipDialog: true }, sourceActor.sheet?.getTokenId());
const testResult = await sourceActor.basicTest(skillSetupData);
const successLevel = testResult?.result?.successLevel ?? 0;

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

    ChatMessage.create(game.dsa5.apps.DSA5_Utility.chatDataSetup(dict.successMsg(sourceActor.name, weapon.name)));

    if (!targetActor.hasCondition("surprised")) {
        await targetActor.addCondition("surprised");
    }

    const updatedWeapon = sourceActor.items.get(weapon.id);
    const weaponSetupData = await sourceActor.setupWeapon(updatedWeapon.toObject(), "attack", { skipDialog: false }, sourceActor.sheet?.getTokenId());
    await sourceActor.basicTest(weaponSetupData);

} else {
    updates.push({ _id: weapon.id, "system.parent_id": "0" });
    await sourceActor.updateEmbeddedDocuments("Item", updates);
    await item.unsetFlag(FLAG_SCOPE, FLAG_KEY);

    const formula = weapon.system.damage?.value?.replace(/W/g, "d") || "1d6";
    const dmgRoll = await new Roll(formula).evaluate();
    
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
