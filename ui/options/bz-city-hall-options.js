import '/core/ui/options/screen-options.js';  // make sure this loads first
import { C as CategoryType, O as Options, a as OptionType } from '/core/ui/options/editors/index.chunk.js';
// set up mod options tab
import ModOptions from '/bz-city-hall/ui/options/mod-options.js';

const bzCityHallOptions = new class {
    modID = "bz-city-hall";
    defaults = {
        compact: Number(true),
    };
    data = {};
    load(optionID) {
        const value = ModOptions.load(this.modID, optionID);
        if (value == null) {
            const value = this.defaults[optionID];
            console.warn(`LOAD ${this.modID}.${optionID}=${value} (default)`);
            return value;
        }
        return value;
    }
    save(optionID) {
        const value = Number(this.data[optionID]);
        ModOptions.save(this.modID, optionID, value);
    }
    get compact() {
        this.data.compact ??= Boolean(this.load("compact"));
        return this.data.compact;
    }
    set compact(flag) {
        this.data.compact = Boolean(flag);
        this.save("compact");
        document.body.classList.toggle("bz-city-compact", this.data.compact);
    }
};

// fix Options initialization
Options.addInitCallback = function(callback) {
    if (this.optionsReInitCallbacks.length && !this.optionsInitCallbacks.length) {
        throw new Error("Options already initialized, cannot add init callback");
    }
    this.optionsInitCallbacks.push(callback);
    this.optionsReInitCallbacks.push(callback);
}

Options.addInitCallback(() => {
    Options.addOption({
        category: CategoryType.Mods,
        group: "bz_mods",
        type: OptionType.Checkbox,
        id: "bz-city-compact",
        initListener: (info) => info.currentValue = bzCityHallOptions.compact,
        updateListener: (_info, value) => bzCityHallOptions.compact = value,
        label: "LOC_OPTIONS_BZ_CITY_COMPACT",
        description: "LOC_OPTIONS_BZ_CITY_COMPACT_DESCRIPTION",
    });
});

export { bzCityHallOptions as default };
