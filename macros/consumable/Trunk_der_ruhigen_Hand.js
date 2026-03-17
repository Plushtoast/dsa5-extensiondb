// This is a system macro used for automation. It is disfunctional without the proper context.

        
        const lang = game.i18n.lang === "de" ? "de" : "en";
        const dict = {
          de: {
            talent_lockpicking: "Schlösserknacken",
            item_name: "Trunk der ruhigen Hand",
          },
          en: {
            talent_lockpicking: "Pick Locks", 
            item_name: "Potion of the Steady Hand",
          }
        };
        
        const TALENT = dict[lang].talent_lockpicking;
        const ITEM_NAME = dict[lang].item_name;
        
        // Dauer in Sekunden je QS
        const durations = [15 * 60, 30 * 60, 60 * 60, 2 * 60 * 60, 4 * 60 * 60, 8 * 60 * 60];
        const durationSeconds = durations[qs - 1];
        
        
        let changes = [];
        if (qs === 1) {
          // Erste Teilprobe FF um 1 erleichtert 
          changes = [{
            key: "system.skillModifiers.TPM",
            mode: 0,
            value: `${TALENT} 0|1|0`
          }];
        } else if (qs === 2 || qs === 3) {
          // Beide Teilproben FF um 1 erleichtert 
          changes = [{
            key: "system.skillModifiers.TPM",
            mode: 0,
            value: `${TALENT} 0|1|1`
          }];
        } else {
          // QS 4–6: Gesamte Probe um 1 erleichtert
          changes = [{
            key: "system.skillModifiers.step",
            mode: 0,
            value: `${TALENT} 1`
          }];
        }
        
        // Condition anwenden
        if (changes.length) {
          await actor.addCondition({
            name: ITEM_NAME,
            icon: "icons/svg/aura.svg",
            changes,
            duration: {
              seconds: durationSeconds,
              startTime: game.time.worldTime
            },
            flags: {
              dsa5: { description: ITEM_NAME }
            },
            type: "base",
            disabled: false,
            system: {}
          });
        }
        
