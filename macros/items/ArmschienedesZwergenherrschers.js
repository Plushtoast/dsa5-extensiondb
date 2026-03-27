// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
    de: {
        onceWarning: (name) => `Du kannst <b>${name}</b> nur einmal verwenden.`,
        accept: "Annehmen",
        cancel: "Abbrechen",
        alreadyUsedWarning: (name) => `<b>${name}</b> wurde bereits verwendet.`
    },
    en: {
        onceWarning: (name) => `You can only use <b>${name}</b> once.`,
        accept: "Accept",
        cancel: "Cancel",
        alreadyUsedWarning: (name) => `<b>${name}</b> has already been used.`
    }
}[lang];

if (item.getFlag("dsa5", "alreadyused")) {
    ui.notifications.warn(dict.alreadyUsedWarning(item.name));
    return;
}

const { ApplicationV2 } = foundry.applications.api;

class ItemUseApp extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
        id: `item-use-${item.id}`,
        classes: ["dsa5"],
        window: { 
            title: item.name, 
            resizable: false 
        },
        position: { 
            width: 400, 
            height: "auto" 
        },
        actions: {
            accept: function() { this._onAccept(); },
            cancel: function() { this.close(); }
        }
    };

    async _renderHTML(context, options) {
        return `
            <div class="paddingBox center marginBottom">
                <p>${dict.onceWarning(item.name)}</p>
            </div>
            <div class="row-section gap5px">
                <button type="button" class="col two dsa5 button" data-action="accept">
                    <i class="fas fa-check"></i> ${dict.accept}
                </button>
                <button type="button" class="col two dsa5 button" data-action="cancel">
                    <i class="fas fa-times"></i> ${dict.cancel}
                </button>
            </div>
        `;
    }

    _replaceHTML(result, content, options) {
        content.innerHTML = result;
    }

    async _onAccept() {
        await item.setFlag("dsa5", "alreadyused", true);
        
        const effectData = {
            name: item.name,
            icon: "icons/svg/aura.svg",
            changes: [
                { key: "system.characteristics.mu.gearmodifier", mode: 2, value: 3 },
                { key: "system.characteristics.kk.gearmodifier", mode: 2, value: 2 }
            ],
            duration: {
                rounds: 3,
                seconds: 18
            }
        };
        
        await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
        this.close();
    }
}

new ItemUseApp().render(true);
