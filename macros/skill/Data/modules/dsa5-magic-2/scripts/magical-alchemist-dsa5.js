import DSA5_Utility from '/systems/dsa5/modules/system/helpers/utility-dsa5.js';

export default class MagicalAlchemistDSA5 {
    static async handleMagicalAlchemist(message) {
        const data = message.flags.data;
        const actor = DSA5_Utility.getSpeaker(message.speaker) || (message.speaker?.actor ? game.actors.get(message.speaker.actor) : null);
        const roll = this._getRollFromMessage(message);
        if (!roll || !actor) return;

        const level = data.postData.successLevel;
        if (level === -2) return this._rescueBotch(message, actor);
        if (level > 0) return this.renderAlchemistDialog(message, actor, roll);
    }

    static async renderAlchemistDialog(message, actor, roll) {
        const data = message.flags.data;
        const postData = data.postData;
        const preData = data.preData; 
        const source = (postData.source && postData.source.system) ? postData.source : preData.source;
        const chars = [source.system.characteristic1.value, source.system.characteristic2.value, source.system.characteristic3.value];
        
        const dialogData = {
            description: game.i18n.localize("MAGICAL_ALCHEMIST.descriptionAlchemist"),
            currentAsP: actor.system.status.astralenergy.value,
            result: postData.result,
            qualityStep: postData.qualityStep,
            dice: roll.terms.filter(t => t.faces === 20).map((t, i) => ({
                index: i,
                value: t.results[0].result,
                attr: chars[i].toLowerCase(),
                cssClass: t.results[0].result <= postData.characteristics[i].tar ? "suc" : "fail",
                tooltip: `${game.i18n.localize("CHAR." + chars[i].toUpperCase())} vs ${postData.characteristics[i].tar}`
            }))
        };

        const content = await renderTemplate("modules/dsa5-magic-2/templates/magical-alchemist-dialog.hbs", dialogData);
        new Dialog({
            title: game.i18n.localize("MAGICAL_ALCHEMIST.alchemistName"),
            content,
            buttons: {
                confirm: { label: game.i18n.localize("MAGICAL_ALCHEMIST.confirm"), callback: (html) => this._applyChanges(html, message, actor, roll) },
                cancel: { label: game.i18n.localize("MAGICAL_ALCHEMIST.cancel") }
            },
            render: (html) => this._activateListeners(html, postData, roll)
        }).render(true);
    }

    static _activateListeners(html, postData, roll) {
        html.find('.item').click(ev => {
            const tab = $(ev.currentTarget).data('tab');
            html.find('.item').removeClass('active');
            $(ev.currentTarget).addClass('active');
            html.find('.improve-controls, .add-fp-controls').hide();
            if(tab === 'addFP') html.find('.add-fp-controls').show();
            else if (tab === 'improve') html.find('.improve-controls').show();

			html.find('.dieButton').removeClass('reroll-selected');
            html.find('.reroll-checkbox').prop('checked', false);

            const d20s = roll.terms.filter(t => t.faces === 20);
            html.find('.die-group').each((i, el) => {
                const originalVal = d20s[i].results[0].result;
                const target = postData.characteristics[i].tar;
                const dieSpan = $(el).find('.dieButton span');
                
                dieSpan.text(originalVal);
                dieSpan.removeClass('fail suc').addClass(originalVal <= target ? 'suc' : 'fail');
            });

            this._updatePreview(html, postData, tab, roll);
        });

        html.find('.dieButton').click(ev => {
            if (html.find('.item.active').data('tab') !== 'reroll') return;
            $(ev.currentTarget).toggleClass('reroll-selected');
            const checkbox = html.find(`.reroll-checkbox[data-index="${$(ev.currentTarget).data('index')}"]`);
            checkbox.prop('checked', !checkbox.prop('checked'));
            this._updatePreview(html, postData, 'reroll', roll);
        });

        html.find('.fp-input').on('change keyup', () => this._updatePreview(html, postData, 'addFP', roll));

         html.find('.improve-btn').click(ev => {
            const group = $(ev.currentTarget).closest('.die-group');
            const index = group.data('index');
            const dieSpan = group.find('.dieButton span');
            let val = parseInt(dieSpan.text());
            const original = roll.terms.filter(t => t.faces === 20)[index].results[0].result;

            let anotherDieModified = false;
            html.find('.die-group').each((i, el) => {
                if (i !== index) {
                    const currentVal = parseInt($(el).find('.dieButton span').text());
                    const originalVal = roll.terms.filter(t => t.faces === 20)[i].results[0].result;
                    if (currentVal < originalVal) anotherDieModified = true;
                }
            });

            if (anotherDieModified && $(ev.currentTarget).hasClass('down') && val === original) return;

            if ($(ev.currentTarget).hasClass('up') && val < original) val++;
            else if ($(ev.currentTarget).hasClass('down') && val > 1) val--;
            
            dieSpan.text(val);
            dieSpan.removeClass('fail suc').addClass(val <= postData.characteristics[index].tar ? 'suc' : 'fail');
            this._updatePreview(html, postData, 'improve', roll);
        });
    }

    static _updatePreview(html, postData, mode, roll) {
        let cost = 0, modifiedFW = postData.result;
        if (mode === 'reroll') {
            if (html.find('.reroll-checkbox:checked').length > 0) cost = 4;
        } else if (mode === 'addFP') {
            let added = Math.min(parseInt(html.find('.fp-input').val()) || 0, 18 - postData.result);
            html.find('.fp-input').val(added);
            cost = added * 5; modifiedFW += added;
        } else if (mode === 'improve') {
            let diffTotal = 0, savedPoints = 0;
            const d20s = roll.terms.filter(t => t.faces === 20);
            html.find('.die-group').each((i, el) => {
                const current = parseInt($(el).find('.dieButton span').text());
                const original = d20s[i].results[0].result;
                const target = postData.characteristics[i].tar;
                if (original > current) {
                    diffTotal += (original - current);
                    savedPoints += (Math.max(0, original - target) - Math.max(0, current - target));
                }
            });
            cost = diffTotal * 2; modifiedFW += savedPoints;
        }
        html.find('.asp-cost').text(cost);
        html.find('.fw-preview').text(modifiedFW);
        html.find('.qs-preview').text(Math.max(1, Math.min(6, Math.ceil(modifiedFW / 3))));
    }

    static async _applyChanges(html, message, actor, originalRoll) {
        const mode = html.find('.item.active').data('tab');
        const cost = parseInt(html.find('.asp-cost').text());
        if (actor.system.status.astralenergy.value < cost) return ui.notifications.warn(game.i18n.localize("MAGICAL_ALCHEMIST.notEnoughAsP"));
        
        await actor.update({"system.status.astralenergy.value": actor.system.status.astralenergy.value - cost});
        const data = foundry.utils.duplicate(message.flags.data);
        let roll = Roll.fromData(originalRoll.toJSON());
        const d20s = roll.terms.filter(t => t.faces === 20);

        if (mode === 'reroll') {
            const indices = html.find('.reroll-checkbox:checked').map((i, el) => $(el).data('index')).get();
            for(let idx of indices) d20s[idx].results[0].result = (await new Roll("1d20").evaluate()).total;
        } else if (mode === 'addFP') {
            if (!data.preData.situationalModifiers) data.preData.situationalModifiers = [];
            data.preData.situationalModifiers.push({ name: game.i18n.localize("MAGICAL_ALCHEMIST.addFP"), value: parseInt(html.find('.fp-input').val()) || 0, type: "FP" });
        } else if (mode === 'improve') {
            html.find('.die-group').each((i, el) => { d20s[i].results[0].result = parseInt($(el).find('.dieButton span').text()); });
        }
        
        data.preData.roll = roll;
        const DiceDSA5 = (await import('/systems/dsa5/modules/system/rolls/dice-dsa5.js')).default;
        await actor[data.postData.postFunction]({ testData: data.preData, cardOptions: data }, { rerenderMessage: message });
        await message.update({"flags.dsa5.magicalAlchemistUsed": true});
    }

    static async _rescueBotch(message, actor) {
        const cost = 10;
        if (actor.system.status.astralenergy.value < cost) return ui.notifications.warn(game.i18n.localize("MAGICAL_ALCHEMIST.notEnoughAsP"));
        
        new Dialog({
            title: game.i18n.localize("MAGICAL_ALCHEMIST.alchemistName"),
            content: `<p>${game.i18n.localize("MAGICAL_ALCHEMIST.botchRescue")}</p>`,
            buttons: {
                yes: {
                    label: game.i18n.localize("MAGICAL_ALCHEMIST.confirm"),
                    callback: async () => {
                        await actor.update({"system.status.astralenergy.value": actor.system.status.astralenergy.value - cost});
                        const failureLabel = game.i18n.localize("Failure");
                        const updateData = {
                            "flags.data.postData.successLevel": -1,
                            "flags.data.postData.description": failureLabel,
                            "flags.dsa5.magicalAlchemistUsed": true,
                            "content": message.content.replace(/Patzer|Botch/g, failureLabel)
                        };
                        await message.update(updateData);
                    }
                },
                cancel: { label: game.i18n.localize("MAGICAL_ALCHEMIST.cancel") }
            }
        }).render(true);
    }

    static _getRollFromMessage(message) {
        const d = message.flags.data;
        const r = d.postData?.roll || d.preData?.roll;
        return r instanceof Roll ? r : Roll.fromData(r);
    }
}
