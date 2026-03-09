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


    class ZurbaranApp extends Application {
        constructor(actor) {
            super();
            this.actor = actor;
            this.plant1 = null;
            this.plant2 = null;
            this.selectedImprovements = new Set();
            
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
        }

        static get defaultOptions() {
            return foundry.utils.mergeObject(super.defaultOptions, {
                id: "zurbaran-app",
                classes: ["dsa5"], 
                title: game.i18n.localize("ZURBARAN.title"),
                template: TEMPLATE_PATH,
                width: 620, 
                height: "auto", 
                resizable: true
            });
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

        async getData() {
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
            
            if (bothSelected) {
                for (let imp of this.allImprovements) {
                    let matchesType = false;
                    for (let req of imp.req) {
                        if (activeTypes[req]) matchesType = true;
                    }

                    if (matchesType) {
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
                            metHealing: imp.req.includes("healing") && activeTypes.healing,
                            metPoison: imp.req.includes("poison") && activeTypes.poison,
                            metCrop: imp.req.includes("crop") && activeTypes.crop
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
                availablePlants,
                improvements: mappedImprovements,
                bothSelected,
                costText
            };
        }

        activateListeners(html) {
            super.activateListeners(html);

            const slots = html.find('.plant-slot');
            
            slots.on("dragover", ev => ev.preventDefault());
            
            slots.on("drop", async (ev) => {
                ev.preventDefault();
                const slotNum = ev.currentTarget.dataset.slot;
                
                try {
                    const data = JSON.parse(ev.originalEvent.dataTransfer.getData("text/plain"));
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
                    
                    this._resetInvalidImprovements();
                    this.render(false);
                    
                } catch (err) {
                    console.error("Drag Drop Error", err);
                }
            });

            slots.on("click", async (ev) => {
                if ($(ev.target).closest('.plant-popover').length > 0) return;
                
                const slotNum = ev.currentTarget.dataset.slot;
                const currentPlant = slotNum === "1" ? this.plant1 : this.plant2;

                if (currentPlant) {
                    currentPlant.sheet.render(true);
                } else {
                    const popover = $(ev.currentTarget).find('.plant-popover');
                    const wasShowing = popover.hasClass('show');
                    
                    html.find('.plant-popover').removeClass('show');
                    
                    if (!wasShowing) {
                        popover.addClass('show');
                    }
                }
            });

            slots.on("contextmenu", (ev) => {
                const slotNum = ev.currentTarget.dataset.slot;
                if (slotNum === "1") this.plant1 = null;
                else this.plant2 = null;
                
                this._resetInvalidImprovements();
                this.render(false);
            });

            html.find('.select-plant').click(async (ev) => {
                const uuid = ev.currentTarget.dataset.uuid;
                const slotNum = ev.currentTarget.dataset.slot;
                const selectedItem = await fromUuid(uuid);
                
                if (slotNum === "1") this.plant1 = selectedItem;
                else this.plant2 = selectedItem;
                
                this._resetInvalidImprovements();
                this.render(false);
            });

            html.find('.imp-btn').click((ev) => {
                const btn = $(ev.currentTarget);
                if (btn.prop("disabled")) return;

                const id = btn.data("id");
                if (this.selectedImprovements.has(id)) {
                    this.selectedImprovements.delete(id);
                } else {
                    if (this.selectedImprovements.size < 3) {
                        this.selectedImprovements.add(id);
                    }
                }
                this.render(false);
            });

            html.find('.btn-cancel').click(() => this.close());
            
            // --- BESTÄTIGEN LOGIK ---
            html.find('.btn-confirm').click(async () => {
                if (!this.plant1 || !this.plant2) {
                    ui.notifications.warn("Bitte weise zuerst zwei Pflanzen zu.");
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
                    icon: "icons/svg/aura.svg",
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
                            description: { value: "<p>Für jeden Liter Flüssigkeit oder für jede Anwendung eines flüssigen pflanzlichen oder alchimistischen Rezepts, mit dem die Chimäre gegossen wird, kann diese nach 1 Stunde 1W6 LeP regenerieren – allerdings nicht solche, die sie durch das Ernten von Anwendungen verloren hat.</p>" },
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

                const distributePlants = async (typeStr) => {
                    let validPlants = [];
                    if (this._getTypesOfPlant(this.plant1)[typeStr]) validPlants.push(this.plant1);
                    if (this.plant2 && this.plant1.id !== this.plant2.id && this._getTypesOfPlant(this.plant2)[typeStr]) validPlants.push(this.plant2);
                    if (validPlants.length === 0 && this._getTypesOfPlant(this.plant2)[typeStr]) validPlants.push(this.plant2); 
                    
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

                                itemsToCreate.push(baseItemObj);
                            }
                        }
                    }
                };

                if (this.selectedImprovements.has("bastler")) await distributePlants("crop");
                if (this.selectedImprovements.has("giftmischer")) await distributePlants("poison");
                if (this.selectedImprovements.has("heiler")) await distributePlants("healing");

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
            });
        }

        _resetInvalidImprovements() {
            const activeTypes = this._getActiveTypes();
            for (let impId of this.selectedImprovements) {
                const impDef = this.allImprovements.find(i => i.id === impId);
                const stillValid = impDef.req.some(r => activeTypes[r]);
                
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
