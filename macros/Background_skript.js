const getNetDict = () => {
    const lang = game.i18n.lang == "de" ? "de" : "en";
    return {
        de: {
            freeMsg: (name) => `<h3>Freiheit!</h3><p>Das Netz wurde entfernt. <b>${name}</b> ist frei.</p>`,
            itemSearch: ["Entwirren (Netz)", "Untangle (Net)"],
            netName: "Wurfnetz",
            statusName: "Fixiert [Wurfnetz]",
            targetRegex: /Ziel:\s*(\d+)/
        },
        en: {
            freeMsg: (name) => `<h3>Freedom!</h3><p>The net has been removed. <b>${name}</b> is free.</p>`,
            itemSearch: ["Untangle (Net)", "Entwirren (Netz)"],
            netName: "Throwing Net",
            statusName: "Fixed [Throwing Net]",
            targetRegex: /Target:\s*(\d+)/
        }
    }[lang];
};

Hooks.on("updateActor", async (actor, updateData) => {
    if (!game.user.isGM) return; 

    const newLeP = foundry.utils.getProperty(updateData, "system.status.wounds.value");
    if (newLeP === undefined) return;

    const targetId = actor.getFlag("dsa5", "netTargetId");
    const effectId = actor.getFlag("dsa5", "netEffectId");

    if (targetId && effectId && newLeP <= 0) {
        const dict = getNetDict();
        
        let targetActor;
        const token = canvas.tokens.placeables.find(t => t.actor && t.actor.id === targetId);
        if (token) {
            targetActor = token.actor;
        } else {
            targetActor = game.actors.get(targetId);
        }

        if (targetActor) {
            let effect = targetActor.effects.get(effectId);
            if (!effect) {
                effect = targetActor.effects.find(e => e.name === dict.statusName || e.label === dict.statusName);
            }
            if (!effect) {
                effect = targetActor.effects.find(e => e.statuses.has("fixated"));
            }

            if (effect) await effect.delete();

            ChatMessage.create({
                content: dict.freeMsg(targetActor.name),
                speaker: {alias: "System"}
            });
            
            await actor.unsetFlag("dsa5", "netTargetId");
            await targetActor.unsetFlag("dsa5", "capturedByNetTokenId");
            
            setTimeout(async () => {
                const item = targetActor.items.find(i => dict.itemSearch.some(term => i.name.includes(term)));
                if (item) await item.delete();
            }, 1000);
        }
    }
});

Hooks.on("updateItem", async (item, updateData, options, userId) => {
    if (!game.user.isGM) return;
    
    const dict = getNetDict();
    if (!dict.itemSearch.some(term => item.name.includes(term))) return;

    const currentQS = item.system.cummulatedQS.value;
    
    let realTarget = 10;
    const match = item.name.match(dict.targetRegex);
    if (match) realTarget = parseInt(match[1]);
    if (!match) {
         const altMatch = item.name.match(/(\d+)\s*QS/); 
         if (altMatch) realTarget = parseInt(altMatch[1]);
    }

    if (currentQS >= realTarget) {
        const actor = item.actor;
        if (!actor) return;

        const netTokenId = actor.getFlag("dsa5", "capturedByNetTokenId");
        if (!netTokenId) return;

        const netToken = canvas.scene.tokens.get(netTokenId);
        
        if (netToken && netToken.actor) {
            if (netToken.actor.system.status.wounds.value > 0) {
                let itemData = null;

                let worldItem = game.items.find(i => i.name === dict.netName);
                if (worldItem) {
                    itemData = worldItem.toObject();
                }

                if (!itemData) {
                    const armoryPack = game.packs.find(p => 
                        p.metadata.type === "Item" && 
                        (p.metadata.packageName === "dsa5-aventurian-armory" || 
                         p.metadata.label.includes("Rüstkammer") || 
                         p.metadata.label.includes("Armory"))
                    );
                    if (armoryPack) {
                        const index = await armoryPack.getIndex();
                        const entry = index.find(e => e.name === dict.netName);
                        if (entry) itemData = (await armoryPack.getDocument(entry._id)).toObject();
                    }
                }

                if (!itemData) {
                    for (let pack of game.packs) {
                        if (pack.metadata.type !== "Item") continue;
                        const index = await pack.getIndex();
                        const entry = index.find(e => e.name === dict.netName);
                        if (entry) {
                            itemData = (await pack.getDocument(entry._id)).toObject();
                            break; 
                        }
                    }
                }

                if (itemData) {
                    await netToken.actor.createEmbeddedDocuments("Item", [itemData]);
                }

                await netToken.actor.update({"system.status.wounds.value": 0});
            }
        }
    }
});
