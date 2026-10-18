// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang === "de" ? "de" : "en";

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
<div class="dsa5-smoking-macro thinscroll height100 dsapr-1">
    
    <div class="dsa-info-box marginBottom">
        <h3><i>{{dict.header}}</i></h3>
        <p class="dsa-info-text">{{dict.description}}</p>
        <p class="dsa-info-text center"><b>{{dict.question}}</b></p>
    </div>

    <div class="combatGripControls row-section marginBottom">
        <button type="button" data-action="setMode" data-mode="tobacco" class="dsadesignbutton {{#if (eq mode 'tobacco')}}active{{/if}}">{{dict.btnTobacco}}</button>
        <button type="button" data-action="setMode" data-mode="mixed" class="dsadesignbutton {{#if (eq mode 'mixed')}}active{{/if}}">{{dict.btnMixed}}</button>
        <button type="button" data-action="setMode" data-mode="herbs" class="dsadesignbutton {{#if (eq mode 'herbs')}}active{{/if}}">{{dict.btnHerbs}}</button>
    </div>

    <div id="selection-area">
        {{#if isModeNull}}
            <p class="center dsamy-4" style="opacity: 0.7;"><i>{{dict.placeholder}}</i></p>
        {{else}}
            <div class="row-section wrap gap10px">
                {{#if showTobacco}}
                <div class="center groupbox paddingBox dsam-0" style="flex: 1 1 180px;">
                    <div class="table-title">{{dict.labelTobacco}}</div>
                    <div data-action="openSheet" data-item-id="{{selectedTobacco.id}}" data-tooltip="{{dict.slotTooltip}}"
                         class="slot dsamy-1 dsamx-auto" style="{{#if selectedTobacco}}background-image: url('{{selectedTobacco.img}}');{{/if}}">
                    </div>
                    <div class="dsamb-1"><b>{{#if selectedTobacco}}{{selectedTobacco.name}}{{else}}&nbsp;{{/if}}</b></div>
                    
                    <div class="row-section wrap gap2px flexAlignCenter dsapt-1" style="border-top: 1px solid var(--border-color);">
                        {{#if availableTobacco.length}}
                            {{#each availableTobacco as |item|}}
                            <a class="dsa-icon-count {{#if item.isSelected}}selected{{/if}}" data-action="selectTobacco" data-id="{{item.id}}" data-dblclick-sheet data-tooltip="{{item.name}}">
                                <div class="image" style="background-image: url('{{item.img}}');"></div>
                                <span class="dsa-icon-count__qty">{{item.qty}}</span>
                            </a>
                            {{/each}}
                        {{else}}
                            <p class="small">{{dict.noItems}}</p>
                        {{/if}}
                    </div>
                </div>
                {{/if}}

                {{#if showHerbs}}
                <div class="center groupbox paddingBox dsam-0" style="flex: 1 1 180px;">
                    <div class="table-title">{{dict.labelHerb}}</div>
                    <div data-action="openSheet" data-item-id="{{selectedHerb.id}}" data-tooltip="{{dict.slotTooltip}}"
                         class="slot dsamy-1 dsamx-auto" style="{{#if selectedHerb}}background-image: url('{{selectedHerb.img}}');{{/if}}">
                    </div>
                    <div class="dsamb-1"><b>{{#if selectedHerb}}{{selectedHerb.name}}{{else}}&nbsp;{{/if}}</b></div>
                    
                    <div class="row-section wrap gap2px flexAlignCenter dsapt-1" style="border-top: 1px solid var(--border-color);">
                        {{#if availableHerbs.length}}
                            {{#each availableHerbs as |item|}}
                            <a class="dsa-icon-count {{#if item.isSelected}}selected{{/if}}" data-action="selectHerb" data-id="{{item.id}}" data-dblclick-sheet data-tooltip="{{item.name}}">
                                <div class="image" style="background-image: url('{{item.img}}');"></div>
                                <span class="dsa-icon-count__qty">{{item.qty}}</span>
                            </a>
                            {{/each}}
                        {{else}}
                            <p class="small">{{dict.noItems}}</p>
                        {{/if}}
                    </div>
                </div>
                {{/if}}
            </div>
        {{/if}}
    </div>

    <footer class="row-section gap5px margin-top">
        <button type="button" data-action="smoke" class="col two dsa5 button"><i class="fas fa-smoking"></i> {{dict.smoke}}</button>
        <button type="button" data-action="cancel" class="col two dsa5 button"><i class="fas fa-times"></i> {{dict.cancel}}</button>
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
            smoke: async function(e, t) { await this._onSmoke(e, t); },
            cancel: function() { this.close(); }
        }
    };

    constructor(dsaActor, options) {
        super(options);
        this.dsaActor = dsaActor;
        this.mode = null; 
        this.selectedTobaccoId = null;
        this.selectedHerbId = null;
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

            const token = this.dsaActor.getActiveTokens()[0] || canvas.tokens.placeables.find(t => t.actor?.id === this.dsaActor.id);
            if (token) {
                token.setTarget(true, {user: game.user, releaseOthers: true});
            }

            try {
                const setupData = await item.setupEffect();
                if (!setupData) return;

                const td = setupData.testData || setupData;
                if (!td.characteristics && !td.source) return;

                td.source = td.source || item.toObject(); 
                if (!td.extra) td.extra = {};
                
                td.extra.speaker = td.extra.speaker || ChatMessage.getSpeaker({ actor: this.dsaActor, token: token?.document });
                
                await item.itemTest(setupData);
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
