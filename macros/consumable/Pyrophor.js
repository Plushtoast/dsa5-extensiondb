// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = (game.i18n.lang === "de") ? "de" : "en";
const dict = { de: { talent_gaukeleien: "Gaukeleien" }, en: { talent_gaukeleien: "Gaukelei" } }; 
const TALENT = dict[lang].talent_gaukeleien;

const durationDefault = [300, 600, 900, 1200, 1800, 2700][qs - 1];
const fpBonus = [1, 1, 1, 2, 2, 0][qs - 1];
const qlBonus = [0, 0, 0, 0, 0, 1][qs - 1];
const lightSeconds = [0, 6, 12, 12, 18, 18][qs - 1];

// Bonus-ActiveEffect, Dauer = 30 Sekunden (konstant)
{
  let changes = [];
  if (qlBonus > 0) {
    changes = [{ key: "system.skillModifiers.QL", mode: 0, value: `${TALENT} ${qlBonus}` }];
  } else if (fpBonus > 0) {
    changes = [{ key: "system.skillModifiers.FP", mode: 0, value: `${TALENT} ${fpBonus}` }];
  }

  if (changes.length) {
    const condition = {
      name: "Pyrophor: Gaukeleien-Bonus",
      icon: "icons/svg/aura.svg",
      changes: changes,
      duration: { seconds: 30, startTime: game.time.worldTime }, 
      flags: { dsa5: { description: "Pyrophor" } }, 
      type: "base",
      disabled: false,
      system: {}
    };
    await actor.addCondition(condition);
  }
}

// Licht 
if (lightSeconds > 0) {
  const tokens = actor.getActiveTokens?.() || [];
  if (tokens.length) {
    const lightID = "candle";
    const itemName = "Pyrophor";

    await game.dsa5.apps.LightDialog.applyVisionOrLight(true, lightID, tokens, itemName);

    setTimeout(async () => {
      const ae = actor.effects.find(e => e.name === itemName);
      if (ae) {
        await ae.update({ duration: { seconds: lightSeconds, startTime: game.time.worldTime } });
      }
    }, 100);
  }
}
