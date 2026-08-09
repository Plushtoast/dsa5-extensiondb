// transform spell source data object

let macroEffect = source.effects.find(x => x.flags?.dsa5?.args3 && x.flags.dsa5.args3.includes("createEmbeddedDocuments"));

if(!macroEffect) return;

macroEffect = foundry.utils.duplicate(macroEffect);
source.effects = source.effects.filter(x => x._id != macroEffect._id);

let code = macroEffect.flags.dsa5.args3;

code = code.replace(/quantity:\s*\{\s*value:\s*qs\s*\}/, "quantity: { value: qs * 4 }");

code = code.replace(/\.replace\("{qs}",\s*qs\)/, '.replace("{qs}", qs * 4)');

macroEffect.flags.dsa5.args3 = code;
source.effects.push(macroEffect);
