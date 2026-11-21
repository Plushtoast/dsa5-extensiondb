import { DSA5GodsMenuConfig } from './config.js';
import SchipAssignment from './schip-assignment.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const GODS_CATALOG = DSA5GodsMenuConfig.godListNames.map((id) => ({
    id,
    icon: DSA5GodsMenuConfig.chipIcon(id),
    type: 'gods',
}));

const DEMONS_CATALOG = DSA5GodsMenuConfig.demonListNames.map((id) => ({
    id,
    icon: DSA5GodsMenuConfig.chipIcon(id),
    type: 'archdemons',
}));

export default class GodsMenu extends HandlebarsApplicationMixin(ApplicationV2) {
    static SOCKET = DSA5GodsMenuConfig.SOCKET;
    static MASTER_ID = 'dsa-gods-menu';
    static PLAYER_ID = 'dsa-gods-menu-player';
    static playerSession = null;

    static {
        DSA5GodsMenuConfig.registerSocketHandler('openSchipCatalog', (data) => {
            if (!game.user.isGM) GodsMenu.openPlayer(data.mode);
        });
        DSA5GodsMenuConfig.registerSocketHandler('closeSchipCatalog', () => {
            if (game.user.isGM) return;
            GodsMenu.playerSession = null;
            foundry.applications.instances.get(GodsMenu.PLAYER_ID)?.close();
        });
    }

    #onActorUpdate = (actor) => {
        if (this.rendered && actor.id === this.actor?.id) this.render();
    };

    constructor(options = {}) {
        const requestedMode = options.mode ?? 'master';
        const isPlayerSession = requestedMode === 'view' || requestedMode === 'pick';
        super({
            ...options,
            id: isPlayerSession ? GodsMenu.PLAYER_ID : GodsMenu.MASTER_ID,
        });
        this.mode = GodsMenu.resolveMode(requestedMode);
        this.actor = null;
        this.selectedItem = null;
        if (this.mode !== 'master') this.tabGroups.sheet = 'gods';
    }

    static resolveMode(requested = 'master', { isGM = game.user.isGM, session = GodsMenu.playerSession } = {}) {
        if (isGM) {
            if (requested === 'view' || requested === 'pick') return requested;
            return 'master';
        }
        if (requested === 'pick' && session === 'pick') return 'pick';
        return 'view';
    }

    get title() {
        if (this.mode === 'pick') return _loc('GodsMenu.PickTitle');
        if (this.mode === 'view') return _loc('GodsMenu.ShowTitle');
        return _loc('GodsMenu.Title');
    }

    get canEditSchips() {
        return this.mode === 'master';
    }

    get canSwap() {
        return this.mode === 'master' || this.mode === 'pick';
    }

    get canReset() {
        return this.mode === 'master';
    }

    get canSwitchActor() {
        return this.mode === 'master' || this.mode === 'pick';
    }

    static DEFAULT_OPTIONS = {
        classes: ['dsa5', 'largeDialog', 'godsMenu', 'sheet'],
        window: { title: 'GodsMenu.Title', resizable: true, contentClasses: ['standard-form'] },
        position: { width: 570, height: 'auto' },
        actions: {
            openChar: this._onOpenChar,
            quickSelectActor: this.#quickSelectActor,
            unselectActor: this.#unselectActor,
            schipUpdate: this._onSchipUpdate,
            specialSchipUpdate: this._onSpecialSchipUpdate,
            openDetail: this._onOpenDetail,
            closeDetail: this._onCloseDetail,
            swapEffect: this._onSwapEffect,
            resetSchips: this._onResetSchips,
            showToPlayers: this._onShowToPlayers,
            letPlayersPick: this._onLetPlayersPick,
            closePlayerWindows: this._onClosePlayerWindows,
        },
    };

    static _onOpenChar() { this.actor?.sheet.render(true); }

    static #quickSelectActor(ev, target) {
        if (!this.canSwitchActor) return;
        const actor = game.actors.get(target.dataset.actorId);
        if (actor) {
            this.actor = actor;
            this.render(true);
        }
    }

    static #unselectActor() {
        if (!this.canSwitchActor) return;
        this.actor = null;
        this.render(true);
    }

    static async _onSchipUpdate(ev, target) {
        if (!this.canEditSchips) return;
        if (!this.actor) {
            ui.notifications.error(_loc('DSAError.noActorSelected'));
            return;
        }
        let val = Number(target.dataset.val);
        const available = this.actor.system.status.fatePoints.value || 0;
        if (val === 1 && available === 1) val = 0;
        await this.actor.update({ 'system.status.fatePoints.value': val });
        this.render(true);
    }

    static async _onSpecialSchipUpdate(ev, target) {
        if (!this.canEditSchips) return;
        if (!this.actor) {
            ui.notifications.error(_loc('DSAError.noActorSelected'));
            return;
        }
        const key = target.dataset.key;
        let val = Number(target.dataset.val);
        const path = `flags.dsa5.specialPoints.${key}`;
        const existing = foundry.utils.getProperty(this.actor, path);
        if (!existing) return;

        const available = existing.current || 0;
        if (val === 1 && available === 1) val = 0;

        await this.actor.update({ [`${path}.current`]: val });
        this.render(true);
    }

    static async _onSwapEffect() {
        if (!this.canSwap || !this.selectedItem) return;
        const swapped = await SchipAssignment.swap(this.actor, this.selectedItem.id, this.selectedItem.type);
        if (swapped) this.render(true);
    }

    static async _onResetSchips() {
        if (!this.canReset) return;
        const reset = await SchipAssignment.reset(this.actor);
        if (reset) this.render(true);
    }

    static _onShowToPlayers() {
        GodsMenu.broadcastToPlayers('view');
    }

    static _onLetPlayersPick() {
        GodsMenu.broadcastToPlayers('pick');
    }

    static _onClosePlayerWindows() {
        GodsMenu.closePlayerWindows();
    }

    static broadcastToPlayers(mode) {
        if (!game.user.isGM) return;
        if (mode !== 'view' && mode !== 'pick') return;
        game.socket.emit(DSA5GodsMenuConfig.SOCKET, { type: 'openSchipCatalog', mode });
        ui.notifications.info(_loc(mode === 'pick' ? 'GodsMenu.PlayersNotifiedPick' : 'GodsMenu.PlayersNotifiedShow'));
    }

    static closePlayerWindows() {
        if (!game.user.isGM) return;
        game.socket.emit(DSA5GodsMenuConfig.SOCKET, { type: 'closeSchipCatalog' });
        ui.notifications.info(_loc('GodsMenu.PlayersClosed'));
    }

    static openPlayer(mode) {
        if (game.user.isGM) return;
        GodsMenu.playerSession = mode;
        const existing = foundry.applications.instances.get(GodsMenu.PLAYER_ID);
        if (existing) {
            existing.mode = GodsMenu.resolveMode(mode);
            existing.selectedItem = null;
            existing.render({ force: true });
            existing.bringToFront();
            return;
        }
        new GodsMenu({ mode }).render(true);
    }

    static registerSocket() {
        DSA5GodsMenuConfig.initSocket();
    }

    static _onOpenDetail(ev, target) {
        this.selectedItem = {
            id: target.dataset.id,
            icon: target.dataset.icon,
            type: target.dataset.type,
        };
        this.render(true);
    }

    static _onCloseDetail() {
        this.selectedItem = null;
        this.render(true);
    }

    static TABS = {
        sheet: {
            tabs: [
                { id: 'rules', label: 'GodsMenu.tabs.rules' },
                { id: 'gods', label: 'GodsMenu.tabs.gods' },
                { id: 'archdemons', label: 'GodsMenu.tabs.archdemons' },
            ],
            initial: 'rules',
        },
    };

    static PARTS = {
        header: { template: DSA5GodsMenuConfig.templatePath('fate/header.hbs') },
        tabs: { template: DSA5GodsMenuConfig.templatePath('fate/tabs.hbs') },
        rules: { template: DSA5GodsMenuConfig.templatePath('fate/rules.hbs') },
        gods: { template: DSA5GodsMenuConfig.templatePath('fate/gods.hbs') },
        archdemons: { template: DSA5GodsMenuConfig.templatePath('fate/archdemons.hbs') },
    };

    async _onFirstRender(context, options) {
        await super._onFirstRender(context, options);
        Hooks.on('updateActor', this.#onActorUpdate);
    }

    async _onClose(options) {
        Hooks.off('updateActor', this.#onActorUpdate);
        return super._onClose(options);
    }

    async getAvailableActors() {
        const trackedActors = game.settings.get('dsa5', 'trackedActors') || {};
        let actors;
        if (trackedActors.actors?.length > 0) {
            actors = game.actors.filter((x) => trackedActors.actors.includes(x.id))
                .sort((a, b) => trackedActors.actors.indexOf(a.id) - trackedActors.actors.indexOf(b.id));
        } else {
            actors = game.actors.filter((x) => x.hasPlayerOwner);
        }
        if (!game.user.isGM) actors = actors.filter((a) => a.isOwner);
        else if (!actors.length) actors = game.actors.filter((a) => a.type === 'character');
        return actors;
    }

    async _prepareContext(_options) {
        const data = await super._prepareContext(_options);
        const availableActors = await this.getAvailableActors();

        if ((this.mode === 'pick' || this.mode === 'view' || !game.user.isGM) && !this.actor) {
            this.actor = availableActors.length === 1 ? availableActors[0] : game.user.character;
        }

        const fatePoints = this.actor
            ? DSA5GodsMenuConfig.buildSchipDots(
                this.actor.system.status.fatePoints.current || 0,
                this.actor.system.status.fatePoints.value || 0,
            )
            : [];

        const specialPointsGroups = [];
        const specialPoints = foundry.utils.getProperty(this.actor, 'flags.dsa5.specialPoints');
        if (this.actor && specialPoints) {
            for (const [key, sData] of Object.entries(specialPoints)) {
                const total = sData?.value || 0;
                if (total <= 0) continue;

                const imgStyle = `background-image: url('${DSA5GodsMenuConfig.chipIcon(key)}');`;
                const dots = DSA5GodsMenuConfig.buildSchipDots(total, sData.current || 0, (_isFull, _i, css) => ({
                    cssClass: `${css} gods-schip`,
                    imgStyle,
                }));

                specialPointsGroups.push({ key, name: DSA5GodsMenuConfig.schipName(key), dots });
            }
        }

        return {
            ...data,
            actor: this.actor,
            availableActors: availableActors.map((a) => ({ id: a.id, name: a.name, img: a.img })),
            canSwitchActor: this.canSwitchActor,
            showActorSwitcher: this.canSwitchActor && (availableActors.length > 1 || game.user.isGM),
            canEditSchips: this.canEditSchips,
            canSwap: this.canSwap,
            canReset: this.canReset,
            showBroadcast: game.user.isGM && this.mode === 'master',
            pickHint: this.mode === 'pick',
            viewHint: this.mode === 'view',
            hasHeaderSchips: fatePoints.length > 0 || specialPointsGroups.length > 0,
            fatePoints,
            specialPointsGroups,
            gods: GODS_CATALOG,
            demons: DEMONS_CATALOG,
            selectedGod: this.selectedItem?.type === 'gods' ? this.selectedItem : null,
            selectedDemon: this.selectedItem?.type === 'archdemons' ? this.selectedItem : null,
        };
    }
}
