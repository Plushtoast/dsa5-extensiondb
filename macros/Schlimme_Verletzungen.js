// ==========================================
// Vorheriger Code den ich nicht von hitzone.js - den sollte ich lieber nicht hochladen
// ==========================================

if (res.result.successLevel < 0) {
                                let dmg = 0;
                                let finalHitCode = hitType.toString();
                                
                                // PLATZHALTER: Prüfung ob Haken im Menü (Menüeintrag aktuell nicht vorhanden) - ermöglicht use von Schlimme Verletzungen
                                const useDetailedWounds = true;
                                
                                // Wenn true wird 1W6 zusätzlich geworfen
                                if (useDetailedWounds) {
                                    const d6Roll = (await new Roll("1d6").evaluate()).total;
                                    finalHitCode = `${hitType}${d6Roll}`; // Kombiniert HitType und W6 (z.B. "01")
                                }


                                // Variablen für den custom effect
                                let createCustomEffect = false;
                                let injuryLocation = "";
                                let effectDuration = {};
                                let effectChanges = [];
                                let effectStatuses = [];

                                // Definition der Dauern (1 KR = 6 Sekunden)
                                const DUR_1_KR = { rounds: 1, seconds: 6 };
                                const DUR_5_MIN = { rounds: 50, seconds: 300 };
                                const DUR_24_H = { rounds: 14400, seconds: 86400 };

                                switch (finalHitCode) {
                                    // Basisfälle
                                    case "0":
                                        await actor.addCondition("stunned");
                                        break;
                                    case "1":
                                        dmg = (await new Roll("1d3+1").evaluate()).total;
                                        await actor.applyDamage(dmg);
                                        break;
                                    case "2":
                                        break;
                                    case "3":
                                        await actor.addCondition("prone");
                                        break;


                                    // KOPF (0) + 1W6
                                    case "01": // Nase (-2 AT, 1 KR)
                                        createCustomEffect = true;
                                        injuryLocation = game.i18n.localize("INJURY.Nose");
                                        effectDuration = DUR_1_KR;
                                        effectChanges = [
                                            { key: "system.meleeStats.attack", mode: 2, value: -2 },
                                            { key: "system.rangeStats.attack", mode: 2, value: -2 }
                                        ];
                                        break;
                                    case "02": // Ohr (Verwirrung, 5 Min)
                                        createCustomEffect = true;
                                        injuryLocation = game.i18n.localize("INJURY.Ear");
                                        effectDuration = DUR_5_MIN;
                                        effectStatuses = ["confused"];
                                        break;
                                   case "03": // Auge (2x Schmerz, 5 Min)
                                        createCustomEffect = true;
                                        injuryLocation = game.i18n.localize("INJURY.Eye");
                                        effectDuration = DUR_5_MIN;
                                        effectStatuses = ["inpain"];
                                        effectChanges = [
                                            { key: "system.condition.inpain", mode: 2, value: "2" }
                                        ];
                                        break;
                                    case "04": // Wange (Schmerz, 5 Min & Hässlich 24h)
                                        createCustomEffect = true;
                                        injuryLocation = game.i18n.localize("INJURY.Cheek");
                                        effectDuration = DUR_24_H; 
                                        
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
                                            changes: [
                                                { key: "system.condition.inpain", mode: 2, value: 1 }
                                            ]
                                        };
                                        await actor.createEmbeddedDocuments("ActiveEffect", [painEffectData]);
                                        break;
                                    case "05": // Stirn (-1 VT, 1 KR)
                                        createCustomEffect = true;
                                        injuryLocation = game.i18n.localize("INJURY.Forehead");
                                        effectDuration = DUR_1_KR;
                                        effectChanges = [
                                            { key: "system.combat.dodge", mode: 2, value: -1 },
                                            { key: "system.combat.parry", mode: 2, value: -1 }
                                        ];
                                        break;
                                    case "06": // Hinterkopf (Betäubung, 5 Min)
                                        createCustomEffect = true;
                                        injuryLocation = game.i18n.localize("INJURY.BackOfHead");
                                        effectDuration = DUR_5_MIN;
                                        effectStatuses = ["stunned"];
                                        break;

                                    // TORSO (1) + 1W6
                                    case "11": // Rippe (1W3 SP)
                                        dmg = (await new Roll("1d3").evaluate()).total;
                                        await actor.applyDamage(dmg);
                                        break;
                                    case "12": // Bauch (1W6 SP)
                                        dmg = (await new Roll("1d6").evaluate()).total;
                                        await actor.applyDamage(dmg);
                                        break;
                                    case "13": // Brust (1W3 SP)
                                        dmg = (await new Roll("1d3").evaluate()).total;
                                        await actor.applyDamage(dmg);
                                        break;
                                    case "14": // Schulter (-1 VT, 1 KR)
                                        createCustomEffect = true;
                                        injuryLocation = game.i18n.localize("INJURY.Shoulder");
                                        effectDuration = DUR_1_KR;
                                        effectChanges = [
                                            { key: "system.combat.dodge", mode: 2, value: -1 },
                                            { key: "system.combat.parry", mode: 2, value: -1 }
                                        ];
                                        break;
                                    case "15": // Rücken (1W3 SP)
                                        dmg = (await new Roll("1d3").evaluate()).total;
                                        await actor.applyDamage(dmg);
                                        break;
                                    case "16": // Genital (Schmerz, 5 Min)
                                        createCustomEffect = true;
                                        injuryLocation = game.i18n.localize("INJURY.Groin");
                                        effectDuration = DUR_5_MIN;
                                        effectStatuses = ["inpain"];
                                        break;

                                    // ARME (2) + 1W6 
                                    case "21": // Oberarm (-2 AT, 1 KR)
                                        createCustomEffect = true;
                                        injuryLocation = game.i18n.localize("INJURY.UpperArm");
                                        effectDuration = DUR_1_KR;
                                        effectChanges = [
                                            { key: "system.meleeStats.attack", mode: 2, value: -2 },
                                            { key: "system.rangeStats.attack", mode: 2, value: -2 }
                                        ];
                                        break;
                                    case "22": // Unterarm (-1 PA, 1 KR)
                                        createCustomEffect = true;
                                        injuryLocation = game.i18n.localize("INJURY.Forearm");
                                        effectDuration = DUR_1_KR;
                                        effectChanges = [{ key: "system.combat.parry", mode: 2, value: -1 }];
                                        break;
                                    case "23": // Ellbogen (-1 AT, 1 KR)
                                        createCustomEffect = true;
                                        injuryLocation = game.i18n.localize("INJURY.Elbow");
                                        effectDuration = DUR_1_KR;
                                        effectChanges = [
                                            { key: "system.meleeStats.attack", mode: 2, value: -1 },
                                            { key: "system.rangeStats.attack", mode: 2, value: -1 }
                                        ];
                                        break;
                                    case "24": // Hand (Waffe fallen lassen) -- Könnte man mit den interaktiven Effekten automatisieren -- z. B. indem man die Waffenanzahl auf "0" setzt und sie dann bei einer gelungenen Probe auf Aufheben wieder zurücksetzt
                                        break;
                                    case "25": // Finger (-1 AT, 1 KR)
                                        createCustomEffect = true;
                                        injuryLocation = game.i18n.localize("INJURY.Finger");
                                        effectDuration = DUR_1_KR;
                                        effectChanges = [
                                            { key: "system.meleeStats.attack", mode: 2, value: -1 },
                                            { key: "system.rangeStats.attack", mode: 2, value: -1 }
                                        ];
                                        break;
                                    case "26": // Handgelenk (Waffe fallen lassen) -- Könnte man mit den interaktiven Effekten automatisieren -- z. B. indem man die Waffenanzahl auf "0" setzt und sie dann bei einer gelungenen Probe auf Aufheben wieder zurücksetzt
                                        break;

                                    // BEINE (3) + 1W6
                                    case "31": // Oberschenkel (-2 AT, 1 KR)
                                        createCustomEffect = true;
                                        injuryLocation = game.i18n.localize("INJURY.Thigh");
                                        effectDuration = DUR_1_KR;
                                        effectChanges = [
                                            { key: "system.meleeStats.attack", mode: 2, value: -2 },
                                            { key: "system.rangeStats.attack", mode: 2, value: -2 }
                                        ];
                                        break;
                                    case "32": // Unterschenkel (-1 PA, 1 KR)
                                        createCustomEffect = true;
                                        injuryLocation = game.i18n.localize("INJURY.Calf");
                                        effectDuration = DUR_1_KR;
                                        effectChanges = [{ key: "system.combat.parry", mode: 2, value: -1 }];
                                        break;
                                    case "33": // Knie (-1 AT, 1 KR)
                                        createCustomEffect = true;
                                        injuryLocation = game.i18n.localize("INJURY.Knee");
                                        effectDuration = DUR_1_KR;
                                        effectChanges = [
                                            { key: "system.meleeStats.attack", mode: 2, value: -2 },
                                            { key: "system.rangeStats.attack", mode: 2, value: -2 }
                                        ];
                                        break;
                                    case "34": // Fuß (Liegend) 
                                        createCustomEffect = true;
                                        injuryLocation = game.i18n.localize("INJURY.Foot");
                                        // "Liegend" hat für diesen Case keine automatische Ablaufzeit, man muss aktiv aufstehen, hierfür könnte man die V8 interaktiven Proben verwenden.
                                        effectStatuses = ["prone"]; 
                                        break;
                                    case "35": // Zeh (-1 AT, 1 KR)
                                        createCustomEffect = true;
                                        injuryLocation = game.i18n.localize("INJURY.Toe");
                                        effectDuration = DUR_1_KR;
                                        effectChanges = [
                                            { key: "system.meleeStats.attack", mode: 2, value: -2 },
                                            { key: "system.rangeStats.attack", mode: 2, value: -2 }
                                        ];
                                        break;
                                    case "36": // Fersensehne (Liegend, 24h)
                                        createCustomEffect = true;
                                        injuryLocation = game.i18n.localize("INJURY.Heel");
                                        effectDuration = DUR_24_H;
                                        effectStatuses = ["prone"];
                                        break;
                                }

                                //
                                // Effekt generieren und zuweisen
                                if (createCustomEffect) {
                                    const baseTitle = game.i18n.localize("INJURY.SevereTitle");
                                    
                                    const customEffectData = {
                                        name: `${baseTitle}: ${injuryLocation}`,
                                        icon: "icons/svg/blood.svg",
                                        changes: effectChanges,
                                        statuses: effectStatuses,
                                        duration: effectDuration
                                    };
                                    
                                    await actor.createEmbeddedDocuments("ActiveEffect", [customEffectData]);
                                }

                                // Nachricht im Chat
                                const message = game.i18n.format(`HITBOX.wounded${finalHitCode}`, { name: actor.name, dmg });
                                await ChatMessage.create(game.dsa5.apps.DSA5_Utility.chatDataSetup(message));
                            }

// ==========================================
// Folgender Code den ich nicht von hitzone.js - den sollte ich lieber nicht hochladen
// ==========================================
