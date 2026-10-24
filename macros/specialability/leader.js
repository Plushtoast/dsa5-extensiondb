// Schema type: onUseEffect
// Parameters injected by the system:
//   args   {OnUseEffectExecutionArgs} - Execution metadata for this activation.
//   item   {Itemdsa5} - The item that was used.
//   actor  {Actordsa5} - The actor who used the item.
//   this   {OnUseEffect} - Helper instance (socketedConditionAdd, effectDummy, createChatMessage, ...).

const lang = game.i18n.lang === "de" ? "de" : "en";
const dict = {
  de: {
    skillName: "Überreden",
    header: (qs) => `${qs} Ziele profitieren von deinen Befehlen. Bitte wähle bis zu ${qs} Charaktere aus:`,
  },
  en: {
    skillName: "Fast-Talk",
    header: (qs) => `${qs} targets profit from your commands. Please select up to ${qs} characters:`,
  },
}[lang];

const skill = actor.items.find((x) => x.type === "skill" && x.name === dict.skillName);
if (!skill) return;

const setupData = await actor.setupSkill(skill, { subtitle: ` (${item.name})` }, actor.sheet.getTokenId());
setupData.testData.opposable = false;

const res = await actor.basicTest(setupData);
const availableQs = res.result.qualityStep || 0;
this.automatedAnimation(res.result.successLevel);

if (availableQs > 0) {
  const { default: ActorPickerDialog } = await import("/systems/dsa5/modules/dialog/actor-picker-dialog.js");

  const maxTargets = availableQs + 1;
  const changes = [
    { key: "system.rangeStats.attack", type: "add", value: 1 },
    { key: "system.status.dodge.gearmodifier", type: "add", value: 1 },
    { key: "system.meleeStats.attack", type: "add", value: 1 },
    { key: "system.meleeStats.parry", type: "add", value: 1 },
  ];
  const condition = this.effectDummy(item.name, changes, { value: 1, units: "rounds" });

  await ActorPickerDialog.open({
    title: item.name,
    header: dict.header(maxTargets),
    selectionMode: "multiple",
    showSourceToggle: true,
    onRender: (dlg) => {
      const el = dlg.element;
      const list = el.querySelector(".query-actor-list");

      const syncLimit = () => {
        const checkboxes = Array.from(el.querySelectorAll(".query-actor-selector"));
        let checked = checkboxes.filter((cb) => cb.checked);

        if (checked.length > maxTargets) {
          checked.slice(maxTargets).forEach((cb) => {
            cb.checked = false;
            cb.closest(".query-actor-row")?.classList.remove("selected");
          });
          checked = checked.slice(0, maxTargets);
        }

        const limitReached = checked.length >= maxTargets;
        checkboxes.forEach((cb) => {
          cb.disabled = !cb.checked && limitReached;
        });
      };

      el.querySelectorAll(".query-actor-row").forEach((row) => {
        const cb = row.querySelector(".query-actor-selector");
        if (cb) cb.checked = false;
        row.classList.remove("selected");
      });
      syncLimit();

      el.addEventListener("change", (ev) => {
        if (ev.target.classList.contains("query-actor-selector")) {
          syncLimit();
        }
      });

      el.addEventListener("click", (ev) => {
        if (ev.target.closest("[data-action='selectAll'], [data-action='selectNone']")) {
          setTimeout(syncLimit, 0);
        }
      });

      if (list) {
        const observer = new MutationObserver((mutations) => {
          for (const m of mutations) {
            for (const node of m.addedNodes) {
              if (node.nodeType !== Node.ELEMENT_NODE) continue;
              const rows = node.matches?.(".query-actor-row")
                ? [node]
                : (node.querySelectorAll?.(".query-actor-row") ?? []);
              for (const row of rows) {
                const cb = row.querySelector(".query-actor-selector");
                if (cb) cb.checked = false;
                row.classList.remove("selected");
              }
            }
          }
          syncLimit();
        });
        observer.observe(list, { childList: true });
      }
    },
    callback: async ({ actorIds }) => {
      if (!actorIds?.length) return;

      const selectedIds = actorIds.slice(0, maxTargets);
      const worldActors = [];
      const unlinkedTokenIds = [];

      for (const id of selectedIds) {
        const sceneTokens = canvas?.scene?.tokens?.filter((t) => t.actor?.id === id) ?? [];
        const unlinked = sceneTokens.filter((t) => !t.actorLink);

        if (unlinked.length > 0) {
          unlinkedTokenIds.push(...unlinked.map((t) => t.id));
        } else {
          const targetActor = game.actors.get(id);
          if (targetActor) worldActors.push(targetActor);
        }
      }

      if (worldActors.length > 0) {
        await this.socketedConditionAddActor(worldActors, condition);
      }
      if (unlinkedTokenIds.length > 0) {
        await this.socketedConditionAdd(unlinkedTokenIds, condition);
      }
    },
  });
}
