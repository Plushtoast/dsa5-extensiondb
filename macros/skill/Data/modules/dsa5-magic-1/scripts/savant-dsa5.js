import DSA5_Utility from '/systems/dsa5/modules/system/helpers/utility-dsa5.js';

const { ApplicationV2, DialogV2 } = foundry.applications.api;

class SavantApp extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
        id: "savant-app",
        classes: ["dsa5"],
        window: { resizable: true },
        position: { width: 450, height: "auto" },
        actions: {
            switchTab: function(e, t) { this._onSwitchTab(e, t); },
            toggleDie: function(e, t) { this._onToggleDie(e, t); },
            adjustDie: function(e, t) { this._onAdjustDie(e, t); },
            adjustFP: function(e, t) { this._onAdjustFP(e, t); },
            confirm: function() { this._onConfirm(); },
            cancel: function() { this.close(); }
        }
    };

    constructor(message, actor, roll, options) {
        super(options);
        this.message = message;
        this.dsaActor = actor;
        this.originalRoll = roll;
        
        this.data = message.flags.data;
        this.postData = this.data.postData;
        this.preData = this.data.preData;
        this.source = this.postData.source?.system ? this.postData.source : this.preData.source;
        this.chars = [this.source.system.characteristic1.value, this.source.system.characteristic2.value, this.source.system.characteristic3.value];
        this.d20s = roll.terms.filter(t => t.faces === 20);
        
        this.activeTab = 'reroll';
        this.selectedForReroll = new Set();
        this.addedFP = 0;
        this.improvedDice = this.d20s.map(t => t.results[0].result);
    }

    get title() {
        return game.i18n.localize("SAVANT.name");
    }

    async _renderHTML(context, options) {
        return await renderTemplate("modules/dsa5-magic-1/templates/savant-dialog.hbs", context);
    }

    _replaceHTML(result, content, options) {
        content.innerHTML = result;
    }

    async _prepareContext(options) {
        let cost = 0;
        let previewFW = this.postData.result;
        
        if (this.activeTab === 'reroll') {
            if (this.selectedForReroll.size > 0) cost = 4;
        } else if (this.activeTab === 'addFP') {
            cost = this.addedFP * 5;
            previewFW += this.addedFP;
        } else if (this.activeTab === 'improve') {
            let diffTotal = 0;
            let savedPoints = 0;
            this.improvedDice.forEach((current, i) => {
                const original = this.d20s[i].results[0].result;
                const target = this.postData.characteristics[i].tar;
                if (original > current) {
                    diffTotal += (original - current);
                    savedPoints += (Math.max(0, original - target) - Math.max(0, current - target));
                }
            });
            cost = diffTotal * 2;
            previewFW += savedPoints;
        }

        const previewQS = Math.max(1, Math.min(6, Math.ceil(previewFW / 3)));

        const dice = this.d20s.map((t, i) => {
            const originalVal = t.results[0].result;
            const currentVal = this.activeTab === 'improve' ? this.improvedDice[i] : originalVal;
            const target = this.postData.characteristics[i].tar;
            return {
                index: i,
                currentValue: currentVal,
                attr: this.chars[i].toLowerCase(),
                cssClass: currentVal <= target ? "suc" : "fail",
                tooltip: `${game.i18n.localize("CHAR." + this.chars[i].toUpperCase())} vs ${target}`,
                selected: this.activeTab === 'reroll' && this.selectedForReroll.has(i)
            };
        });

        return {
            description: game.i18n.localize("SAVANT.descriptionSavant"),
            activeTab: this.activeTab,
            isRerollTab: this.activeTab === 'reroll',
            isImproveTab: this.activeTab === 'improve',
            isAddFPTab: this.activeTab === 'addFP',
            dice: dice,
            addedFP: this.addedFP,
            previewFW: previewFW,
            previewQS: previewQS,
            cost: cost,
            currentAsP: this.dsaActor.system.status.astralenergy.value
        };
    }

    
    _onSwitchTab(event, target) {
        this.activeTab = target.dataset.tab;
        this.selectedForReroll.clear();
        this.addedFP = 0;
        this.improvedDice = this.d20s.map(t => t.results[0].result);
        this.render();
    }

    _onToggleDie(event, target) {
        if (this.activeTab !== 'reroll') return;
        const idx = parseInt(target.closest('[data-index]').dataset.index);
        if (this.selectedForReroll.has(idx)) this.selectedForReroll.delete(idx);
        else this.selectedForReroll.add(idx);
        this.render();
    }

    _onAdjustDie(event, target) {
        if (this.activeTab !== 'improve') return;
        const idx = parseInt(target.closest('[data-index]').dataset.index);
        const delta = parseInt(target.closest('[data-delta]').dataset.delta);
        
        const original = this.d20s[idx].results[0].result;
        let val = this.improvedDice[idx];

        let anotherDieModified = this.improvedDice.some((v, i) => i !== idx && v < this.d20s[i].results[0].result);

        if (anotherDieModified && delta === -1 && val === original) return;

        if (delta === 1 && val < original) val++;
        else if (delta === -1 && val > 1) val--;

        this.improvedDice[idx] = val;
        this.render();
    }

    _onAdjustFP(event, target) {
        if (this.activeTab !== 'addFP') return;
        const delta = parseInt(target.closest('[data-delta]').dataset.delta);
        const max = 18 - this.postData.result; 
        
        let val = this.addedFP + delta;
        this.addedFP = Math.min(Math.max(0, val), max);
        this.render();
    }

    async _onConfirm() {
        let cost = 0;
        if (this.activeTab === 'reroll' && this.selectedForReroll.size > 0) cost = 4;
        else if (this.activeTab === 'addFP') cost = this.addedFP * 5;
        else if (this.activeTab === 'improve') {
            let diffTotal = 0;
            this.improvedDice.forEach((current, i) => {
                const original = this.d20s[i].results[0].result;
                if (original > current) diffTotal += (original - current);
            });
            cost = diffTotal * 2;
        }

        if (this.dsaActor.system.status.astralenergy.value < cost) {
            return ui.notifications.warn(game.i18n.localize("SAVANT.notEnoughAsP"));
        }
        
        await this.dsaActor.update({"system.status.astralenergy.value": this.dsaActor.system.status.astralenergy.value - cost});
        
        const data = foundry.utils.duplicate(this.message.flags.data);
        let roll = Roll.fromData(this.originalRoll.toJSON());
        const d20s = roll.terms.filter(t => t.faces === 20);

        if (this.activeTab === 'reroll') {
            const rollFormulas = [];
            for (let i = 0; i < this.selectedForReroll.size; i++) {
                rollFormulas.push("1d20");
            }
            
            if (rollFormulas.length > 0) {
                const reroll = await new Roll(rollFormulas.join(" + ")).evaluate();
                
                if (game.dice3d) {
                    await game.dice3d.showForRoll(reroll, game.user, true);
                }
                
                let resultIdx = 0;
                for (let idx of this.selectedForReroll) {
                    d20s[idx].results[0].result = reroll.terms[resultIdx * 2].results[0].result;
                    resultIdx++;
                }
            }
        } else if (this.activeTab === 'addFP') {
            if (!data.preData.situationalModifiers) data.preData.situationalModifiers = [];
            data.preData.situationalModifiers.push({ 
                name: game.i18n.localize("SAVANT.addFP"), 
                value: this.addedFP, 
                type: "FP" 
            });
        } else if (this.activeTab === 'improve') {
            this.improvedDice.forEach((val, i) => {
                d20s[i].results[0].result = val;
            });
        }
        
        data.preData.roll = roll;
        const DiceDSA5 = (await import('/systems/dsa5/modules/system/rolls/dice-dsa5.js')).default;
        await this.dsaActor[data.postData.postFunction]({ testData: data.preData, cardOptions: data }, { rerenderMessage: this.message });
        await this.message.update({"flags.dsa5.savantUsed": true});

        this.close();
    }
}

export default class SavantDSA5 {
    static async handleSavant(message) {
        const data = message.flags.data;
        const actor = DSA5_Utility.getSpeaker(message.speaker) || (message.speaker?.actor ? game.actors.get(message.speaker.actor) : null);
        const roll = this._getRollFromMessage(message);
        if (!roll || !actor) return;

        if (data.postData.successLevel === -2) return this._rescueBotch(message, actor);
        if (data.postData.successLevel > 0) return this.renderSavantDialog(message, actor, roll);
    }

    static async renderSavantDialog(message, actor, roll) {
        new SavantApp(message, actor, roll).render(true);
    }

    static async _rescueBotch(message, actor) {
        const cost = 10;
        if (actor.system.status.astralenergy.value < cost) {
            return ui.notifications.warn(game.i18n.localize("SAVANT.notEnoughAsP"));
        }
        
        const confirmed = await DialogV2.confirm({
            window: { title: game.i18n.localize("SAVANT.name") },
            content: `<p>${game.i18n.localize("SAVANT.botchRescue")}</p>`,
            modal: true
        });

        if (confirmed) {
            await actor.update({"system.status.astralenergy.value": actor.system.status.astralenergy.value - cost});
            const failureLabel = game.i18n.localize("Failure");
            const updateData = {
                "flags.data.postData.successLevel": -1,
                "flags.data.postData.description": failureLabel,
                "flags.dsa5.savantUsed": true,
                "content": message.content.replace(/Patzer|Botch/g, failureLabel)
            };
            await message.update(updateData);
        }
    }

    static _getRollFromMessage(message) {
        const r = message.flags.data.postData?.roll || message.flags.data.preData?.roll;
        return r instanceof Roll ? r : Roll.fromData(r);
    }
}
