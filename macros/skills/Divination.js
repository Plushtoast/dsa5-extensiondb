Hooks.once("init", () => {
    game.dsa5Magic2 = game.dsa5Magic2 || {};

    game.dsa5Magic2.castDivination = async (sourceActor) => {
        if (!sourceActor) {
            ui.notifications.warn(game.i18n.localize("DIVINATION.selectTokenWarn"));
            return;
        }

        const targets = Array.from(game.user.targets);
        if (targets.length !== 1) {
            ui.notifications.warn(game.i18n.localize("DIVINATION.selectOneTargetWarn"));
            return;
        }

        const targetActor = targets[0]?.actor;
        
        const targetUsers = game.users.players.filter(u => targetActor?.testUserPermission(u, "OWNER"));
        if (targetUsers.length === 0) {
            ui.notifications.warn(game.i18n.localize("DIVINATION.noOwnerWarn"));
            return;
        }
        
        const whisperRecipients = targetUsers.map(u => u.id);
        const senderName = foundry.utils.getProperty(sourceActor, "name") || sourceActor.name;

        const actionLabel = game.i18n.localize("DIVINATION.actionLabel");
        const wantsToDo = game.i18n.localize("DIVINATION.wantsToDo");

        const messageContent = `
            <div class="dsa5 chat-card">
                <div class="message-content">
                    <p class="center">${senderName} ${wantsToDo}</p>
                    <button class="divination-open-btn chatButton width100 margin-top" data-target="${targetActor.id}">
                        ${actionLabel}
                    </button>
                </div>
            </div>
        `;

        await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: sourceActor }),
            content: messageContent,
            whisper: whisperRecipients
        });
    };
});

Hooks.on("renderChatMessage", (message, html, data) => {
    const htmlElement = html instanceof jQuery ? html[0] : html;
    const btn = htmlElement.querySelector('.divination-open-btn');
    
    if (!btn) return;

    btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        
        const targetId = ev.currentTarget.dataset.target;
        const targetActor = game.actors.get(targetId);

        if (!targetActor || !targetActor.isOwner) {
            ui.notifications.warn(game.i18n.localize("DIVINATION.notOwnerWarn"));
            return;
        }

        const actionLabel = game.i18n.localize("DIVINATION.actionLabel");
        const dialogText = game.i18n.localize("DIVINATION.dialogText");
        const rulesText = game.i18n.localize("DIVINATION.rulesText");
        const acceptLabel = game.i18n.localize("DIVINATION.acceptLabel");
        const declineLabel = game.i18n.localize("DIVINATION.declineLabel");

        const { DialogV2 } = foundry.applications.api;

        DialogV2.wait({
            window: { title: actionLabel },
            position: { width: 650 },
            content: `
                <div class="groupbox paddingBox marginBottom">
                    <p><i>${dialogText}</i></p>
                    <p><b>${rulesText}</b></p>
                </div>
            `,
            buttons: [
                {
                    action: "accept",
                    label: acceptLabel,
                    icon: "fas fa-check",
                    default: true,
                    callback: async () => {
                        let current = foundry.utils.getProperty(targetActor, "system.status.fatePoints.value") ?? 0;
                        let max = foundry.utils.getProperty(targetActor, "system.status.fatePoints.max") ?? 0;

                        const effectData = {
                            name: game.i18n.localize("DIVINATION.effectName"),
                            icon: "icons/svg/aura.svg",
                            origin: targetActor.uuid,
                            duration: { rounds: null }, 
                            changes: [
                                {
                                    key: "system.skillModifiers.global",
                                    value: -1,
                                    mode: 0, 
                                    priority: 20,
                                }
                            ],
                            flags: {
                                dsa5: {
                                    description: game.i18n.localize("DIVINATION.effectDesc"),
                                },
                            },
                        };

                        if (current >= max) {
                            effectData.changes.push({
                                key: "system.status.fatePoints.gearmodifier",
                                value: 1,
                                mode: CONST.ACTIVE_EFFECT_MODES.ADD,
                                priority: 20,
                            });

                            await targetActor.createEmbeddedDocuments("ActiveEffect", [effectData]);
                            await targetActor.update({ "system.status.fatePoints.value": current + 1 });
                            current += 1;
                            max += 1;
                        } else {
                            await targetActor.createEmbeddedDocuments("ActiveEffect", [effectData]);
                            await targetActor.update({ "system.status.fatePoints.value": current + 1 });
                            current += 1;
                        }

                        const inPenaltyLabel = game.i18n.localize("DIVINATION.inPenaltyLabel");
                        const extra = inPenaltyLabel + (current >= max ? " " : "");
                        
                        ui.notifications.info(game.i18n.format("DIVINATION.acceptedInfo", { 
                            name: targetActor.name, 
                            current: current, 
                            max: max, 
                            extra: extra 
                        }));
                    }
                },
                {
                    action: "decline",
                    label: declineLabel,
                    icon: "fas fa-times",
                    callback: () => {
                        ui.notifications.info(game.i18n.localize("DIVINATION.declinedInfo"));
                    }
                }
            ]
        });
    });
});
