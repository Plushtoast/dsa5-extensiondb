//Nachteil

const isLeather = actor?.items.some(i => i.type === 'armor' && i.system.worn?.value && i.system.subcategory === 3);
if(options.armor >= 3 && !isLeather) options.damage = Math.max(0, options.damage - 2);


//Vorteil

const isLeather = actor?.items.some(i => i.type === 'armor' && i.system.worn?.value && i.system.subcategory === 3);
if (options.armor === 0 || isLeather) options.damage += 1;
