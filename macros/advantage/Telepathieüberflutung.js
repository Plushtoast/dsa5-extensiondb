// Schema type: onUseEffect
// Parameters injected by the system:
//   args   {OnUseEffectExecutionArgs} - Execution metadata for this activation.
//   item   {Itemdsa5} - The item that was used.
//   actor  {Actordsa5} - The actor who used the item.
//   this   {OnUseEffect} - Helper instance (socketedConditionAdd, effectDummy, createChatMessage, ...).

const dict = {
  de: {
    header: "Wähle bis zu 6 Lebewesen aus, die mit Gedanken überflutet werden:",
    noTargetSelected: "Es wurden keine Ziele ausgewählt.",
    activateMsg: "überflutet die Gedanken der gewählten Ziele!",
    noSkill: "besitzt keine Fertigkeit",
    chatResult: "erleidet Stufen Verwirrung:",
  },
  en: {
    header: "Select up to 6 creatures to be flooded with thoughts:",
    noTargetSelected: "No targets selected.",
    activateMsg: "floods the minds of the selected targets!",
    noSkill: "does not have the skill",
    chatResult: "suffers levels of Confusion:",
  },
}[game.i18n.lang === "en" ? "en" : "de"];

const maxTargets = 6;
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
    const checkboxes = Array.from(el.querySelectorAll(".query-actor-selector"));

    const updateLimits = () => {
      const checkedCount = checkboxes.filter((cb) => cb.checked).length;

      checkboxes.forEach((cb) => {
        const isLocked = !cb.checked && checkedCount >= maxTargets;
        cb.disabled = isLocked;
        const row = cb.closest(".query-actor-row");
        row.style.opacity = isLocked ? "0.35" : "1";
        row.style.pointerEvents = isLocked ? "none" : "";
      });
    };

    updateLimits();

    el.addEventListener("change", (ev) => {
      if (ev.target.matches(".query-actor-selector")) {
        updateLimits();
      }
    });

    el.querySelectorAll("[data-action='selectAll']").forEach((b) => {
      b.style.display = "none";
    });
  },
  callback: async ({ form }) => {
    const targetActorIds = Array.from(
      form.querySelectorAll(".query-actor-selector:checked"),
      (cb) => cb.value
    );

    if (!targetActorIds.length) {
      ui.notifications.warn(dict.noTargetSelected);
      return;
    }

    const willpowerName = _loc("LocalizedIDs.willpower");
    const attackerTokenId = actor.getActiveTokens()[0]?.id;

    const effectData = {
      _id: foundry.utils.randomID(),
      name: item.name,
      img: item.img,
      system: {
        advancedFunction: 2,
        changes: [],
        macroArgs: {
          macro: `
            (async () => {
              const skillName = ${JSON.stringify(willpowerName)};
              const itemName = ${JSON.stringify(item.name)};
              const skill = actor.items.find((i) => i.type === "skill" && i.name === skillName);
              if (!skill) {
                ui.notifications.warn(actor.name + " " + ${JSON.stringify(dict.noSkill)} + " " + skillName);
                return;
              }

              const tokenId = actor.token?.id ?? actor.getActiveTokens()[0]?.id;
              const playerUser =
                game.users.find((u) => !u.isGM && u.active && u.character?.id === actor.id) ??
                game.users.find((u) => !u.isGM && u.active && actor.testUserPermission(u, "OWNER"));

              let successLevel = 0;
              let qs = 0;

              if (playerUser && typeof playerUser.query === "function" && CONFIG.queries?.["dsa5.rollRequest"]) {
                const queryRes = await playerUser.query("dsa5.rollRequest", {
                  actorId: actor.id,
                  tokenId,
                  sceneId: canvas.scene?.id,
                  category: "skill",
                  type: "skill",
                  skill: skillName,
                  name: skillName,
                  target: skillName,
                  label: skillName + " (" + itemName + ")",
                  modifier: 0,
                });

                if (!queryRes || ["rejected", "cancelled", "failed", "error", "expired"].includes(queryRes.status)) {
                  return;
                }

                const rollMsg = queryRes.resultDetails?.messageId
                  ? game.messages.get(queryRes.resultDetails.messageId)
                  : null;
                const postData = rollMsg?.flags?.data?.postData ?? queryRes.resultDetails ?? {};

                successLevel = postData.successLevel ?? (["success", "critical"].includes(queryRes.status) ? 1 : 0);
                qs = successLevel > 0 ? (postData.qualityStep ?? 0) : 0;
              } else {
                const setupData = await actor.setupSkill(skill, { subtitle: " (" + itemName + ")" }, tokenId);
                if (!setupData) return;
                setupData.testData.opposable = false;

                const res = await actor.basicTest(setupData);
                if (!res) return;

                successLevel = res.result?.successLevel ?? 0;
                qs = successLevel > 0 ? (res.result?.qualityStep ?? 0) : 0;
              }

              const confusionLevels = Math.max(0, 4 - Math.round(qs / 2));

              if (confusionLevels > 0) {
                await actor.addCondition("confused", confusionLevels);
              }

              await ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ actor }),
                content: "<p><b>" + actor.name + "</b> " + ${JSON.stringify(dict.chatResult)} + " <b>" + confusionLevels + "</b> (QS " + qs + ")</p>",
              });
            })();
          `,
        },
      },
    };

    const msg = await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<p><b>${actor.name}</b> ${dict.activateMsg}</p>`,
      flags: {
        data: {
          preData: {
            source: {
              name: item.name,
              type: item.type,
              effects: [effectData],
            },
            situationalModifiers: [],
            extra: {
              speaker: {
                actor: actor.id,
                token: attackerTokenId,
                scene: canvas.scene?.id,
              },
            },
          },
          postData: {
            qualityStep: 1,
            successLevel: 1,
          },
        },
      },
    });

    const targetSpeakers = targetActorIds.map((id) => {
      const tok = canvas.tokens.placeables.find((t) => t.actor?.id === id);
      return {
        token: tok?.id,
        actor: id,
        scene: canvas.scene?.id,
      };
    });

    await game.dsa5.apps.DSAActiveEffectConfig.applyEffect(msg.id, "targets", targetSpeakers, {
      skipResistRolls: true,
      suppressInfoMessage: true,
    });

    await actor.addCondition("stunned", 1);
  },
});
