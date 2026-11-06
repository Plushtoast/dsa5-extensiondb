function normalizeName(str) {
  return String(str ?? "").trim().toLocaleLowerCase();
}

export function registerLocalKnowledgeFilter() {
  const ActorClass = CONFIG.Actor.documentClass;
  const origSetupSkill = ActorClass.prototype.setupSkill;

  ActorClass.prototype.setupSkill = async function (skill, options = {}, tokenId) {
    const validSkills = new Set([_loc("LocalizedIDs.streetwise"), _loc("LocalizedIDs.orienting")]);
    if (!skill || !validSkills.has(skill.name)) {
      return origSetupSkill.call(this, skill, options, tokenId);
    }

    const atlas = game.dsa5.atlas;
    const token = atlas?.getGroupToken(canvas.scene, { allowInactiveAtlasScene: true });
    const center = token?.getCenterPoint?.() ?? token?.object?.center;

    const validNames = new Set();
    if (center && atlas?.coordsData) {
      const sceneScale = Number(token.parent?.flags?.["dsa5-atlas"]?.coordScale) || 1;
      const coordRatio = sceneScale / (atlas._activeCoordScale || 1);
      const iconSizes = CONFIG.Atlas.documentClass.ICON_SIZES;

      const match = Object.entries(atlas.coordsData).find(([, loc]) => {
        if (!loc || loc.sType === "w") return false;
        const size = (iconSizes[loc.sType] || 20) * sceneScale;
        return (
          Math.hypot(loc.x * coordRatio - center.x, loc.y * coordRatio - center.y) <=
          Math.max(size / 2, 15)
        );
      });

      if (match) {
        const [key, loc] = match;
        const rawName = loc.name || key;
        const presentedName =
          foundry.utils.getProperty(game.i18n.translations, `DEREATLAS.LocationNames.${rawName}`) ||
          rawName;
        validNames.add(normalizeName(rawName));
        validNames.add(normalizeName(presentedName));
      }
    }

    const prefix = `${_loc("LocalizedIDs.localKnowledge")} (`;
    const suppressed = [];

    for (const item of this.items) {
      if (item.type !== "specialability") continue;
      const name = item.name.trim();
      if (!name.startsWith(prefix) || !name.endsWith(")")) continue;

      const place = normalizeName(name.slice(prefix.length, -1));
      if (!validNames.has(place)) {
        suppressed.push([item, item.system.effect.value]);
        item.system.effect.value = "";
      }
    }

    const restore = () => {
      for (const [item, val] of suppressed) item.system.effect.value = val;
      suppressed.length = 0;
    };

    if (suppressed.length) Hooks.once("renderApplicationV2", restore);

    try {
      return await origSetupSkill.call(this, skill, options, tokenId);
    } finally {
      restore();
    }
  };
}
