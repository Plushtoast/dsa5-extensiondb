const lang = game.i18n.lang === "de" ? "de" : "en";

const dict = {
    de: {
        traitName: "Wolfsapfel",
        effectName: "Wirkung: Wolfsapfel",
        effectDesc: "Der Mähnenwolf ernährt sich nicht nur von Beutetieren, sondern auch von seiner Lieblingsfrucht, dem Wolfsapfel. Hat der Mähnenwolf von einen solchen gegessen, erhält er einen Bonus von +1 auf KK und TP für die nächsten 12 Stunden."
    },
    en: {
        traitName: "Wolf Apple",
        effectName: "Effect: Wolf Apple",
        effectDesc: "The maned wolf not only feeds on prey, but also on its favorite fruit, the wolf apple. If the maned wolf has eaten one, it receives a +1 bonus to Strength and Damage for the next 12 hours."
    }
}[lang];

const hasTrait = actor.items.find(i => i.name === dict.traitName && i.type === "trait");

if (hasTrait) {
    let condition = {
        name: dict.effectName,
        icon: "icons/svg/aura.svg",
        changes: [
            { key: "system.characteristics.kk.gearmodifier", mode: 2, value: 1 },
            { key: "@trait.[a-z ]*.system.damage.value", mode: 2, value: 1 }
        ],
        duration: {
            seconds: 12 * 60 * 60, 
            startTime: game.time.worldTime
        },
        flags: {
            dsa5: {
                description: dict.effectDesc
            }
        }
    };
    
    await actor.addCondition(condition);
}
