(async () => {
    if (!testData || !actor || !source) return;

    const msgId = event?.target?.closest('.chat-message')?.dataset?.messageId || testData?.messageId;
    const msg = msgId ? game.messages.get(msgId) : null;

    const lang = game.i18n.lang === "de" ? "de" : "en";
    const dict = {
        de: {
            title: "Waffe verzaubern",
            descTop: "Mit diesem Ritual lassen sich arkane Kräfte in eine Waffe binden. Diese gilt dann als magische Waffe. Die Kosten des Rituals sind abhängig von der Größe der Waffe.",
            currentCost: "Aktuelle Kosten",
            permCostLabel: "permanente AsP",
            availableAsp: "Verfügbare AsP",
            selectWeapon: "Waffe wählen",
            cat1: "Dolche, Fechtwaffen, Kurzschwerter",
            cat2: "Hiebwaffen, Kettenwaffen, Schwerter",
            cat3: "Zweihändig geführte Waffen",
            qsAvailable: "Du hast",
            qsAvailable2: "QS zur Verfügung",
            durationBase: "Die Wirkungsdauer des Effektes beträgt",
            days: "Tage",
            years: "Jahre",
            descBottom: "Die Wirkungsdauer lässt sich auf QS x 30 Jahre erhöhen. In diesem Falle verfünffachen sich die AsP-Kosten, wobei 5 % davon permanent verloren gehen.",
            btnEnchant: "Verzaubern",
            confirmText: "Das Verzaubern von {item} verbraucht {asp} permanente AsP.",
            noWeapon: "Es wurde keine Waffe ausgewählt.",
            success: "Waffe erfolgreich verzaubert!",
            magicFaded: "Die Verzauberung von {item} ist abgeklungen.",
            noChatCard: "Zugehörige Chatkarte konnte nicht identifiziert werden.",
            and: "und"
        },
        en: {
            title: "Enchant Weapon",
            descTop: "With this ritual, arcane powers can be bound into a weapon. It is then considered a magical weapon. The costs of the ritual depend on the size of the weapon.",
            currentCost: "Current Costs",
            permCostLabel: "permanent AsP",
            availableAsp: "Available AsP",
            selectWeapon: "Select Weapon",
            cat1: "Daggers, Fencing Weapons, Short Swords",
            cat2: "Impact Weapons, Chain Weapons, Swords",
            cat3: "Two-Handed Weapons",
            qsAvailable: "You have",
            qsAvailable2: "QL available",
            durationBase: "The duration of the effect is",
            days: "days",
            years: "years",
            descBottom: "The duration can be increased to QS x 30 years. In this case, the AsP costs are multiplied by five, with 5% permanently lost.",
            btnEnchant: "Enchant",
            confirmText: "Enchanting {item} permanently consumes {asp} AsP.",
            noWeapon: "No weapon was selected.",
            success: "Weapon successfully enchanted!",
            magicFaded: "The enchantment of {item} has faded.",
            noChatCard: "Associated chat card could not be identified.",
            and: "and"
        }
    }[lang];

    if (!msg) {
        ui.notifications.error(dict.noChatCard);
        return;
    }

    const chatBaseCost = parseInt(msg.flags.data?.preData?.calculatedSpellModifiers?.finalcost);
    const spellQs = qs;
    const currentAsp = actor.system.status.astralenergy.value;
    
    const weapons = actor.items.filter(i => {
        if (!["meleeweapon", "rangeweapon"].includes(i.type)) return false;
        const skill = (i.system.combatskill?.value || "").toLowerCase();
        return !(skill.includes(_loc("LocalizedIDs.Shields").toLowerCase()) || skill.includes(_loc("LocalizedIDs.wrestle").toLowerCase()));
    });
    
    const weaponOptions = weapons.map(w => `<option value="${w.id}">${w.name}</option>`).join("");

    const content = `
        <div class="dsa-info-box">
            ${dict.descTop}
        </div>
        <div class="row-section dsamb-2 dsapx-1" style="justify-content: space-between;">
            <div>
                <strong>${dict.currentCost}: <span id="ew-cost">${chatBaseCost}</span> AsP</strong><span id="ew-perm-cost" class="darkred dsahidden"></span>
            </div>
            <strong>${dict.availableAsp}: ${currentAsp} AsP</strong>
        </div>
        
        <div id="ew-container" class="groupbox paddingBox dsamb-2">
            <div class="row-section gap10px dsamb-2" style="align-items: start;">
                <div id="ew-icon-container" style="flex: 0 0 40px; height: 40px; background: var(--dsa-muted-bg); border-radius: 4px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                    <i class="fas fa-question" style="color: #888; font-size: 1.5rem;"></i>
                </div>
                <div class="columnFlex gap5px" style="flex: 1.5;">
                    <select id="ew-weapon-select" style="width: 100%;">
                        <option value="">-- ${dict.selectWeapon} --</option>
                        ${weaponOptions}
                    </select>
                    <div id="ew-weapon-type-container" class="dsahidden small" style="opacity: 0.8;">
                        <span style="float: left;">${_loc("TYPES.Item.combatskill")}:</span>
                        <em style="float: right;"><span id="ew-weapon-type"></span></em>
                        <div style="clear: both;"></div>
                    </div>
                </div>
                <div class="columnFlex gap5px" style="flex: 1.2;">
                    <select id="ew-category-select" style="width: 100%;">
                        <option value="0">${dict.cat1}</option>
                        <option value="10">${dict.cat2}</option>
                        <option value="25">${dict.cat3}</option>
                    </select>
                    <div class="center small" style="opacity: 0.8; min-height: 18px;">
                        <strong id="ew-cost-increase"></strong>
                    </div>
                </div>
            </div>
            <div class="dsapt-1" style="border-top: 1px solid var(--border-color);">
                ${dict.qsAvailable} <strong>${spellQs}</strong> ${dict.qsAvailable2} -
                ${dict.durationBase} <strong id="ew-duration">${spellQs * 3} ${dict.days}</strong>.
            </div>
        </div>
        
        <div class="row-section gap10px dsamb-2 dsapx-1">
            <input type="checkbox" id="ew-extend-duration" style="margin-top: 4px; flex-shrink: 0;">
            <label for="ew-extend-duration" style="line-height: 1.4;">${dict.descBottom}</label>
        </div>
    `;

    const { DialogV2 } = foundry.applications.api;

    const myDialog = new DialogV2({
        window: { title: `${source.name} - ${dict.title}`, resizable: true },
        position: { width: 760, height: "auto" },
        classes: ["dsa5"],
        content: content,
        buttons: [
            {
                action: "enchant",
                label: dict.btnEnchant,
                callback: async (event, button, dialog) => {
                    const html = dialog.element; 
                    const weaponId = html.querySelector("#ew-weapon-select").value;
                    if (!weaponId) {
                        ui.notifications.warn(dict.noWeapon);
                        return false; 
                    }

                    const weapon = actor.items.get(weaponId);
                    const isExtended = html.querySelector("#ew-extend-duration").checked;
                    const addedCost = parseInt(html.querySelector("#ew-category-select").value);
                    const totalCost = isExtended ? (chatBaseCost + addedCost) * 5 : (chatBaseCost + addedCost);

                    if (actor.system.status.astralenergy.value < totalCost) {
                        ui.notifications.warn(_loc("DSAError.NotEnoughAsP"));
                        return false; 
                    }

                    let permCost = 0;
                    let chatCost = totalCost;

                    if (isExtended) {
                        permCost = Math.round(totalCost * 0.05);
                        chatCost = totalCost - permCost; 

                        if (permCost > 0) {
                            const confirmed = await DialogV2.confirm({
                                window: { title: _loc("confirm"), resizable: true },
                                content: `<div style="padding: 10px; font-size: 1.1em; text-align: center;">${dict.confirmText.replace("{item}", `<strong>${weapon.name}</strong>`).replace("{asp}", permCost)}</div>`,
                                rejectClose: false 
                            });
                            if (!confirmed) return false;
    
                            const newModifier = (actor.system.status.astralenergy.modifier || 0) - permCost;
                            await actor.update({"system.status.astralenergy.modifier": newModifier});
                        }
                    }

                    const durationSecs = isExtended ? (spellQs * 30 * 365 * 86400) : (spellQs * 3 * 86400);
                    const effectName = `${source.name} (${weapon.name})`;
                    
                    const existingEffects = weapon.effects.filter(e => e.name === effectName);
                    if (existingEffects.length > 0) {
                        await weapon.deleteEmbeddedDocuments("ActiveEffect", existingEffects.map(e => e.id));
                    }

                    const currentAttr = weapon.system.effect?.attributes || "";
                    if (!currentAttr.includes(_loc("WEAPON.magical"))) {
                        const newAttr = currentAttr.trim() !== "" ? `${currentAttr}, ${_loc("WEAPON.magical")}` : _loc("WEAPON.magical");
                        await weapon.update({"system.effect.attributes": newAttr});
                    }

                    const onRemoveMacro = `
                        const targetItem = typeof effect !== 'undefined' ? effect.parent : null;
                        if (targetItem) {
                            let attr = targetItem.system.effect?.attributes || "";
                            let cleanedAttr = attr.replace("${_loc("WEAPON.magical")}", "").replace(/,\\s*,/g, ",").replace(/^,\\s*/, "").replace(/,\\s*$/, "").trim();
                            targetItem.update({"system.effect.attributes": cleanedAttr});
                            ui.notifications.info("${dict.magicFaded.replace("{item}", weapon.name)}");
                        }
                    `;

                    await weapon.createEmbeddedDocuments("ActiveEffect", [{
                        name: effectName,
                        img: source.img,
                        type: "base",
                        transfer: true,
                        start: {
                            time: game.time.worldTime
                        },
                        duration: {
                            value: durationSecs,
                            units: "seconds"
                        },
                        system: { 
                            visibility: { hideOnToken: true, hidePlayers: false } 
                        },
                        flags: { dsa5: { onRemove: onRemoveMacro } }
                    }]);

                    const parser = new DOMParser();
                    const doc = parser.parseFromString(msg.content, "text/html");

                    doc.querySelectorAll('[data-cost]').forEach(el => el.setAttribute('data-cost', chatCost));
                    doc.querySelectorAll('span.costCheck').forEach(span => {
                        const textNode = span.previousSibling;
                        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                            textNode.nodeValue = ` ${chatCost} `;
                        }
                    });

                    doc.querySelectorAll('.ew-injected-perm').forEach(el => el.remove());

                    if (isExtended && permCost > 0) {
                        const firstCostCheck = doc.querySelector('span.costCheck');
                        if (firstCostCheck) {
                            const costRow = firstCostCheck.closest('.row-section') || firstCostCheck.parentElement; 
                            if (costRow) {
                                const permRow = doc.createElement(costRow.tagName.toLowerCase());
                                if (costRow.classList.contains("row-section")) {
                                    permRow.className = "row-section ew-injected-perm";
                                    permRow.innerHTML = `<div class="col eighty"><b>${_loc("permanentCost")}</b>: ${permCost}</div>`;
                                } else {
                                    permRow.className = "ew-injected-perm";
                                    permRow.style.display = "block";
                                    permRow.style.marginTop = "2px";
                                    permRow.innerHTML = `<b>${_loc("permanentCost")}</b>: ${permCost}`;
                                }
                                costRow.parentNode.insertBefore(permRow, costRow.nextSibling);
                            }
                        }
                    }

                    const pData = foundry.utils.duplicate(msg.flags.data?.preData || {});
                    const tData = foundry.utils.duplicate(msg.flags.data?.postData || {});
                    
                    if (!pData.calculatedSpellModifiers) pData.calculatedSpellModifiers = {};
                    if (!tData.calculatedSpellModifiers) tData.calculatedSpellModifiers = {};
                    
                    pData.calculatedSpellModifiers.finalcost = chatCost;
                    tData.calculatedSpellModifiers.finalcost = chatCost;

                    await msg.update({ 
                        content: doc.body.innerHTML,
                        "flags.data.preData": pData,
                        "flags.data.postData": tData
                    });

                    ui.notifications.info(dict.success);
                    return true; 
                }
            },
            { action: "cancel", label: _loc("cancel") }
        ]
    });

    await myDialog.render(true);

    const updateUI = () => {
        const html = myDialog.element;
        const addedCost = parseInt(html.querySelector("#ew-category-select").value);
        const weaponId = html.querySelector("#ew-weapon-select").value;
        const isExt = html.querySelector("#ew-extend-duration").checked;
        
        let currentTotal = chatBaseCost + addedCost;

        html.querySelector("#ew-cost-increase").innerText = addedCost > 0 ? `+${addedCost} AsP` : "";

        const permSpan = html.querySelector("#ew-perm-cost");
        if (isExt) {
            currentTotal *= 5;
            const pCost = Math.round(currentTotal * 0.05);
            html.querySelector("#ew-duration").innerText = `${spellQs * 30} ${dict.years}`;
            permSpan.innerText = ` ${dict.and} ${pCost} ${dict.permCostLabel}`;
            permSpan.classList.remove("dsahidden");
        } else {
            html.querySelector("#ew-duration").innerText = `${spellQs * 3} ${dict.days}`;
            permSpan.classList.add("dsahidden");
        }
        
        html.querySelector("#ew-cost").innerText = currentTotal;

        const wTypeCont = html.querySelector("#ew-weapon-type-container");
        const iconCont = html.querySelector("#ew-icon-container");

        if (weaponId) {
            const w = actor.items.get(weaponId);
            wTypeCont.classList.remove("dsahidden");
            html.querySelector("#ew-weapon-type").innerText = w?.system?.combatskill?.value || _loc("unknown");
            iconCont.innerHTML = `<img src="${w.img}" style="width: 100%; height: 100%; object-fit: cover; border: none;">`;
        } else {
            wTypeCont.classList.add("dsahidden");
            iconCont.innerHTML = `<i class="fas fa-question" style="color: #888; font-size: 1.5rem;"></i>`;
        }
    };

    myDialog.element.addEventListener("change", (e) => {
        if (["ew-weapon-select", "ew-category-select", "ew-extend-duration"].includes(e.target.id)) updateUI();
    });

    updateUI();
})();
