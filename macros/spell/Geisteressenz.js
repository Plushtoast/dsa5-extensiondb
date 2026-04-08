// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    itemName: "Geisteressenz",
    flavor: "Ektoplasmatische Manifestation",
    info: "Ektoplasma kondensiert aus der Luft und verfestigt sich im Besitz von <b>{name}</b> zu <b>{qs}x Geisteressenz</b>.",
    noActor: "Kein gültiges Ziel (Actor) vorhanden."
  },
  en: {
    itemName: "Phantom Essence",
    flavor: "Ectoplasmic Manifestation",
    info: "Ectoplasm condenses from the air and solidifies in <b>{name}'s</b> possession into <b>{qs}x Phantom Essence</b>.",
    noActor: "No valid target (Actor) found."
  }
}[lang];

if (!actor) {
    ui.notifications.warn(dict.noActor);
    return;
}

const itemData = {
  name: dict.itemName,
  type: "consumable",
  img: "systems/dsa5/icons/categories/consumable.webp",
  system: {
    quantity: { value: qs },
    weight: { value: 0.05 },
    equipmentType: { value: "tools" }
  }
};

await actor.createEmbeddedDocuments("Item", [itemData]);

const speakerSource = (typeof sourceActor !== "undefined") ? sourceActor : actor;

ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: speakerSource }),
    flavor: dict.flavor, 
    content: dict.info.replace("{qs}", qs).replace("{name}", actor.name)
});
