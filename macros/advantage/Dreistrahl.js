// Schema type: onUseEffect
// Parameters injected by the system:
//   args   {OnUseEffectExecutionArgs} - Execution metadata for this activation.
//   item   {Itemdsa5} - The item that was used.
//   actor  {Actordsa5} - The actor who used the item.
//   this   {OnUseEffect} - Helper instance (socketedConditionAdd, effectDummy, createChatMessage, ...).

const dict = {
  de: {
    noSkill: (name) => `besitzt keine Fertigkeit "${name}".`,
    burnStarted: "steht in Flammen!",
    burnNotStarted: "wird nicht in Brand gesteckt.",
    fireTest: "Feuerprobe",
    header: "Wähle Ziele für deine 3 Flammenstrahlen aus. Ein Ziel kann mehrfach gewählt werden:",
    noTargetSelected: "Es wurden keine Ziele ausgewählt.",
  },
  en: {
    noSkill: (name) => `does not have the skill "${name}".`,
    burnStarted: "is ablaze!",
    burnNotStarted: "is not set on fire.",
    fireTest: "Fire Check",
    header: "Select targets for your 3 flame rays. A target can be chosen multiple times:",
    noTargetSelected: "No targets selected.",
  },
}[game.i18n.lang === "en" ? "en" : "de"];

const kraftaktName = _loc("LocalizedIDs.featOfStrength");
const kraftakt = actor.items.find((i) => i.type === "skill" && i.name === kraftaktName);
if (!kraftakt) {
  ui.notifications.error(`${actor.name} ${dict.noSkill(kraftaktName)}`);
  return;
}

const attackerTokenId = actor.getActiveTokens()[0]?.id;
const setup = await actor.setupSkill(kraftakt, { subtitle: ` (${item.name})` }, attackerTokenId);
const kraftaktRes = await actor.basicTest(setup);
if (!kraftaktRes) return;

await actor.addCondition("stunned", 2);

const qs = kraftaktRes.result?.qualityStep ?? 0;
if ((kraftaktRes.result?.successLevel ?? 0) <= 0) return;

const maxRays = 3;
const { ActorPickerDialog } = game.dsa5.apps;
const pickerActors = ActorPickerDialog.buildActorPickerData({ source: "scene" });

await ActorPickerDialog.open({
  title: item.name,
  header: dict.header,
  actors: pickerActors,
  selectionMode: "multiple",
  showSourceToggle: false,
  onRender: (dlg) => {
    const el = dlg.element;

    el.querySelectorAll(".query-actor-row").forEach((row) => {
      const cb = row.querySelector(".query-actor-selector");
      const wrapper = document.createElement("div");

      wrapper.style.cssText =
        "display:flex; align-items:center; justify-content:center; gap:8px; margin-right:10px; flex-shrink:0; min-width:74px;";
      wrapper.innerHTML = `
        <i class="fas fa-minus-circle qty-minus" style="cursor:pointer; font-size:1.2em; flex-shrink:0;"></i>
        <input type="text" name="multiActorQty" data-id="${cb.value}" value="0" style="width:24px; min-width:24px; padding:0; text-align:center; background:transparent; border:none; color:inherit; font-weight:bold; font-size:1.1em; flex-shrink:0;" readonly>
        <i class="fas fa-plus-circle qty-plus" style="cursor:pointer; font-size:1.2em; flex-shrink:0;"></i>
      `;

      cb.replaceWith(wrapper);
      row.classList.remove("selected");
    });

    const inputs = Array.from(el.querySelectorAll('input[name="multiActorQty"]'));
    const getTotal = () => inputs.reduce((sum, inp) => sum + Number(inp.value), 0);

    const updateLimits = () => {
      const total = getTotal();
      inputs.forEach((input) => {
        const val = Number(input.value);
        const row = input.closest(".query-actor-row");
        row.querySelector(".qty-plus").style.opacity = total >= maxRays ? "0.35" : "1";
        row.querySelector(".qty-minus").style.opacity = val <= 0 ? "0.35" : "1";
        row.classList.toggle("selected", val > 0);
      });
    };

    updateLimits();

    el.addEventListener("click", (ev) => {
      const plus = ev.target.closest(".qty-plus");
      const minus = ev.target.closest(".qty-minus");
      if (!plus && !minus) return;

      ev.preventDefault();
      ev.stopPropagation();

      const input = ev.target.closest(".query-actor-row").querySelector('input[name="multiActorQty"]');
      const val = Number(input.value);

      if (plus && getTotal() < maxRays) {
        input.value = val + 1;
      } else if (minus && val > 0) {
        input.value = val - 1;
      }
      updateLimits();
    });

    el.querySelectorAll("[data-action='selectAll'], [data-action='selectNone']").forEach((b) => {
      b.style.display = "none";
    });
  },
  callback: async ({ form }) => {
    const rayTargets = [];

    form.querySelectorAll('input[name="multiActorQty"]').forEach((input) => {
      const count = Number(input.value);
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
      img: item.img,
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
                  const burnRoll = await (new Roll("1d6")).evaluate();
                  let statusText = ${JSON.stringify(dict.burnNotStarted)};

                  if (burnRoll.total <= 3) {
                    await actor.addCondition("burning", 1);
                    statusText = ${JSON.stringify(dict.burnStarted)};
                  }

                  await ChatMessage.create({
                    speaker: ChatMessage.getSpeaker({ actor }),
                    content: actor.name + " " + statusText
                  });
                })();
              `,
            },
          },
        },
      ],
    };

    const WeaponClass = game.dsa5.entities.Itemdsa5.getSubClass(weaponData.type);
    const weapon = new WeaponClass(weaponData);
    const defenseMalusMod = {
      name: _loc("MODS.defenseMalus"),
      value: -4,
      type: "defenseMalus",
      selected: true,
    };

    for (const targetId of rayTargets) {
      const targetToken = canvas.tokens.placeables.find((t) => t.actor?.id === targetId);
      if (targetToken) {
        targetToken.setTarget(true, { releaseOthers: true });
      }

      const setupData = await WeaponClass.setupDialog(
        null,
        { mode: "attack", bypass: true, cheat: true, predefinedResult: [{ val: 2, index: 0 }] },
        weapon,
        actor,
        attackerTokenId
      );

      setupData.testData.situationalModifiers = [defenseMalusMod];
      await actor.basicTest(setupData);
    }

    game.user.targets.forEach((t) => t.setTarget(false, { releaseOthers: false }));
  },
});
