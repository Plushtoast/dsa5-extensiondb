// Schema type: onUseEffect
// Parameters injected by the system:
//   args   {OnUseEffectExecutionArgs} - Execution metadata for this activation.
//   item   {Itemdsa5} - The item that was used.
//   actor  {Actordsa5} - The actor who used the item.
//   this   {OnUseEffect} - Helper instance (socketedConditionAdd, effectDummy, createChatMessage, ...).

const dict = {
  de: {
    noActor: "Kein Actor gefunden – bitte Makro ausführen, während ein Actor ausgewählt ist.",
    noSkill: (name) => `besitzt keine Fertigkeit "${name}".`,
    burnStarted: "steht in Flammen!",
    burnNotStarted: "wird nicht in Brand gesteckt.",
    fireTest: "Feuerprobe",
    header: "Wähle Ziele für deine 3 Flammenstrahlen aus. Ein Ziel kann mehrfach gewählt werden:",
    noTargetSelected: "Es wurden keine Ziele ausgewählt.",
    dialogError: "Fehler: ActorPickerDialog konnte nicht gefunden werden.",
    unknown: "Unbekannt",
    errNoTargetActor: "Kein Ziel-Akteur im Effektkontext gefunden.",
    errNoAddCondition: "addCondition ist im Ziel-Akteur nicht verfügbar.",
    errApplyEffect: "Fehler beim Anwenden des Effekts:",
  },
  en: {
    noActor: "No actor found – please run the macro while an actor is selected.",
    noSkill: (name) => `does not have the skill "${name}".`,
    burnStarted: "is ablaze!",
    burnNotStarted: "is not set on fire.",
    fireTest: "Fire Check",
    header: "Select targets for your 3 flame rays. A target can be chosen multiple times:",
    noTargetSelected: "No targets selected.",
    dialogError: "Error: ActorPickerDialog could not be found.",
    unknown: "Unknown",
    errNoTargetActor: "No target actor found in effect context.",
    errNoAddCondition: "addCondition is not available on target actor.",
    errApplyEffect: "Error applying effect:",
  },
}[game.i18n.lang === "en" ? "en" : "de"];

if (!actor) {
  ui.notifications.error(dict.noActor);
  return;
}

const kraftaktName = _loc("LocalizedIDs.featOfStrength");
const kraftakt = actor.items.find((i) => i.type === "skill" && i.name === kraftaktName);
if (!kraftakt) {
  ui.notifications.error(`${actor.name} ${dict.noSkill(kraftaktName)}`);
  return;
}

const setup = await actor.setupSkill(kraftakt, { subtitle: ` (${item.name})` }, actor.sheet?.getTokenId?.());
const kraftaktRes = await actor.basicTest(setup);
if (!kraftaktRes) return;

await actor.addCondition("stunned", 2);

const qs = kraftaktRes.result?.qualityStep ?? 0;
if ((kraftaktRes.result?.successLevel ?? 0) <= 0) return;

const maxRays = 3;

const ActorPickerDialog =
  game.dsa5.apps?.ActorPickerDialog ||
  game.dsa5.applications?.ActorPickerDialog ||
  game.dsa5.dialogs?.ActorPickerDialog;

if (!ActorPickerDialog) {
  ui.notifications.error(dict.dialogError);
  return;
}

const pickerActors = ActorPickerDialog.buildActorPickerData({ source: "scene" });

await ActorPickerDialog.open({
  title: item.name,
  header: dict.header,
  actors: pickerActors,
  selectionMode: "multiple",
  showSourceToggle: true,
  onRender: (dlg) => {
    const el = dlg.element;
    const list = el.querySelector(".query-actor-list");

    const transformRows = () => {
      el.querySelectorAll(".query-actor-row").forEach((row) => {
        if (row.dataset.multiBound) return;
        row.dataset.multiBound = "true";

        const cb = row.querySelector(".query-actor-selector");
        if (!cb) return;

        const actorId = cb.value;
        const wrapper = document.createElement("div");

        wrapper.style.cssText =
          "display:flex; align-items:center; justify-content:center; gap:8px; margin-right:10px; flex-shrink:0; min-width:74px;";
        wrapper.innerHTML = `
          <i class="fas fa-minus-circle qty-minus" style="cursor:pointer; font-size:1.2em; flex-shrink:0;"></i>
          <input type="text" name="multiActorQty" data-id="${actorId}" value="0" style="width:24px; min-width:24px; padding:0; text-align:center; background:transparent; border:none; color:inherit; font-weight:bold; font-size:1.1em; flex-shrink:0;" readonly>
          <i class="fas fa-plus-circle qty-plus" style="cursor:pointer; font-size:1.2em; flex-shrink:0;"></i>
        `;

        cb.replaceWith(wrapper);
        row.classList.remove("selected");
      });
    };

    const updateLimits = () => {
      const inputs = Array.from(el.querySelectorAll('input[name="multiActorQty"]'));
      const total = inputs.reduce((sum, input) => sum + parseInt(input.value || 0, 10), 0);

      inputs.forEach((input) => {
        const val = parseInt(input.value || 0, 10);
        const parent = input.parentElement;
        const plus = parent.querySelector(".qty-plus");
        const minus = parent.querySelector(".qty-minus");
        const row = input.closest(".query-actor-row");

        if (plus) plus.style.opacity = total >= maxRays ? "0.35" : "1";
        if (minus) minus.style.opacity = val <= 0 ? "0.35" : "1";

        row?.classList.toggle("selected", val > 0);
      });
    };

    transformRows();
    updateLimits();

    el.addEventListener("click", (ev) => {
      const plus = ev.target.closest(".qty-plus");
      const minus = ev.target.closest(".qty-minus");
      if (!plus && !minus) return;

      ev.preventDefault();
      ev.stopPropagation();

      const input = ev.target.parentElement.querySelector('input[name="multiActorQty"]');
      const val = parseInt(input.value || 0, 10);

      const inputs = Array.from(el.querySelectorAll('input[name="multiActorQty"]'));
      const total = inputs.reduce((sum, inp) => sum + parseInt(inp.value || 0, 10), 0);

      if (plus && total < maxRays) {
        input.value = val + 1;
      } else if (minus && val > 0) {
        input.value = val - 1;
      }
      updateLimits();
    });

    el.querySelectorAll("[data-action='selectAll'], [data-action='selectNone']").forEach((b) => {
      b.style.display = "none";
    });

    if (list) {
      const observer = new MutationObserver(() => {
        transformRows();
        updateLimits();
      });
      observer.observe(list, { childList: true });
    }
  },
  callback: async ({ form }) => {
    const inputs = Array.from(form.querySelectorAll('input[name="multiActorQty"]'));
    const rayTargets = [];

    inputs.forEach((input) => {
      const count = parseInt(input.value || 0, 10);
      for (let i = 0; i < count; i++) {
        rayTargets.push(input.dataset.id);
      }
    });

    if (!rayTargets.length) {
      ui.notifications.warn(dict.noTargetSelected);
      return;
    }

    const weaponData = {
      name: item.name,
      type: "rangeweapon",
      img: "systems/dsa5/icons/categories/Rangeweapon.webp",
      system: {
        damage: { value: `1d6 + ${qs}` },
        reloadTime: { value: 0, progress: 0 },
        reach: { value: "0/8/8" },
        ammunitiongroup: { value: "-" },
        combatskill: { value: _loc("LocalizedIDs.bows") },
        worn: { value: false },
        quantity: { value: 1 },
      },
      effects: [
        {
          name: dict.fireTest,
          img: "icons/svg/aura.svg",
          system: {
            advancedFunction: 2,
            macroArgs: {
              macro: `
                (async () => {
                  const speakerName = actor?.name ?? game.user.name ?? ${JSON.stringify(dict.unknown)};
                  try {
                    if (!actor) throw new Error(${JSON.stringify(dict.errNoTargetActor)});
                    if (typeof actor.addCondition !== "function") {
                      throw new Error(${JSON.stringify(dict.errNoAddCondition)});
                    }

                    const burnRoll = await (new Roll("1d6")).evaluate();
                    let content = "";

                    if (burnRoll.total <= 3) {
                      await actor.addCondition("burning", 1);
                      content = speakerName + " " + ${JSON.stringify(dict.burnStarted)};
                    } else {
                      content = speakerName + " " + ${JSON.stringify(dict.burnNotStarted)};
                    }

                    await ChatMessage.create({
                      speaker: { alias: speakerName },
                      content
                    });
                  } catch (err) {
                    await ChatMessage.create({
                      speaker: { alias: speakerName },
                      content: ${JSON.stringify(dict.fireTest)} + ": " + ${JSON.stringify(dict.errApplyEffect)} + " " + (err?.message ?? err)
                    });
                    console.error(${JSON.stringify(dict.fireTest)}, err);
                  }
                })();
              `,
            },
          },
        },
      ],
    };

    const WeaponClass = game.dsa5.entities.Itemdsa5.getSubClass(weaponData.type);
    const weapon = new WeaponClass(weaponData);
    const attackerTokenId = actor.getActiveTokens()?.[0]?.id;

    for (const targetId of rayTargets) {
      const targetToken = canvas.tokens?.placeables.find((t) => t.actor?.id === targetId);

      if (targetToken) {
        targetToken.setTarget(true, { releaseOthers: true });
      } else {
        game.user.targets.forEach((t) => t.setTarget(false, { releaseOthers: false }));
      }

      const setupData = await WeaponClass.setupDialog(
        null,
        { mode: "attack", bypass: true, cheat: true, predefinedResult: [{ val: 2, index: 0 }] },
        weapon,
        actor,
        attackerTokenId
      );

      setupData.testData.situationalModifiers = [
        {
          name: _loc("MODS.defenseMalus"),
          value: -4,
          type: "defenseMalus",
          selected: true,
        },
      ];

      await actor.basicTest(setupData);
    }

    game.user.targets.forEach((t) => t.setTarget(false, { releaseOthers: false }));
  },
});
