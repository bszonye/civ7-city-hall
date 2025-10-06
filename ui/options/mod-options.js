import { d as CategoryData, C as CategoryType } from '/core/ui/options/editors/index.chunk.js';

CategoryType["Mods"] = "mods";
CategoryData[CategoryType.Mods] ??= {
    title: "LOC_UI_CONTENT_MGR_SUBTITLE",
    description: "LOC_UI_CONTENT_MGR_SUBTITLE_DESCRIPTION",
};

// fix Options tab spacing
const MOD_OPTIONS_STYLE = document.createElement("style");
MOD_OPTIONS_STYLE.textContent = `
.option-frame .tab-bar__items fxs-tab-item {
    flex: 1 0 auto;
    min-width: 0rem;
    margin-left: 0.4444444444rem;
    margin-right: 0.4444444444rem;
}
`;
document.head.appendChild(MOD_OPTIONS_STYLE);

export class ModOptionsSingleton {
    save(modID, optionID, value) {
        const optionName = `${modID}.${optionID}`;
        UI.setOption("user", "Mod", optionName, value);
        Configuration.getUser().saveCheckpoint();
        if (localStorage.length > 1) {
            console.warn(`ModOptions: erasing storage (${localStorage.length} items)`);
            localStorage.clear();
        }
        const storage = localStorage.getItem("modSettings") || "{}";
        const options = JSON.parse(storage);
        options[modID] ??= {};
        options[modID][optionID] = value;
        localStorage.setItem("modSettings", JSON.stringify(options));
        console.warn(`SAVE ${optionName}=${value}`);
    }
    load(modID, optionID) {
        const optionName = `${modID}.${optionID}`;
        const value = UI.getOption("user", "Mod", optionName);
        if (value != null) {
            console.warn(`LOAD ${optionName}=${value} (saved)`);
            return value;
        }
        // const value = UI.getOption("user", "Mod", data.optionName);
        try {
            const storage = localStorage.getItem("modSettings");
            if (!storage) return null;
            const options = JSON.parse(storage);
            if (!options) return null;
            options[modID] ??= {};
            const value = options[modID][optionID];
            console.warn(`LOAD ${optionName}=${value} (stored)`);
            return value;
        }
        catch (e) {
            console.error(`ModOptions: error loading options`);
            console.error(`${modID}: ${e}`);
        }
        return null;
    }
}
const ModOptions = new ModOptionsSingleton();
export { ModOptions as default };
