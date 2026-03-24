// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";

const dict = {
  de: {
    dialogTitle: "Elementare Manifestation",
    dialogText: "Der Zauberspruch ruft eine kleine Menge eines Elements herbei.<br><i>Welches Element möchtest du manifestieren?</i>",
    btnManifest: "Manifestieren",
    btnCancel: "Abbrechen",
    noActor: "Kein gültiges Ziel (Actor) vorhanden.",
    noSelection: "Bitte wähle ein Element aus.",
    elements: {
      humus: { name: "Humus", label: "Humusessenz", flavor: "Ein Klumpen fruchtbarer, warm pulsierender Erde" },
      fire:  { name: "Feuer", label: "Feueressenz", flavor: "Eine kleine, ewig tanzende Flamme" },
      air:   { name: "Luft",  label: "Luftessenz",  flavor: "Ein gefangener, wirbelnder Luftzug" },
      ice:   { name: "Eis",   label: "Eisessenz",   flavor: "Ein perfekt geformter, nie schmelzender Eiskristall" },
      water: { name: "Wasser",label: "Wasseressenz",flavor: "Eine schwebende Kugel reinsten Quellwassers" },
      ore:   { name: "Erz",   label: "Erzessenz",   flavor: "Ein Stück rohes, ungewöhnlich schweres Erz" }
    },
    chatInfo: "<i>{desc}</i> manifestiert sich im Besitz von <b>{name}</b> zu <b>{qs}x {item}</b>."
  },
  en: {
    dialogTitle: "Elemental Manifestation",
    dialogText: "The spell summons a small amount of an element.<br><i>Which element do you want to manifest?</i>",
    btnManifest: "Manifest",
    btnCancel: "Cancel",
    noActor: "No valid target (Actor) found.",
    noSelection: "Please select an element.",
    elements: {
      humus: { name: "Humus", label: "Humus Essence", flavor: "A lump of fertile, warm pulsing earth" },
      fire:  { name: "Fire",  label: "Fire Essence",  flavor: "A small, eternally dancing flame" },
      air:   { name: "Air",   label: "Air Essence",   flavor: "A trapped, swirling draft of air" },
      ice:   { name: "Ice",   label: "Ice Essence",   flavor: "A perfectly formed, never-melting ice crystal" },
      water: { name: "Water", label: "Water Essence", flavor: "A floating orb of purest spring water" },
      ore:   { name: "Ore",   label: "Ore Essence",   flavor: "A piece of raw, unusually heavy ore" }
    },
    chatInfo: "<i>{desc}</i> manifests in <b>{name}'s</b> possession into <b>{qs}x {item}</b>."
  }
}[lang];

if (!actor) {
    ui.notifications.warn(dict.noActor);
    return;
}

const content = `
<div class="marginBottom">
  <p class="center">${dict.dialogText}</p>
  
  <div class="dsa-card-list">
    <ul class="dsa-grid-2col">
      <li class="dsa-list-no-margin">
        <label>
          <input type="radio" name="element" value="humus">
          <span class="center width100">${dict.elements.humus.name}</span>
        </label>
      </li>
      <li class="dsa-list-no-margin">
        <label>
          <input type="radio" name="element" value="fire">
          <span class="center width100">${dict.elements.fire.name}</span>
        </label>
      </li>
      <li class="dsa-list-no-margin">
        <label>
          <input type="radio" name="element" value="air">
          <span class="center width100">${dict.elements.air.name}</span>
        </label>
      </li>
      <li class="dsa-list-no-margin">
        <label>
          <input type="radio" name="element" value="ice">
          <span class="center width100">${dict.elements.ice.name}</span>
        </label>
      </li>
      <li class="dsa-list-no-margin">
        <label>
          <input type="radio" name="element" value="water">
          <span class="center width100">${dict.elements.water.name}</span>
        </label>
      </li>
      <li class="dsa-list-no-margin">
        <label>
          <input type="radio" name="element" value="ore">
          <span class="center width100">${dict.elements.ore.name}</span>
        </label>
      </li>
    </ul>
  </div>
</div>
`;

const selectedKey = await foundry.applications.api.DialogV2.wait({
    window: { title: dict.dialogTitle },
    classes: ["dsa5"],
    content: content,
    rejectClose: false,
    buttons: [
        {
            action: "manifest",
            icon: "fa-solid fa-check",
            label: dict.btnManifest,
            default: true,
            callback: (event, button, dialog) => {
                const selected = dialog.element.querySelector('input[name="element"]:checked');
                
                if (!selected) {
                    ui.notifications.warn(dict.noSelection);
                    return null;
                }
                return selected.value; 
            }
        },
        {
            action: "cancel",
            icon: "fa-solid fa-xmark",
            label: dict.btnCancel,
            callback: () => null 
        }
    ]
});

if (typeof selectedKey !== "string" || !dict.elements[selectedKey]) return;

const elData = dict.elements[selectedKey];
        
const itemData = {
    name: elData.label,
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
        
const infoText = dict.chatInfo
    .replace("{name}", actor.name)
    .replace("{qs}", qs)
    .replace("{item}", elData.label)
    .replace("{desc}", elData.flavor);

ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: speakerSource }),
    flavor: dict.dialogTitle, 
    content: infoText
});
