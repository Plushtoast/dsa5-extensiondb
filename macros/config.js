const { mergeObject } = foundry.utils;

// Definition der Dauern (Annahme: 1 KR = 6 Sekunden)
const DUR_1_KR = { rounds: 1, seconds: 6 };
const DUR_5_MIN = { rounds: 50, seconds: 300 };
const DUR_24_H = { rounds: 14400, seconds: 86400 };

const severeInjuriesData = {
    // KOPF (0) + 1W6
    "01": { locationKey: "INJURY.Nose", duration: DUR_1_KR, changes: [{ key: "system.meleeStats.attack", mode: 2, value: -2 }, { key: "system.rangeStats.attack", mode: 2, value: -2 }] }, // Nase (-2 AT, 1 KR)
    "02": { locationKey: "INJURY.Ear", duration: DUR_5_MIN, statuses: ["confused"] }, // Ohr (Verwirrung, 5 Min)
    "03": { locationKey: "INJURY.Eye", duration: DUR_5_MIN, statuses: ["inpain"], changes: [{ key: "system.condition.inpain", mode: 2, value: "2" }] }, // Auge (2x Schmerz, 5 Min)
    "04": { locationKey: "INJURY.Cheek", duration: DUR_24_H }, // Wange (Schmerz, 5 Min & Hässlich 24h)
    "05": { locationKey: "INJURY.Forehead", duration: DUR_1_KR, changes: [{ key: "system.combat.dodge", mode: 2, value: -1 }, { key: "system.combat.parry", mode: 2, value: -1 }] }, // Stirn (-1 VT, 1 KR)
    "06": { locationKey: "INJURY.BackOfHead", duration: DUR_5_MIN, statuses: ["stunned"] }, // Hinterkopf (Betäubung, 5 Min)

    // TORSO (1) + 1W6
    "11": { locationKey: "INJURY.Rib", duration: DUR_5_MIN, damageRoll: "1d3" }, // Rippe (1W3 SP) // Platzhalter für die Funktion Bewusstlos bei 6 Wunden im gleichen Bereich - Dauer der Wunde nicht in den Regeln definiert
    "12": { locationKey: "INJURY.Belly", duration: DUR_5_MIN, damageRoll: "1d6" }, // Bauch (1W6 SP) // Platzhalter für die Funktion Bewusstlos bei 6 Wunden im gleichen Bereich - Dauer der Wunde nicht in den Regeln definiert
    "13": { locationKey: "INJURY.Chest", duration: DUR_5_MIN, damageRoll: "1d3" }, // Brust (1W3 SP) // Platzhalter für die Funktion Bewusstlos bei 6 Wunden im gleichen Bereich - Dauer der Wunde nicht in den Regeln definiert
    "14": { locationKey: "INJURY.Shoulder", duration: DUR_1_KR, changes: [{ key: "system.combat.dodge", mode: 2, value: -1 }, { key: "system.combat.parry", mode: 2, value: -1 }] }, // Schulter (-1 VT, 1 KR)
    "15": { locationKey: "INJURY.Back", duration: DUR_5_MIN, damageRoll: "1d3" }, // Rücken (1W3 SP) // Platzhalter für die Funktion Bewusstlos bei 6 Wunden im gleichen Bereich - Dauer der Wunde nicht in den Regeln definiert
    "16": { locationKey: "INJURY.Groin", duration: DUR_5_MIN, statuses: ["inpain"] }, // Genital (Schmerz, 5 Min)

    // ARME (2) + 1W6
    "21": { locationKey: "INJURY.UpperArm", duration: DUR_1_KR, changes: [{ key: "system.meleeStats.attack", mode: 2, value: -2 }, { key: "system.rangeStats.attack", mode: 2, value: -2 }] }, // Oberarm (-2 AT, 1 KR)
    "22": { locationKey: "INJURY.Forearm", duration: DUR_1_KR, changes: [{ key: "system.combat.parry", mode: 2, value: -1 }] }, // Unterarm (-1 PA, 1 KR)
    "23": { locationKey: "INJURY.Elbow", duration: DUR_1_KR, changes: [{ key: "system.meleeStats.attack", mode: 2, value: -1 }, { key: "system.rangeStats.attack", mode: 2, value: -1 }] }, // Ellbogen (-1 AT, 1 KR)
    "24": { locationKey: "INJURY.Hand", duration: DUR_5_MIN }, // Hand (Waffe fallen lassen) -- Könnte man mit den interaktiven Effekten automatisieren -- z. B. indem man die Waffenanzahl auf "0" setzt und sie dann bei einer gelungenen Probe auf Aufheben wieder zurücksetzt // Platzhalter für die Funktion Bewusstlos bei 6 Wunden im gleichen Bereich - Dauer der Wunde nicht in den Regeln definiert
    "25": { locationKey: "INJURY.Finger", duration: DUR_1_KR, changes: [{ key: "system.meleeStats.attack", mode: 2, value: -1 }, { key: "system.rangeStats.attack", mode: 2, value: -1 }] }, // Finger (-1 AT, 1 KR)
    "26": { locationKey: "INJURY.Wrist", duration: DUR_5_MIN }, // Handgelenk (Waffe fallen lassen) -- Könnte man mit den interaktiven Effekten automatisieren -- z. B. indem man die Waffenanzahl auf "0" setzt und sie dann bei einer gelungenen Probe auf Aufheben wieder zurücksetzt // Platzhalter für die Funktion Bewusstlos bei 6 Wunden im gleichen Bereich - Dauer der Wunde nicht in den Regeln definiert

    // BEINE (3) + 1W6
    "31": { locationKey: "INJURY.Thigh", duration: DUR_1_KR, changes: [{ key: "system.meleeStats.attack", mode: 2, value: -2 }, { key: "system.rangeStats.attack", mode: 2, value: -2 }] }, // Oberschenkel (-2 AT, 1 KR)
    "32": { locationKey: "INJURY.Calf", duration: DUR_1_KR, changes: [{ key: "system.combat.parry", mode: 2, value: -1 }] }, // Unterschenkel (-1 PA, 1 KR)
    "33": { locationKey: "INJURY.Knee", duration: DUR_1_KR, changes: [{ key: "system.meleeStats.attack", mode: 2, value: -2 }, { key: "system.rangeStats.attack", mode: 2, value: -2 }] }, // Knie (-1 AT, 1 KR)
    "34": { locationKey: "INJURY.Foot", statuses: ["prone"] }, // Fuß (Liegend) -- "Liegend" hat für diesen Case keine automatische Ablaufzeit, man muss aktiv aufstehen, hierfür könnte man die V8 interaktiven Proben verwenden.
    "35": { locationKey: "INJURY.Toe", duration: DUR_1_KR, changes: [{ key: "system.meleeStats.attack", mode: 2, value: -2 }, { key: "system.rangeStats.attack", mode: 2, value: -2 }] }, // Zeh (-1 AT, 1 KR)
    "36": { locationKey: "INJURY.Heel", duration: DUR_24_H, statuses: ["prone"] } // Fersensehne (Liegend, 24h)
};


export default function() {
    mergeObject(game.dsa5.config, {
		severeInjuries: severeInjuriesData,
        hitzones: {


// ==========================================
// Ursprünglicher code der hitzones - sollte ich lieber nicht hochladen
// ==========================================
      
