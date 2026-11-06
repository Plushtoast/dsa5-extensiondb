const FINAGEBAST_HOOK_KEY = 'dsa5.finagebast';

function registerFinagebastHooks() {
    class FinagebastBurgerMenu extends game.dsa5.api.RollDialogBurgerMenuRule {
        matches(dialogState) {
            const { source, actor } = dialogState;
            if (!source || !actor || source.type !== "skill") return false;

            const skillName = game.i18n.localize("LocalizedIDs.treatWounds");
            if (source.name !== skillName) return false;

            const itemName = game.i18n.localize("Finagebast.itemName");
            return actor.items.some(i => i.name === itemName);
        }

        getBurgerMenuItems(dialogState) {
            const { actor } = dialogState;
            const itemName = game.i18n.localize("Finagebast.itemName");
            const finagebast = actor.items.find(i => i.name === itemName);
            
            if (!finagebast) return [];

            const iconHtml = `<i class="schip tiny fullSchip" style="background-image: url('${finagebast.img}'); display: inline-block !important; vertical-align: middle !important; margin-right: 8px; border: none; box-shadow: none;"></i>`;

            return [{
                label: finagebast.name,
                icon: iconHtml,
                onClick: async () => {
                    const testData = dialogState.dialog?.testData || dialogState.testData;
                    if (testData) {
                        testData.extra ??= {};
                        testData.extra.finagebastVorgemerkt = true;
                    }
                }
            }];
        }
    }

    const finagebastMenu = new FinagebastBurgerMenu();

    Hooks.on('dsa5.getRollDialogContextOptions', (dialogState, menuItems) => {
        if (finagebastMenu.matches(dialogState)) {
            menuItems.push(...finagebastMenu.getBurgerMenuItems(dialogState));
        }
    });

    Hooks.on("postProcessDSARoll", async (chatOptions, testData, rerenderMessage) => {
        const preData = testData.preData;
        
        if (!preData || rerenderMessage) return;
        
        if (preData.extra?.finagebastVorgemerkt && !preData.extra?.finagebastVerbraucht) {
            preData.extra.finagebastVerbraucht = true;

            const speaker = preData.extra?.speaker || chatOptions.speaker;
            let actor = game.actors.get(speaker?.actor);
            
            if (!actor && speaker?.token && canvas.ready) {
                actor = canvas.tokens.get(speaker.token)?.actor;
            }

            if (!actor) return;

            const itemName = game.i18n.localize("Finagebast.itemName");
            const finagebast = actor.items.find(i => i.name === itemName);
            
            if (finagebast && finagebast.system.quantity.value > 0) {
                await finagebast.update({ "system.quantity.value": finagebast.system.quantity.value - 1 });

                const skillName = game.i18n.localize("LocalizedIDs.treatWounds");
                const effectData = {
                    name: finagebast.name,
                    img: "icons/svg/aura.svg",
                    type: "base",
                    transfer: false,
                    system: {
                        changes: [{
                            key: "system.skillModifiers.postRoll.reroll",
                            type: "custom",
                            value: `${skillName} 2`
                        }],
                        charges: { max: 1, value: 1 }
                    }
                };

                await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
            }
        }
    });
}

Hooks.once("setup", function () {
    const hookRegistry = game.dsa5.dsa5HookRegistry;
    if (hookRegistry?.has(FINAGEBAST_HOOK_KEY)) return;

    hookRegistry?.add(FINAGEBAST_HOOK_KEY);
    registerFinagebastHooks();
});
