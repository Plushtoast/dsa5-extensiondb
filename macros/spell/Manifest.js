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

// CSS 
const styleId = "em-macro-styles";

if (!document.getElementById(styleId)) {
    document.head.insertAdjacentHTML("beforeend", `
      <style id="${styleId}">
        .em-dialog-text { font-size: 1.1em; margin-bottom: 10px; line-height: 1.4; }
        .em-element-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; margin-bottom: 10px; }
        .em-element-col { display: flex; flex-direction: column; gap: 5px; }
        .em-hidden-radio { position: absolute !important; left: -9999px !important; opacity: 0 !important; }
        
        .em-element-btn { 
          display: block; padding: 8px; text-align: center; border: 1px solid #7a7971; 
          background: rgba(0, 0, 0, 0.05); cursor: pointer; border-radius: 3px; 
          font-weight: bold; transition: all 0.2s; margin: 0; 
        }
        
        .em-element-btn::before, .em-element-btn::after { display: none !important; content: none !important; }
        .em-element-btn:hover { background: rgba(0, 0, 0, 0.1); }
        
        .em-hidden-radio:checked + .em-element-btn { 
          background: #968678 !important; 
          color: white !important; 
          border-color: #7a7971 !important; 
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.15) !important; 
        }
      </style>
    `);
}

const content = `
  <div class="em-dialog-text">${dict.dialogText}</div>
  <form>
    <div class="em-element-grid">
      <div class="em-element-col">
        <input type="radio" id="elem-humus" name="element" value="humus" class="em-hidden-radio">
        <label for="elem-humus" class="em-element-btn">${dict.elements.humus.name}</label>
        
        <input type="radio" id="elem-fire" name="element" value="fire" class="em-hidden-radio">
        <label for="elem-fire" class="em-element-btn">${dict.elements.fire.name}</label>
        
        <input type="radio" id="elem-air" name="element" value="air" class="em-hidden-radio">
        <label for="elem-air" class="em-element-btn">${dict.elements.air.name}</label>
      </div>
      <div class="em-element-col">
        <input type="radio" id="elem-ice" name="element" value="ice" class="em-hidden-radio">
        <label for="elem-ice" class="em-element-btn">${dict.elements.ice.name}</label>
        
        <input type="radio" id="elem-water" name="element" value="water" class="em-hidden-radio">
        <label for="elem-water" class="em-element-btn">${dict.elements.water.name}</label>
        
        <input type="radio" id="elem-ore" name="element" value="ore" class="em-hidden-radio">
        <label for="elem-ore" class="em-element-btn">${dict.elements.ore.name}</label>
      </div>
    </div>
  </form>
`;

const selectedKey = await foundry.applications.api.DialogV2.wait({
    window: { title: dict.dialogTitle },
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
