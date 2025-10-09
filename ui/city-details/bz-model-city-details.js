import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';
import { U as UpdateGate } from '/core/ui/utilities/utilities-update-gate.chunk.js';
export const bzUpdateCityDetailsEventName = 'bz-update-city-details';

class bzUpdateCityDetailsEvent extends CustomEvent {
    constructor() {
        super(bzUpdateCityDetailsEventName, { bubbles: false });
    }
}

const IMPROVEMENT_BONUS_INDEXES = {
    LOC_IMPROVEMENT_EXPEDITION_BASE_NAME: -1,
    LOC_IMPROVEMENT_FARM_NAME: 0,
    LOC_IMPROVEMENT_FISHING_BOAT_NAME: 0,
    LOC_IMPROVEMENT_PASTURE_NAME: 0,
    LOC_IMPROVEMENT_PLANTATION_NAME: 0,
    LOC_IMPROVEMENT_CAMP_NAME: 1,
    LOC_IMPROVEMENT_CLAY_PIT_NAME: 1,
    LOC_IMPROVEMENT_MINE_NAME: 1,
    LOC_IMPROVEMENT_OIL_RIG_NAME: 1,
    LOC_IMPROVEMENT_QUARRY_NAME: 1,
    LOC_IMPROVEMENT_WOODCUTTER_NAME: 1,
};
const YIELD_GOLD_INFO = GameInfo.Yields.lookup(YieldTypes.YIELD_GOLD);
const YIELD_HAPPINESS_INFO = GameInfo.Yields.lookup(YieldTypes.YIELD_HAPPINESS);

const bzNameSort = (a, b) => {
    const aname = Locale.compose(a).toUpperCase();
    const bname = Locale.compose(b).toUpperCase();
    return aname.localeCompare(bname);
}
function getReligionInfo(id) {
    // find a matching player religion, to get custom names
    const info = GameInfo.Religions.lookup(id);
    if (!info) return null;
    // find custom religion name, if any
    const customName = (info) => {
        for (const founder of Players.getEverAlive()) {
            if (founder.Religion?.getReligionType() != id) continue;
            return founder.Religion.getReligionName();
        }
        return info.Name;
    }
    const name = customName(info);
    const icon = info.ReligionType;
    return { name, icon, info, };
}
class bzCityDetailsModel {
    set updateCallback(callback) {
        this.onUpdate = callback;
    }
    growth = null;
    connections = null;
    improvements = new Map();
    warehouseTable = null;
    townFocusTable = null;
    updateGate = new UpdateGate(() => {
        const cityID = UI.Player.getHeadSelectedCity();
        if (!cityID || ComponentID.isInvalid(cityID)) {
            this.reset();
            return;
        }
        const city = Cities.get(cityID);
        if (!city) {
            console.error(`bz-city-details-model: Failed to get city=${cityID}`);
            return;
        }
        this.updateOverview(city);
        // notifications
        this.onUpdate?.(this);
        window.dispatchEvent(new bzUpdateCityDetailsEvent());
    });
    constructor() {
        // update callback
        this.updateGate.call('constructor');
        engine.on('CityGrowthModeChanged', this.onCityGrowthModeChanged, this);
        engine.on('CityPopulationChanged', this.onCityPopulationChanged, this);
        engine.on('CitySelectionChanged', this.onCitySelectionChanged, this);
    }
    onCityGrowthModeChanged() {
        // catches Town Focus and Convert to City events
        this.updateGate.call('onCityGrowthModeChanged');
    }
    onCityPopulationChanged() {
        this.updateGate.call('onCityPopulationChanged');
    }
    onCitySelectionChanged() {
        this.updateGate.call('onCitySelectionChanged');
    }
    reset() {
        // overview
        this.growth = null;
        this.connections = null;
        this.improvements = new Map();
        this.warehouseTable = null;
        this.townFocusTable = null;
        // notifications
        this.onUpdate?.(this);
        window.dispatchEvent(new bzUpdateCityDetailsEvent());
    }
    updateOverview(city) {
        this.growth = this.modelGrowth(city);
        this.connections = this.modelConnections(city);
        this.improvements = this.modelImprovements(city);
        this.warehouseTable = this.modelWarehouses(city);
        this.townFocusTable = this.modelTownFocus(city);
    }
    modelGrowth(city) {
        // food
        const isGrowing = city.Growth?.growthType == GrowthTypes.EXPAND;
        const current = city.Growth?.currentFood ?? -1;
        const threshold = city.Growth?.getNextGrowthFoodThreshold().value ?? -1;
        const net = city.Yields.getNetYield(YieldTypes.YIELD_FOOD);
        const turns = city.Growth?.turnsUntilGrowth ?? -1;
        const food = { isGrowing, current, threshold, net, turns, };
        // population
        const isTown = city.isTown;
        const total = city.population ?? 0;
        const urban = city.urbanPopulation ?? 0;
        const rural = city.ruralPopulation ?? 0;
        const specialists = city.Workers.getNumWorkers(false) ?? 0;
        const pop = { isTown, total, urban, rural, specialists, };
        // religion
        const religion = { majority: null, urban: null, rural: null, };
        if (city.Religion) {
            const info = city.Religion;
            religion.majority = getReligionInfo(info.majorityReligion);
            religion.urban = getReligionInfo(info.urbanReligion);
            religion.rural = getReligionInfo(info.ruralReligion);
        }
        return { food, pop, religion, };
    }
    modelConnections(city) {
        const ids = city.getConnectedCities() ?? [];
        // convert to city objects and weed out broken connections
        const settlements = ids.map(id => Cities.get(id)).filter(e => e);
        settlements.sort((a, b) => bzNameSort(a.name, b.name));
        const cities = [];
        const towns = [];
        const focused = [];
        const growing = [];
        for (const conn of settlements) {
            if (conn.isTown) {
                towns.push(conn);
                if (conn.Growth?.growthType == GrowthTypes.EXPAND) {
                    growing.push(conn);
                } else {
                    focused.push(conn);
                }
            } else {
                cities.push(conn);
            }
        }
        return { settlements, cities, towns, focused, growing, };
    }
    modelImprovements(city) {
        const improvements = new Map();
        improvements.appeal = 0;
        improvements.resources = 0;
        improvements.factoryResources = 0;
        const ids = city.Constructibles?.getIds() ?? [];
        for (const id of ids) {
            const item = Constructibles.getByComponentID(id);
            const cinfo = item && GameInfo.Constructibles.lookup(item.type);
            if (cinfo?.ConstructibleClass != "IMPROVEMENT") continue;
            const loc = item.location;
            const fcid = Districts.getFreeConstructible(loc, GameContext.localPlayerID);
            const fcinfo = GameInfo.Constructibles.lookup(fcid);
            // group all improvements with the same localized name
            // (like IMPROVEMENT_EXPEDITION_BASE & IMPROVEMENT_MOUNTAIN)
            const key = fcinfo.Name;
            const imp = improvements.get(key) ?? { ...fcinfo, count: 0 };
            // count matching improvements
            if (!imp.count) improvements.set(key, imp);
            imp.count += 1;
            // warehouse yield icons
            imp.bonusIndex = IMPROVEMENT_BONUS_INDEXES[fcinfo.Name] ?? -1;
            imp.bonusIcon = GameInfo.Yields[imp.bonusIndex]?.YieldType;
            // Resort Town: natural Happiness yields
            const plot = GameplayMap.getIndexFromLocation(loc);
            const yields = GameplayMap.getYields(plot, GameContext.localPlayerID);
            for (const [type, v] of yields) {
                if (v && type == YieldTypes.YIELD_HAPPINESS) improvements.appeal += 1;
            };
            // Trade Outpost and Factory Town: resources
            const resourceType = GameplayMap.getResourceType(loc.x, loc.y);
            const resource = GameInfo.Resources.lookup(resourceType);
            if (resource) {
                improvements.resources += 1;
                if (resource.ResourceClassType == "RESOURCECLASS_FACTORY") {
                    improvements.factoryResources += 1;
                }
            }
        }
        return improvements;
    }
    modelWarehouses(_city) {
        const warehouses = [...this.improvements.values()].map(info => ({
            icon: info.ConstructibleType,
            name: info.Name,
            bonusIndex: info.bonusIndex,
            details: [{ icon: info.bonusIcon, bonus: info.count }],
        }));
        return warehouses.sort((a, b) =>
            a.bonusIndex - b.bonusIndex || bzNameSort(a.name, b.name));
    }
    modelTownFocus(city) {
        if (!city.isTown) return null;
        const focusHash = city.Growth?.projectType;
        const loc = city.location;
        // get current age and per-age multiplier
        const age = GameInfo.Ages.lookup(Game.age);
        const perAge = age.ChronologyIndex + 1;
        // get the enabled Town Focus projects
        const canStart = Game.CityCommands.canStart(
            city.id,
            CityCommandTypes.CHANGE_GROWTH_MODE,
            { Type: GrowthTypes.PROJECT },
            false
        );
        const enabled = new Set(canStart.Projects ?? []);
        // utility functions
        const buildingTypes = () => city.Constructibles.getIds()
            .map(id => Constructibles.getByComponentID(id))
            .map(c => c && GameInfo.Constructibles.lookup(c.type))
            .filter(info => info?.ConstructibleClass == "BUILDING")
            .map(info => info.ConstructibleType);
        const warehouseCount = (...types) => {
            const counts = types.map(name => this.improvements.get(name)?.count ?? 0);
            return counts.reduce((a, v) => a + v, 0);
        }
        // collect town focus entries
        const projects = [];
        for (const info of GameInfo.Projects) {
            if (info.CityOnly) continue;
            const project = {
                icon: info.ProjectType,
                name: info.Name,
                description: info.Description,
                highlight: info.$hash == focusHash,
                disabled: !enabled.has(info.$index),
            };
            switch (info.ProjectType) {
                case "PROJECT_TOWN_FORT":
                    project.details = [{ icon: "ACTION_FORTIFY", bonus: 25 }];
                    break;
                case "PROJECT_TOWN_URBAN_CENTER": {
                    const maintenance = buildingTypes()
                        .map(type => city.Constructibles.getMaintenance(type));
                    const mGold = maintenance.map(m => m[YIELD_GOLD_INFO.$index])
                    const mHappy = maintenance.map(m => m[YIELD_HAPPINESS_INFO.$index])
                    const dGold = mGold.reduce((a, m) => a + m, 0) / 2;
                    const dHappy = mHappy.reduce((a, m) => a + m, 0) / 2;
                    project.details = [
                        { icon: "YIELD_GOLD", bonus: dGold },
                        { icon: "YIELD_HAPPINESS", bonus: dHappy },
                    ];
                    break;
                }
                case "PROJECT_TOWN_RESORT": {
                    const bonus = this.improvements.appeal * perAge;
                    project.details = [
                        { icon: "YIELD_GOLD", bonus },
                        { icon: "YIELD_HAPPINESS", bonus },
                    ];
                    break;
                }
                case "PROJECT_TOWN_GRANARY":
                case "PROJECT_TOWN_FISHING": {
                    const isCoastal = GameplayMap.isCoastalLand(loc.x, loc.y);
                    const isCoastalProject = info.ProjectType == "PROJECT_TOWN_FISHING";
                    if (isCoastal !== isCoastalProject) continue;
                    const count = warehouseCount(
                        "LOC_IMPROVEMENT_FARM_NAME",
                        "LOC_IMPROVEMENT_PASTURE_NAME",
                        "LOC_IMPROVEMENT_PLANTATION_NAME",
                        "LOC_IMPROVEMENT_FISHING_BOAT_NAME",
                    );
                    project.details = [{ icon: "YIELD_FOOD", bonus: count * perAge }];
                    break;
                }
                case "PROJECT_TOWN_PRODUCTION": {
                    const count = warehouseCount(
                        "LOC_IMPROVEMENT_CAMP_NAME",
                        "LOC_IMPROVEMENT_WOODCUTTER_NAME",
                        "LOC_IMPROVEMENT_CLAY_PIT_NAME",
                        "LOC_IMPROVEMENT_MINE_NAME",
                        "LOC_IMPROVEMENT_QUARRY_NAME",
                    );
                    project.details = [{
                        icon: "YIELD_PRODUCTION",
                        bonus: count * (perAge + 1),
                    }];
                    break;
                }
                case "PROJECT_TOWN_TRADE": {
                    const bonus = 2 * this.improvements.resources;
                    project.details = [
                        { icon: "YIELD_TRADES", bonus: 5 },
                        { icon: "YIELD_HAPPINESS", bonus },
                    ];
                    break;
                }
                case "PROJECT_TOWN_TEMPLE":
                    project.details = [{
                        icon: "YIELD_HAPPINESS",
                        bonus: buildingTypes().length,
                    }];
                    break;
                case "PROJECT_TOWN_INN":
                    project.details = [{
                        icon: "YIELD_DIPLOMACY",
                        bonus: city.getConnectedCities()?.length ?? 0,
                    }];
                    break;
                case "PROJECT_TOWN_FACTORY":
                    project.details = [{ icon: "YIELD_TRADES", bonus: 5 }];
                    break;
            }
            projects.push(project);
        }
        return projects;
    }
    sortConstructibles(buildings, improvements, wonders) {
        // sort buildings by population (walls last)
        for (const district of buildings) {
            // add the population data
            const data = district.constructibleData;
            for (const item of data) {
                if ('population' in item) continue;
                const ctype = GameInfo.Constructibles.lookup(item.type);
                item.population = ctype?.Population ?? 0;
            }
            data.sort((a, b) => b.population - a.population);
        }
        // sort improvements and wonders by name
        improvements.sort((a, b) =>
            Locale.compose(a.name ?? '').localeCompare(Locale.compose(b.name ?? '')));
        wonders.sort((a, b) =>
            Locale.compose(a.name ?? '').localeCompare(Locale.compose(b.name ?? '')));
    }
}
const bzCityDetails = new bzCityDetailsModel();
engine.whenReady.then(() => {
    const updateModel = () => {
        engine.updateWholeModel(bzCityDetails);
    };
    engine.createJSModel('g_bzCityDetails', bzCityDetails);
    bzCityDetails.updateCallback = updateModel;
});
export { bzCityDetails as default };
