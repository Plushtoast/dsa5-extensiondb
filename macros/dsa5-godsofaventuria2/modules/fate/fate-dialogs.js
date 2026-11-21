import { DSA5GodsMenuConfig } from './config.js';

const { renderTemplate } = foundry.applications.handlebars;
const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

function bindClampedInputs(root, selector, defaultMax = 20) {
    root.querySelectorAll(selector).forEach((input) => {
        input.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            const max = parseInt(e.target.max, 10) || defaultMax;
            if (val > max) e.target.value = max;
            if (val < 1) e.target.value = 1;
        });
        input.addEventListener('blur', (e) => {
            if (!e.target.value) e.target.value = 1;
        });
    });
}

// Dialog zum Tauschen der Schip-Kosten (Flexibel-Effekt - bei den Spezialwürfeln)
export async function promptSchipSwap(actor, selectedSpecialKey, isGod) {
    const optionsData = [{ value: `special_${selectedSpecialKey}`, label: _loc('GodsMenu.FateTab.SwapSchipKeep', { name: selectedSpecialKey }) }];

    const personal = actor.system.status.fatePoints.value || 0;
    if (personal > 0) optionsData.push({ value: 'personal', label: _loc('GodsMenu.FateTab.SwapSchipPersonal', { amount: personal }) });

    const { current: group } = DSA5GodsMenuConfig.getSchipSetting('groupschips');
    if (group > 0) optionsData.push({ value: 'group', label: _loc('GodsMenu.FateTab.SwapSchipGroup', { amount: group }) });

    const specialObj = foundry.utils.getProperty(actor, 'flags.dsa5.specialPoints');
    if (specialObj) {
        for (const [k, sData] of Object.entries(specialObj)) {
            if (k !== selectedSpecialKey && (sData?.current || 0) > 0) {
                const name = DSA5GodsMenuConfig.schipName(k);
                optionsData.push({ value: `special_${k}`, label: _loc('GodsMenu.FateTab.SwapSchipSpecial', { name, amount: sData.current }) });
            }
        }
    }

    const symbol = _loc(isGod ? 'GodsMenu.GodSymbol' : 'GodsMenu.DemonSymbol');
    const content = await renderTemplate(DSA5GodsMenuConfig.templatePath('fate/swap-schip-dialog.hbs'), {
        promptText: _loc('GodsMenu.FateTab.SwapSchipPrompt', { symbol }),
        options: optionsData,
    });

    return DialogV2.wait({
        window: { title: 'GodsMenu.FateTab.SwapSchipTitle', resizable: true },
        classes: ['dsa5'],
        position: { width: 420, height: 'auto' },
        content,
        rejectClose: false,
        buttons: [
            {
                action: 'ok',
                icon: 'fa-solid fa-check',
                label: 'GodsMenu.FateTab.SwapSchipConfirm',
                default: true,
                callback: (event, button, dialogApp) => {
                    const val = dialogApp.element.querySelector('#swap-schip-select').value;
                    if (val === 'personal' || val === 'group') return { pool: val, key: null };
                    return { pool: 'special', key: val.replace('special_', '') };
                },
            },
            {
                action: 'cancel',
                icon: 'fa-solid fa-times',
                label: 'cancel',
                callback: () => null,
            },
        ],
    });
}

// Dialog zum manuellen Abbau von Zustandsstufen (Erzdämonen)
export async function promptManualConditions(actor, availableConditions, maxLevels = 3) {
    const conditionsData = availableConditions.map((c) => ({
        id: c.id,
        img: c.img,
        name: c.name,
        max: Math.min(maxLevels, c.value),
        hintText: _loc('GodsMenu.FateTab.ConditionCurrentLevel', { val: c.value }),
        tooltipText: _loc('GodsMenu.FateTab.ConditionTooltip', { val: c.value, name: c.name }),
    }));

    const contentHtml = await renderTemplate(DSA5GodsMenuConfig.templatePath('fate/manual-conditions-dialog.hbs'), {
        descText: _loc('GodsMenu.FateTab.DemonConditionDesc', { name: actor.name }),
        conditions: conditionsData,
    });

    class DemonCondDialog extends DialogV2 {
        constructor(config) {
            super(config);
            this.totalSelected = 0;
        }

        _onRender(context, options) {
            super._onRender(context, options);
            const html = this.element;

            html.querySelectorAll('.decreaseEffect').forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    const span = html.querySelector(`.cond-val[data-id="${e.currentTarget.dataset.id}"]`);
                    const val = parseInt(span.innerText, 10);
                    if (val > 0) {
                        span.innerText = val - 1;
                        this.totalSelected--;
                    }
                });
            });

            html.querySelectorAll('.increaseEffect').forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    const { id, max } = e.currentTarget.dataset;
                    const span = html.querySelector(`.cond-val[data-id="${id}"]`);
                    const val = parseInt(span.innerText, 10);
                    if (val < parseInt(max, 10) && this.totalSelected < maxLevels) {
                        span.innerText = val + 1;
                        this.totalSelected++;
                    } else if (this.totalSelected >= maxLevels) {
                        ui.notifications.warn(_loc('GodsMenu.FateTab.DemonConditionMaxWarn'));
                    }
                });
            });
        }
    }

    return DemonCondDialog.wait({
        window: { title: 'GodsMenu.FateTab.DemonConditionTitle' },
        content: contentHtml,
        position: { width: 420 },
        rejectClose: false,
        buttons: [
            {
                action: 'ok',
                label: 'GodsMenu.FateTab.DemonConditionRemoveBtn',
                icon: 'fa-solid fa-check',
                callback: (event, button, dialogApp) => {
                    const reductions = {};
                    dialogApp.element.querySelectorAll('.cond-val').forEach((span) => {
                        const val = parseInt(span.innerText, 10);
                        if (val > 0) reductions[span.dataset.id] = val;
                    });
                    return reductions;
                },
            },
            {
                action: 'cancel',
                label: 'cancel',
                icon: 'fa-solid fa-times',
                callback: () => null,
            },
        ],
    });
}

// Dialog für den Aves-Münzwurf (SL-Willkür)
export async function promptAvesCheat() {
    return DialogV2.wait({
        window: { title: 'GodsMenu.FateTab.AvesCheatTitle', resizable: false },
        classes: ['dsa5'],
        content: `<p class="gods-aves-cheat-prompt">${_loc('GodsMenu.FateTab.AvesCheatPrompt')}</p>`,
        position: { width: 400, height: 'auto' },
        rejectClose: false,
        buttons: [
            { action: 'success', label: 'GodsMenu.FateTab.AvesCheatSuccess', icon: 'fa-solid fa-check', callback: () => 1 },
            { action: 'failure', label: 'GodsMenu.FateTab.AvesCheatFailure', icon: 'fa-solid fa-times', callback: () => 2 },
        ],
    });
}

// Dialog für den zweiten Schadenswurf bei Aves-Glück (max. 1 Würfel)
export async function promptAvesDamageReroll(damageDice) {
    const preselectSingle = damageDice.length === 1;
    const diceHtml = damageDice.map((d) => `
        <a class="dieButton ${preselectSingle ? 'dieSelected' : ''}" data-index="${d.index}">
            <span data-tooltip="${d.tooltip}" class="display-toggle fail die-damage d${d.faces}">${d.currentValue}</span>
        </a>
    `).join('');

    const content = `
        <div class="dialog-content standard-form">
            <h4 class="center">${_loc('GodsMenu.FateTab.RerollDamage')}</h4>
            <div class="card-content hide-option roll-result center flexrow flexAlignCenter dsamt-4">
                ${diceHtml}
            </div>
        </div>
    `;

    class AvesDamageRerollDialog extends DialogV2 {
        _onRender(context, options) {
            super._onRender(context, options);
            this.element.querySelectorAll('.dieButton[data-index]').forEach((el) => {
                el.addEventListener('click', (ev) => {
                    const btn = ev.currentTarget;
                    const wasSelected = btn.classList.contains('dieSelected');
                    this.element.querySelectorAll('.dieButton.dieSelected').forEach((other) => other.classList.remove('dieSelected'));
                    if (!wasSelected) btn.classList.add('dieSelected');
                });
            });
        }
    }

    return AvesDamageRerollDialog.wait({
        window: { title: `${_loc('GodsMenu.FateTab.AvesHeadTitle')} – ${_loc('GodsMenu.FateTab.RerollDamage')}` },
        classes: ['dsa5'],
        content,
        rejectClose: false,
        buttons: [
            {
                action: 'yes',
                icon: 'fa-solid fa-check',
                label: 'ok',
                callback: (ev, btn, app) => {
                    const selected = app.element.querySelector('.dieButton.dieSelected');
                    return selected ? Number(selected.dataset.index) : null;
                },
            },
            {
                action: 'cancel',
                icon: 'fa-solid fa-times',
                label: 'cancel',
                callback: () => null,
            },
        ],
    });
}

// Öffnet den Dialog zur SL-Willkür (Reroll von W20 oder W6)
export async function promptRerollCheat(diceData) {
    const contentHtml = await renderTemplate(DSA5GodsMenuConfig.templatePath('fate/rerollCheat-dialog.hbs'), {
        dice: diceData,
    });

    class RerollCheatDialog extends DialogV2 {
        _onRender(context, options) {
            super._onRender(context, options);
            bindClampedInputs(this.element, 'input.cheat-value', 20);
        }
    }

    return RerollCheatDialog.wait({
        window: { title: 'GodsMenu.FateTab.Reroll', resizable: true },
        classes: ['dsa5', 'gods-cheat-dialog'],
        content: contentHtml,
        position: { width: 400, height: 'auto' },
        rejectClose: false,
        buttons: [
            {
                action: 'ok',
                label: 'ok',
                icon: 'fa-solid fa-check',
                class: 'dsadesignbutton',
                callback: (event, button, dialogApp) => Array.from(
                    dialogApp.element.querySelectorAll('input.cheat-value'),
                    (input) => parseInt(input.value, 10),
                ),
            },
            {
                action: 'cancel',
                label: 'cancel',
                icon: 'fa-solid fa-times',
                class: 'dsadesignbutton',
                callback: () => null,
            },
        ],
    });
}

// Öffnet den Dialog zur SL-Willkür (2W6 Götter-/Dämonenwurf)
export async function promptSpecialRollCheat(title, icon1, tooltip1, icon2, tooltip2) {
    const defaultD1 = Math.floor(Math.random() * 6) + 1;
    const defaultD2 = Math.floor(Math.random() * 6) + 1;

    const contentHtml = await renderTemplate(DSA5GodsMenuConfig.templatePath('fate/specialRollCheat-dialog.hbs'), {
        title,
        icon1,
        tooltip1,
        icon2,
        tooltip2,
    });

    class SpecialCheatDialog extends DialogV2 {
        _onRender(context, options) {
            super._onRender(context, options);
            this.element.querySelector('#special-cheat-d1').value = defaultD1;
            this.element.querySelector('#special-cheat-d2').value = defaultD2;
            bindClampedInputs(this.element, 'input[type="number"]', 6);
        }
    }

    return SpecialCheatDialog.wait({
        window: { title: 'DIALOG.cheat', resizable: true },
        classes: ['dsa5', 'gods-cheat-dialog'],
        content: contentHtml,
        position: { width: 500, height: 'auto' },
        rejectClose: false,
        buttons: [
            {
                action: 'ok',
                label: 'ok',
                icon: 'fa-solid fa-check',
                class: 'dsadesignbutton',
                callback: (event, button, dialogApp) => ({
                    d1: Math.clamp(parseInt(dialogApp.element.querySelector('#special-cheat-d1').value, 10), 1, 6),
                    d2: Math.clamp(parseInt(dialogApp.element.querySelector('#special-cheat-d2').value, 10), 1, 6),
                }),
            },
            {
                action: 'cancel',
                label: 'cancel',
                icon: 'fa-solid fa-times',
                class: 'dsadesignbutton',
                callback: () => null,
            },
        ],
    });
}

// Dialog zum Verteilen von Regenerationsboni auf Gefährten (Mada / Travia)
class RegenDistributionDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: 'gods-regen-distribution-app',
        classes: ['dsa5'],
        window: { resizable: true, contentClasses: ['standard-form'] },
        position: { width: 460, height: 'auto' },
        actions: {
            adjustAmount: this.#onAdjustAmount,
            confirm: this.#onConfirm,
        },
    };

    static PARTS = {
        main: { template: DSA5GodsMenuConfig.templatePath('fate/regen-distribution-dialog.hbs') },
    };

    constructor({ key, cfg, companions, resolve }, options = {}) {
        super(options);
        this.key = key;
        this.cfg = cfg;
        this.companions = companions;
        this._resolve = resolve;
        this._settled = false;
        this.allocations = Object.fromEntries(companions.map((a) => [a.id, 0]));
    }

    get title() {
        return `${DSA5GodsMenuConfig.schipName(this.key)}-Schip`;
    }

    #totalAllocated(excludeId = null) {
        return Object.entries(this.allocations).reduce(
            (sum, [id, val]) => sum + (id === excludeId ? 0 : val),
            0,
        );
    }

    #clampAllocation(actorId, rawValue) {
        const maxAllowed = Math.min(this.cfg.maxPerTarget, this.cfg.maxTotal - this.#totalAllocated(actorId));
        this.allocations[actorId] = Math.clamp(Math.trunc(Number(rawValue) || 0), 0, maxAllowed);
    }

    async _prepareContext() {
        const totalAllocated = this.#totalAllocated();
        const remaining = this.cfg.maxTotal - totalAllocated;
        const targets = this.companions.map((actor) => {
            const amount = this.allocations[actor.id] || 0;
            const maxAllowed = Math.min(this.cfg.maxPerTarget, remaining + amount);
            return {
                id: actor.id,
                name: actor.name,
                img: actor.img,
                amount,
                maxAllowed,
                atMin: amount <= 0,
                atMax: amount >= maxAllowed,
            };
        });

        return {
            description: DSA5GodsMenuConfig.schipDescription(this.key),
            resource: this.cfg.resource,
            maxTotal: this.cfg.maxTotal,
            remaining,
            canConfirm: totalAllocated > 0,
            targets,
        };
    }

    async _onRender(context, options) {
        await super._onRender(context, options);
        for (const inp of this.element.querySelectorAll('.fg-cost-input')) {
            inp.addEventListener('change', () => this.#onManualInput(inp));
            inp.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') {
                    ev.preventDefault();
                    this.#onManualInput(inp);
                }
            });
        }
    }

    #onManualInput(input) {
        this.#clampAllocation(input.dataset.actorId, input.value);
        this.render();
    }

    static #onAdjustAmount(event, target) {
        const actorId = target.dataset.actorId;
        const delta = target.dataset.dir === 'left' ? -1 : 1;
        this.#clampAllocation(actorId, (this.allocations[actorId] || 0) + delta);
        this.render();
    }

    static async #onConfirm() {
        const result = this.companions
            .map((actor) => ({ actorId: actor.id, name: actor.name, amount: this.allocations[actor.id] || 0 }))
            .filter((entry) => entry.amount > 0);
        if (!result.length) return;

        this._settled = true;
        this._resolve(result);
        this.close();
    }

    async _onClose(options) {
        if (!this._settled) {
            this._settled = true;
            this._resolve(null);
        }
        return super._onClose(options);
    }
}

export function promptRegenDistribution({ key, cfg, companions }) {
    return new Promise((resolve) => {
        new RegenDistributionDialog({ key, cfg, companions, resolve }).render(true);
    });
}
