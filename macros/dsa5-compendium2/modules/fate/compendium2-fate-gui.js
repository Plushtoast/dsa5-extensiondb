import { FateRolls } from './dsa5-api.js';
import { buildCompendium2FateContext } from './compendium2-fate-context.js';
import { executeAddRegen, executeRerollRegen } from './compendium2-fate-actions.js';
import './compendium2-fate-chat-menu.js';

const { renderTemplate } = foundry.applications.handlebars;
const wrappedClasses = new WeakMap();

Hooks.once('setup', () => {
    Hooks.on('dsa5.getFateSpendApp', (registry) => {
        const BaseClass = registry.AppClass;
        if (!wrappedClasses.has(BaseClass)) {
            wrappedClasses.set(BaseClass, createCompendium2FateClass(BaseClass));
        }
        registry.AppClass = wrappedClasses.get(BaseClass);
    });
});

function createCompendium2FateClass(BaseClass) {
    return class Compendium2FateDSA5 extends BaseClass {
        static DEFAULT_OPTIONS = foundry.utils.mergeObject(
            foundry.utils.deepClone(BaseClass.DEFAULT_OPTIONS),
            {
                actions: {
                    toggleHeilkraft: function (e, t) { this._onToggleHeilkraft(e, t); },
                    toggleRegenDie: function (e, t) { this._onToggleRegenDie(e, t); }
                }
            }
        );

        constructor(message, actor, roll, options) {
            super(message, actor, roll, options);
            this.selectedForHeilkraft = new Set();
            this.selectedForRegenReroll = new Set();
        }

        async _buildFateContext(baseContext) {
            const cachedTab = this.tabGroups?.sheet;
            const context = await super._buildFateContext(baseContext);

            if (this.selectedPool !== 'master' && (cachedTab === 'addRegen' || cachedTab === 'rerollRegen')) {
                this.tabGroups.sheet = cachedTab;
                Object.values(context.tabs || {}).forEach(t => { t.cssClass = ''; });
            }

            return buildCompendium2FateContext(this, context);
        }

        async _onRender(context, options) {
            await super._onRender(context, options);
            const contentSection = this.element?.querySelector('section.content');

            if (contentSection && (context.tabs?.rerollRegen || context.tabs?.addRegen)) {
                const tabsHtml = await renderTemplate('modules/dsa5-compendium2/templates/regen-tabs.hbs', context);
                contentSection.insertAdjacentHTML('beforeend', tabsHtml);
            }
        }

        _onToggleHeilkraft(event, target) {
            const idx = parseInt(target?.closest('[data-index]')?.dataset?.index, 10);
            if (Number.isNaN(idx)) return;
            if (this.selectedForHeilkraft.has(idx)) this.selectedForHeilkraft.delete(idx);
            else this.selectedForHeilkraft.add(idx);
            this.render();
        }

        _onToggleRegenDie(event, target) {
            const idx = parseInt(target?.closest('[data-index]')?.dataset?.index, 10);
            if (Number.isNaN(idx)) return;
            if (this.selectedForRegenReroll.has(idx)) {
                this.selectedForRegenReroll.delete(idx);
            } else {
                this.selectedForRegenReroll.clear();
                this.selectedForRegenReroll.add(idx);
            }
            this.render();
        }

        _onClickTab(event) {
            super._onClickTab(event);
            this.selectedForHeilkraft.clear();
            this.selectedForRegenReroll.clear();
        }

        _validateDieSelection() {
            const tab = this.tabGroups?.sheet;
            if (tab === 'rerollRegen') return this.selectedForRegenReroll.size > 0 || this._warnNoDieSelected();
            if (tab === 'addRegen') return this.selectedForHeilkraft.size > 0 || this._warnNoDieSelected();
            return super._validateDieSelection();
        }

        async _executeSheetAction(payload) {
            const tab = this.tabGroups?.sheet;
            if (tab !== 'rerollRegen' && tab !== 'addRegen') return super._executeSheetAction(payload);

            payload.cardOptions.skipNativePostFunction = true;
            const res = tab === 'rerollRegen'
                ? await executeRerollRegen(this, payload.data, payload.isCheat)
                : await executeAddRegen(this, payload.data, payload.isCheat);
            if (!res) return null;

            await this.message.update(res.updates);

            if (this.selectedPool !== 'special') {
                for (let i = 1; i < (res.cost || 1); i++) {
                    await FateRolls.reduceSchips(this.dsaActor, this._schipSource());
                }
            }
            return res;
        }
    };
}
