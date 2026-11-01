const QUERY_KEY = "dsa5-magic-2.divination";
const EFFECT_FLAG = "isDivination";

function hasDivinationEffect(actor) {
  return actor.effects.some((e) => !e.disabled && e.getFlag("dsa5", EFFECT_FLAG));
}

function resolveRecipientUser(targetActor) {
  const playerOwner =
    game.users.find(
      (u) => !u.isGM && u.active && u.character?.id === targetActor.id
    ) ??
    game.users.find(
      (u) => !u.isGM && u.active && targetActor.testUserPermission(u, "OWNER")
    );

  return playerOwner ?? game.users.activeGM;
}

async function promptAndApplyDivination({ targetActorUuid, senderName }) {
  const targetActor = await fromUuid(targetActorUuid);
  if (!targetActor || !targetActor.isOwner) {
    ui.notifications.warn(_loc("DIVINATION.notOwnerWarn"));
    return { status: "error" };
  }

  if (hasDivinationEffect(targetActor)) {
    return { status: "alreadyActive" };
  }

  const wantsToDo = _loc("DIVINATION.wantsToDo", {
    name: targetActor.name,
  });

  const { DialogV2 } = foundry.applications.api;

  const decision = await DialogV2.wait({
    classes: ["dsa5"],
    window: { title: _loc("DIVINATION.actionLabel") },
    position: { width: 650 },
    rejectClose: false,
    content: `
      <div class="groupbox paddingBox marginBottom">
        <p><b>${senderName}</b> ${wantsToDo}</p>
        <p><i>${_loc("DIVINATION.dialogText")}</i></p>
        <p><b>${_loc("DIVINATION.rulesText")}</b></p>
      </div>
    `,
    buttons: [
      {
        action: "accept",
        label: _loc("DIVINATION.acceptLabel"),
        icon: "fas fa-check",
        default: true,
        callback: () => "accept",
      },
      {
        action: "decline",
        label: _loc("DIVINATION.declineLabel"),
        icon: "fas fa-times",
        callback: () => "decline",
      },
    ],
  });

  if (decision !== "accept") {
    const msg = _loc("DIVINATION.declinedInfo");
    ui.notifications.info(msg);
    return { status: "declined", message: msg };
  }

  if (hasDivinationEffect(targetActor)) {
    return { status: "alreadyActive" };
  }

  let current = targetActor.system.status.fatePoints.value;
  let max = targetActor.system.status.fatePoints.max;

  const inSkills = targetActor.items
    .filter(
      (i) =>
        i.type === "skill" &&
        [
          i.system.characteristic1?.value,
          i.system.characteristic2?.value,
          i.system.characteristic3?.value,
        ].includes("in")
    )
    .map((i) => `${i.name} -1`)
    .join(";");

  const changes = [];
  if (inSkills) {
    changes.push({
      key: "system.skillModifiers.step",
      type: "custom",
      value: inSkills,
    });
  }

  if (current >= max) {
    changes.push({
      key: "system.status.fatePoints.gearmodifier",
      type: "add",
      value: 1,
    });
    max += 1;
  }

  const onRemoveMacro = `
    if (actor) {
      setTimeout(async () => {
        const current = actor.system.status.fatePoints.value;
        const max = actor.system.status.fatePoints.max;
        if (current > max) {
          await actor.update({ "system.status.fatePoints.value": max });
        }
      }, 100);
    }
  `;

  await targetActor.createEmbeddedDocuments("ActiveEffect", [
    {
      name: _loc("DIVINATION.effectName"),
      img: "icons/svg/aura.svg",
      description: _loc("DIVINATION.effectDesc"),
      origin: targetActor.uuid,
      flags: {
        dsa5: {
          [EFFECT_FLAG]: true,
        },
      },
      system: {
        changes,
        macroArgs: {
          onRemove: onRemoveMacro,
        },
      },
    },
  ]);

  current += 1;
  await targetActor.update({ "system.status.fatePoints.value": current });

  const infoMsg = _loc("DIVINATION.acceptedInfo", {
    name: targetActor.name,
    current,
    max,
    extra: _loc("DIVINATION.inPenaltyLabel"),
  });

  ui.notifications.info(infoMsg);
  return { status: "accepted", message: infoMsg };
}

export async function castDivination(sourceActor) {
  if (!sourceActor) {
    ui.notifications.warn(_loc("DIVINATION.selectTokenWarn"));
    return;
  }

  const targets = Array.from(game.user.targets);
  if (targets.length !== 1) {
    ui.notifications.warn(_loc("DIVINATION.selectOneTargetWarn"));
    return;
  }

  const targetActor = targets[0].actor;
  if (!targetActor) return;

  if (hasDivinationEffect(targetActor)) {
    ui.notifications.warn(_loc("DIVINATION.alreadyActiveWarn"));
    return;
  }

  const recipientUser = resolveRecipientUser(targetActor);
  if (!recipientUser) {
    ui.notifications.warn(_loc("DIVINATION.noOwnerWarn"));
    return;
  }

  const payload = {
    targetActorUuid: targetActor.uuid,
    senderName: sourceActor.name,
  };

  if (recipientUser.id === game.user.id) {
    await promptAndApplyDivination(payload);
    return;
  }

  try {
    const result = await recipientUser.query(QUERY_KEY, payload, { timeout: 120000 });
    if (result?.message) {
      ui.notifications.info(result.message);
    }
  } catch (err) {
    console.warn(`DSA5 | Divination query failed or expired:`, err);
  }
}

Hooks.once("init", () => {
  CONFIG.queries ??= {};
  CONFIG.queries[QUERY_KEY] = promptAndApplyDivination;

  game.dsa5Magic2 = game.dsa5Magic2 || {};
  game.dsa5Magic2.castDivination = castDivination;
});
