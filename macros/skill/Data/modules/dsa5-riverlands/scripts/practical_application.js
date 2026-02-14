class PracticalApplicationDialog extends Dialog {
    constructor(actor, parentDialog, parentTestData) {
        super({
            title: game.i18n.localize('LOCAL.PraxisbezugTitle'),
            content: `<div id="praxis-wrapper"></div>`,
            buttons: {}
        });
        this.actor = actor;
        this.parentDialog = parentDialog;
        this.parentTestData = parentTestData;
        this.qs = 0;
        this.rolled = false;
        this.distributionData = [0, 0, 0];
        this.data.content = `<div id="praxis-wrapper">${this._getInitialHTML()}</div>`;
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            width: 500,
            classes: ["dsa5", "dialog", "praxis-window"],
            resizable: true
        });
    }

    _getInitialHTML() {
        let html = `<p>${game.i18n.localize("LOCAL.PraxisbezugDescription")}</p><hr>`;
        html += `<div class="form-group knowledge-buttons" style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">`;
        const skills = this.actor.items.filter(i => i.type === "skill" && i.system.group?.value === "knowledge").sort((a, b) => a.name.localeCompare(b.name));
        for (let skill of skills) {
            html += `<button class="knowledge-roll-btn dsa5 button" data-id="${skill.id}">${skill.name}</button>`;
        }
        html += `</div>`;
        return html;
    }

    _getDistributionHTML() {
        const source = this.parentTestData.source;
        const attrs = [source.system.characteristic1.value, source.system.characteristic2.value, source.system.characteristic3.value];
        let html = `<div style="text-align: center; margin-bottom: 10px;"><p>${game.i18n.format("LOCAL.PraxisbezugInstruction", {qs: this.qs})}</p></div>`;
        html += `<div style="display: flex; justify-content: space-around; margin: 15px 0;">`;
        attrs.forEach((attr, idx) => {
            const label = game.i18n.localize(`CHARAbbrev.${attr.toUpperCase()}`);
            html += `<div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
                <label style="font-weight: bold;">${label}</label>
                <a class="praxis-control" data-idx="${idx}" data-delta="1" style="cursor:pointer;"><i class="fas fa-chevron-up"></i></a>
                <input type="number" class="praxis-input" data-idx="${idx}" value="${this.distributionData[idx]}" readonly style="width: 45px; text-align: center; height: 30px; border: 1px solid #7a7971;">
                <a class="praxis-control" data-idx="${idx}" data-delta="-1" style="cursor:pointer;"><i class="fas fa-chevron-down"></i></a>
            </div>`;
        });
        html += `</div><hr><div style="display: flex; gap: 5px;">
            <button class="confirm-praxis dsa5 button" style="flex:1"><i class="fas fa-check"></i> ${game.i18n.localize("LOCAL.confirm")}</button>
            <button class="cancel-praxis dsa5 button" style="flex:1"><i class="fas fa-times"></i> ${game.i18n.localize("LOCAL.cancel")}</button>
        </div>`;
        return html;
    }

    activateListeners(html) {
        super.activateListeners(html);
        const wrapper = html.find('#praxis-wrapper');

        if (!this.rolled) {
            wrapper.html(this._getInitialHTML());
            html.find('.knowledge-roll-btn').click(async (ev) => {
                const skillId = ev.currentTarget.dataset.id;
                const skill = this.actor.items.get(skillId);
                Hooks.once("postProcessDSARoll", (chatOptions, testData) => {
                    const rolledId = testData.source?._id || testData.source?.id || testData.preData?.source?._id;
                    if (String(rolledId) === String(skillId) && testData.successLevel > 0) {
                        this.qs = testData.qualityStep || 0;
                        this.rolled = true;
                        this.data.content = `<div id="praxis-wrapper">${this._getDistributionHTML()}</div>`;
                        this.render(true);
                    } else if (String(rolledId) === String(skillId)) { this.close(); }
                });
                this.actor.setupSkill(skill, {}, "roll").then(setupData => { if(setupData) this.actor.basicTest(setupData); });
            });
        } else {
            wrapper.html(this._getDistributionHTML());
            html.find('.praxis-control').click((ev) => {
                const idx = $(ev.currentTarget).data('idx');
                const delta = $(ev.currentTarget).data('delta');
                let newVal = Math.clamp(this.distributionData[idx] + delta, 0, 2);
                let totalUsed = this.distributionData.reduce((a, b) => a + b, 0) - this.distributionData[idx];
                if (totalUsed + newVal <= this.qs || delta < 0) {
                    this.distributionData[idx] = newVal;
                    html.find(`.praxis-input[data-idx="${idx}"]`).val(newVal);
                }
            });
            html.find('.cancel-praxis').click(() => this.close());
            html.find('.confirm-praxis').click(() => this._applyBonuses());
        }
    }

    _applyBonuses() {
        const tpmValues = `${this.distributionData[0]}|${this.distributionData[1]}|${this.distributionData[2]}`;
        const label = `Praxisbezug [${tpmValues} TPM]`;
        const tooltip = `Praxisbezug<br>Teilprobenmodifikator: ${tpmValues}<br>Quelle: Sonderfertigkeit`;
        const select = $(this.parentDialog.element).find('select[name="situationalModifiers"]');

        if (select.length) {
            select.find('option').filter((i, el) => $(el).text().includes("Praxisbezug")).remove();
            const option = $('<option></option>')
                .val(tpmValues)
                .text(label)
                .prop('selected', true)
                .attr('data-type', 'TPM')
                .attr('data-tooltip', tooltip);

            select.append(option);
            select.trigger('change');
            $(this.parentDialog.element).find('form').trigger('change');
            this.close();
        }
    }
}

Hooks.on('dsa5.getRollDialogContextOptions', (dialogState, menuItems) => {
    const { actor, source, testData, dialog } = dialogState;
    if (source.system?.group?.value === 'knowledge' || source.type !== "skill") return;
    const sfName = game.i18n.localize('LOCAL.praxisbezugAbility');
    if (actor.items.some(i => i.type === "specialability" && i.name.includes(sfName))) {
        menuItems.push({
            name: sfName,
            icon: '<i class="fas fa-lightbulb"></i>',
            callback: () => new PracticalApplicationDialog(actor, dialog, testData).render(true)
        });
    }
});
