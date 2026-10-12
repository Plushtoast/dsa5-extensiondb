const BRAZORAGH_SCHIP_HOOK_KEY = 'dsa5-gods.brazoragh-schip';

function registerBrazoraghSchipHooks() {
    class BrazoraghSchipBurgerMenu extends game.dsa5.api.RollDialogBurgerMenuRule {
        constructor() {
            super({ abilityNameKey: 'God.Brazoragh.Name' }); 
        }

        matches(dialogState) {
            const { testData, actor } = dialogState;
            if (testData?.mode !== 'attack' || !actor) return false;

            const currentBrazoraghSchips = foundry.utils.getProperty(actor, "flags.dsa5.specialPoints.Brazoragh.current") || 0;
            return currentBrazoraghSchips > 0;
        }

        getBurgerMenuItems(dialogState) {
            return [{
                label: _loc("GodsMenu.BrazoraghSchipName"), 
                icon: '<i class="schip tiny fullSchip" style="background-image: url(\'modules/dsa5-godsofaventuria2/icons/chips/Brazoragh.webp\'); display: inline-block !important; vertical-align: middle !important; margin-right: 8px; border: none; box-shadow: none;"></i>',
                onClick: async () => {
                    const { dialog } = dialogState;
                    const modNameAT = _loc("GodsMenu.BrazoraghSchipNameAT");

                    if (this.hasModifierApplied(dialog, modNameAT)) {
                        ui.notifications.warn(_loc("GodsMenu.BrazoraghSchipAlreadyActive"));
                        return;
                    }

                    const widget = this.getSituationalModifiersWidget(dialog);
                    if (widget) {
                        const pain = game.i18n.has("CONDITION.pain") ? _loc("CONDITION.pain") : "Schmerz";
                        const fear = game.i18n.has("CONDITION.fear") ? _loc("CONDITION.fear") : "Furcht";
                        
                        widget.removeModifier(mod => 
                            mod.name === pain || 
                            mod.name === fear || 
                            mod.name === "Schmerz" || 
                            mod.name === "Furcht"
                        );
                    }

                    const sourceText = _loc("GodsMenu.BrazoraghSchipSource");

                    this.upsertModifier(dialog, {
                        name: modNameAT,
                        value: 2,
                        selected: true,
                        source: sourceText
                    });

                    if (widget && typeof widget.dispatchChange === 'function') {
                        widget.dispatchChange();
                    }
                }
            }];
        }
    }

    const brazoraghSchipMenu = new BrazoraghSchipBurgerMenu();

    Hooks.on('dsa5.getRollDialogContextOptions', (dialogState, menuItems) => {
        if (brazoraghSchipMenu.matches(dialogState)) {
            menuItems.push(...brazoraghSchipMenu.getBurgerMenuItems(dialogState));
        }
    });

    Hooks.on("postProcessDSARoll", async (chatOptions, testData) => {
        const { preData } = testData;
        if (!preData) return;

        const modNameAT = _loc("GodsMenu.BrazoraghSchipNameAT");
        const hasModifier = preData.situationalModifiers?.some(mod => mod.name === modNameAT);

        if (hasModifier) {
            const speaker = preData.extra?.speaker || chatOptions.speaker;
            let actor = game.actors.get(speaker?.actor);

            if (!actor && speaker?.token && canvas.ready) {
                actor = canvas.tokens.get(speaker.token)?.actor;
            }

            if (actor) {
                const currentBrazoragh = foundry.utils.getProperty(actor, "flags.dsa5.specialPoints.Brazoragh.current") || 0;
                if (currentBrazoragh > 0) {
                    await actor.update({ "flags.dsa5.specialPoints.Brazoragh.current": currentBrazoragh - 1 });
                    ui.notifications.info(_loc("GodsMenu.BrazoraghSchipConsumed", { name: actor.name }));
                }
            }
        }
    });
}

Hooks.once("setup", function () {
    const hookRegistry = game.dsa5.dsa5HookRegistry;
    if (hookRegistry?.has(BRAZORAGH_SCHIP_HOOK_KEY)) return;

    hookRegistry?.add(BRAZORAGH_SCHIP_HOOK_KEY);
    registerBrazoraghSchipHooks();
});
