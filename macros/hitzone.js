// ==========================================
// Vorheriger Code von hitzone.js - den sollte ich lieber nicht hochladen
// ==========================================

if (actor) {
                // PLATZHALTER: Prüfung ob Haken im Menü -> ermöglicht use von Schlimme Verletzungen
                const useDetailedWounds = true;

                if (useDetailedWounds) {
                    await Hitzones.hideResistButton($(ev.currentTarget).parents('.message').attr("data-message-id"));
                    
                    let hitZoneStr = hitType.toString();
                    
                    // Sucht all Effekte auf dem Charakter, die der Zone zugehörig sind
                    let zoneEffects = actor.effects.filter(e => e.getFlag("dsa5-compendium", "injuryZone") === hitZoneStr);
                    let injuredCodes = zoneEffects.map(e => e.getFlag("dsa5-compendium", "injuryCode"));

                    // Wenn schon 6 Effekte in dieser Zone existieren -> Bewusstlos
                    if (injuredCodes.length >= 6) {
                        await actor.addCondition("unconscious");
                        
                        const unconsciousEffectData = {
                            name: game.i18n.localize("INJURY.UnconsciousZoneTrauma"),
                            icon: "icons/svg/unconscious.svg",
                            duration: { rounds: 600, seconds: 3600 }
                        };
                        await actor.createEmbeddedDocuments("ActiveEffect", [unconsciousEffectData]);
                        
                        const msg = game.i18n.format("INJURY.ZoneTraumaMessage", { name: actor.name });
                        await ChatMessage.create(game.dsa5.apps.DSA5_Utility.chatDataSetup(msg));
                        
                        return;
                    }

                    // Wunde auswürfeln, bis eine Stelle getroffen wird, die noch nicht in injuredCodes steht
                    let dmg = 0;
                    let d6Roll;
                    let finalHitCode;
                    
                    do {
                        // Wenn true wird 1W6 zusätzlich geworfen
                        d6Roll = (await new Roll("1d6").evaluate()).total;
                        finalHitCode = `${hitZoneStr}${d6Roll}`; // Kombiniert HitType und W6 (z.B. "01")
                    } while (injuredCodes.includes(finalHitCode));

                    const injuryData = game.dsa5.config.severeInjuries[finalHitCode]; 
                    
                    let injuryLocation = game.i18n.localize(injuryData.locationKey);
                    let effectDuration = injuryData.duration || {};
                    let effectChanges = injuryData.changes ? [...injuryData.changes] : []; 
                    let effectStatuses = injuryData.statuses || [];

                    if (finalHitCode === "04") {
                        // sprachunabhängigen Talente für den 24h-Hässlich-Effekt
                        effectChanges.push(
                            { key: "system.skillModifiers.FP", mode: 2, value: `${game.i18n.localize("LocalizedIDs.seduction")} -1` },
                            { key: "system.skillModifiers.FP", mode: 2, value: `${game.i18n.localize("LocalizedIDs.fastTalk")} -1` },
                            { key: "system.skillModifiers.FP", mode: 2, value: `${game.i18n.localize("LocalizedIDs.commerce")} -1` }
                        );
                        
                        // Dynamischen Name "Schmerz (Wange)"
                        const specificPainName = `${game.i18n.localize("CONDITION.inpain")} (${injuryLocation})`;
                        
                        // 5-Minuten-Schmerz direkt als eigenen Effekt definieren und vergeben
                        const painEffectData = {
                            name: specificPainName,
                            icon: "icons/svg/blood.svg",
                            statuses: ["inpain"],
                            duration: DUR_5_MIN,
                            changes: [{ key: "system.condition.inpain", mode: 2, value: 1 }]
                        };
                        await actor.createEmbeddedDocuments("ActiveEffect", [painEffectData]);
                    }

                    if (injuryData.damageRoll) {
                        dmg = (await new Roll(injuryData.damageRoll).evaluate()).total;
                        await actor.applyDamage(dmg);
                    }

                    // Variablen für den custom effect
                    // Jede wunde erzeugt einen einen Effekt (manche nur als visuellen Speicher ohne Werteänderung)
                    const baseTitle = game.i18n.localize("INJURY.SevereTitle");
                    const effectName = (finalHitCode === "04") 
                            ? `${game.i18n.localize("CONDITION.inpain")} (${injuryLocation})`
                            : `${baseTitle}: ${injuryLocation}`;

                    // Effekt generieren und zuweisen
                    const customEffectData = {
                        name: effectName,
                        icon: "icons/svg/blood.svg",
                        changes: effectChanges,
                        statuses: effectStatuses,
                        duration: effectDuration,
                        flags: {
                            "dsa5-compendium": {
                                "injuryZone": hitZoneStr,
                                "injuryCode": finalHitCode
                            }
                        }
                    };
                    await actor.createEmbeddedDocuments("ActiveEffect", [customEffectData]);

                    // Detalierte Nachricht im Chat ausgeben
                    const message = game.i18n.format(`HITBOX.wounded${finalHitCode}`, { name: actor.name, dmg });
                    await ChatMessage.create(game.dsa5.apps.DSA5_Utility.chatDataSetup(message));

                } else {
                    const skill = actor.items.find(i => i.name == game.i18n.localize("LocalizedIDs.selfControl") && i.type == "skill");
                    if (skill) {
                        game.user._onUpdateTokenTargets([]);
                        actor.setupSkill(skill, { modifier }, token).then(setupData => {
                            actor.basicTest(setupData).then(async (res) => {
                                await Hitzones.hideResistButton($(ev.currentTarget).parents('.message').attr("data-message-id"));
                                
                                if (res.result.successLevel < 0) {
                                    let dmg = 0;
                                    let finalHitCode = hitType.toString();
                                    
                                    // Basisfälle
                                    switch (finalHitCode) {
                                        case "0": await actor.addCondition("stunned"); break;
                                        case "1": 
                                            dmg = (await new Roll("1d3+1").evaluate()).total;
                                            await actor.applyDamage(dmg);
                                            break;
                                        case "2": break;
                                        case "3": await actor.addCondition("prone"); break;
                                    }
                                    
                                    const message = game.i18n.format(`HITBOX.wounded${finalHitCode}`, { name: actor.name, dmg });
                                    await ChatMessage.create(game.dsa5.apps.DSA5_Utility.chatDataSetup(message));
                                }
                            });
                        });
                    }
                }
            }

// ==========================================
// Folgender Code von hitzone.js - den sollte ich lieber nicht hochladen
// ==========================================
