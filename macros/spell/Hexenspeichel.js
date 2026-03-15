// This is a system macro used for automation. It is disfunctional without the proper context.

                const lang = game.i18n.lang == "de" ? "de" : "en";
                
                const dict = {
                  de: {
                    effectName: "Hexenspeichel",
                    description: "Regeneriert 1 LeP pro Runde",
                    startInfo: "Hexenspeichel aktiviert"
                  },
                  en: {
                    effectName: "Witch's Salve",
                    description: "Regenerates 1 LeP per round",
                    startInfo: "Witch's Salve activated"
                  }
                }[lang];
                
                // --- KONFIGURATION ---
                const effectIcon = "systems/dsa5/icons/spellicons/spells/hexenspeichel.webp"; 
                const healAmount = -1; // -1 Schaden = +1 LeP Heilung
                
                // Dauer: 1 Kampfrunde pro QS
                const totalRounds = qs; 
                
                (async () => {
                
                  // Rekursive Funktion für den Loop
                  async function processHealingRound(roundsLeft) {
                    
                    // Abbruchbedingung
                    if (roundsLeft <= 0) return;
                
                    // 1. Erstelle den Effekt
                    const hotEffect = {
                      name: `${dict.effectName} (${roundsLeft})`, 
                      icon: effectIcon,
                      flags: { dsa5: { description: dict.description } },
                      origin: actor.uuid,
                      duration: { 
                          seconds: 5, // Füllt das Feld "Effekt-Dauer (in Sekunden)"
                          rounds: 1   
                      } 
                    };
                
                    let createdArr;
                    try {
                        createdArr = await actor.createEmbeddedDocuments("ActiveEffect", [hotEffect]);
                    } catch(e) { return; }
                
                    const effectId = createdArr[0].id;
                
                    // 2. Hook setzen: Warten auf Löschung des Effekts
                    const hookId = Hooks.on("deleteActiveEffect", async (deletedEffect) => {
                      // Prüfen, ob es der richtige Effekt ist
                      if (!deletedEffect || deletedEffect.id !== effectId) return;
                      
                      Hooks.off("deleteActiveEffect", hookId);
                
                      // 3. HEILUNG DURCHFÜHREN
                      await actor.applyDamage(healAmount);
                
                      // 4. Nächste Runde
                      await processHealingRound(roundsLeft - 1);
                    });
                  }
                
                  // --- START ---
                  ui.notifications.info(`${actor.name}: ${dict.startInfo} (${totalRounds} KR)`);
                  
                  await processHealingRound(totalRounds);
                
                })();
