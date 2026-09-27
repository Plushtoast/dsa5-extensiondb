import { RollDialogBurgerMenuRule } from '../../../../systems/dsa5/modules/item/burgermenus/base-burger-menu-rule.js';

export class SpuckenElixierBurgerMenu extends RollDialogBurgerMenuRule {
    constructor() {
        super();
    }

    matches(dialogState) {
        const expectedName = game.i18n.localize("Spitattack.sourceName");
        if (!dialogState?.source || !dialogState.source.name.includes(expectedName)) return false;
        
        const actor = dialogState.actor;
        if (!actor) return false;
        
        return actor.effects.some(e => e.flags?.world?.storedElixir);
    }

    getBurgerMenuItems(dialogState) {
        const actor = dialogState.actor;
        const effect = actor.effects.find(e => e.flags?.world?.storedElixir);
        if (!effect) return [];

        const encodedData = effect.getFlag("world", "storedElixir");
        const itemData = JSON.parse(decodeURIComponent(encodedData));
        
        const qs = itemData.type === "poison" ? (itemData.system?.step?.value || 1) : (itemData.system?.QL || 1);
        const qsLabel = itemData.type === "poison" ? game.i18n.localize("Spitattack.step") : game.i18n.localize("Spitattack.qs");

        return [
            {
                label: game.i18n.format("Spitattack.spitSubstance", { name: itemData.name }),
                icon: `<img src="${itemData.img}" style="width: 16px; height: 16px; border: none; margin-right: 5px;">`,
                onClick: async () => this.#onClick(dialogState, effect, itemData, qs, qsLabel),
            },
        ];
    }

    async #onClick(dialogState, effect, itemData, qs, qsLabel) {
        const attacker = dialogState.actor;

        const roll = new Roll("1d3");
        await roll.evaluate();
        if (game.dice3d) await game.dice3d.showForRoll(roll, game.user, true);

        const hpPath = "system.status.wounds.value";
        const currentHp = Number(foundry.utils.getProperty(attacker, hpPath)) || 0;
        await attacker.update({ [hpPath]: Math.max(0, currentHp - roll.total) });

        await ChatMessage.create({
            content: game.i18n.format("Spitattack.spitDamage", { name: attacker.name, damage: roll.total })
        });

        dialogState.source.effects = foundry.utils.deepClone(dialogState.source.effects);

        if (itemData.type === "poison") {
            const macroString = `
                const itemData = JSON.parse(decodeURIComponent("${encodeURIComponent(JSON.stringify(itemData))}"));
                const poisonItem = new CONFIG.Item.documentClass(itemData, { parent: actor });
                
                poisonItem.setupEffect().then(async (setupData) => {
                    if (setupData) {
                        await poisonItem.itemTest(setupData);
                    }
                });
            `;

            const poisonWrapper = {
                name: `${game.i18n.localize("Spitattack.poisonPrefix")}: ${itemData.name}`,
                img: itemData.img,
                system: {
                    advancedFunction: 2,
                    macroArgs: { macro: macroString }
                }
            };
            dialogState.source.effects.push(poisonWrapper);

        } else {
            if (itemData.effects && itemData.effects.length > 0) {
                const effectsToAdd = itemData.effects.map(e => {
                    let eff = foundry.utils.deepClone(e);
                    if (eff.system?.advancedFunction === 2 && eff.system?.macroArgs?.macro) {
                        eff.system.macroArgs.macro = eff.system.macroArgs.macro.replace(/\bqs\b/g, qs);
                    }
                    foundry.utils.setProperty(eff, "flags.dsa5.qs", qs);
                    return eff;
                });
                dialogState.source.effects.push(...effectsToAdd);
            }
        }

        const desc = dialogState.source.system.description.value;
        const spatWithLabel = game.i18n.localize("Spitattack.spatWith");
        
        dialogState.source.system.description.value = desc + `<br><br><b>${spatWithLabel}:</b> ${itemData.name} (${qsLabel} ${qs})`;

        await effect.setFlag("world", "spatOut", true);
        await effect.delete();

        if (!this.clickRollButton(dialogState)) {
            ui.notifications.warn(game.i18n.localize("Spitattack.rollFailWarn"));
        }
    }
}

const spitElixirBurgerMenu = new SpuckenElixierBurgerMenu();

Hooks.on('dsa5.getRollDialogContextOptions', (dialogState, menuItems) => {
    if (!spitElixirBurgerMenu.matches(dialogState)) return;
    menuItems.push(...spitElixirBurgerMenu.getBurgerMenuItems(dialogState));
});
