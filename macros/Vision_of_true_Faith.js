Hooks.on('renderDialog', (app, html, data) => {
    const isRegeneration = html.find('select[name="regnerationCampLocations"]').length > 0;
    if (!isRegeneration) return;

    if (game.dsa5 && game.dsa5.apps && game.dsa5.apps.RollDialogExtensions) {
        game.dsa5.apps.RollDialogExtensions.bindBurgerMenu(app);
    }
});

Hooks.on('dsa5.getRollDialogContextOptions', (dialogState, menuItems) => {
    const { source, actor, dialog } = dialogState;

    if (!source || source.type !== "regenerate") return;
    if (!actor) return;

    const effectNameKey = "VISION_FAITH.name";
    const effectName = game.i18n.localize(effectNameKey);
    const hasAbility = actor.items.find(i => i.type === "specialability" && i.name === effectName);
    
    if (!hasAbility) return;

    menuItems.push({
        name: effectName,
        icon: '<img src="systems/dsa5/icons/schip.webp" style="height: 1.1em; width: 1.1em; display: inline-block; vertical-align: middle; border: none; margin: 0 5px 0 0;" />',
        callback: async () => {
            await runVisionOfTrueFaith(actor, dialog);
        }
    });
});

async function runVisionOfTrueFaith(actor, dialog) {
    const currentFate = foundry.utils.getProperty(actor.system, "status.fatePoints.value") ?? 0;
    
    if (currentFate <= 0) {
        ui.notifications.warn(game.i18n.format("VISION_FAITH.noFate", { name: actor.name }));
        return;
    }

    const rollButton = dialog.element.querySelector('button[data-action="rollButton"], button[type="submit"]');
            
    if (rollButton) {
        rollButton.click();
    } else {
        ui.notifications.warn("Konnte die Regenerationsprobe nicht automatisch auslösen.");
    }

    const skillName = game.i18n.localize("VISION_FAITH.skillName");
    const skill = actor.items.find(i => i.type === "skill" && i.name === skillName);
    
    if (!skill) {
        ui.notifications.error(game.i18n.format("VISION_FAITH.noSkill", { name: actor.name }));
        return;
    }

    const setupData = await actor.setupSkill(skill, {}, actor.sheet?.getTokenId?.());
    foundry.utils.setProperty(setupData, "testData.opposable", false);
    const res = await actor.basicTest(setupData);

    await actor.update({ "system.status.fatePoints.value": currentFate - 1 });

    const resultObj = res?.result || res; 

    if (resultObj?.successLevel > 0) {
        const qs = resultObj.qs ?? resultObj.qualityStep ?? 1;
        
        let willpowerBonus = 0;
        let skBonus = 0;
        
        if (qs >= 1) willpowerBonus += 1;
        if (qs >= 2) willpowerBonus += 1;
        if (qs >= 3) skBonus += 1;
        if (qs >= 4) willpowerBonus += 1;
        if (qs >= 5) willpowerBonus += 1;
        if (qs >= 6) skBonus += 1;

        const effectData = {
            name: game.i18n.localize("VISION_FAITH.name"),
            icon: "icons/svg/aura.svg",
            origin: actor.uuid,
            duration: { seconds: 12 * 3600 },
            changes: []
        };

        const willpowerLabel = game.i18n.localize("VISION_FAITH.willpowerLabel");

        if (willpowerBonus > 0) {
            effectData.changes.push({
                key: "system.skillModifiers.step",
                mode: 0, 
                value: `${willpowerLabel} ${willpowerBonus}`
            });
        }

        if (skBonus > 0) {
            effectData.changes.push({
                key: "system.status.soulpower.modifier",
                mode: 2,
                value: skBonus
            });
        }

        if (effectData.changes.length > 0) {
            await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
            ui.notifications.info(
                game.i18n.format("VISION_FAITH.gained", { name: actor.name, wp: willpowerBonus, sk: skBonus })
            );
        } else {
            ui.notifications.info(game.i18n.format("VISION_FAITH.noBonus", { qs: qs, name: actor.name }));
        }
    } else {
        ui.notifications.warn(game.i18n.format("VISION_FAITH.testFailed", { name: actor.name }));
    }
}
