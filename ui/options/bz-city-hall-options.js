import '/core/ui/options/screen-options.js';  // make sure this loads first
import { C as CategoryType, O as Options, a as OptionType } from '/core/ui/options/editors/index.chunk.js';
import ModSettings from '/bz-city-hall/ui/options/mod-options-decorator.js';

const MOD_ID = "bz-city-hall";

const BZ_DEFAULT_OPTIONS = {
    compact: true,
};
const bzCityHallOptions = new class {
    data = { ...BZ_DEFAULT_OPTIONS };
    constructor() {
        const modSettings = ModSettings.load(MOD_ID);
        if (modSettings) this.data = modSettings;
    }
    save() {
        ModSettings.save(MOD_ID, this.data);
        document.body.classList.toggle("bz-city-compact", this.compact);
    }
    get compact() {
        return this.data.compact ?? BZ_DEFAULT_OPTIONS.compact;
    }
    set compact(flag) {
        this.data.compact = !!flag;
        this.save();
    }
};

const onInitCityCompact = (info) => {
    info.currentValue = bzCityHallOptions.compact;
};
const onUpdateCityCompact = (_info, flag) => {
    bzCityHallOptions.compact = flag;
};

Options.addInitCallback(() => {
    Options.addOption({
        category: CategoryType.Mods,
        // @ts-ignore
        group: "bz_mods",
        type: OptionType.Checkbox,
        id: "bz-city-compact",
        initListener: onInitCityCompact,
        updateListener: onUpdateCityCompact,
        label: "LOC_OPTIONS_BZ_CITY_COMPACT",
        description: "LOC_OPTIONS_BZ_CITY_COMPACT_DESCRIPTION",
    });
});

export { bzCityHallOptions as default };
