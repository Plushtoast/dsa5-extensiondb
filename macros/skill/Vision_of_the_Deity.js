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

    const effectNameKey = "VISION_DEITY.name";
    const effectName = game.i18n.localize(effectNameKey);
    const hasAbility = actor.items.find(i => i.type === "specialability" && i.name === effectName);
    
    if (!hasAbility) return;

    menuItems.push({
        name: effectName,
        icon: '<img src="systems/dsa5/icons/schip.webp" style="height: 1.1em; width: 1.1em; display: inline-block; vertical-align: middle; border: none; margin: 0 5px 0 0;" />',
        callback: async () => {
            await runVisionOfTheDeity(actor, dialog);
        }
    });
});

async function runVisionOfTheDeity(actor, dialog) {
    const currentFate = foundry.utils.getProperty(actor.system, "status.fatePoints.value") ?? 0;
    
    if (currentFate <= 0) {
        ui.notifications.warn(game.i18n.format("VISION_DEITY.noFate", { name: actor.name }));
        return;
    }

    const rollButton = dialog.element.querySelector('button[data-action="rollButton"], button[type="submit"]');
            
    if (rollButton) {
        rollButton.click();
    } else {
        ui.notifications.warn("Konnte die Regenerationsprobe nicht automatisch auslösen.");
    }

    const skillName = game.i18n.localize("VISION_DEITY.skillName");
    const skill = actor.items.find(i => i.type === "skill" && i.name === skillName);
    
    if (!skill) {
        ui.notifications.error(game.i18n.format("VISION_DEITY.noSkill", { name: actor.name }));
        return;
    }

    const setupData = await actor.setupSkill(skill, {}, actor.sheet?.getTokenId?.());
    foundry.utils.setProperty(setupData, "testData.opposable", false);
    const res = await actor.basicTest(setupData);

    await actor.update({ "system.status.fatePoints.value": currentFate - 1 });

    const resultObj = res?.result || res; 

    if (resultObj?.successLevel > 0) {
        const qs = resultObj.qs ?? resultObj.qualityStep ?? 1;
        const charges = Math.ceil(qs / 2);
        
        const effectData = {
            name: game.i18n.localize("VISION_DEITY.name"),
            icon: "icons/svg/aura.svg",
            origin: actor.uuid,
            changes: [
                {
                    key: "system.skillModifiers.postRoll.reroll",
                    mode: 0,
                    value: `any 3`
                }
            ],
            flags: {
                dsa5: {
                    charges: { max: charges, value: charges }
                }
            }
        };

        await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
        ui.notifications.info(
            game.i18n.format("VISION_DEITY.gained", { anzahl: charges })
        );
    } else {
        ui.notifications.warn(game.i18n.format("VISION_DEITY.testFailed", { name: actor.name }));
    }
}
