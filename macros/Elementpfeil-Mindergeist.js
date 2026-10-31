const ARROW_APPLY_SCRIPT = `
{
  const conditionId = "minorSpirits";
  if (actor.effects.some((e) => [...(e.statuses ?? [])].includes(conditionId))) return;
  await actor.addTimedCondition(conditionId, 1, true, false, {
    duration: { value: effect.duration.value, units: "seconds" },
  });
  const condition = actor.effects.find((e) => [...(e.statuses ?? [])].includes(conditionId));
  if (condition?.duration?.expiry) await condition.update({ "duration.expiry": null });
}`;

const MINDERGEIST_CONDITION = {
  name: "Lästige Mindergeister",
  icon: "icons/svg/aura.svg",
  flags: { dsa5: { mindergeist: true } },
  system: {
    visibility: { hideOnToken: false, hidePlayers: false },
    description: "Lästige Mindergeister (−1 auf alle Proben)",
    advancedFunction: 2,
    macroArgs: { macro: ARROW_APPLY_SCRIPT },
    changes: [],
  },
};
const HOOK_TIMEOUT_MS = 60000;

const getMacroCommand = (entry) =>
  foundry.utils.getProperty(entry, "system.macroArgs.macro")
  ?? foundry.utils.getProperty(entry, "flags.dsa5.args3")
  ?? "";

const setMacroCommand = (entry, command) => {
  entry.system ??= {};
  entry.system.macroArgs ??= {};
  entry.system.advancedFunction = 2;
  entry.system.macroArgs.macro = command;
};

const arrowEffectJson = JSON.stringify(MINDERGEIST_CONDITION);
const spellNameJson = JSON.stringify(source.name);

// Runs inside the effect that creates the arrow; qs = QS of the spell roll.
const prelude = `
{
  const arrowEffect = ${arrowEffectJson};
  arrowEffect.duration = { value: Number(qs) * 5, units: "seconds" };
  const arrowSuffix = " (" + ${spellNameJson} + ")";
  const onArrowCreated = async (item) => {
    if (item.parent?.id !== actor.id || item.type !== "ammunition") return;
    if (!String(item.name).endsWith(arrowSuffix)) return;
    Hooks.off("createItem", onArrowCreated);
    // Multiple casts can leave more than one hook alive for up to 60 s. Guard
    // synchronously on the item, then also check the persisted marker.
    if (item._dsa5Mindergeist || [...item.effects].some((e) => e.name === arrowEffect.name || e.flags?.dsa5?.mindergeist)) return;
    item._dsa5Mindergeist = true;
    await item.createEmbeddedDocuments("ActiveEffect", [foundry.utils.deepClone(arrowEffect)]);
  };
  Hooks.on("createItem", onArrowCreated);
  setTimeout(() => Hooks.off("createItem", onArrowCreated), ${HOOK_TIMEOUT_MS});
}
`;

const macroEffect = source.effects.find((entry) => getMacroCommand(entry));

if (macroEffect) {
  const copy = foundry.utils.duplicate(macroEffect);
  source.effects = source.effects.filter((entry) => entry._id != copy._id);
  setMacroCommand(copy, `${prelude}\n${getMacroCommand(copy)}`);
  source.effects.push(copy);
} else {
  console.warn(`Elementpfeil-Mindergeist: no macro effect on ${source.name}; extension not applied`);
}