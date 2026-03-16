window.GK_ACTIVE_ROLL = false;

Hooks.once('ready', () => {
    if (!game.dsa5) return;
    const originalRollTest = game.dsa5.apps.DiceDSA5.rollTest;

    game.dsa5.apps.DiceDSA5.rollTest = function(testData, ...args) {
        if (window.GK_ACTIVE_ROLL || (testData.extra && testData.extra.isCommonKnowledge)) {
            testData.routine = true;
            testData.fw = 0;
            if (testData.source?.system?.talentValue) {
                testData.source.system.talentValue.value = 0;
            }
            testData.modifier = 0;
            testData.testDifficulty = 0;
            testData.situationalModifiers = [];
            
            if (testData.extra?.skillModifiers) {
                testData.extra.skillModifiers.ql = 0;
                testData.extra.skillModifiers.step = 0;
            }
            window.GK_ACTIVE_ROLL = false;
        }
        return originalRollTest.apply(this, [testData, ...args]);
    };
});

Hooks.on('dsa5.getRollDialogContextOptions', (dialogState, menuItems) => {
    const { actor, source, testData, dialog } = dialogState;
    const sfName = game.i18n.localize('COMMON_KNOWLEDGE.abilityName');
    
    if (source?.type !== 'skill' || source.system?.group?.value !== 'knowledge') return;
    if (!actor.items.some(i => i.type === "specialability" && i.name.includes(sfName))) return;

    menuItems.push({
        name: game.i18n.localize('COMMON_KNOWLEDGE.menuLabel'),
        icon: '<i class="fa-solid fa-book-open"></i>',
        callback: async () => {
            const element = dialog.element[0] || dialog.element;
            
            const diffInput = element.querySelector('[name="testDifficulty"]');
            const diffKey = diffInput ? diffInput.value : null;
            const modBase = (diffKey && game.dsa5.config.skillDifficultyModifiers && game.dsa5.config.skillDifficultyModifiers[diffKey]) || 0;
            
            const manualInput = element.querySelector('[name="testModifier"]');
            const manualMod = manualInput ? (Number(manualInput.value) || 0) : 0;
            
            const visionInput = element.querySelector('[name="vision"]');
            const visionMod = visionInput ? (Number(visionInput.value) || 0) : 0;
            
            let situationalMod = 0;
            
            const selectedOptions = element.querySelectorAll('[name="situationalModifiers"] option:checked');
            selectedOptions.forEach(option => {
                const val = option.value;
                if (val && !val.includes('|')) {
                    situationalMod += (Number(val) || 0);
                }
            });

            if ((modBase + manualMod + visionMod + situationalMod) <= -3) {
                const warnText = game.i18n.has('COMMON_KNOWLEDGE.tooDifficult') 
                    ? game.i18n.localize('COMMON_KNOWLEDGE.tooDifficult') 
                    : "Die Probe ist zu schwer.";
                return ui.notifications.warn(warnText);
            }

            window.GK_ACTIVE_ROLL = true;
            if (!testData.extra) testData.extra = {};
            testData.extra.isCommonKnowledge = true;

            const rollButton = element.querySelector('button[data-action="nonOpposedButton"], button[data-action="rollButton"]');
            
            if (rollButton) {
                rollButton.click();
            } else {
                const form = element.querySelector('form');
                if (form) {
                    if (typeof form.requestSubmit === "function") {
                        form.requestSubmit();
                    } else {
                        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                    }
                }
            }

            setTimeout(() => dialog.close(), 50);
        }
    });
});
