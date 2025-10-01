// This is a system macro used for automation. It is disfunctional without the proper context.


const DICT = {
  de: {
    noActor: "Kein Actor gefunden – bitte Makro ausführen, während ein Actor ausgewählt ist.",
    noTarget: "Kein Ziel ausgewählt! Bitte ein Token anvisieren.",
    noKraftakt: 'besitzt keine Fertigkeit "Kraftakt".',
    burnStarted: "steht in Flammen!",
    burnNotStarted: "wird nicht in Brand gesteckt.",
    fireTest: "Feuerprobe",
    dummyWeapon: "Odemwaffe",
    skill_Kraftakt: "Kraftakt",
    cs_Bows: "Bögen",
    defenseMalus: "MODS.defenseMalus",
  },
  en: {
    noActor: "No actor found – please run the macro while an actor is selected.",
    noTarget: "No target selected! Please target a token.",
    noKraftakt: 'does not have the skill "Feat of Strength".',
    burnStarted: "is ablaze!",
    burnNotStarted: "is not set on fire.",
    fireTest: "Fire Check",
    dummyWeapon: "Breath Weapon",
    skill_Kraftakt: "Feat of Strength",
    cs_Bows: "Bows",
    defenseMalus: "MODS.defenseMalus",
  }
};

const LANG = (game.i18n?.lang === "en") ? "en" : "de";
const T = (k) => DICT[LANG][k] ?? k;


if (!actor) {
  ui.notifications.error(T("noActor"));
  return;
}

// 1) Ziele 
const targets = Array.from(game.user.targets);
if (!targets?.length) {
  ui.notifications.error(T("noTarget"));
  return;
}
const primaryTarget = targets[0];
const targetActor = primaryTarget?.actor;

// 2) Talentprobe Kraftakt
const kraftaktName = T("skill_Kraftakt");
const kraftakt = actor.items.find(i => i.type === "skill" && i.name === kraftaktName);
if (!kraftakt) {
  ui.notifications.error(`${actor.name} ${T("noKraftakt")}`);
  return;
}

const setup = await actor.setupSkill(kraftakt);
const kraftaktRes = await actor.basicTest(setup);
const qs = kraftaktRes?.result?.qualityStep ?? 0;

// Abbruch bei Misserfolg
if ((kraftaktRes?.result?.successLevel ?? 0) <= 0) return;

// 3) Schaden berechnen: 1W6 + QS
const dmgRoll = await (new Roll("1d6")).roll({ async: true });
const damage = Number(dmgRoll.total) + Number(qs || 0);

// 4) Dummy-Angriff vorbereiten (Kampftechnik lokalisiert)
const localizedCS = T("cs_Bows");

const weaponData = {
  name: T("dummyWeapon"),
  type: "rangeweapon",
  img: "systems/dsa5/icons/categories/Rangeweapon.webp",
  system: {
    damage: { value: `${damage}` },
    reloadTime: { value: 0, progress: 0 },
    reach: { value: "0/8/8" },
    ammunitiongroup: { value: "-" },
    combatskill: { value: localizedCS },
    worn: { value: false },
    structure: { max: 0, value: 0 },
    quantity: { value: 1 },
    price: { value: 0 },
    weight: { value: 0 },
    effect: { value: "", attributes: "" },
  },
  effects: [
    {
      name: T("fireTest"),
      type: "",
      img: "icons/svg/aura.svg",
      changes: [],
      duration: { startTime: null, seconds: null, rounds: null },
      flags: {
        dsa5: {
          advancedFunction: 2,
          // args3: direkter addCondition-Call (hoffe das muss nicht soceted sein, hat bei mir zumindest nicht hingehaun)
          args3: `
            (async () => {
              const speakerName = actor?.name ?? game.user.name ?? "Unbekannt";

              async function addBurningDirect(a) {
                if (!a) throw new Error("Kein Ziel-Akteur im Effektkontext gefunden.");
                if (typeof a.addCondition !== "function") {
                  throw new Error("addCondition ist nicht verfügbar im Ziel-Akteur.");
                }
                await a.addCondition("burning");
              }

              try {
                const burnRoll = await (new Roll("1d6")).roll({ async: true });
                let content = "";

                if (burnRoll.total <= 3) {
                  await addBurningDirect(actor);
                  content = speakerName + " ${T("burnStarted")}";
                } else {
                  content = speakerName + " ${T("burnNotStarted")}";
                }

                await ChatMessage.create({
                  speaker: { alias: speakerName },
                  content
                });
              } catch (err) {
                await ChatMessage.create({
                  speaker: { alias: speakerName },
                  content: "Feuerprobe: Fehler beim Anwenden des Effekts: " + (err?.message ?? err)
                });
                console.error("Feuerprobe args3 error:", err);
              }
            })();
          `
        }
      },
      disabled: false,
      transfer: false
    }
  ]
};

const WeaponClass = game.dsa5.entities.Itemdsa5.getSubClass(weaponData.type);
const weapon = new WeaponClass(weaponData);

// 5) Dummy-Angriff ausführen
const setupData = await game.dsa5.entities.Itemdsa5.getSubClass(weapon.type).setupDialog(
  null,
  { mode: "attack", bypass: true, cheat: true, predefinedResult: [{ val: 2, index: 0 }] },
  weapon,
  actor,
  actor.getActiveTokens()?.[0]?.id
);

// Modifikator zum Ausweichen
setupData.testData.situationalModifiers.push({
  name: game.i18n.localize(T("defenseMalus")),
  value: -4,
  type: "defenseMalus",
  selected: true,
});

await actor.basicTest(setupData);

