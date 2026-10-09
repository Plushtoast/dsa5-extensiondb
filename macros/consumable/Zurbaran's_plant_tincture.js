Hooks.once("init", () => {
    game.dsa5Herbarium2 = game.dsa5Herbarium2 || {};

    const TEMPLATE_PATH = "modules/dsa5-herbarium2/templates/zurbaran.hbs";

    Hooks.on("preUpdateItem", (item, changes, options, userId) => {
        if (item.type !== "plant" || !item.parent || !item.parent.getFlag("dsa5", "isPlantChimera")) return;
        const newQty = foundry.utils.getProperty(changes, "system.quantity.value");
        if (newQty !== undefined) {
            const oldQty = item.system.quantity.value || 0;
            const diff = oldQty - newQty;
            if (diff > 0) {
                options.chimeraHarvestDiff = diff;
            }
        }
    });

    Hooks.on("updateItem", async (item, changes, options, userId) => {
        if (game.user.id !== userId || !options.chimeraHarvestDiff) return;
        const diff = options.chimeraHarvestDiff;
        const actor = item.parent;
        if (!actor) return;
        
        let currentWounds = foundry.utils.getProperty(actor, "system.status.wounds.value") || 0;
        let currentInitial = foundry.utils.getProperty(actor, "system.status.wounds.initial") || 0;

        await actor.update({
            "system.status.wounds.value": Math.max(0, currentWounds - (diff * 10)),
            "system.status.wounds.initial": Math.max(0, currentInitial - (diff * 10))
        });
        ui.notifications.info(`Die Chimäre hat ${diff * 10} LeP durch die Ernte unwiderruflich verloren.`);
    });

    Hooks.on("preDeleteItem", (item, options, userId) => {
        if (item.type !== "plant" || !item.parent || !item.parent.getFlag("dsa5", "isPlantChimera")) return;
        options.chimeraHarvestDiff = item.system.quantity.value || 1;
    });

    Hooks.on("deleteItem", async (item, options, userId) => {
        if (game.user.id !== userId || !options.chimeraHarvestDiff) return;
        const diff = options.chimeraHarvestDiff;
        const actor = item.parent;
        if (!actor) return;
        
        let currentWounds = foundry.utils.getProperty(actor, "system.status.wounds.value") || 0;
        let currentInitial = foundry.utils.getProperty(actor, "system.status.wounds.initial") || 0;

        await actor.update({
            "system.status.wounds.value": Math.max(0, currentWounds - (diff * 10)),
            "system.status.wounds.initial": Math.max(0, currentInitial - (diff * 10))
        });
        ui.notifications.info(`Die Chimäre hat ${diff * 10} LeP durch die Ernte unwiderruflich verloren.`);
    });

    const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

    class ZurbaranApp extends HandlebarsApplicationMixin(ApplicationV2) {
        
        static DEFAULT_OPTIONS = {
            id: "zurbaran-app",
            classes: ["dsa5"], 
            window: {
                title: "Zurbarans Pflanzentinktur", 
                resizable: true
            },
            position: {
                width: 620,
                height: 700 
            },
            actions: {
                cancel: function() { this.close(); },
                confirm: async function() { await this._onConfirm(); },
                selectType: function(event, target) { this._onSelectType(event, target); },
                toggleImp: function(event, target) { this._onToggleImp(event, target); }
            }
        };

        static PARTS = {
            main: { template: TEMPLATE_PATH }
        };

        constructor(actor) {
            super();
            this.actor = actor;
            this.plant1 = null;
            this.plant2 = null;
            this.selectedType = null;
            this.selectedImprovements = new Set();
            this._scrollPos = 0; 
            
            this.options.window.title = game.i18n.localize("ZURBARAN.title") || "Zurbarans Pflanzentinktur";

            this.allImprovements = [
                { id: "brutal", labelKey: "ZURBARAN.imp_brutal", tooltipKey: "ZURBARAN.tooltip_brutal", req: ["healing", "poison", "crop"] },
                { id: "giftig", labelKey: "ZURBARAN.imp_giftig", tooltipKey: "ZURBARAN.tooltip_giftig", req: ["poison"] },
                { id: "hoerig", labelKey: "ZURBARAN.imp_hoerig", tooltipKey: "ZURBARAN.tooltip_hoerig", req: ["healing", "poison", "crop"] },
                { id: "langlebig", labelKey: "ZURBARAN.imp_langlebig", tooltipKey: "ZURBARAN.tooltip_langlebig", req: ["healing", "poison", "crop"] },
                { id: "laufend", labelKey: "ZURBARAN.imp_laufend", tooltipKey: "ZURBARAN.tooltip_laufend", req: ["healing", "poison", "crop"] },
                { id: "natuerlich", labelKey: "ZURBARAN.imp_natuerlich", tooltipKey: "ZURBARAN.tooltip_natuerlich", req: ["healing", "poison", "crop"] },
                { id: "bastler", labelKey: "ZURBARAN.imp_bastler", tooltipKey: "ZURBARAN.tooltip_bastler", req: ["crop"] },
                { id: "giftmischer", labelKey: "ZURBARAN.imp_giftmischer", tooltipKey: "ZURBARAN.tooltip_giftmischer", req: ["poison"] },
                { id: "heiler", labelKey: "ZURBARAN.imp_heiler", tooltipKey: "ZURBARAN.tooltip_heiler", req: ["healing"] },
                { id: "regeneration", labelKey: "ZURBARAN.imp_regeneration", tooltipKey: "ZURBARAN.tooltip_regeneration", req: ["healing", "poison", "crop"] },
                { id: "unauffaellig", labelKey: "ZURBARAN.imp_unauffaellig", tooltipKey: "ZURBARAN.tooltip_unauffaellig", req: ["healing", "poison", "crop"] }
            ];

            const styleId = "zurbaran-app-styles";
            if (!document.getElementById(styleId)) {
                document.head.insertAdjacentHTML("beforeend", `
                    <style id="${styleId}">
                        #dsa-zurbaran-container { 
                            --border-color: #736953a6; --bg-color: #e1d3c6; --bg-contrast-color: #333333; 
                            --button-color: #532902e7; --sheet-bg: #2e2c2a15; --sheet-border: #968678; 
                            --boldFont: "Signika"; --normalFont: "Signika"; --dsadesign1: #937b48; 
                            --oddColor: rgba(0, 0, 0, 0.1); --copiedBG: rgba(255, 255, 255, 0.6); 
                            font-size: 14px; font-family: var(--normalFont), "Signika", sans-serif; 
                            color: var(--bg-contrast-color); padding: 5px 15px 15px 15px; 
                            height: 100%; box-sizing: border-box; 
                            overflow-y: auto; 
                            display: flex; flex-direction: column; 
                        }
                        #dsa-zurbaran-container h3 { font-family: var(--boldFont), "Signika", sans-serif; border-bottom: 1px solid var(--border-color); margin-bottom: 5px; }
                        #dsa-zurbaran-container .intro-text { margin-bottom: 15px; font-style: italic; }
                        #dsa-zurbaran-container .drag-area { display: flex; justify-content: center; gap: 40px; align-items: center; padding: 25px 0 15px 0; margin-bottom: 15px; transition: padding-bottom 0.2s ease; }
                        #dsa-zurbaran-container .plant-slot { width: 80px; height: 80px; border: 2px dashed var(--sheet-border); border-radius: 5px; display: flex; justify-content: center; align-items: center; cursor: pointer; position: relative; background-size: cover; background-position: center; }
                        #dsa-zurbaran-container .plant-slot:hover { border-color: var(--bg-contrast-color); background-color: var(--oddColor); }
                        #dsa-zurbaran-container .mini-icons { position: absolute; top: -14px; left: 0; width: 100%; display: flex; justify-content: center; gap: 3px; pointer-events: none; }
                        #dsa-zurbaran-container .mini-icons img { width: 22px; height: 22px; background: rgba(255, 255, 255, 0.75); border-radius: 50%; border: 1px solid var(--sheet-border); padding: 1px; }
                        #dsa-zurbaran-container .icon-center { display: flex; gap: 10px; }
                        #dsa-zurbaran-container .type-icon { width: 80px; height: 80px; border: none; border-radius: 50%; background: transparent; filter: grayscale(100%) opacity(40%); transition: all 0.3s ease; }
                        #dsa-zurbaran-container .type-icon.available { filter: grayscale(0%) opacity(100%); cursor: pointer; }
                        #dsa-zurbaran-container .type-icon.available:hover { transform: scale(1.05); }
                        #dsa-zurbaran-container .type-icon.selected-healing { filter: grayscale(0%) opacity(100%); transform: scale(1.1); background: #eaf2e4; box-shadow: 0 0 15px 5px rgba(107, 148, 77, 0.9), inset 0 0 10px rgba(107, 148, 77, 0.5); }
                        #dsa-zurbaran-container .type-icon.selected-poison { filter: grayscale(0%) opacity(100%); transform: scale(1.1); background: #f7e4e4; box-shadow: 0 0 15px 5px rgba(168, 66, 66, 0.9), inset 0 0 10px rgba(168, 66, 66, 0.5); }
                        #dsa-zurbaran-container .type-icon.selected-crop { filter: grayscale(0%) opacity(100%); transform: scale(1.1); background: #ffebad; box-shadow: 0 0 15px 5px rgba(212, 176, 76, 0.9), inset 0 0 10px rgba(212, 176, 76, 0.5); }
                        #dsa-zurbaran-container .plant-popover { display: none; position: absolute; background: var(--bg-color); border: 1px solid var(--sheet-border); z-index: 1000; max-height: 250px; overflow-y: auto; width: 260px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); list-style: none; margin: 0; padding: 0; }
                        #dsa-zurbaran-container .plant-popover.show { display: block; }
                        #dsa-zurbaran-container .plant-popover li { padding: 5px; cursor: pointer; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 5px; }
                        #dsa-zurbaran-container .plant-popover li:hover { background: var(--copiedBG); }
                        #dsa-zurbaran-container .plant-popover img.plant-img { width: 24px; height: 24px; border: none; flex-shrink: 0; }
                        #dsa-zurbaran-container .list-mini-icons { display: flex; gap: 2px; margin-left: auto; }
                        #dsa-zurbaran-container .list-mini-icons img { width: 18px; height: 18px; background: rgba(255, 255, 255, 0.75); border-radius: 50%; border: 1px solid var(--sheet-border); padding: 1px; }
                        #dsa-zurbaran-container .plant-slot[data-slot="1"] .plant-popover { bottom: 80px; left: 80px; top: auto; }
                        #dsa-zurbaran-container .plant-slot[data-slot="2"] .plant-popover { bottom: 80px; right: 80px; top: auto; left: auto; }
                        #dsa-zurbaran-container .improvements-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 8px; margin-bottom: 20px; margin-top: 15px; }
                        #dsa-zurbaran-container .imp-btn { position: relative; padding: 8px 6px 6px 6px; cursor: pointer; text-align: center; font-size: 14px; font-family: var(--normalFont), "Signika", sans-serif; background: rgba(0, 0, 0, 0.05); border: 1px solid var(--sheet-border); border-radius: 3px; color: var(--bg-contrast-color); transition: all 0.2s; }
                        #dsa-zurbaran-container .imp-btn:hover:not(:disabled) { background: rgba(0, 0, 0, 0.1); border-color: var(--dsadesign1); }
                        #dsa-zurbaran-container .imp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                        #dsa-zurbaran-container .imp-btn.selected { background: #e2d6c6; color: var(--bg-contrast-color); border: 1px solid #736953; font-family: var(--boldFont), "Signika", sans-serif; box-shadow: inset 0 0 5px rgba(0,0,0,0.05); }
                        #dsa-zurbaran-container .btn-mini-icons { position: absolute; top: -11px; left: 50%; transform: translateX(-50%); display: flex; gap: 4px; pointer-events: none; z-index: 5; }
                        #dsa-zurbaran-container .btn-mini-icons img { width: 20px; height: 20px; background: #ece4d9; border-radius: 50%; border: 1px solid var(--sheet-border); padding: 1px; box-shadow: 0 1px 2px rgba(0,0,0,0.2); transition: all 0.3s ease; }
                        #dsa-zurbaran-container .btn-mini-icons img.met-healing { border-color: #6b944d; background: #eaf2e4; box-shadow: 0 0 10px 3px rgba(107, 148, 77, 0.9), inset 0 0 4px rgba(107, 148, 77, 0.5); transform: scale(1.2); z-index: 10; }
                        #dsa-zurbaran-container .btn-mini-icons img.met-poison { border-color: #a84242; background: #f7e4e4; box-shadow: 0 0 10px 3px rgba(168, 66, 66, 0.9), inset 0 0 4px rgba(168, 66, 66, 0.5); transform: scale(1.2); z-index: 10; }
                        #dsa-zurbaran-container .btn-mini-icons img.met-crop { border-color: #c99a2e; background: #ffebad; box-shadow: 0 0 10px 3px rgba(212, 176, 76, 0.9), inset 0 0 4px rgba(212, 176, 76, 0.5); transform: scale(1.2); z-index: 10; }
                        #dsa-zurbaran-container .cost-display { text-align: center; margin-bottom: 10px; font-size: 14px; color: var(--bg-contrast-color); }
                        
                        /* Exakte Ausrichtung der Buttons im 50/50 Look */
                        #dsa-zurbaran-container .dialog-buttons { 
                            display: flex; 
                            justify-content: space-between; 
                            gap: 10px; 
                            margin-top: auto; 
                            padding-top: 15px; 
                            width: 100%;
                        }
                        #dsa-zurbaran-container .dialog-buttons button { 
                            flex: 1; 
                            display: flex;
                            justify-content: center; 
                            align-items: center;
                            gap: 5px;
                            padding: 8px 15px;
                            font-family: var(--boldFont), "Signika", sans-serif;
                            font-size: 1.05em;
                            background: #e2d8c9; 
                            border: 1px solid #8e806b;
                            border-radius: 2px;
                            color: var(--bg-contrast-color);
                            cursor: pointer; 
                            transition: 0.2s; 
                        }
                        #dsa-zurbaran-container .dialog-buttons button:hover { 
                            background: #d4c8b6; 
                            border-color: var(--dsadesign1); 
                        }
                    </style>
                `);
            }
        }

        _getTypesOfPlant(p) {
            if (!p) return { healing: false, poison: false, crop: false };
            return {
                healing: foundry.utils.getProperty(p, "system.planttype.healing") === true,
                poison: foundry.utils.getProperty(p, "system.planttype.poison") === true,
                crop: foundry.utils.getProperty(p, "system.planttype.crop") === true
            };
        }

        _getActiveTypes() {
            if (!this.plant1 || !this.plant2) {
                return { healing: false, poison: false, crop: false };
            }

            const t1 = this._getTypesOfPlant(this.plant1);
            const t2 = this._getTypesOfPlant(this.plant2);

            const intersect = {
                healing: t1.healing && t2.healing,
                poison: t1.poison && t2.poison,
                crop: t1.crop && t2.crop
            };
            
            if (intersect.healing || intersect.poison || intersect.crop) {
                return intersect;
            }
            
            return {
                healing: t1.healing || t2.healing,
                poison: t1.poison || t2.poison,
                crop: t1.crop || t2.crop
            };
        }

        _updateAutoSelection() {
            const available = this._getActiveTypes();
            const activeKeys = Object.keys(available).filter(k => available[k]);
            
            if (activeKeys.length === 1) {
                if (this.selectedType !== activeKeys[0]) {
                    this.selectedType = activeKeys[0];
                    this.selectedImprovements.clear(); 
                }
            } else if (activeKeys.length === 0) {
                this.selectedType = null;
                this.selectedImprovements.clear();
            } else {
                if (this.selectedType && !available[this.selectedType]) {
                    this.selectedType = null;
                    this.selectedImprovements.clear();
                }
            }
        }

        async _prepareContext(options) {
            const bothSelected = !!(this.plant1 && this.plant2);
            const activeTypes = this._getActiveTypes();
            const plant1Types = this._getTypesOfPlant(this.plant1);
            const plant2Types = this._getTypesOfPlant(this.plant2);
            
            const availablePlants = this.actor.items.filter(i => i.type === "plant").map(i => {
                const pTypes = this._getTypesOfPlant(i);
                return { 
                    uuid: i.uuid, 
                    name: i.name, 
                    img: i.img,
                    isHealing: pTypes.healing,
                    isPoison: pTypes.poison,
                    isCrop: pTypes.crop
                };
            });

            const mappedImprovements = [];
            
            if (bothSelected && this.selectedType) {
                for (let imp of this.allImprovements) {
                    if (imp.req.includes(this.selectedType)) {
                        let isDisabled = false;
                        
                        if (this.selectedImprovements.has("langlebig") && imp.id !== "langlebig") {
                            isDisabled = true; 
                        } else if (this.selectedImprovements.size > 0 && !this.selectedImprovements.has("langlebig") && imp.id === "langlebig") {
                            isDisabled = true; 
                        } 
                        else if (this.selectedImprovements.size >= 3 && !this.selectedImprovements.has(imp.id)) {
                            isDisabled = true; 
                        }

                        mappedImprovements.push({
                            id: imp.id,
                            name: game.i18n.localize(imp.labelKey),
                            tooltip: game.i18n.localize(imp.tooltipKey),
                            selected: this.selectedImprovements.has(imp.id),
                            disabled: isDisabled,
                            reqHealing: imp.req.includes("healing"),
                            reqPoison: imp.req.includes("poison"),
                            reqCrop: imp.req.includes("crop"),
                            metHealing: imp.req.includes("healing") && this.selectedType === "healing",
                            metPoison: imp.req.includes("poison") && this.selectedType === "poison",
                            metCrop: imp.req.includes("crop") && this.selectedType === "crop"
                        });
                    }
                }
            }

            const count = Math.max(1, this.selectedImprovements.size);
            const costText = count === 1 
                ? game.i18n.localize("ZURBARAN.costTextSingle") 
                : game.i18n.format("ZURBARAN.costTextPlural", { count: count });

            return {
                plant1: this.plant1,
                plant2: this.plant2,
                plant1Types,
                plant2Types,
                activeTypes,
                selectedType: this.selectedType,
                isTypeHealing: this.selectedType === "healing",
                isTypePoison: this.selectedType === "poison",
                isTypeCrop: this.selectedType === "crop",
                availablePlants,
                improvements: mappedImprovements,
                bothSelected,
                costText
            };
        }

        _onRender(context, options) {
            super._onRender(context, options);
            const html = this.element;

            const container = html.querySelector('#dsa-zurbaran-container');
            if (container) {
                container.scrollTop = this._scrollPos;
                container.addEventListener('scroll', (ev) => {
                    this._scrollPos = ev.target.scrollTop;
                });
            }

            html.querySelectorAll('.plant-slot').forEach(slot => {
                slot.addEventListener("dragover", ev => ev.preventDefault());
                
                slot.addEventListener("drop", async (ev) => {
                    ev.preventDefault();
                    const slotNum = ev.currentTarget.dataset.slot;
                    
                    try {
                        const data = JSON.parse(ev.dataTransfer.getData("text/plain"));
                        if (data.type !== "Item") return;
                        
                        const droppedItem = await fromUuid(data.uuid);
                        
                        if (droppedItem.type !== "plant") {
                            ui.notifications.warn("Es können nur Pflanzen verwendet werden.");
                            return;
                        }
                        if (droppedItem.parent !== this.actor) {
                            ui.notifications.warn("Die Pflanze muss sich im Inventar des Charakters befinden.");
                            return;
                        }

                        if (slotNum === "1") this.plant1 = droppedItem;
                        else this.plant2 = droppedItem;
                        
                        this._updateAutoSelection();
                        this._resetInvalidImprovements();
                        this.render(); 
                        
                    } catch (err) {
                        console.error("Drag Drop Error", err);
                    }
                });

                slot.addEventListener("click", async (ev) => {
                    if (ev.target.closest('.plant-popover')) return;
                    
                    const slotNum = ev.currentTarget.dataset.slot;
                    const currentPlant = slotNum === "1" ? this.plant1 : this.plant2;

                    if (currentPlant) {
                        currentPlant.sheet.render(true);
                    } else {
                        const popover = ev.currentTarget.querySelector('.plant-popover');
                        const wasShowing = popover.classList.contains('show');
                        
                        html.querySelectorAll('.plant-popover').forEach(p => p.classList.remove('show'));
                        
                        if (!wasShowing) {
                            popover.classList.add('show');
                        }
                    }
                });

                slot.addEventListener("contextmenu", (ev) => {
                    const slotNum = ev.currentTarget.dataset.slot;
                    if (slotNum === "1") this.plant1 = null;
                    else this.plant2 = null;
                    
                    this._updateAutoSelection();
                    this._resetInvalidImprovements();
                    this.render();
                });
            });

            html.querySelectorAll('.select-plant').forEach(li => {
                li.addEventListener('click', async (ev) => {
                    const uuid = ev.currentTarget.dataset.uuid;
                    const slotNum = ev.currentTarget.dataset.slot;
                    const selectedItem = await fromUuid(uuid);
                    
                    if (slotNum === "1") this.plant1 = selectedItem;
                    else this.plant2 = selectedItem;
                    
                    this._updateAutoSelection();
                    this._resetInvalidImprovements();
                    this.render();
                });
            });
        }

        _onSelectType(event, target) {
            if (!target.classList.contains('available')) return;
            const type = target.dataset.type;
            const available = this._getActiveTypes();
            const activeKeys = Object.keys(available).filter(k => available[k]);
            
            if (activeKeys.length === 1) return; 
            
            if (this.selectedType === type) {
                this.selectedType = null; 
            } else {
                this.selectedType = type;
            }
            this.selectedImprovements.clear(); 
            this.render();
        }

        _onToggleImp(event, target) {
            if (target.disabled) return;

            const id = target.dataset.id;
            if (this.selectedImprovements.has(id)) {
                this.selectedImprovements.delete(id);
            } else {
                if (this.selectedImprovements.size < 3) {
                    this.selectedImprovements.add(id);
                }
            }
            this.render();
        }
        
        async _onConfirm() {
            if (!this.plant1 || !this.plant2) {
                ui.notifications.warn("Bitte weise zuerst zwei Pflanzen zu.");
                return;
            }
            if (!this.selectedType) {
                ui.notifications.warn(game.i18n.localize("ZURBARAN.selectTypeWarn"));
                return;
            }

            const neededUses = Math.max(1, this.selectedImprovements.size);
            const toDeduct = neededUses - 1;
            
            let tincture = this.actor.items.find(i => i.name.includes("Pflanzentinktur") || i.name.includes("Plant Tincture"));
            let currentTinctureQty = tincture ? (foundry.utils.getProperty(tincture, "system.quantity.value") || 0) : 0;
            let qsRaw = tincture ? (foundry.utils.getProperty(tincture, "system.QL") || foundry.utils.getProperty(tincture, "system.step.value") || 1) : 1;
            let qs = parseInt(qsRaw, 10);
            if (isNaN(qs) || qs < 1) qs = 1; 

            if (currentTinctureQty < toDeduct) {
                ui.notifications.warn(game.i18n.format("ZURBARAN.notEnoughTincture", { max: currentTinctureQty + 1 }));
                return;
            }

            if (toDeduct > 0 && tincture) {
                if (currentTinctureQty <= toDeduct) {
                    await tincture.delete();
                } else {
                    await tincture.update({ "system.quantity.value": currentTinctureQty - toDeduct });
                }
            }

            const plantDeductions = {};
            plantDeductions[this.plant1.id] = (plantDeductions[this.plant1.id] || 0) + 1;
            plantDeductions[this.plant2.id] = (plantDeductions[this.plant2.id] || 0) + 1;

            for (const [id, amount] of Object.entries(plantDeductions)) {
                const item = this.actor.items.get(id);
                if (!item) continue;
                
                let qty = foundry.utils.getProperty(item, "system.quantity.value") || 0;
                if (qty <= amount) {
                    await item.delete();
                } else {
                    await item.update({ "system.quantity.value": qty - amount });
                }
            }

            const compendiumActor = await fromUuid("Compendium.dsa5-herbarium2.herbarium2bestiary.Actor.s3VATlzHEMBb7yka");
            if (!compendiumActor) {
                ui.notifications.error("Die Pflanzenchimäre konnte nicht im Kompendium gefunden werden.");
                this.close();
                return;
            }

            let actorUpdates = {
                "flags.dsa5.isPlantChimera": true
            };
            
            const worldActor = await Actor.create(compendiumActor.toObject());
            
            let itemsToCreate = [];
            let itemsToUpdate = [];

            const isLongLived = this.selectedImprovements.has("langlebig");
            const durationSeconds = isLongLived ? (qs * 30 * 24 * 60 * 60) : (qs * 24 * 60 * 60);
            const onRemoveCode = "try { await actor.addCondition('dead'); } catch(e) {} try { await actor.update({ 'system.status.wounds.value': 0 }); } catch(e) {}";
            
            const effectData = {
                name: game.i18n.localize("ZURBARAN.effectName") || "Zurbarans Pflanzentinktur",
                origin: tincture?.uuid || this.actor.uuid,
                img: "icons/svg/aura.svg",
                type: "base",
                duration: { seconds: durationSeconds, startTime: game.time.worldTime },
                flags: { dsa5: { description: game.i18n.localize("ZURBARAN.effectName") || "Zurbarans Pflanzentinktur", onRemove: onRemoveCode } }
            };
            
            if (this.selectedImprovements.has("laufend")) {
                actorUpdates["system.status.speed.initial"] = 6;
            }

            if (this.selectedImprovements.has("unauffaellig")) {
                const stealthName = game.i18n.localize("ZURBARAN.skillStealth") || "Verbergen";
                const stealthItem = worldActor.items.find(i => i.type === "skill" && i.name === stealthName);
                if (stealthItem) {
                    itemsToUpdate.push({ _id: stealthItem.id, "system.talentValue.value": 10 });
                }
            }

            if (this.selectedImprovements.has("brutal")) {
                itemsToCreate.push({
                    name: game.i18n.localize("ZURBARAN.traitBite") || "Biss",
                    img: "systems/dsa5/icons/traits/Biss.webp",
                    type: "trait",
                    system: {
                        traitType: { value: "meleeAttack" },
                        at: { value: "14" },
                        damage: { value: "1W6+3" },
                        reach: { value: "short" },
                        pa: 0
                    }
                });
            }

            if (this.selectedImprovements.has("regeneration")) {
                itemsToCreate.push({
                    name: game.i18n.localize("ZURBARAN.traitWatering") || "Gießen",
                    type: "specialability",
                    img: "systems/dsa5/icons/categories/ability_general.webp",
                    system: {
                        description: { value: game.i18n.localize("ZURBARAN.traitWateringDesc") },
                        step: { value: 1 },
                        category: { value: "general", sub: 0 }
                    },
                    flags: {
                        dsa5: { onUseEffect: "await actor.applyDamage(\"-1d6\");" }
                    }
                });
            }

            const findPlantInCompendium = async (plantName) => {
                for (let pack of game.packs.values()) {
                    if (pack.documentName === "Item") {
                        let index = pack.index.length ? pack.index : await pack.getIndex();
                        let entry = index.find(e => e.name === plantName && e.type === "plant");
                        if (entry) {
                            return await pack.getDocument(entry._id);
                        }
                    }
                }
                return null;
            };

            const distributePlants = async () => {
                let validPlants = [];
                if (this._getTypesOfPlant(this.plant1)[this.selectedType]) validPlants.push(this.plant1);
                if (this.plant2 && this.plant1.id !== this.plant2.id && this._getTypesOfPlant(this.plant2)[this.selectedType]) validPlants.push(this.plant2);
                if (validPlants.length === 0 && this._getTypesOfPlant(this.plant2)[this.selectedType]) validPlants.push(this.plant2); 
                
                if (validPlants.length > 0) {
                    let amounts = new Array(validPlants.length).fill(0);
                    for(let i=0; i<qs; i++) {
                        amounts[Math.floor(Math.random() * validPlants.length)]++;
                    }

                    for(let i=0; i<validPlants.length; i++) {
                        if (amounts[i] > 0) {
                            let compendiumItem = await findPlantInCompendium(validPlants[i].name);
                            let baseItemObj = compendiumItem ? compendiumItem.toObject() : validPlants[i].toObject();
                            
                            baseItemObj.system.quantity.value = amounts[i];
                            
                            if (foundry.utils.hasProperty(baseItemObj, "system.remaining.shelfLife.value")) {
                                foundry.utils.setProperty(baseItemObj, "system.remaining.shelfLife.value", qs);
                            }
                            
                            foundry.utils.setProperty(baseItemObj, "flags.dsa5.demonicfilth", true); 

                            itemsToCreate.push(baseItemObj);
                        }
                    }
                }
            };

            if (this.selectedImprovements.has("bastler") || this.selectedImprovements.has("giftmischer") || this.selectedImprovements.has("heiler")) {
                await distributePlants();
            }

            if (Object.keys(actorUpdates).length > 0) await worldActor.update(actorUpdates);
            if (itemsToUpdate.length > 0) await worldActor.updateEmbeddedDocuments("Item", itemsToUpdate);
            if (itemsToCreate.length > 0) await worldActor.createEmbeddedDocuments("Item", itemsToCreate);
            await worldActor.createEmbeddedDocuments("ActiveEffect", [effectData]);

            const currentActorToken = this.actor.token ? this.actor.token : this.actor.getActiveTokens()[0];
            let spawnX = 0;
            let spawnY = 0;

            if (currentActorToken) {
                spawnX = currentActorToken.x + (canvas.grid.size || 50);
                spawnY = currentActorToken.y;
            }

            const newTokenData = await worldActor.getTokenDocument({
                name: worldActor.name,
                x: spawnX,
                y: spawnY,
                actorLink: false,
                texture: { 
                    src: worldActor.prototypeToken.texture.src 
                },
                delta: {
                    ownership: this.actor.ownership 
                }
            }, {parent: canvas.scene});

            await canvas.scene.createEmbeddedDocuments("Token", [newTokenData]);
            
            ui.notifications.info("Die Pflanzenchimäre wurde erfolgreich erschaffen!");
            this.close();
        }

        _resetInvalidImprovements() {
            if (!this.selectedType) return;
            const activeTypes = this._getActiveTypes();
            for (let impId of this.selectedImprovements) {
                const impDef = this.allImprovements.find(i => i.id === impId);
                const stillValid = impDef.req.includes(this.selectedType) && activeTypes[this.selectedType];
                
                if (!stillValid) {
                    this.selectedImprovements.delete(impId);
                }
            }
        }
    }

    game.dsa5Herbarium2.openZurbaranApp = function(actor) {
        if (!actor) {
            ui.notifications.warn("Kein Actor gefunden.");
            return;
        }
        new ZurbaranApp(actor).render(true);
    };
});
