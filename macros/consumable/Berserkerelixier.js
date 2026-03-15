// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang === "de" ? "de" : "en";
const KR = (r) => r * 6;

(async () => {
  const q = Number(typeof qs !== "undefined" ? qs : 0);
  if (!q || q < 1 || q > 6) return;

  if (q === 1) {
    // +1 AT, -2 VW für 5 KR; Betäubung via onRemove
    const seconds = KR(5);
    const condition = {
      name: lang === "de" ? "Berserkerelixier (QS1)" : "Berserker Elixir (QS1)",
      icon: "icons/svg/aura.svg",
      changes: [
        { key: "system.meleeStats.attack", mode: 2, value: 1 },
        { key: "system.meleeStats.parry", mode: 2, value: -2 },
      ],
      duration: { seconds, startTime: game.time.worldTime },
      flags: {
        dsa5: {
          description: lang === "de" ? "Berserkerelixier" : "Berserker Elixir",
          onRemove: "actor.addCondition('stunned')" // Beim Entfernen Betäubung hinzufügen
        }
      },
      type: "base",
      disabled: false,
      system: {}
    };
    await actor.addCondition(condition);
    return;
  }

  if (q === 2) {
    // +2 AT, -4 VW für 5 KR
    const seconds = KR(5);
    const condition = {
      name: lang === "de" ? "Berserkerelixier (QS2)" : "Berserker Elixir (QS2)",
      icon: "icons/svg/aura.svg",
      changes: [
        { key: "system.meleeStats.attack", mode: 2, value: 2 },
        { key: "system.meleeStats.parry", mode: 2, value: -4 },
      ],
      duration: { seconds, startTime: game.time.worldTime },
      flags: { dsa5: { description: lang === "de" ? "Berserkerelixier" : "Berserker Elixir" } },
      type: "base",
      disabled: false,
      system: {}
    };
    await actor.addCondition(condition);
    return;
  }

  // QS3–QS6: Blutrausch mit Dauer über statuses
  const berserkDurationsKR = { 3: 5, 4: 10, 5: 20, 6: 40 };
  if (q >= 3 && q <= 6) {
    const seconds = KR(berserkDurationsKR[q]);

    const berserkEffect = {
      name: lang === "de" ? "Berserkerelixier – Blutrausch" : "Berserker Elixir – Bloodrush",
      icon: "icons/svg/aura.svg",
      changes: [],
      duration: { seconds, startTime: game.time.worldTime },
      statuses: ["bloodrush"], // Inspector: Status-Bedingungen → Blutrausch
      flags: { dsa5: { description: lang === "de" ? "Blutrausch" : "Bloodrush" } },
      type: "base",
      disabled: false,
      system: {}
    };

    await actor.addCondition(berserkEffect);
    return;
  }
})();
