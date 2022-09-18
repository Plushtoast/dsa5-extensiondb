source.effects.push({
    label: source.name,
    icon: "icons/svg/aura.svg",
    changes: [],
    duration: { },
    flags: {
        dsa5: {
            value: null,
            editable: true,
            customizable: true,
            description: effect.name,
            hideOnToken: true,
            custom: true,
            onRemove: `await actor.addCondition(\"stunned\", 1, false)`,
        },
    },
})