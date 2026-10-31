// Schema type: onUseEffect
// Parameters injected by the system:
//   args   {OnUseEffectExecutionArgs} - Execution metadata for this activation.
//   item   {Itemdsa5} - The item that was used.
//   actor  {Actordsa5} - The actor who used the item.
//   this   {OnUseEffect} - Helper instance (socketedConditionAdd, effectDummy, createChatMessage, ...).

const dict = {
  de: {
    notInCombat: "Diese Fähigkeit kann nicht in einem Kampf eingesetzt werden.",
    noSkill: (name) => `besitzt keine Fertigkeit "${name}".`,
    header: (max) => `Wähle bis zu ${max} Person(en) aus, die durch deine Worte beeinflusst werden:`,
    noTargetSelected: "Es wurden keine Ziele ausgewählt.",
    activateMsg: "versucht, den Willen der gewählten Ziele zu beeinflussen!",
    resistSubtitle: "Überreden widerstehen",
    effectDescription:
      "Führt die aufgetragene Handlung für 5 Minuten aus, solange es keine triftigen Gründe (z. B. eigenes Überleben, Vermeiden eines Verbrechens) gibt, diese abzulehnen.",
    chatAffected: "wird beeinflusst und führt die Handlung aus!",
    chatResisted: "widersteht der Beeinflussung!",
  },
  en: {
    notInCombat: "This ability cannot be used in combat.",
    noSkill: (name) => `does not have the skill "${name}".`,
    header: (max) => `Select up to ${max} person(s) to be influenced by your words:`,
    noTargetSelected: "No targets selected.",
    activateMsg: "attempts to influence the minds of the selected targets!",
    resistSubtitle: "Resist Fast-Talk",
    effectDescription:
      "Performs the requested action for 5 minutes as long as there are no compelling reasons (e.g., own survival, avoiding a crime) to refuse.",
    chatAffected: "is influenced and performs the action!",
    chatResisted: "resists the influence!",
  },
}[game.i18n.lang === "en" ? "en" : "de"];

if (game.combat?.started || actor.inCombat) {
  ui.notifications.warn(dict.notInCombat);
  return;
}

const fastTalkName = _loc("LocalizedIDs.Fast-Talk");
const fastTalk = actor.items.find((i) => i.type === "skill" && i.name === fastTalkName);
if (!fastTalk) {
  ui.notifications.error(`${actor.name} ${dict.noSkill(fastTalkName)}`);
  return;
}

const attackerTokenId = actor.getActiveTokens()[0]?.id;
const setup = await actor.setupSkill(fastTalk, { subtitle: ` (${item.name})` }, attackerTokenId);
const fastTalkRes = await actor.basicTest(setup);
if (!fastTalkRes) return;

await actor.addCondition("stunned", 1);

const qs = fastTalkRes.result?.qualityStep ?? 0;
if ((fastTalkRes.result?.successLevel ?? 0) <= 0 || qs <= 0) return;

const maxTargets = qs;
const penalty = -(qs * 2);
const { ActorPickerDialog } = game.dsa5.apps;
const pickerActors = ActorPickerDialog.buildActorPickerData({ source: "scene" });

await ActorPickerDialog.open({
  title: item.name,
  header: dict.header(maxTargets),
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
              const subtitleText = ${JSON.stringify(dict.resistSubtitle)} + " – " + itemName;
              const mod = ${penalty};

              const skill = actor.items.find((i) => i.type === "skill" && i.name === skillName);
              if (!skill) {
                ui.notifications.warn(actor.name + " " + ${JSON.stringify(dict.noSkill(willpowerName))});
                return;
              }

              const tokenId = actor.token?.id ?? actor.getActiveTokens()[0]?.id;
              const playerUser =
                game.users.find((u) => !u.isGM && u.active && u.character?.id === actor.id) ??
                game.users.find((u) => !u.isGM && u.active && actor.testUserPermission(u, "OWNER"));

              let successLevel = 0;

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
                  label: skillName + " (" + subtitleText + ")",
                  modifier: mod,
                });

                if (!queryRes || ["rejected", "cancelled", "failed", "error", "expired"].includes(queryRes.status)) {
                  return;
                }

                const rollMsg = queryRes.resultDetails?.messageId
                  ? game.messages.get(queryRes.resultDetails.messageId)
                  : null;
                const postData = rollMsg?.flags?.data?.postData ?? queryRes.resultDetails ?? {};

                successLevel = postData.successLevel ?? (["success", "critical"].includes(queryRes.status) ? 1 : 0);
              } else {
                const setupData = await actor.setupSkill(
                  skill,
                  { modifier: mod, subtitle: " (" + subtitleText + ")" },
                  tokenId
                );
                if (!setupData) return;
                setupData.testData.opposable = false;

                const res = await actor.basicTest(setupData);
                if (!res) return;

                successLevel = res.result?.successLevel ?? 0;
              }

              if (successLevel <= 0) {
                await actor.createEmbeddedDocuments("ActiveEffect", [
                  {
                    name: itemName,
                    img: "icons/svg/aura.svg",
                    description: ${JSON.stringify(dict.effectDescription)},
                    duration: {
                      value: 300,
                      units: "seconds",
                    },
                    system: {
                      changes: [
                        { key: "system.condition.encumbered", type: "add", value: 1 },
                        { key: "system.condition.encumbered", type: "add", value: -1 },
                      ],
                    },
                  },
                ]);

                await ChatMessage.create({
                  speaker: ChatMessage.getSpeaker({ actor }),
                  content: "<p><b>" + actor.name + "</b> " + ${JSON.stringify(dict.chatAffected)} + "</p>",
                });
              } else {
                await ChatMessage.create({
                  speaker: ChatMessage.getSpeaker({ actor }),
                  content: "<p><b>" + actor.name + "</b> " + ${JSON.stringify(dict.chatResisted)} + "</p>",
                });
              }
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
            qualityStep: qs,
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
  },
});
