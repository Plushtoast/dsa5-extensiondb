const lang = game.i18n.lang == "de" ? "de" : "en";

const dict = {
  de: {
    noActor: "Kein Actor gefunden. Dieses Makro muss zwingend aus dem Item heraus aufgerufen werden.",
    noOwner: (name) => `${name} hat keinen zugewiesenen Besitzer.`,
    noOwnerFound: "Der zugewiesene Besitzer konnte in der Welt nicht gefunden werden.",
    noCurses: (name) => `${name} besitzt keine Hexenflüche.`,
    notEnoughAsp: (current, required) => `${game.i18n.localize("DSAError.NotEnoughAsP")} (Gefunden: ${current} AsP, Benötigt: ${required} AsP)`,
    title: (name) => `Hexenflüche von ${name}`,
    dialogTitle: (name) => `Fluchauswahl (via ${name})`,
    emptyMessage: "Keine Hexenflüche gefunden."
  },
  en: {
    noActor: "No actor found. This macro must be called directly from the item.",
    noOwner: (name) => `${name} has no assigned owner.`,
    noOwnerFound: "The assigned owner could not be found in the world.",
    noCurses: (name) => `${name} has no Curses.`,
    notEnoughAsp: (current, required) => `${game.i18n.localize("DSAError.NotEnoughAsP")} (Found: ${current} AsP, Required: ${required} AsP)`,
    title: (name) => `Curses of ${name}`,
    dialogTitle: (name) => `Curse Selection (via ${name})`,
    emptyMessage: "No Curses found."
  }
}[lang];

(async () => {
    const petActor = typeof actor !== 'undefined' ? actor : null;
    if (!petActor) return ui.notifications.warn(dict.noActor);

    const aspCost = 1;
    const asp = foundry.utils.getProperty(petActor, "system.status.astralenergy.value") ?? 0;

    if (asp < aspCost) {
        return ui.notifications.warn(dict.notEnoughAsp(asp, aspCost));
    }

    const ownerArray = petActor.system.companionData?.owners || [];
    if (ownerArray.length === 0) {
        return ui.notifications.warn(dict.noOwner(petActor.name));
    }
    
    const ownerId = ownerArray[0].split(".")[1];
    const ownerActor = game.actors.get(ownerId);

    if (!ownerActor) {
        return ui.notifications.error(dict.noOwnerFound);
    }

    const hexenflueche = ownerActor.items.filter(i => 
        i.type === "spell" && 
        i.system.magicalActionKind?.value === "hexenflueche"
    );

    if (hexenflueche.length === 0) {
        return ui.notifications.info(dict.noCurses(ownerActor.name));
    }

    await petActor.update({ "system.status.astralenergy.value": Math.max(0, asp - aspCost) });

    if (typeof this !== 'undefined' && typeof this.automatedAnimation === "function") {
        this.automatedAnimation(1);
    }

    const templateData = {
        title: dict.title(ownerActor.name),
        hasSpells: true,
        spells: hexenflueche,
        hasLiturgies: false,
        liturgies: [],
        emptyMessage: dict.emptyMessage
    };

    const templatePath = "systems/dsa5/templates/dialog/dialog-act-spell-selection.hbs";
    
    const dialogContent = await foundry.applications.handlebars.renderTemplate(templatePath, templateData);

    let d = new Dialog({
        title: dict.dialogTitle(petActor.name),
        content: dialogContent,
        buttons: {},
        render: (html) => {
            html.find('.selectableRow[data-action="spellSelect"]').click(async (ev) => {
                ev.preventDefault();
                
                const itemId = ev.currentTarget.dataset.itemId;
                const spellItem = ownerActor.items.get(itemId);
                
                d.close();
                
                if (spellItem) {
                    const ownerTokens = ownerActor.getActiveTokens();
                    const tokenId = ownerTokens[0]?.id;
                    
                    const setupData = await spellItem.setupEffect(ev, {}, tokenId);
                    if (setupData) {
                        await ownerActor.basicTest(setupData);
                    }
                }
            });
        }
    }, {
        width: 700,
        classes: ["dsa5", "dialog", "sheet"] 
    });

    d.render(true);
})();
