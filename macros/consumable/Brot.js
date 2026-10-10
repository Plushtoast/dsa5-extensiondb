const lang = game.i18n.lang === 'de' ? 'de' : 'en';

const dict = {
  de: {
    dialogContent: "Welchen Typ von Belastung möchtest du für 1 Tag ignorieren?",
    btnGear: "Gepäck",
    btnArmor: "Rüstung"
  },
  en: {
    dialogContent: "Which encumbrance to ignore for 1 day?",
    btnGear: "Gear",
    btnArmor: "Armor"
  }
}[lang];

const currentQs = typeof qs !== 'undefined' ? qs : (source.system?.qs || 1);
const isCriticalCook = source?.flags?.dsa5?.CriticalCook;

const applyBreadEffect = async (ignoreGear, ignoreArmor, shortName) => {
    const changes = [];
    
    if (ignoreGear) {
        changes.push({ key: "system.carryModifier", value: "4", mode: 2 });
    }
    if (ignoreArmor) {
        changes.push({ key: "@armor.[\\w\\W]+.system.encumbrance.value", value: "-1", mode: 2 });
    }

    const effectData = {
        name: `${source.name} (${shortName})`,
        icon: "icons/svg/aura.svg",
        duration: { seconds: 86400 },
        system: { changes: changes, visibility: { hideOnToken: false } }
    };

    await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
};

if (isCriticalCook) {
    await applyBreadEffect(true, false, dict.btnGear);
    await applyBreadEffect(true, true, `${dict.btnGear} & ${dict.btnArmor}`);
    return;
}

if (currentQs <= 3) {
    await applyBreadEffect(true, false, dict.btnGear);
    return;
} else if (currentQs >= 6) {
    await applyBreadEffect(true, true, `${dict.btnGear} & ${dict.btnArmor}`);
    return;
}

const buttons = [
    { action: "gear", label: dict.btnGear, callback: async () => await applyBreadEffect(true, false, dict.btnGear) },
    { action: "armor", label: dict.btnArmor, callback: async () => await applyBreadEffect(false, true, dict.btnArmor) }
];

try {
    await foundry.applications.api.DialogV2.wait({
        window: { title: source.name },
        classes: ["dsa5"],
        content: `<p style="text-align: center; margin-bottom: 10px;"><b>${dict.dialogContent}</b></p>`,
        buttons: buttons
    });
} catch (err) {
}
