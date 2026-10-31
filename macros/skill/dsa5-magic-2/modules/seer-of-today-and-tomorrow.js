Hooks.on('dsa5.getRollDialogContextOptions', (dialogState, menuItems) => {
    const { source, actor, dialog } = dialogState;
    if (!source || !["spell", "ritual"].includes(source.type) || !actor || !dialog || dialog._seerInjected) return;

    const uneigennuetzigName = _loc("LocalizedIDs.selfless");
    const hellsichtName = _loc("Features.Clairvoyance");
    const abilityName = _loc("LocalizedIDs.Seeroftodayandtomorrow"); 

    const ability = actor.items.find(i => i.name.includes(abilityName));
    if (!ability) return;

    if (source.system.feature?.includes(hellsichtName)) return;

    const targets = Array.from(game.user.targets);
    const isSelfTarget = targets.length === 0 || targets.some(t => t.actor?.id === actor.id);

    class SeerHelper extends game.dsa5.api.RollDialogBurgerMenuRule {
        constructor() { super({ abilityNameKey: 'dummy' }); }
    }
    
    const helper = new SeerHelper();
    const widget = helper.getSituationalModifiersWidget(dialog);

    if (widget) {
        helper.upsertModifier(dialog, {
            name: uneigennuetzigName,
            value: 2,
            selected: isSelfTarget,
            source: ability.name,
            type: "AsPCost"
        });

        widget.dispatchChange();
        dialog._seerInjected = true; 
    }
});
