const bonus = qs <= 3 ? 1 : 2;

const SECONDS_PER_DAY = 86400;
const SECONDS_PER_HOUR = 3600;
const WORLD_TIME = game.time.worldTime;

const calendarSettings = game.settings.get("dsa5", "calendarSettings") || {};
const dawnHour = calendarSettings.dawn !== undefined ? Number(calendarSettings.dawn) : 5;
const dawnSeconds = dawnHour * SECONDS_PER_HOUR;

const currentDaySeconds = WORLD_TIME % SECONDS_PER_DAY;

let durationSecs = 0;
if (currentDaySeconds < dawnSeconds) {
  durationSecs = dawnSeconds - currentDaySeconds;
} else {
  durationSecs = (SECONDS_PER_DAY - currentDaySeconds) + dawnSeconds;
}

const condition = {
  name: source.name,
  img: "icons/svg/aura.svg",
  duration: {
    value: durationSecs,
    units: "seconds",
  },
  system: {
    changes: [
      {
        key: "system.skillModifiers.spell.step",
        type: "custom",
        value: bonus,
      },
      {
        key: "system.skillModifiers.ritual.step",
        type: "custom",
        value: bonus,
      },
    ],
  },
};

const created = await actor.addCondition(condition);
const createdEffect = Array.isArray(created) ? created[0] : created;
if (createdEffect?.uuid) {
  args.result.maintainedTargets ??= [];
  args.result.maintainedTargets.push(createdEffect.uuid);
}
