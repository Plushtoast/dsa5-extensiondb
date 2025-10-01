// This is a system macro used for automation. It is disfunctional without the proper context.

        
        const DICT = {
          de: {
            noTarget: "Kein Ziel ausgewählt! Bitte ein Token anvisieren.",
            nameBreath: "Rachenputzer",
            burning: "Brennend",
            ctxMissing: "Kontext fehlt: Actor nicht gesetzt.",
            qsInvalid: "Qualitätsstufe (QS) fehlt oder ist ungültig (1–6).",
            noToken: "Kein aktives Token des Auslösers gefunden.",
            noScene: "Keine aktive Szene gefunden.",
            combatSkill: "Bögen",
          },
          en: {
            noTarget: "No target selected! Please aim at a token.",
            nameBreath: "Throat Scrubber",
            burning: "Burning",
            ctxMissing: "Context missing: Actor not set.",
            qsInvalid: "Quality level (QS) missing or invalid (1–6).",
            noToken: "No active token of the source actor found.",
            noScene: "No active scene found.",
            combatSkill: "Bows",
          },
        };
        const L = (key) => (game.i18n?.lang?.startsWith("de") ? DICT.de[key] : DICT.en[key]) ?? key;
        
        // 0) Kontext prüfen
        if (!Actor) {
          ui.notifications.error(L("ctxMissing"));
          return;
        }
        if (typeof qs === "undefined" || qs < 1 || qs > 6) {
          ui.notifications.error(L("qsInvalid"));
          return;
        }
        
        // 1) Ziel-Logik UNVERÄNDERT
        const target = Array.from(game.user.targets)[0];
        if (!target) {
          ui.notifications.error(L("noTarget"));
          return;
        }
        const targetActor = target.actor;
        
        // 2) Quelle über kontrolliertes Token ermitteln 
        const scene = game.scenes?.active;
        if (!scene) {
          ui.notifications.error(L("noScene"));
          return;
        }
        const sourceTokenDoc = canvas?.tokens?.controlled?.[0]?.document;
        if (!sourceTokenDoc) {
          ui.notifications.error(L("noToken"));
          return;
        }
        const sourceActorDoc = sourceTokenDoc.actor;
        
        // 3) Schaden und Reichweite nach QS
        const dieTable = ["1d6", "1d6+2", "2d6", "2d6+2", "2d6+6", "2d6+6"];
        const ranges = ["0/3/3", "0/6/6", "0/8/8", "0/12/12", "0/16/16", "0/32/32"];
        const die = dieTable[qs - 1];
        const reach = ranges[qs - 1];
        
        let damage = 0;
        {
          const roll = new Roll(die);
          await roll.evaluate();
          damage = roll.total ?? 0;
        }
        
        // 4) Dummywaffe - Kapftechnik ist sprachsensitiv
        const weaponData = {
          name: L("nameBreath"), // Rachenputzer / Throat Scrubber
          type: "rangeweapon",
          img: "systems/dsa5/icons/categories/Rangeweapon.webp",
          system: {
            damage: { value: String(damage) },
            reloadTime: { value: 0, progress: 0 },
            reach: { value: reach },
            ammunitiongroup: { value: "-" },
            combatskill: { value: L("combatSkill") }, // DE: "Bögen", EN: "Bows"
            worn: { value: false },
            structure: { max: 0, value: 0 },
            quantity: { value: 1 },
            price: { value: 0 },
            weight: { value: 0 },
            effect: { value: "", attributes: "" },
          },
          effects: [],
        };
        
        // 4a) Brennend-Effekt ab QS 3
        if (qs >= 3) {
          weaponData.effects.push({
            name: L("burning"),
            type: "",
            img: "icons/svg/aura.svg",
            changes: [],
            duration: { startTime: null, seconds: null, rounds: null },
            flags: { dsa5: { advancedFunction: 2, args3: `await actor.addCondition("burning");` } },
            disabled: false,
            transfer: false,
          });
        }
        
        // 5) FDummywaffe
        const Itemdsa5 = game?.dsa5?.entities?.Itemdsa5;
        const weapon = new Itemdsa5(weaponData);
        

        const dialogOptions = {
          mode: "attack",
          bypass: true,
          cheat: true,
          predefinedResult: [{ val: 2, index: 0 }], // auto-hit
        };


        const sub = Itemdsa5.getSubClass(weapon.type);
        const setupData = await sub.setupDialog(
          null,
          dialogOptions,
          weapon,
          sourceActorDoc,
          sourceTokenDoc.id
        );
        
        // 6b) Ziel und Modifikator ergänzen
        setupData.testData.targets = [target.id];
        const defenseMalus = qs === 6 ? 2 : 0;
        if (Array.isArray(setupData.testData.situationalModifiers)) {
          setupData.testData.situationalModifiers.push({
            name: game.i18n.localize("MODS.defenseMalus"),
            value: defenseMalus,
            type: "defenseMalus",
            selected: true,
          });
        }
        
        // 7) Test automatisiert ausführen
        await sourceActorDoc.basicTest(setupData);
        
