// This is a system macro used for automation. It is disfunctional without the proper context.

// --- Language switch (de | en) ---
const lang = (game?.i18n?.lang === "en") ? "en" : "de";

// --- Übersetzungs-Dictionary (deutsch/englisch) ---
const dict = {
  de: {
    itemName: "Licht",
    noTokens: (name) => `Der Actor ${name} hat keine aktiven Tokens auf der Szene.`,
    noKap: (name) => `Dein kontrollierter Token (${name}) verfügt nicht über Karmaenergie.`,
    notEnoughKap: (name) => `Nicht genügend Karmaenergie bei ${name}.`
  },
  en: {
    itemName: "Light",
    noTokens: (name) => `The actor ${name} has no active tokens on the scene.`,
    noKap: (name) => `Your controlled token (${name}) does not have karma energy.`,
    notEnoughKap: (name) => `Not enough karma energy for ${name}.`
  }
};


const t = dict[lang];

// Einstellungen zum Licht
const lightID = "candle";
const durationSeconds = 300;

// --- Aktive Tokens prüfen ---
const tokens = actor.getActiveTokens();
if (!tokens || tokens.length === 0) {
  ui.notifications.warn(t.noTokens(actor.name));
  return;
}

// --- 1 KaP (Karmaenergie) prüfen und abziehen ---
const kapObject = foundry.utils.getProperty(actor, "system.status.karmaenergy");
if (!kapObject?.max) {
  ui.notifications.warn(t.noKap(actor.name));
  return;
}
if (kapObject.value < 1) {
  ui.notifications.warn(t.notEnoughKap(actor.name));
  return;
}

const updateData = { "system.status.karmaenergy.value": kapObject.value - 1 };

// Update über socketedActorTransformation
if (game.dsa5?.apps?.socketedActorTransformation) {
  await game.dsa5.apps.socketedActorTransformation(actor, updateData);
} else {
  // Fallback: Direktes Update versuchen (kann an Rechten scheitern)
  await actor.update(updateData);
}

// Licht anschalten
await game.dsa5.apps.LightDialog.applyVisionOrLight(true, lightID, tokens, t.itemName);

// --- ActiveEffects nach kurzer Verzögerung starten ---
setTimeout(async () => {
  const ae = actor.effects.find(e => e.name === t.itemName);
  if (ae) {
    await ae.update({
      duration: {
        seconds: durationSeconds,
        startTime: game.time.worldTime
      }
    });
  }
}, 100); // 100ms warten
