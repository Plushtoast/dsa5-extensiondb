// Makro

if (!actor) {
    ui.notifications.error("Kein Akteur gefunden – bitte stelle sicher, dass der Wirseltrank von einem Charakter im Inventar benutzt wird.");
} else {
    const roll = await new Roll("1d3").roll();

    const current = actor.system.status.regeneration.LePTemp ?? 0;

    await actor.update({ "system.status.regeneration.LePTemp": current + roll.total });
    await actor.applyRegeneration(2, 0, 0);

    const condition = this.effectDummy(item.name, [], { seconds: 3600 })
    foundry.utils.mergeObject(condition, {
        flags: {
            dsa5: {
                hideOnToken: true,
                onRemove: 'const roll = await new Roll("1d3").roll();await actor.applyRegeneration(roll.total, 0, 0);'
            }
        }
    })
    await actor.addCondition(condition);
}
