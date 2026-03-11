const WITCH_MAPPING = {
    "sisterhoodApe": ["spellAffenhaende", "spellAffenruf", "spellHarmloseGestalt", "spellKraftDesTiers"],
    "sisterhoodCat": ["spellGrosseGier", "spellHexenkrallen", "spellKatzenaugen", "spellKatzenruf"],
    "sisterhoodSpider": ["spellHexengalle", "spellKrabbelnderSchrecken", "spellSpinnenlauf", "spellSpinnenruf"],
    "sisterhoodSnake": ["spellGifthaut", "spellSchlangenruf", "spellSerpentialis", "spellVipernblick"],
    "sisterhoodSeer": ["spellHexenkrallen", "spellGefunden", "spellKraehenruf", "spellMadasSpiegel"],
    "sisterhoodToad": ["spellGifthaut", "spellHexenspeichel", "spellKroetensprung", "spellTiereBesprechen"],
    "sisterhoodOwl": ["spellEulenruf", "spellKatzenaugen", "spellKraftDesTiers", "spellHexenkrallen"]
};

Hooks.once('ready', () => {
    const DiceDSA5 = game.dsa5.apps.DiceDSA5;
    const tradName = game.i18n.localize('customWitchTradition'); // der übliche lang key hat bei mir warum auch immer nicht geklappt

    if (DiceDSA5 && DiceDSA5.calculateEnergyCost) {
        const originalCalculateEnergyCost = DiceDSA5.calculateEnergyCost;
        
        DiceDSA5.calculateEnergyCost = async function (isClerical, res, testData) {
            await originalCalculateEnergyCost.call(this, isClerical, res, testData);

            try {
                const actor = game.dsa5.apps.DSA5_Utility.getSpeaker(testData?.extra?.speaker);
                if (!actor || !actor.items.some(i => i.name === tradName)) return;

                const spellName = testData.source?.name;
                const actorImprints = actor.items.filter(i => i.type === "imprint").map(i => i.name);

                let totalReduction = 0;
                let foundSisterhoods = [];

                for (const [sKey, spellKeys] of Object.entries(WITCH_MAPPING)) {
                    const sNameLocalized = game.i18n.localize(sKey);
                    
                    if (actorImprints.includes(sNameLocalized)) {
                        const localizedSpells = spellKeys.map(k => game.i18n.localize(k));
                        
                        if (localizedSpells.includes(spellName)) {
                            totalReduction += 1;
                            foundSisterhoods.push(sNameLocalized);
                        }
                    }
                }

                if (totalReduction > 0) {
                    let mods = res.preData?.calculatedSpellModifiers;
                    if (mods && mods.finalcost > 1) {
                        mods.finalcost = Math.max(1, mods.finalcost - totalReduction);
                        
                        foundSisterhoods.forEach(sName => {
                            const line = `\n${sName} -1 AsP`;
                            if (!mods.description.includes(sName)) {
                                mods.description += line;
                            }
                        });

                        if (res.asp !== undefined) res.asp = mods.finalcost;
                    }
                }
            } catch (err) {}
        };
    }
});

Hooks.on('renderDSA5SpellDialog', (app, html, data) => {
    const dialogData = app.dialogData || data;
    if (!dialogData?.speaker) return;
    const actor = game.dsa5.apps.DSA5_Utility.getSpeaker(dialogData.speaker);
    const tradName = game.i18n.localize('customWitchTradition');
    if (!actor || !actor.items.some(i => i.name === tradName)) return;

    const $html = $(html);
    const spellName = dialogData.source?.name;
    const actorImprints = actor.items.filter(i => i.type === "imprint").map(i => i.name);

    let isPreferred = false;
    for (const [sKey, spellKeys] of Object.entries(WITCH_MAPPING)) {
        if (actorImprints.includes(game.i18n.localize(sKey))) {
            const localizedSpells = spellKeys.map(k => game.i18n.localize(k));
            if (localizedSpells.includes(spellName)) {
                isPreferred = true;
                break;
            }
        }
    }

    if (isPreferred) {
        const maxModsElement = $html.find('.maxMods');
        const newMax = (parseInt(maxModsElement.text()) || 0) + 1;
        maxModsElement.text(newMax);
    }

    const sitMods = $html.find('[name="situationalModifiers"]');
    const foreignName = game.i18n.localize('DSASETTINGS.enableForeignSpellModifer');
    const foreignOption = sitMods.find('option').filter(function() {
        return $(this).text().includes(foreignName) || $(this).text().includes("Fremdzauber");
    });

    if (foreignOption.length > 0) {
        const currentValue = parseInt(foreignOption.val()) || -2;
        const newValue = currentValue - 2;
        foreignOption.val(newValue.toString()); 
        const newText = foreignOption.text().replace(/\[-?\d+\s*\]/, `[${newValue} ]`);
        foreignOption.text(newText); 
        foreignOption.attr('data-tooltip', `${foreignName}<br>Modifikator: ${newValue}`);
        sitMods.trigger('change');
    }
});
