const lang = game.i18n.lang === 'de' ? 'de' : 'en';

const dict = {
  de: {
    dialogContent: "Wähle die Wirkung:",
    btnQs1: "Kälte verzögert",
    btnQs4: "Unterkühlung -1",
    btnQs6: "Kälteresistenz"
  },
  en: {
    dialogContent: "Choose effect:",
    btnQs1: "Cold delayed",
    btnQs4: "Cold -1",
    btnQs6: "Cold Resistance"
  }
}[lang];

const currentQs = typeof qs !== 'undefined' ? qs : (source.system?.qs || 1);
const isCriticalCook = source?.flags?.dsa5?.CriticalCook;

const applyQs1 = async () => {};

const applyQs4 = async () => {
    if (actor.hasCondition("cold")) {
        await actor.removeCondition("cold", 1, false);
    }
};

const applyQs6 = async () => {
    const effectData = {
        name: `${source.name} (Kälteresistenz)`,
        icon: "icons/svg/aura.svg",
        duration: { seconds: 86400 },
        system: { 
            changes: [{ key: "system.temperature.coldProtection", value: "1", mode: 2 }], 
            visibility: { hideOnToken: false } 
        }
    };
    await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
};

if (isCriticalCook) {
    await applyQs1();
    await applyQs4();
    await applyQs6();
    return;
}

if (currentQs <= 3) {
    await applyQs1();
    return;
}

const buttons = [
    { action: "qs1", label: dict.btnQs1, callback: async () => await applyQs1() }
];

if (currentQs >= 4) {
    buttons.push({ action: "qs4", label: dict.btnQs4, callback: async () => await applyQs4() });
}

if (currentQs >= 6) {
    buttons.push({ action: "qs6", label: dict.btnQs6, callback: async () => await applyQs6() });
}

try {
    await foundry.applications.api.DialogV2.wait({
        window: { title: source.name },
        classes: ["dsa5"],
        content: `<p style="text-align: center; margin-bottom: 10px;"><b>${dict.dialogContent}</b></p>`,
        buttons: buttons
    });
} catch (err) {
}
