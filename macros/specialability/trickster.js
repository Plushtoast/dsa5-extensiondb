Hooks.once('setup', () => {
    class TrickserBurgerMenu extends game.dsa5.api.RollDialogBurgerMenuRule {
        
        getValidPets(actor) {
            if (!actor) return [];
            const locTrickser = game.i18n.localize("COMPANIONS.trickser");
            
            const companionsData = actor.system?.companions || actor.flags?.dsa5?.companions || {};
            const validPets = [];

            for (const key of Object.keys(companionsData)) {
                const comp = companionsData[key];
                if (!comp.uuid) continue;

                const petActor = fromUuidSync(comp.uuid);
                if (!petActor) continue;

                const hasTrickser = petActor.items.some(i => i.type === "specialability" && i.name === locTrickser);
                
                if (hasTrickser) {
                    validPets.push(petActor);
                }
            }
            
            return validPets;
        }

        matches(dialogState) {
            const locGaukeleien = game.i18n.localize("COMPANIONS.gaukeleien");
            
            if (dialogState?.source?.type !== "skill" || dialogState?.source?.name !== locGaukeleien) {
                return false;
            }
            
            return this.getValidPets(dialogState.actor).length > 0;
        }

        getBurgerMenuItems(dialogState) {
            const validPets = this.getValidPets(dialogState.actor);
            
            const locKunststueck = game.i18n.localize("COMPANIONS.kunststueck");
            const locTrickser = game.i18n.localize("COMPANIONS.trickser");
            const locSource = game.i18n.localize("COMPANIONS.sourceAnimalSF");
            
            return validPets.map(pet => {
                const hasKunststueck = pet.items.some(i => i.type === "trait" && i.name === locKunststueck);
                const bonus = hasKunststueck ? 2 : 1;
                
                const labelName = hasKunststueck ? locKunststueck : locTrickser;
                const modifierLabel = `${labelName} (${pet.name})`;
                const iconHtml = `<i style="background-image: url('${pet.img}'); display: inline-block !important; vertical-align: middle !important; margin-right: 8px; width: 20px; height: 20px; background-size: cover; background-position: center; border-radius: 50%; border: none; box-shadow: none;"></i>`;

                return {
                    label: modifierLabel,
                    icon: iconHtml,
                    onClick: async () => {
                        if (this.hasModifierApplied(dialogState.dialog, modifierLabel)) {
                            ui.notifications.warn(game.i18n.format("COMPANIONS.alreadyApplied", { name: pet.name }));
                            return;
                        }

                        this.upsertModifier(dialogState.dialog, {
                            name: modifierLabel,
                            value: bonus,
                            selected: true,
                            source: locSource
                        });
                    }
                };
            });
        }
    }

    const trickserBurgerMenu = new TrickserBurgerMenu();

    Hooks.on('dsa5.getRollDialogContextOptions', (dialogState, menuItems) => {
        if (!trickserBurgerMenu.matches(dialogState)) return;
        menuItems.push(...trickserBurgerMenu.getBurgerMenuItems(dialogState));
    });
});
