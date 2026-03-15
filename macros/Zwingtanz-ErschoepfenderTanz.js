source.effects.push({
    name: source.name,
    img: "icons/svg/aura.svg",
    changes: [],
    duration: { },
    flags: {
        dsa5: {
            value: null,
            editable: true,
            customizable: true,
            description: effect.system.description.value,
            hideOnToken: true,
            custom: true,
            onRemove: `await actor.addCondition(\"stunned\", 1, false)`,
        },
    },
})
