// transform spell source data object

let macroEffect = source.effects.find(x => x.flags?.dsa5?.args3 && x.flags.dsa5.args3.includes("createEmbeddedDocuments"));

if(!macroEffect) return;

macroEffect = foundry.utils.duplicate(macroEffect);
source.effects = source.effects.filter(x => x._id != macroEffect._id);

let code = macroEffect.flags.dsa5.args3;

const injection = `
  effects: [{
    name: dict.itemName,
    img: "icons/svg/aura.svg",
    transfer: false,
    changes: [
      { key: "system.skillModifiers.FP", mode: 0, value: "Invocatio Minor 2, Invocatio Maior 2, Invocatio Maxima 2" }
    ]
  }],
`;

code = code.replace(/const\s+itemData\s*=\s*\{/, `const itemData = { ${injection}`);

macroEffect.flags.dsa5.args3 = code;
source.effects.push(macroEffect);
