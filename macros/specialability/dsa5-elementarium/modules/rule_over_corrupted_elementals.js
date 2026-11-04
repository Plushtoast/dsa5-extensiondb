const PACT_TEMPLATE = "modules/dsa5-elementarium/templates/pact_summoning.hbs";

Hooks.once("init", () => {
    foundry.applications.handlebars.loadTemplates([PACT_TEMPLATE]);
});

Hooks.once("ready", () => {
    const playerMenuInstance = game.dsa5?.apps?.playerMenu;
    if (!playerMenuInstance) return;

    const elementalType = game.dsa5.CONJURATION.TYPES.ELEMENTAL;
    const origPost = playerMenuInstance.conjurationData.postFunction[elementalType];

    playerMenuInstance.conjurationData.postFunction[elementalType] = async function (conjurationDataObj, qs, type) {
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
    if (PlayerMenuPrototype._pactSummonPatched) return;

    const resetPactState = (instance) => {
        if (!instance?.conjurationData) return;
        instance.conjurationData.isPactSummon = 0;
        instance.conjurationData.pactActorId = null;
        instance.conjurationData.pactConjurationType = null;
        instance.conjurationData.pactBindingDesc = null;
    };

    const origApplyTarget = PlayerMenuPrototype.applyConjurationTarget;
    PlayerMenuPrototype.applyConjurationTarget = function (actor) {
        resetPactState(this);
        return origApplyTarget.call(this, actor);
    };

    const origClearTarget = PlayerMenuPrototype.clearConjurationTarget;
    PlayerMenuPrototype.clearConjurationTarget = function () {
        resetPactState(this);
        return origClearTarget.call(this);
    };

    const origCalcServices = PlayerMenuPrototype.calculateConjurationServices;
    PlayerMenuPrototype.calculateConjurationServices = function (qs = this.conjurationData.qs, consumedQS = this.conjurationData.consumedQS) {
        if (this.conjurationData?.isPactSummon) {
            return Number(qs);
        }
        return origCalcServices.call(this, qs, consumedQS);
    };

    const origPrepareContext = PlayerMenuPrototype._prepareContext;
    PlayerMenuPrototype._prepareContext = async function (options) {
        if (
            this.conjurationData?.isPactSummon &&
            (this.actor?.id !== this.conjurationData.pactActorId ||
             Number(this.conjurationData.conjurationType) !== Number(this.conjurationData.pactConjurationType))
        ) {
            resetPactState(this);
        }

        const data = await origPrepareContext.call(this, options);

        if (this.conjurationData?.isPactSummon && data.summary) {
            data.summary.blockers = [];
            data.summary.canFinalize = true;
            data.summary.nextStep = "CONJURATION.nextStep.finalize";
        }

        return data;
    };

    const origFinalize = PlayerMenuPrototype.finalizeConjuration;
    PlayerMenuPrototype.finalizeConjuration = function () {
        if (this.conjurationData?.isPactSummon && this.conjuration) {
            const origToObject = this.conjuration.toObject.bind(this.conjuration);
            const levels = this.conjurationData.isPactSummon;
            const summonerUuid = this.actor.uuid;

            const pactBindingName = _loc("CONJURATION.PACT.binding");
            const pactBindingDesc = this.conjurationData.pactBindingDesc || _loc("CONJURATION.PACT.bindingDescElemental");

            this.conjuration.toObject = (source) => {
                const obj = origToObject(source);
                obj.effects = obj.effects || [];

                if (!obj.effects.some(e => e.name === pactBindingName)) {
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
                }
                return obj;
            };

            try {
                origFinalize.call(this);
            } finally {
                this.conjuration.toObject = origToObject;
                if (!(Number(this.conjurationData.consumedQS) > Number(this.conjurationData.qs))) {
                    resetPactState(this);
                }
            }
        } else {
            origFinalize.call(this);
        }
    };

    Hooks.on("deleteActor", async (actor) => {
        if (!game.user.isGM) return;

        const pactBindingName = _loc("CONJURATION.PACT.binding");
        const pactEffect = actor.effects?.find(e => e.name === pactBindingName);

        if (pactEffect?.flags?.dsa5?.pactConsumption) {
            const { summonerUuid, levels } = pactEffect.flags.dsa5.pactConsumption;
            const summoner = await fromUuid(summonerUuid);
            if (summoner) {
                await summoner.removeCondition("demonicConsumption", levels, false);
            }
        }
    });

    PlayerMenuPrototype._pactSummonPatched = true;
});

Hooks.on("renderPlayerMenu", async (app, html) => {
    if (!app.actor || Number(app.conjurationData.conjurationType) !== game.dsa5.CONJURATION.TYPES.ELEMENTAL) return;

    const ruleOverCorruptedElementals = _loc("LocalizedIDs.ruleOverCorruptedElementals");

    html.querySelectorAll('[data-action="skillSelect"]').forEach(btn => {
        btn.addEventListener('click', () => {
            app.conjurationData.isPactSummon = 0;
            app.conjurationData.pactActorId = null;
            app.conjurationData.pactConjurationType = null;
            app.conjurationData.pactBindingDesc = null;
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

    const paktGeschenk = app.actor.items.find(i => i.name === ruleOverCorruptedElementals && i.type === "specialability");
    const daemonenMal = app.actor.items.find(i => i.type === "demonmark");
    if (!paktGeschenk || !daemonenMal) return;

    const patron = daemonenMal.system.domain;
    const creatureClass = app.conjuration.system.creatureClass?.value || "";

    const patronElementMap = {
        [_loc("CONJURATION.PACT.patrons.agrimoth")]: [
            _loc("CONJURATION.PACT.elements.unerz"),
            _loc("CONJURATION.PACT.elements.unfeuer"),
            _loc("CONJURATION.PACT.elements.unhumus"),
            _loc("CONJURATION.PACT.elements.unluft")
        ],
        [_loc("CONJURATION.PACT.patrons.charyptoroth")]: [
            _loc("CONJURATION.PACT.elements.unwasser")
        ],
        [_loc("CONJURATION.PACT.patrons.nagrach")]: [
            _loc("CONJURATION.PACT.elements.uneis")
        ]
    };

    const allowedElements = patronElementMap[patron];
    const isElemental = creatureClass.includes(_loc("CONJURATION.elemental"));
    const isMatchingCorruptedElement = allowedElements?.some(el => creatureClass.includes(el));

    if (!isElemental || !isMatchingCorruptedElement) return;

    const rank = paktGeschenk.system.step.value;
    const difficulty = Number(app.conjuration.system.conjuringDifficulty?.value);
    const isAllowedRank = (rank === 1 && difficulty === -1) || (rank >= 2 && (difficulty === -1 || difficulty === -3));

    if (!isAllowedRank) return;

    const ritualBox = html.querySelector('.groupbox.paddingBox');
    if (!ritualBox || html.querySelector('.pact-summoning-box')) return;

    const kdv = daemonenMal.system.circle;

    const boxHtml = await foundry.applications.handlebars.renderTemplate(PACT_TEMPLATE, {
        ruleOverCorruptedElementals,
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
            app.conjurationData.pactConjurationType = app.conjurationData.conjurationType;
            app.conjurationData.pactBindingDesc = _loc("CONJURATION.PACT.bindingDescElemental");
            app.summoningPhase = 'extensions';
            app.render(true);
        });
    }
});
