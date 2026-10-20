const PACT_TEMPLATE = "modules/dsa5-magic-3/templates/pact_summoning.hbs";

Hooks.once("init", () => {
    foundry.applications.handlebars.loadTemplates([PACT_TEMPLATE]);
});

Hooks.once("ready", () => {
    const playerMenuInstance = game.dsa5.apps.playerMenu;
    const demonType = game.dsa5.CONJURATION.TYPES.DEMON;
    const origPost = playerMenuInstance.conjurationData.postFunction[demonType];

    playerMenuInstance.conjurationData.postFunction[demonType] = async function (conjurationDataObj, qs, type) {
        if (origPost) await origPost.call(this, conjurationDataObj, qs, type);

        const pactBindingName = _loc("CONJURATION.PACT.binding");
        const pactEffect = conjurationDataObj.effects?.find(e => e.name === pactBindingName);

        if (pactEffect?.flags?.dsa5?.pactConsumption) {
            const { summonerUuid, levels } = pactEffect.flags.dsa5.pactConsumption;
            const summoner = await fromUuid(summonerUuid);
            if (summoner) {
                await summoner.addCondition("demonicConsumption", levels, false, false);
            }
        }
    };

    const PlayerMenuPrototype = playerMenuInstance.constructor.prototype;

    const origApplyTarget = PlayerMenuPrototype.applyConjurationTarget;
    PlayerMenuPrototype.applyConjurationTarget = function (actor) {
        this.conjurationData.isPactSummon = 0;
        return origApplyTarget.call(this, actor);
    };

    const origClearTarget = PlayerMenuPrototype.clearConjurationTarget;
    PlayerMenuPrototype.clearConjurationTarget = function () {
        this.conjurationData.isPactSummon = 0;
        return origClearTarget.call(this);
    };

    const origCalcServices = PlayerMenuPrototype.calculateConjurationServices;
    PlayerMenuPrototype.calculateConjurationServices = function (qs = this.conjurationData.qs, consumedQS = this.conjurationData.consumedQS) {
        if (this.conjurationData.isPactSummon) {
            return Number(qs);
        }
        return origCalcServices.call(this, qs, consumedQS);
    };

    const origPrepareContext = PlayerMenuPrototype._prepareContext;
    PlayerMenuPrototype._prepareContext = async function (options) {
        if (this.conjurationData.pactActorId && this.actor?.id !== this.conjurationData.pactActorId) {
            this.conjurationData.isPactSummon = 0;
            this.conjurationData.pactActorId = null;
        }

        const data = await origPrepareContext.call(this, options);

        if (this.conjurationData.isPactSummon && data.summary) {
            data.summary.blockers = [];
            data.summary.canFinalize = true;
            data.summary.nextStep = "CONJURATION.nextStep.finalize";
        }

        return data;
    };

    const origFinalize = PlayerMenuPrototype.finalizeConjuration;
    PlayerMenuPrototype.finalizeConjuration = function () {
        if (this.conjurationData.isPactSummon && this.conjuration) {
            const origToObject = this.conjuration.toObject.bind(this.conjuration);
            const levels = this.conjurationData.isPactSummon;
            const summonerUuid = this.actor.uuid;

            const pactBindingName = _loc("CONJURATION.PACT.binding");
            const pactBindingDesc = _loc("CONJURATION.PACT.bindingDesc");

            this.conjuration.toObject = (source) => {
                const obj = origToObject(source);
                obj.effects = obj.effects || [];

                obj.effects.push({
                    name: pactBindingName,
                    img: "icons/svg/blood.svg",
                    type: "base",
                    system: {
                        description: pactBindingDesc
                    },
                    flags: {
                        dsa5: {
                            pactConsumption: {
                                summonerUuid,
                                levels
                            },
                            onRemove: `const summoner = await fromUuid("${summonerUuid}");\nif (summoner) {\n    await summoner.removeCondition("demonicConsumption", ${levels}, false);\n}`
                        }
                    }
                });
                return obj;
            };

            try {
                origFinalize.call(this);
            } finally {
                this.conjuration.toObject = origToObject;
                if (!(Number(this.conjurationData.consumedQS) > Number(this.conjurationData.qs))) {
                    this.conjurationData.isPactSummon = 0;
                    this.conjurationData.pactActorId = null;
                }
            }
        } else {
            origFinalize.call(this);
        }
    };
});

Hooks.on("deleteActor", async (actor) => {
    if (!game.user.isGM) return;

    const pactBindingName = _loc("CONJURATION.PACT.binding");
    const pactEffect = actor.effects.find(e => e.name === pactBindingName);

    if (pactEffect?.flags?.dsa5?.pactConsumption) {
        const { summonerUuid, levels } = pactEffect.flags.dsa5.pactConsumption;
        const summoner = await fromUuid(summonerUuid);
        if (summoner) {
            await summoner.removeCondition("demonicConsumption", levels, false);
        }
    }
});

Hooks.on("renderPlayerMenu", async (app, html) => {
    if (!app.actor || Number(app.conjurationData.conjurationType) !== game.dsa5.CONJURATION.TYPES.DEMON) return;

    const ruleOverDemons = _loc("LocalizedIDs.ruleOverDemons");

    html.querySelectorAll('[data-action="skillSelect"]').forEach(btn => {
        btn.addEventListener('click', () => {
            app.conjurationData.isPactSummon = 0;
            app.conjurationData.pactActorId = null;
        }, { capture: true });
    });

    if (app.conjurationData.isPactSummon) {
        html.querySelectorAll('.dsa-budget-bar-row').forEach(el => el.style.display = 'none');

        if (app.summoningPhase === 'extensions') {
            const extensionsPhase = html.querySelector('.summoning-phase');
            if (extensionsPhase) extensionsPhase.style.display = 'none';
        }
    }

    if (app.summoningPhase !== "ritual" || !app.conjuration) return;

    const paktGeschenk = app.actor.items.find(i => i.name === ruleOverDemons && i.type === "specialability");
    const daemonenMal = app.actor.items.find(i => i.type === "demonmark");
    if (!paktGeschenk || !daemonenMal) return;

    const patron = daemonenMal.system.domain;
    const creatureClass = app.conjuration.system.creatureClass?.value || "";
    if (!patron || !creatureClass.includes(_loc("CONJURATION.demon")) || !creatureClass.includes(patron)) return;

    const ritualBox = html.querySelector('.groupbox.paddingBox');
    if (!ritualBox || html.querySelector('.pact-summoning-box')) return;

    const rank = paktGeschenk.system.step.value;
    const kdv = daemonenMal.system.circle;

    const boxHtml = await foundry.applications.handlebars.renderTemplate(PACT_TEMPLATE, {
        ruleOverDemons,
        pactLevelTooltip: _loc("CONJURATION.PACT.level", { rank, patron }),
        img: daemonenMal.img,
        kdv
    });

    if (!html.querySelector('.pact-summoning-box')) {
        ritualBox.insertAdjacentHTML('afterend', boxHtml);

        const boxEl = html.querySelector('.pact-summoning-box');
        boxEl.querySelector('.pact-item-open').addEventListener('click', (ev) => {
            ev.preventDefault();
            paktGeschenk.sheet.render(true);
        });

        boxEl.querySelector('.pact-summon-btn').addEventListener('click', (ev) => {
            ev.preventDefault();
            app.conjurationData.selectedIds = [];
            app.conjurationData.selectedEntityIds = [];
            app.conjurationData.selectedPackageIds = [];
            app.conjurationData.consumedQS = 0;
            app.conjurationData.packageModifier = 0;

            app.conjurationData.qs = kdv;
            app.conjurationData.rollAttempted = true;
            app.conjurationData.isPactSummon = rank * 2;
            app.conjurationData.pactActorId = app.actor.id;
            app.summoningPhase = 'extensions';
            app.render(true);
        });
    }
});
