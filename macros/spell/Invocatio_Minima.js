// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    itemName: "Dämonische Essenz",
    flavor: "Manifestation aus den Niederhöllen",
    info: "Ein beißender Schwefelgeruch erfüllt die Luft, während sich dunkle Energie im Besitz von <b>{name}</b> zu <b>{qs}x Essenz der Niederhöllen</b> verdichtet.",
    noActor: "Kein gültiges Ziel (Actor) vorhanden."
  },
  en: {
    itemName: "Demonic Essence",
    flavor: "Manifestation from the Lower Hells",
    info: "A pungent scent of sulfur fills the air as dark energy condenses in <b>{name}'s</b> possession into <b>{qs}x Demonic Essence</b>.",
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
