// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";

const dict = {
    de: {
        noActor: "Kein Actor gefunden. Bitte Makro als Item-Makro nutzen oder einen Token auswählen.",
        header: "»Jetzt erstmal ein Pfeifchen.«",
        description: "Tabak wird teilweise mit Kräutern oder Früchten aromatisiert oder pur geraucht, wobei billigerer Tabak besonders im Norden mit anderen Pflanzenteilen gestreckt ist, die selten zur Verbesserung des Geschmacks beitragen.",
        question: "Was möchtest du rauchen?",
        btnTobacco: "Nur Tabak",
        btnMixed: "Tabak und Kräuter",
        btnHerbs: "Nur Kräuter",
        placeholder: "Wähle eine Option oben.",
        labelTobacco: "Tabak",
        labelHerb: "Kraut",
        slotTooltip: "Klicken um Sheet zu öffnen",
        noItems: "Keine Items",
        dialogTitle: "Rauchwerk Auswahl",
        smoke: "Rauchen",
        cancel: "Abbrechen",
        noSelection: "Du hast nichts zum Rauchen ausgewählt!",
        chatMessage: "zündet sich genüsslich eine Pfeife an.",
        tobaccoNames: ["Knaster", "Methumis-Tabak", "Mochorka, norbardischer Tabak", "Mohacca", "Sinoda-Kraut", "Tabak", "Tabak, Standard"],
        herbNames: ["Cheriacha", "Schwarzer Pfeffer", "Rauschkraut", "Ilmenblatt", "Ilmenblatt-Rauchpäckchen", "Kukuka", "Purpurmohn", "Schleiermoos"]
    },
    en: {
        noActor: "No actor found. Please use as Item Macro or select a token.",
        header: "»Time for a little pipe.«",
        description: "Tobacco is sometimes flavored with herbs or fruits or smoked pure, although cheaper tobacco, especially in the north, is stretched with other plant parts that rarely contribute to improving the taste.",
        question: "What would you like to smoke?",
        btnTobacco: "Tobacco only",
        btnMixed: "Tobacco & Herbs",
        btnHerbs: "Herbs only",
        placeholder: "Choose an option above.",
        labelTobacco: "Tobacco",
        labelHerb: "Herb",
        slotTooltip: "Click to open sheet",
        noItems: "No items",
        dialogTitle: "Select Smoking Goods",
        smoke: "Smoke",
        cancel: "Cancel",
        noSelection: "You haven't selected anything to smoke!",
        chatMessage: "lights a pipe with pleasure.",
        tobaccoNames: ["Knaster", "Methumis Tobacco", "Mochorka, Norbardian Tobacco", "Mohacca", "Sinoda Herb", "Tobacco", "Tobacco, Standard"],
        herbNames: ["Cheriacha", "Black Pepper", "Dreamweed", "Ilmen Leaf", "Ilmen Leaf Pack", "Kukuka", "Purple Poppy", "Veil Moss"]
    }
}[lang];

if (typeof actor === 'undefined' || !actor) {
    ui.notifications.warn(dict.noActor);
    return;
}

function findItems(names) {
    return actor.items.filter(i => names.includes(i.name) && i.system.quantity.value > 0);
}

const PIPE_TEMPLATE_STRING = `
<div id="dsa-pipe-macro-container" class="dsa5-smoking-macro" style="height: 100%; overflow-y: auto; overflow-x: hidden; padding-right: 5px; min-width: 400px;">
    <div style="margin-bottom: 10px;">
        <p style="font-family: 'Times New Roman', serif; font-size: 10pt; font-style: italic; margin-bottom: 5px;">{{dict.header}}</p>
    </div>
    <div style="margin-bottom: 10px;">
        <p>{{dict.description}}</p>
        <p><i>{{dict.question}}</i></p>
    </div>

    <div class="mode-buttons" style="display: flex; justify-content: space-between; margin-bottom: 15px; gap: 5px;">
        <button type="button" data-action="setMode" data-mode="tobacco" class="dsa5 button {{#if (eq mode 'tobacco')}}active-mode{{/if}}" style="flex:1; padding: 0 5px;">{{dict.btnTobacco}}</button>
        <button type="button" data-action="setMode" data-mode="mixed" class="dsa5 button {{#if (eq mode 'mixed')}}active-mode{{/if}}" style="flex:1; padding: 0 5px;">{{dict.btnMixed}}</button>
        <button type="button" data-action="setMode" data-mode="herbs" class="dsa5 button {{#if (eq mode 'herbs')}}active-mode{{/if}}" style="flex:1; padding: 0 5px;">{{dict.btnHerbs}}</button>
    </div>

    <div id="selection-area">
        {{#if isModeNull}}
            <p style="text-align: center; color: #666; margin: 15px 0;">{{dict.placeholder}}</p>
        {{else}}
            <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
                {{#if showTobacco}}
                <div style="flex: 1 1 180px; text-align: center;">
                    <label style="font-weight: bold;">{{dict.labelTobacco}}</label>
                    <div data-action="openSheet" data-item-id="{{selectedTobacco.id}}" data-tooltip="{{dict.slotTooltip}}"
                         style="width: 48px; height: 48px; border: {{#if selectedTobacco}}2px solid #000{{else}}2px dashed #777{{/if}}; margin: 5px auto; background-size: cover; background-position: center; cursor: pointer; {{#if selectedTobacco}}background-image: url('{{selectedTobacco.img}}');{{/if}}">
                    </div>
                    <div style="min-height: 1.2em; font-size: 0.9em; font-weight: bold; color: #444; margin-bottom: 5px;">{{selectedTobacco.name}}</div>
                    <div style="margin-top: 5px; border-top: 1px solid #ccc; padding-top: 5px; display: flex; flex-wrap: wrap; gap: 5px; justify-content: center;">
                        {{#if availableTobacco.length}}
                            {{#each availableTobacco as |item|}}
                            <div style="display: flex; flex-direction: column; align-items: center; width: 34px;">
                                <div data-action="selectTobacco" data-id="{{item.id}}" data-dblclick-sheet data-tooltip="{{item.name}}" 
                                     style="width: 32px; height: 32px; border: 2px solid {{#if item.isSelected}}#968678{{else}}transparent{{/if}}; box-shadow: 0 0 0 1px #999; cursor: pointer; background-image: url('{{item.img}}'); background-size: cover;">
                                </div>
                                <span style="font-size: 10px; color: #333; margin-top: 2px;">{{item.qty}}</span>
                            </div>
                            {{/each}}
                        {{else}}
                            <p style="font-size: 0.8em; color: #999;">{{dict.noItems}}</p>
                        {{/if}}
                    </div>
                </div>
                {{/if}}

                {{#if showHerbs}}
                <div style="flex: 1 1 180px; text-align: center;">
                    <label style="font-weight: bold;">{{dict.labelHerb}}</label>
                    <div data-action="openSheet" data-item-id="{{selectedHerb.id}}" data-tooltip="{{dict.slotTooltip}}"
                         style="width: 48px; height: 48px; border: {{#if selectedHerb}}2px solid #000{{else}}2px dashed #777{{/if}}; margin: 5px auto; background-size: cover; background-position: center; cursor: pointer; {{#if selectedHerb}}background-image: url('{{selectedHerb.img}}');{{/if}}">
                    </div>
                    <div style="min-height: 1.2em; font-size: 0.9em; font-weight: bold; color: #444; margin-bottom: 5px;">{{selectedHerb.name}}</div>
                    <div style="margin-top: 5px; border-top: 1px solid #ccc; padding-top: 5px; display: flex; flex-wrap: wrap; gap: 5px; justify-content: center;">
                        {{#if availableHerbs.length}}
                            {{#each availableHerbs as |item|}}
                            <div style="display: flex; flex-direction: column; align-items: center; width: 34px;">
                                <div data-action="selectHerb" data-id="{{item.id}}" data-dblclick-sheet data-tooltip="{{item.name}}" 
                                     style="width: 32px; height: 32px; border: 2px solid {{#if item.isSelected}}#968678{{else}}transparent{{/if}}; box-shadow: 0 0 0 1px #999; cursor: pointer; background-image: url('{{item.img}}'); background-size: cover;">
                                </div>
                                <span style="font-size: 10px; color: #333; margin-top: 2px;">{{item.qty}}</span>
                            </div>
                            {{/each}}
                        {{else}}
                            <p style="font-size: 0.8em; color: #999;">{{dict.noItems}}</p>
                        {{/if}}
                    </div>
                </div>
                {{/if}}
            </div>
        {{/if}}
    </div>

    <footer class="form-footer" style="display: flex; gap: 5px; margin-top: 15px;">
        <button type="button" data-action="smoke" class="dsa5 button" style="flex:1"><i class="fas fa-smoking"></i> {{dict.smoke}}</button>
        <button type="button" data-action="cancel" class="dsa5 button" style="flex:1"><i class="fas fa-times"></i> {{dict.cancel}}</button>
    </footer>
</div>
`;

const { ApplicationV2 } = foundry.applications.api;

class PipeApp extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
        id: "pipe-smoking-app",
        classes: ["dsa5"],
        window: { 
            title: dict.dialogTitle,
            resizable: true 
        },
        position: { width: 450, height: "auto" }, 
        actions: {
            setMode: function(e, t) { this._onSetMode(e, t); },
            selectTobacco: function(e, t) { this._onSelectTobacco(e, t); },
            selectHerb: function(e, t) { this._onSelectHerb(e, t); },
            openSheet: function(e, t) { this._onOpenSheet(e, t); },
            smoke: function() { this._onSmoke(); },
            cancel: function() { this.close(); }
        }
    };

    constructor(dsaActor, options) {
        super(options);
        this.dsaActor = dsaActor;
        this.mode = null; 
        this.selectedTobaccoId = null;
        this.selectedHerbId = null;

        const styleId = "pipe-macro-styles";
        if (!document.getElementById(styleId)) {
            document.head.insertAdjacentHTML("beforeend", `
                <style id="${styleId}">
                    #dsa-pipe-macro-container .active-mode { background: #968678 !important; color: white !important; border-color: #7a7971 !important; box-shadow: inset 0 2px 4px rgba(0,0,0,0.15) !important; }
                </style>
            `);
        }
   }

    async _renderHTML(context, options) {
        Handlebars.registerHelper('eq', function (a, b) { return a === b; });
        const template = Handlebars.compile(PIPE_TEMPLATE_STRING);
        return template(context);
    }

    _replaceHTML(result, content, options) {
        content.innerHTML = result;
        content.querySelectorAll('[data-dblclick-sheet]').forEach(el => {
            el.addEventListener('dblclick', (ev) => {
                const id = ev.currentTarget.dataset.id;
                this.dsaActor.items.get(id)?.sheet.render(true);
            });
        });
    }

    async _prepareContext(options) {
        const availableTobacco = findItems(dict.tobaccoNames).map(i => ({
            id: i.id, name: i.name, img: i.img, qty: i.system.quantity.value,
            isSelected: i.id === this.selectedTobaccoId
        }));
        const availableHerbs = findItems(dict.herbNames).map(i => ({
            id: i.id, name: i.name, img: i.img, qty: i.system.quantity.value,
            isSelected: i.id === this.selectedHerbId
        }));
        let selTobacco = null;
        if (this.selectedTobaccoId) {
            const i = this.dsaActor.items.get(this.selectedTobaccoId);
            if (i) selTobacco = { id: i.id, name: i.name, img: i.img };
        }
        let selHerb = null;
        if (this.selectedHerbId) {
            const i = this.dsaActor.items.get(this.selectedHerbId);
            if (i) selHerb = { id: i.id, name: i.name, img: i.img };
        }
        return {
            dict: dict, mode: this.mode, isModeNull: this.mode === null,
            showTobacco: this.mode === 'tobacco' || this.mode === 'mixed',
            showHerbs: this.mode === 'herbs' || this.mode === 'mixed',
            availableTobacco: availableTobacco, availableHerbs: availableHerbs,
            selectedTobacco: selTobacco, selectedHerb: selHerb
        };
    }
    
    _onSetMode(event, target) {
        this.mode = target.dataset.mode;
        this.selectedTobaccoId = null;
        this.selectedHerbId = null;
        this.render(); 
    }

    _onSelectTobacco(event, target) {
        this.selectedTobaccoId = target.dataset.id;
        this.render();
    }

    _onSelectHerb(event, target) {
        this.selectedHerbId = target.dataset.id;
        this.render();
    }

    _onOpenSheet(event, target) {
        const id = target.dataset.itemId;
        if (id) this.dsaActor.items.get(id)?.sheet.render(true);
    }

    async _onSmoke() {
        if (!this.selectedTobaccoId && !this.selectedHerbId) {
            return ui.notifications.warn(dict.noSelection);
        }

        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({actor: this.dsaActor}),
            content: `${this.dsaActor.name} ${dict.chatMessage}`
        });

        const triggerItem = async (itemId) => {
            const item = this.dsaActor.items.get(itemId);
            if (!item) return;

            const token = canvas.tokens.placeables.find(t => t.actor?.id === this.dsaActor.id) || this.dsaActor.getActiveTokens()[0];
            if (token) {
                token.setTarget(true, {user: game.user, releaseOthers: true});
            }

            try {
                const setupPromise = item.setupEffect();
                if (setupPromise && typeof setupPromise.then === 'function') {
                    setupPromise.then(setupData => {
                        if (!setupData) return;

                        const td = setupData.testData || setupData;
                        
                        if (!td.characteristics && !td.source) return;

                        td.source = td.source || item.toObject(); 
                        if (!td.extra) td.extra = {};
                        td.extra.speaker = td.extra.speaker || ChatMessage.getSpeaker({ actor: this.dsaActor });
                        
                        item.itemTest(setupData);
                    });
                } 
            } catch (e) {
                console.warn("Rauch-Makro: Fehler bei Effekt-Setup.", e);
            }
        };

        const consumeItem = async (itemId) => {
            const item = this.dsaActor.items.get(itemId);
            if (!item) return;
            const currentQty = item.system.quantity.value;
            if (currentQty <= 1) {
                await this.dsaActor.deleteEmbeddedDocuments("Item", [itemId]);
            } else {
                await this.dsaActor.updateEmbeddedDocuments("Item", [{_id: itemId, "system.quantity.value": currentQty - 1}]);
            }
        };

        if (this.selectedTobaccoId) {
            await triggerItem(this.selectedTobaccoId);
            await consumeItem(this.selectedTobaccoId);
        }

        if (this.selectedHerbId) {
            await triggerItem(this.selectedHerbId);
            await consumeItem(this.selectedHerbId);
        }

        this.close();
    }
}

new PipeApp(actor).render(true);
