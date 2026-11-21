const MODULE_ID = 'dsa5-godsofaventuria2';
const SOCKET = `module.${MODULE_ID}`;
const ICON_ROOT = `modules/${MODULE_ID}/icons`;

const socketHandlers = new Map();
let socketInitialized = false;

function namedIcon(folder, key, fallback) {
    return `${ICON_ROOT}/${folder}/${key ? `${key}.webp` : fallback}`;
}

export const DSA5GodsMenuConfig = {
    MODULE_ID,
    SOCKET,
    templatePath(relativePath) {
        return `modules/${MODULE_ID}/templates/${relativePath}`;
    },
    registerSocketHandler(type, handler) {
        socketHandlers.set(type, handler);
    },
    initSocket() {
        if (socketInitialized || !game.socket) return;
        socketInitialized = true;
        game.socket.on(SOCKET, async (payload) => {
            const handler = socketHandlers.get(payload?.type);
            if (handler) await handler(payload);
        });
    },
    getSchipSetting(key) {
        try {
            const raw = game.settings.get('dsa5', key) || '0/0';
            const [current = 0, max = 0] = raw.split('/').map(Number);
            return { current: Number.isFinite(current) ? current : 0, max: Number.isFinite(max) ? max : 0 };
        } catch {
            return { current: 0, max: 0 };
        }
    },
    async setSchipSetting(key, current, max) {
        await game.settings.set('dsa5', key, `${Math.max(0, current)}/${Math.max(0, max)}`);
    },
    buildSchipDots(total, available, buildExtra = null) {
        return Array.from({ length: Math.max(0, total) }, (_, i) => {
            const isFull = i < available;
            const base = { val: i + 1, cssClass: isFull ? 'fullSchip' : 'emptySchip' };
            return buildExtra ? { ...base, ...buildExtra(isFull, i, base.cssClass) } : base;
        });
    },
    hasPhexTradition(actor) {
        return !!actor?.items?.some(
            (item) => item.type === 'specialability' && item.name === _loc('LocalizedIDs.traditionPhex'),
        );
    },
    chipIcon(key, fallback = 'Alveran.webp') {
        return namedIcon('chips', key, fallback);
    },
    diceIcon(key, fallback) {
        return namedIcon('dice', key, fallback);
    },
    godListNames: [
        'Angrosch', 'Aves', 'Boron', 'Brazoragh', 'Efferd', 'Firun', 'Hesinde',
        'Himmelswölfe', 'Ifirn', 'Ingerimm', 'Kamaluq', 'Kor', 'Levthan', 'Mada',
        'Marbo', 'Mokoscha', 'Namenloser', 'Nandus', 'Numinoru', 'Peraine', 'Phex',
        'Praios', 'Rahja', 'Rastullah', 'Rondra', 'Satuaria', 'Shinxir', 'Simia',
        'Swafnir', 'Tairach', 'Travia', 'Tsa', 'Ucuri', 'Xeledon',
    ],
    demonListNames: [
        'Agrimoth', 'Amazeroth', 'Aphasmayra', 'Aphestadil', 'Asfaloth', 'Belhalhar',
        'Belkelel', 'Blakharaz', 'Charyptoroth', 'Heskatet', 'Lolgramoth', 'Mishkara',
        'Nagrach', 'Tasfarel', 'Thargunitoth',
    ],
    qsandreroll: {
        Agrimoth: ['LocalizedIDs.flying', 'LocalizedIDs.woodworking', 'LocalizedIDs.metalworking', 'LocalizedIDs.plantLore', 'LocalizedIDs.earthencraft'],
        Aphasmayra: ['LocalizedIDs.seduction', 'LocalizedIDs.climbing', 'LocalizedIDs.orienting', 'LocalizedIDs.stealth'],
        Aphestadil: ['LocalizedIDs.intimidation', 'LocalizedIDs.perception', 'LocalizedIDs.gambling'],
        Belkelel: ['LocalizedIDs.seduction', 'LocalizedIDs.intimidation', 'LocalizedIDs.ropes', 'LocalizedIDs.selfControl', 'LocalizedIDs.gambling'],
        Heskatet: ['LocalizedIDs.mythsAndLegends', 'LocalizedIDs.perception', 'LocalizedIDs.sphereLore'],
        Tasfarel: ['LocalizedIDs.commerce', 'LocalizedIDs.Fast-Talk', 'LocalizedIDs.stealth'],
        Thargunitoth: ['LocalizedIDs.treatSoul', 'LocalizedIDs.selfControl', 'LocalizedIDs.willpower'],
        Angrosch: ['LocalizedIDs.woodworking', 'LocalizedIDs.featOfStrength', 'LocalizedIDs.mechanics', 'LocalizedIDs.metalworking', 'LocalizedIDs.earthencraft', 'LocalizedIDs.gambling'],
        Boron: ['LocalizedIDs.treatSoul', 'LocalizedIDs.empathy', 'LocalizedIDs.willpower'],
        Efferd: ['LocalizedIDs.boatsAndShips', 'LocalizedIDs.fishing', 'LocalizedIDs.bodyControl', 'LocalizedIDs.swimming'],
        Firun: ['LocalizedIDs.tracking', 'LocalizedIDs.orienting', 'LocalizedIDs.Zoology', 'LocalizedIDs.survival'],
        Hesinde: ['LocalizedIDs.history', 'LocalizedIDs.religions', 'LocalizedIDs.magicalLore'],
        Himmelswölfe: ['LocalizedIDs.tracking', 'LocalizedIDs.bodyControl', 'LocalizedIDs.survival'],
        Ingerimm: ['LocalizedIDs.woodworking', 'LocalizedIDs.featOfStrength', 'LocalizedIDs.mechanics', 'LocalizedIDs.leatherworking', 'LocalizedIDs.metalworking', 'LocalizedIDs.clothworking'],
        Kamaluq: ['LocalizedIDs.intimidation', 'LocalizedIDs.climbing', 'LocalizedIDs.Zoology', 'LocalizedIDs.survival'],
        Levthan: ['LocalizedIDs.seduction', 'LocalizedIDs.featOfStrength', 'LocalizedIDs.willpower', 'LocalizedIDs.gambling'],
        Namenloser: ['LocalizedIDs.persuasion', 'LocalizedIDs.empathy', 'LocalizedIDs.selfControl', 'LocalizedIDs.willpower'],
        Numinoru: ['LocalizedIDs.fishing', 'LocalizedIDs.swimming', 'LocalizedIDs.willpower'],
        Peraine: ['LocalizedIDs.treatPoison', 'LocalizedIDs.treatDisease', 'LocalizedIDs.treatWounds', 'LocalizedIDs.plantLore'],
        Rahja: ['LocalizedIDs.seduction', 'LocalizedIDs.etiquette', 'LocalizedIDs.riding', 'LocalizedIDs.dancing', 'LocalizedIDs.gambling'],
        Rastullah: ['LocalizedIDs.orienting', 'LocalizedIDs.law', 'LocalizedIDs.riding', 'LocalizedIDs.willpower'],
        Satuaria: ['LocalizedIDs.seduction', 'LocalizedIDs.flying', 'LocalizedIDs.treatPoison', 'LocalizedIDs.treatDisease', 'LocalizedIDs.prepareFood'],
        Swafnir: ['LocalizedIDs.boatsAndShips', 'LocalizedIDs.fishing', 'LocalizedIDs.bodyControl', 'LocalizedIDs.swimming'],
        Tairach: ['LocalizedIDs.magicalLore', 'LocalizedIDs.astronomy', 'LocalizedIDs.willpower'],
        Ucuri: ['LocalizedIDs.persuasion', 'LocalizedIDs.law', 'LocalizedIDs.perception'],
    },
    extra: {
        Aves: ['ALL'],
        Phex: ['ALL'],
    },
    isGod(key) {
        return this.godListNames.includes(key);
    },
    schipName(key) {
        return _loc(this.isGod(key) ? `GodsMenu.GodSchip.${key}.Name` : `GodsMenu.ArchdemonSchip.${key}.Name`);
    },
    schipDescriptionKey(key) {
        return this.isGod(key) ? `GodsMenu.GodSchip.${key}.Description` : `GodsMenu.ArchdemonSchip.${key}.Description`;
    },
    schipDescription(key) {
        return _loc(this.schipDescriptionKey(key));
    },
    matchesRoll(list, rollName) {
        return !!list && (list.includes('ALL') || list.some((k) => _loc(k) === rollName));
    },
    isQsAndReroll(key, rollName) {
        return this.matchesRoll(this.qsandreroll?.[key], rollName);
    },
    isExtraReroll(key, rollName) {
        return this.matchesRoll(this.extra?.[key], rollName);
    },
};

Hooks.once('ready', () => DSA5GodsMenuConfig.initSocket());
