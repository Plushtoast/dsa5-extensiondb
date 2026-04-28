const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    skillName: "Körperbeherrschung",
    netActorName: "Wurfnetz",
    statusName: "Fixiert [Wurfnetz]",
    statusDesc: "Durch Wurfnetz fixiert.",
    itemName: "Entwirren (Netz)",
    itemLabel: (qs) => `Entwirren (Netz) (Ziel: ${qs} QS)`,
    interval: "1 Kampfrunde",
    cleanupList: ["Entwirren (Netz)", "Untangle (Net)"],
    noTarget: "Kein Ziel gewählt!",
    actorNotFound: (name) => `Actor "${name}" nicht gefunden!`,
    caughtMsg: (name) => `<h3>Gefangen!</h3><p><b>${name}</b> ist fixiert.</p><p>Das Netz kann durch eine Sammelprobe auf <b>Körperbeherrschung</b> gelöst oder das Seil mit einer scharfen Waffe zerschnitten werden.</p>`
  },
  en: {
    skillName: "Body Control",
    netActorName: "Throwing Net",
    statusName: "Fixed [Throwing Net]",
    statusDesc: "Fixed by throwing net.",
    itemName: "Untangle (Net)",
    itemLabel: (qs) => `Untangle (Net) (Target: ${qs} QS)`,
    interval: "1 Combat Round",
    cleanupList: ["Untangle (Net)", "Entwirren (Netz)"],
    noTarget: "No target selected!",
    actorNotFound: (name) => `Actor "${name}" not found!`,
    caughtMsg: (name) => `<h3>Caught!</h3><p><b>${name}</b> is fixed.</p><p>The net can be loosened by a cumulative check on <b>Body Control</b> or by cutting the rope with a sharp weapon.</p>`
  }
}[lang];

const TARGET_QS = 10;

const STATUS_DATA = {
    name: dict.statusName,
    label: dict.statusName,
    icon: "icons/svg/net.svg",
    statuses: ["fixated"],
    flags: { dsa5: { value: 1, description: dict.statusDesc } }
};

(async () => {
    const targets = Array.from(game.user.targets);
    if (targets.length === 0) return ui.notifications.warn(dict.noTarget);
    const targetToken = targets[0];
    const targetActor = targetToken.actor;

    let netActor = game.actors.find(a => a.name === dict.netActorName);
    if (!netActor) {
        for (let pack of game.packs) {
            if (pack.metadata.type !== "Actor") continue;
            const index = await pack.getIndex();
            const entry = index.find(e => e.name === dict.netActorName);
            if (entry) {
                netActor = await game.actors.importFromCompendium(pack, entry._id);
                break;
            }
        }
    }
    if (!netActor) return ui.notifications.error(dict.actorNotFound(dict.netActorName));

    const sysEffect = CONFIG.statusEffects.find(e => e.id == "fixated" || e.label == "Fixiert" || e.label == "Fixed");
    if (sysEffect?.icon) STATUS_DATA.icon = sysEffect.icon;

    let effectId;
    const existingEffect = targetActor.effects.find(e => e.name === dict.statusName);
    
    if (!existingEffect) {
        const effectDocs = await targetActor.createEmbeddedDocuments("ActiveEffect", [STATUS_DATA]);
        effectId = effectDocs[0].id;
    } else {
        effectId = existingEffect.id;
    }

    let spawnX = targetToken.x + canvas.grid.size;
    let spawnY = targetToken.y;
    if (spawnX > canvas.dimensions.width) spawnX = targetToken.x - canvas.grid.size;

    const tokenData = (await netActor.getTokenDocument()).toObject();
    tokenData.x = spawnX;
    tokenData.y = spawnY;
    tokenData.elevation = targetToken.elevation;
    tokenData.actorLink = false;

    const createdTokens = await canvas.scene.createEmbeddedDocuments("Token", [tokenData]);
    const netToken = createdTokens[0];
    const tokenActor = netToken.actor;

    await tokenActor.setFlag("dsa5", "netTargetId", targetActor.id);
    await tokenActor.setFlag("dsa5", "netEffectId", effectId);
    await targetActor.setFlag("dsa5", "capturedByNetTokenId", netToken.id);

    const oldItem = targetActor.items.find(i => dict.cleanupList.some(term => i.name.includes(term)));
    if (oldItem) await oldItem.delete();

    const sammelprobeData = {
        name: dict.itemLabel(TARGET_QS), 
        type: "aggregatedTest",
        img: "icons/svg/net.svg",
        system: {
            talent: { value: dict.skillName },
            cummulatedQS: { value: 0, target: 10 },
            allowedTestCount: { value: 10 }, 
            interval: { value: dict.interval },
            baseModifier: 0
        }
    };

    const createdItems = await targetActor.createEmbeddedDocuments("Item", [sammelprobeData]);
    const sammelprobeItem = createdItems[0];

    ChatMessage.create({
        content: dict.caughtMsg(targetActor.name)
    });

    sammelprobeItem.postItem();
})();
