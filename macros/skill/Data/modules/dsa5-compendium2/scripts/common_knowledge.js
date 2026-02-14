Hooks.on('dsa5.getRollDialogContextOptions', (dialogState, menuItems) => {
    const { actor, source, testData, formData, dialog } = dialogState;

    const sfName = game.i18n.localize('COMMON_KNOWLEDGE.abilityName');
    const menuLabel = game.i18n.localize('COMMON_KNOWLEDGE.menuLabel');
    
    // Prüfung auf Wissenstalent und Sonderfertigkeit
    if (source?.type !== 'skill' || source.system?.group?.value !== 'knowledge') return;

    const hasAbility = actor.items.some(item => 
        item.type === "specialability" && item.name.includes(sfName)
    );
    if (!hasAbility) return;

    // Erschwernis-Check (max -3)
    const difficultyMod = game.dsa5.config.skillDifficultyModifiers[formData.testDifficulty] || 0;
    const currentModifier = (Number(formData.modifier) || 0) + difficultyMod;
    if (currentModifier < -3) return;

    menuItems.push({
        name: menuLabel,
        icon: '<i class="fas fa-book"></i>',
        callback: async () => {
            // Routine-Logik mit überschriebenem Talentwert (FW 0 für QS 1)
            testData.routine = true;
            testData.opposable = false;
            testData.source.system.talentValue.value = 0; 
            testData.title = `${source.name} (${sfName})`;

            foundry.utils.mergeObject(testData.extra.options, {
                cheat: true,
                predefinedResult: [
                    { val: 2, index: 0 },
                    { val: 2, index: 1 },
                    { val: 2, index: 2 }
                ]
            });

            // Simulation des Klicks auf den echten Roll-Button
            const rollButton = $(dialog.element).find('button[data-action="nonOpposedButton"], button[data-action="rollButton"]').first();
            
            if (rollButton.length > 0) {
                rollButton.click();
            } else {
                $(dialog.element).find('form').submit();
            }

            setTimeout(() => dialog.close(), 100);
        }
    });
});
