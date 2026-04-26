Hooks.once("init", () => {
    game.dsa5Necromantheum = game.dsa5Necromantheum || {};

    const TEMPLATE_PATH = "modules/dsa5-necromantheum/templates/retroelixier.hbs";
    const { getProperty: getProp, duplicate: dup, mergeObject: mergeObj } = foundry.utils;

    const loc = (key) => game.i18n.localize(`RETRO.${key}`) || key;
    const format = (key, data) => game.i18n.format(`RETRO.${key}`, data) || key;

    const PACKS = {
        main: [
            { key: "lebender", nameKey: "packLebender", uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.kLbStO87YJC1MGl9" },
            { key: "skelett", nameKey: "packSkelett", uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.fLsAlG18Irm33WbE" },
            { key: "mumie", nameKey: "packMumie", uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.4up7Ds2u1bvNW4r0" }
        ],
        extraByMain: {
            lebender: [{ nameKey: "packBrand", uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.jLdazNiUxNrjUFUd" }, { nameKey: "packEis", uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.QV0J2XQTPD2bpGw2" }, { nameKey: "packKadaver", uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.t5Qd4ZQSJdvR659n" }, { nameKey: "packMoor", uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.ZYsbRLmnahm5EW4o" }, { nameKey: "packWasser", uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.LtkGA5O3nQHtxMlC" }],
            skelett: [{ nameKey: "packSkelettErhalten", uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.W9mFlprSHb65Klud" }, { nameKey: "packSkelettReste", uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.ajUph5iJBrrN0896" }],
            mumie: [{ nameKey: "packBandagen", uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.xDikAnIGFY8OD7jG" }, { nameKey: "packGetrocknet", uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.pkXs6We3MAAy8qdD" }, { nameKey: "packWachs", uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.nwRLzzP90kPw4rp4" }]
        },
        incompleteBody: { nameKey: "packIncomplete", uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.tlSRaMhVPBUBGz9Q" }
    };

    const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

    class RetroelixierApp extends HandlebarsApplicationMixin(ApplicationV2) {
        static DEFAULT_OPTIONS = {
            id: "retroelixier-app",
            classes: ["dsa5"],
            window: { resizable: true },
            position: { width: 620, height: 700 },
            actions: {
                cancel: function () { this.close(); },
                reanimate: async function () { await this._onReanimate(); },
                selectMainPack: function (e, t) { 
                    if (e.target.closest('.info-link') || e.target.closest('.info-link-inline')) return; 
                    this.selectedMainKey = (this.selectedMainKey === t.dataset.key) ? null : t.dataset.key; 
                    this.selectedExtraUuid = null; 
                    this.render(); 
                },
                selectExtraPack: function (e, t) { 
                    if (e.target.closest('.info-link') || e.target.closest('.info-link-inline')) return; 
                    this.selectedExtraUuid = (this.selectedExtraUuid === t.dataset.uuid) ? null : t.dataset.uuid; 
                    this.render(); 
                },
                toggleIncomplete: function (e, t) { this.incompleteChecked = t.checked; this.render(); },
                checkTarget: function () { this._onCheckTarget(); },
                
                showItem: async function (e, t) { 
                    e.stopPropagation(); 
                    const uuid = t.dataset?.uuid || t.closest('[data-uuid]')?.dataset?.uuid;
                    if (uuid) {
                        const doc = await fromUuid(uuid); 
                        if (doc && doc.sheet) doc.sheet.render(true);
                    }
                },
                
                showActor: function () { this.shownActor?.sheet.render(true); }
            }
        };

        static PARTS = { main: { template: TEMPLATE_PATH } };

        constructor(sourceActor, qs) {
            super();
            this.sourceActor = sourceActor;
            this.qs = qs;
            this._scrollPos = 0;
            this.options.window.title = loc("title");
            
            const targetsArrInit = Array.from(game.user.targets);
            this.initialTarget = targetsArrInit.length === 1 ? targetsArrInit[0] : null;
            this.initialTargetActor = this.initialTarget?.actor || null;

            this.isReanimatingTarget = false;
            if (this.initialTargetActor && this._isDefeated(this.initialTarget, this.initialTargetActor)) {
                this.isReanimatingTarget = true;
                this.shownActor = this.initialTargetActor;
            } else {
                this.shownActor = null;
            }

            this.selectedSize = this.shownActor ? this._readSizeCategoryRaw(this.shownActor) : "average";
            this.selectedMainKey = null;
            this.selectedExtraUuid = null;
            this.incompleteChecked = false;

            const styleId = "retroelixier-app-styles";
            if (!document.getElementById(styleId)) {
                document.head.insertAdjacentHTML("beforeend", `
                    <style id="${styleId}">
                        #dsa-retroelixier-container { 
                            --border-color: #736953a6; --bg-color: #e1d3c6; --bg-contrast-color: #333333; 
                            --sheet-border: #968678; --boldFont: "Signika"; --normalFont: "Signika"; 
                            --dsadesign1: #937b48; font-size: 14px; color: var(--bg-contrast-color); 
                            padding: 10px; height: 100%; box-sizing: border-box; overflow-y: auto; 
                            display: flex; flex-direction: column; 
                        }
                        #dsa-retroelixier-container fieldset { border: 1px solid var(--border-color); border-radius: 5px; padding: 10px; margin-bottom: 10px; }
                        #dsa-retroelixier-container legend { font-family: var(--boldFont); font-weight: bold; padding: 0 5px; }
                        
                        #dsa-retroelixier-container .drop-zone { border: 2px dashed var(--sheet-border); border-radius: 5px; padding: 10px; text-align: center; cursor: pointer; display: flex; justify-content: center; align-items: center; }
                        #dsa-retroelixier-container .profile { width: 80px; height: 80px; object-fit: cover; border: 1px solid var(--sheet-border); display: block; margin: 0 auto; }
                        
                        #dsa-retroelixier-container .row-section { display: flex; align-items: center; padding: 5px 0; }
                        #dsa-retroelixier-container .fourty { width: 40%; font-weight: bold; }
                        #dsa-retroelixier-container .sixty { width: 60%; }
                        
                        #dsa-retroelixier-container .improvements-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 5px; }
                        #dsa-retroelixier-container .imp-btn { 
                            position: relative; padding: 8px; cursor: pointer; text-align: center; 
                            background: rgba(0, 0, 0, 0.05); border: 1px solid var(--sheet-border); 
                            border-radius: 3px; transition: all 0.2s; font-family: var(--normalFont);
                            display: flex; justify-content: center; align-items: center;
                        }
                        #dsa-retroelixier-container .imp-btn:hover { background: rgba(0, 0, 0, 0.1); }
                        #dsa-retroelixier-container .imp-btn.selected { background: #e2d6c6; border: 1px solid #736953; font-weight: bold; }
                        #dsa-retroelixier-container .info-link { position: absolute; right: 5px; top: 50%; transform: translateY(-50%); color: #7a7971; z-index: 10; }
                        #dsa-retroelixier-container .info-link:hover, #dsa-retroelixier-container .info-link-inline:hover { color: var(--dsadesign1); }
                        
                        #dsa-retroelixier-container .incomplete-label { display: flex; align-items: center; gap: 10px; padding: 8px; border: 1px solid var(--border-color); border-radius: 3px; cursor: pointer; }
                        #dsa-retroelixier-container .incomplete-label.active { background: #e2d6c6; }

                        #dsa-retroelixier-container .check-btn { 
                            padding: 6px 15px; font-family: var(--boldFont); background: #e2d8c9; border: 1px solid #8e806b; 
                            border-radius: 3px; cursor: pointer; transition: 0.2s; 
                            display: flex; align-items: center; justify-content: center; gap: 5px; 
                            margin: 10px auto 0 auto; width: max-content; 
                        }
                        #dsa-retroelixier-container .check-btn:hover { background: #d4c8b6; border-color: var(--dsadesign1); }

                        #dsa-retroelixier-container .dialog-buttons { display: flex; justify-content: space-between; gap: 10px; margin-top: auto; padding-top: 15px; width: 100%; }
                        #dsa-retroelixier-container .dialog-buttons button { flex: 1; display: flex; justify-content: center; align-items: center; gap: 5px; padding: 8px; font-family: var(--boldFont); background: #e2d8c9; border: 1px solid #8e806b; cursor: pointer; border-radius: 2px; }
                        #dsa-retroelixier-container .dialog-buttons button:hover { background: #d4c8b6; }
                    </style>
                `);
            }
        }

        _isDefeated(t, a) {
            return t?.document?.combatant?.defeated || a?.statuses?.has("dead") || a?.statuses?.has("defeated") || 
                   a?.effects.some(e => ["tot", "dead", "defeated", "besiegt"].includes(e.name?.toLowerCase()));
        }

        _readSizeCategoryRaw(a) { return getProp(a, "system.status.size.value")?.toLowerCase() || "average"; }

        async _prepareContext() {
            const sizeMap = { tiny: "sizeTiny", small: "sizeSmall", average: "sizeMedium", big: "sizeLarge", giant: "sizeHuge" };
            
            const dynamicDict = {
                legend: loc("legend"), imgTooltip: loc("imgTooltip"), nameLabel: loc("nameLabel"), nameEmpty: loc("nameEmpty"),
                typeLabel: loc("typeLabel"), sizeLabel: loc("sizeLabel"), reanimate: loc("reanimate"), cancel: loc("cancel"),
                creationLegend: loc("creationLegend"), creationText: loc("creationText"), creationCheckBtn: loc("creationCheckBtn"),
                modpackLegendMain: loc("modpackLegendMain"), modpackLegendExtra: loc("modpackLegendExtra"),
                guideText: loc("guideText"), infoLegend: loc("infoLegend")
            };

            return {
                dict: dynamicDict, 
                imgSrc: this.shownActor?.img || "icons/svg/mystery-man-black.svg",
                actorUuid: this.shownActor?.uuid || "", 
                actorName: this.shownActor?.name || dynamicDict.nameEmpty,
                actorType: this.shownActor ? getProp(this.shownActor, "system.creatureClass.value") : "",
                sizeOptions: Object.entries(sizeMap).map(([k,v]) => ({ value: k, label: loc(v), selected: k === this.selectedSize })),
                sizeText: format("portionsRequired", { count: { tiny: "0,25", small: "0,5", average: "1", big: "2", giant: "4" }[this.selectedSize] || "1" }),
                showPacks: this.isReanimatingTarget,
                showCreationGuide: !this.isReanimatingTarget,
                selectedMainKey: this.selectedMainKey,
                mainPacks: PACKS.main.map(p => ({ ...p, name: loc(p.nameKey), selected: this.selectedMainKey === p.key })),
                extraPacks: this.selectedMainKey ? PACKS.extraByMain[this.selectedMainKey].map(p => ({ ...p, name: loc(p.nameKey), selected: this.selectedExtraUuid === p.uuid })) : [],
                packIncomplete: { ...PACKS.incompleteBody, name: loc(PACKS.incompleteBody.nameKey) }, 
                incompleteChecked: this.incompleteChecked
            };
        }

        _onRender(context, options) {
            super._onRender(context, options);
            const container = this.element.querySelector('#dsa-retroelixier-container');
            if (container) {
                container.scrollTop = this._scrollPos;
                this.element.addEventListener('scroll', (ev) => { if(ev.target.id === 'dsa-retroelixier-container') this._scrollPos = ev.target.scrollTop; }, true);
            }
            
            this.element.querySelector('#size-select')?.addEventListener('change', (ev) => { this.selectedSize = ev.currentTarget.value; this.render(); });
            const drop = this.element.querySelector("#drop-zone");
            drop?.addEventListener("dragover", e => e.preventDefault());
            drop?.addEventListener("drop", async (e) => {
                e.preventDefault();
                const data = JSON.parse(e.dataTransfer.getData("text/plain"));
                const d = await fromUuid(data.uuid);
                const a = d?.actor || d;
                if (a?.documentName !== "Actor") return;
                
                const ccv = (getProp(a, "system.creatureClass.value") || "").trim().toLowerCase();
                const allowed = ccv.startsWith(loc("undeadMindless").toLowerCase());
                if (!allowed) return ui.notifications.warn(loc("invalidDropType"));

                this.shownActor = a; this.isReanimatingTarget = false;
                this.selectedSize = this._readSizeCategoryRaw(a);
                this.render();
            });
        }

        _onCheckTarget() {
            const t = Array.from(game.user.targets)[0];
            if (t?.actor && this._isDefeated(t, t.actor)) {
                this.shownActor = t.actor; this.initialTarget = t; this.isReanimatingTarget = true; this.selectedSize = this._readSizeCategoryRaw(t.actor); this.render();
            } else { ui.notifications.info(loc("notDefeated")); }
        }

        async _onReanimate() {
            let finalQs = parseInt(this.qs, 10);
            if (isNaN(finalQs)) {
                const item = this.sourceActor.items.find(i => i.name.includes("Retroelixier") || i.name.includes("Retro Elixir"));
                finalQs = parseInt(getProp(item, "system.QL") || getProp(item, "system.step.value") || 1);
            }

            const scene = game.scenes.current;
            if (!this.shownActor) return ui.notifications.warn(loc("pleaseDropUndead"));
            if (this.isReanimatingTarget && !this.selectedMainKey) return ui.notifications.warn(loc("mainRequired"));

            let baseActor = this.isReanimatingTarget ? this.initialTarget.actor : this.shownActor;
            let actorData = baseActor.toObject();
            actorData.name = `${baseActor.name} (${loc("reanimated")})`;
            delete actorData._id;
            delete actorData.folder;

            const maxL = getProp(baseActor, "system.status.wounds.max") || 20;
            foundry.utils.setProperty(actorData, "system.status.wounds.value", maxL);

            actorData.items = actorData.items.filter(i => i.type !== "condition" && i.type !== "status");

            actorData.effects = actorData.effects.filter(e => {
                const hasStatusSet = Array.isArray(e.statuses) ? e.statuses.length > 0 : (e.statuses?.size > 0);
                const hasCoreStatus = e.flags?.core?.statusId;
                return !(hasStatusSet || hasCoreStatus);
            });

            const worldActor = await Actor.create(actorData);
            if (!worldActor) return ui.notifications.error(loc("errCreateWorldActor"));

            if (this.isReanimatingTarget) {
                const m = PACKS.main.find(p => p.key === this.selectedMainKey).uuid;
                await this._addItem(worldActor, m);
                if (this.selectedExtraUuid) await this._addItem(worldActor, this.selectedExtraUuid);
                if (this.incompleteChecked) await this._addItem(worldActor, PACKS.incompleteBody.uuid);
            }

            await this._addLoyalty(worldActor);
            
            const originalClass = (getProp(baseActor, "system.creatureClass.value") || "").trim().toLowerCase();
            let newClass = loc("undeadMindless");
            if (originalClass.includes(loc("humanoid").toLowerCase()) && originalClass.includes(loc("non").toLowerCase())) {
                newClass += `, ${loc("nonHumanoid")}`;
            } else if (originalClass.includes(loc("humanoid").toLowerCase())) {
                newClass += `, ${loc("humanoid")}`;
            }
            await worldActor.update({ "system.creatureClass.value": newClass });

            const qsd = await this._getQs(finalQs);
            await worldActor.createEmbeddedDocuments("ActiveEffect", [this._buildEffect(qsd, worldActor.uuid)]);

            const currentActorToken = this.sourceActor.token ? this.sourceActor.token : this.sourceActor.getActiveTokens()[0];
            let spawnX = currentActorToken ? currentActorToken.x + (canvas.grid.size || 50) : 0;
            let spawnY = currentActorToken ? currentActorToken.y : 0;
            if (this.isReanimatingTarget && this.initialTarget) { spawnX = this.initialTarget.x; spawnY = this.initialTarget.y; }

            const tData = await worldActor.getTokenDocument({
                name: worldActor.name,
                x: spawnX, y: spawnY,
                hidden: true, actorLink: false, 
                texture: { tint: "#6b6b6b" }, delta: { ownership: this.sourceActor.ownership }
            }, { parent: scene });
            
            const createdTokens = await scene.createEmbeddedDocuments("Token", [tData]);
            const tokenDoc = createdTokens[0];

            const sec = (await (new Roll("1d6")).evaluate()).total * 6;

            if (this.isReanimatingTarget && this.initialTarget?.actor) {
                try {
                    const visEffectTarget = this._buildVisibilityToggleEffectForTokenWithSeconds(this.initialTarget.document, sec, true);
                    await this.initialTarget.actor.createEmbeddedDocuments("ActiveEffect", [visEffectTarget]);
                } catch(e) { console.warn("Fehler beim Verstecken der Leiche:", e); }
            }

            await tokenDoc.actor.createEmbeddedDocuments("ActiveEffect", [
                this._buildVisibilityToggleEffectForTokenWithSeconds(tokenDoc, sec, false)
            ]);

            if (this.isReanimatingTarget && this.initialTarget) {
                try {
                    const grid = canvas.scene?.grid?.size ?? 0;
                    if (grid > 0) {
                        const axis = [["x"], ["y"], ["x", "y"]][Math.floor(Math.random() * 3)];
                        const update = { _id: tokenDoc.id };
                        for (const axe of axis) update[axe] = (tokenDoc[axe] ?? 0) + grid * (Math.random() > 0.5 ? 1 : -1);
                        await scene.updateEmbeddedDocuments("Token", [update]);
                    }
                } catch(e) {}
            }

            try {
                const speaker = ChatMessage.getSpeaker({ actor: this.sourceActor });
                const msg = this.isReanimatingTarget ? format("chatSpawnInfo", {name: baseActor.name, qs: finalQs}) : format("createdMulti", {name: baseActor.name, count: 1});
                await ChatMessage.create({ speaker, content: msg });
            } catch (e) {}

            this.close();
        }

        async _addItem(a, u) { const d = await fromUuid(u); if (d) await a.createEmbeddedDocuments("Item", [d.toObject()]); }
        
        async _addLoyalty(a) {
            const talentName = "Loyalität (Untot)";
            for (const pack of game.packs.filter(p => p.metadata.type === "Item")) {
                const index = await pack.getIndex();
                const entry = index.find(e => e.name === talentName);
                if (entry) {
                    const doc = await pack.getDocument(entry._id);
                    await a.createEmbeddedDocuments("Item", [doc.toObject()]);
                    break;
                }
            }
        }

        async _getQs(qs) {
            const r = await new Roll(qs <= 2 ? "1d3" : (qs <= 4 ? "1d6+3" : "2d6+8")).evaluate();
            const idx = Math.max(0, qs - 1);
            return { at: [0,1,1,1,2,2][idx], rs: [0,0,1,1,1,2][idx], loy: [1,1,1,2,2,2][idx], sec: r.total * 86400 };
        }

        _buildEffect(d, o) {
            return {
                name: "Retroelixier", img: "icons/svg/aura.svg", duration: { seconds: d.sec },
                changes: [{ key: "system.meleeStats.attack", mode: 2, value: d.at }, { key: "system.rangeStats.attack", mode: 2, value: d.at }, { key: "system.totalArmor", mode: 2, value: d.rs }, { key: "system.skillModifiers.FP", mode: 0, value: `Loyalität (Untot) ${d.loy}` }],
                flags: { dsa5: { onRemove: "await actor.addCondition('dead'); await actor.update({'system.status.wounds.value': 0});" } }
            };
        }

        _buildVisibilityToggleEffectForTokenWithSeconds(tokenDoc, seconds, willBeHiddenAfter) {
            const tokenId = tokenDoc?.id ?? "";
            const sceneId = tokenDoc?.parent?.id ?? "";
            const newHiddenStr = JSON.stringify(!!willBeHiddenAfter);
            const tokenIdStr = JSON.stringify(String(tokenId));
            const sceneIdStr = JSON.stringify(String(sceneId));
            
            const onRemoveCode =
                "const tokenId=" + tokenIdStr + "; " +
                "const sceneId=" + sceneIdStr + "; " +
                "const newHidden=" + newHiddenStr + "; " +
                "const tok = canvas && canvas.scene && canvas.scene.tokens ? canvas.scene.tokens.get(tokenId) : null; " +
                "if (game.user.isGM) { if (tok) { await tok.update({ hidden: newHidden }); } } else { " +
                "await game.socket.emit('world', { type: 'updateDocument', documentType: 'Token', scope: 'world', collection: 'tokens', data: { _id: tokenId, hidden: newHidden }, options: { diff: true }, parent: { type: 'Scene', id: sceneId } }); }";

            return {
                name: loc("timeForReanimation"),
                img: "icons/svg/clockwork.svg",
                duration: { seconds, startTime: game.time.worldTime },
                flags: { dsa5: { description: "Sichtbarkeitstimer", onRemove: onRemoveCode } },
                changes: []
            };
        }
    }

    game.dsa5Necromantheum.openRetroelixierApp = (actor, qs) => new RetroelixierApp(actor, qs).render(true);
});
