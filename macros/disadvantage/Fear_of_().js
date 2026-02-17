const stepValue = item.system.step?.value || 0;

if (stepValue > 0) {
    const effectData = {
        name: item.name, 
        icon: "icons/svg/terror.svg",
        origin: item.uuid,
        changes: [
            {
                key: "system.condition.feared", 
                mode: 2,
                value: stepValue
            }
        ],
        flags: {
            core: { statusId: "furcht" }
        }
    };

    await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);

}
