import { A as Audio } from '/core/ui/input/focus-manager.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';
import { Icon } from '/core/ui/utilities/utilities-image.chunk.js';
import { BuildingPlacementManager } from '/base-standard/ui/building-placement/building-placement-manager.js';
import { a as formatStringArrayAsNewLineText } from '/core/ui/utilities/utilities-core-textprovider.chunk.js';
import { U as UpdateGate } from '/core/ui/utilities/utilities-update-gate.chunk.js';
import { A as AdvisorUtilities } from '/base-standard/ui/tutorial/tutorial-support.chunk.js';

const UpdateCityDetailsEventName = "update-city-details";
class UpdateCityDetailsEvent extends CustomEvent {
    constructor() {
        super(UpdateCityDetailsEventName, { bubbles: false });
    }
}
class CityDetailsModel {
    isTown = false;
    specialistPerTile = 0;
    currentCitizens = 0;
    turnsToNextCitizen = 0;
    hasTownFocus = false;
    happinessPerTurn = 0;
    hasUnrest = false;
    foodPerTurn = 0;
    foodToGrow = 0;
    buildings = [];
    improvements = [];
    wonders = [];
    yields = [];
    baseYieldValue = 0;
    isBeingRazed = false;
    getTurnsUntilRazed = -1;
    treasureFleetText = "";
    connectedSettlementFood = [];
    onUpdate;
    set updateCallback(callback) {
        this.onUpdate = callback;
    }
    constructor() {
        this.updateGate.call("constructor");
        engine.on("CitySelectionChanged", this.onCitySelectionChanged, this);
        engine.on("CityGrowthModeChanged", this.onCityGrowthModeChanged, this);
        engine.on("CityPopulationChanged", this.onCityPopulationchanged, this);
    }
    onCityPopulationchanged() {
        this.updateGate.call("onCityPopulationChanged");
    }
    onCitySelectionChanged() {
        this.updateGate.call("onCitySelectionChanged");
    }
    onCityGrowthModeChanged() {
        this.updateGate.call("onCityGrowthModeChanged");
    }
    reset() {
        this.specialistPerTile = 0;
        this.currentCitizens = 0;
        this.turnsToNextCitizen = 0;
        this.happinessPerTurn = 0;
        this.foodPerTurn = 0;
        this.foodToGrow = 0;
        this.buildings = [];
        this.improvements = [];
        this.wonders = [];
        this.connectedSettlementFood = [];
        if (this.onUpdate) {
            this.onUpdate(this);
        }
        window.dispatchEvent(new UpdateCityDetailsEvent());
    }
    updateGate = new UpdateGate(() => {
        const selectedCityID = UI.Player.getHeadSelectedCity();
        if (!selectedCityID || ComponentID.isInvalid(selectedCityID)) {
            this.reset();
            return;
        }
        const city = Cities.get(selectedCityID);
        if (!city) {
            console.error(`model-city-details: Failed to get city for ID ${selectedCityID}`);
            return;
        }
        const cityResources = city.Resources;
        if (!cityResources) {
            console.error(`model-city-details: Failed to get city.Resources for ID ${selectedCityID}`);
            return;
        }
        this.isTown = city.isTown;
        this.currentCitizens = city.population;
        const cityYields = city.Yields;
        if (!cityYields) {
            console.error(`model-city-details: Failed to get city.Yields for ID ${selectedCityID}`);
            return;
        }
        this.foodPerTurn = cityYields.getNetYield(YieldTypes.YIELD_FOOD);
        const cityGrowth = city.Growth;
        if (cityGrowth) {
            this.turnsToNextCitizen = cityGrowth.turnsUntilGrowth;
            this.foodToGrow = cityGrowth.getNextGrowthFoodThreshold().value;
            if (this.isTown && cityGrowth.growthType != GrowthTypes.EXPAND) {
                this.hasTownFocus = true;
            } else {
                this.hasTownFocus = false;
            }
        }
        const cityHappiness = city.Happiness;
        if (cityHappiness) {
            this.happinessPerTurn = cityHappiness.netHappinessPerTurn;
            this.hasUnrest = cityHappiness.hasUnrest;
        }
        const cityWorkers = city.Workers;
        if (cityWorkers) {
            this.specialistPerTile = cityWorkers.getCityWorkerCap();
        }
        const constructibles = city.Constructibles;
        if (!constructibles) {
            console.error(`model-city-details: Failed to get city.Constructibles for ID ${city.id}`);
            return;
        }
        this.buildings = [];
        this.improvements = [];
        this.wonders = [];
        for (const constructibleID of constructibles.getIds()) {
            const constructible = Constructibles.getByComponentID(constructibleID);
            if (!constructible) {
                return;
            }
            const constructibleDefinition = GameInfo.Constructibles.lookup(constructible.type);
            if (!constructibleDefinition) {
                return;
            }
            const constructibleData = {
                id: constructibleID,
                location: constructible.location,
                type: constructibleDefinition.ConstructibleType,
                name: constructibleDefinition.Name,
                damaged: constructible.damaged,
                icon: constructibleDefinition.ConstructibleType,
                iconContext: constructibleDefinition.ConstructibleClass
            };
            const maintenances = constructibles.getMaintenance(constructibleDefinition.ConstructibleType);
            for (const index in maintenances) {
                const maintenanceValue = maintenances[index];
                if (maintenanceValue > 0) {
                    if (!constructibleData.maintenanceMap) {
                        constructibleData.maintenanceMap = /* @__PURE__ */ new Map();
                    }
                    const yieldDefinition = GameInfo.Yields[index];
                    const maintenanceYieldData = {
                        name: yieldDefinition.Name,
                        value: -maintenanceValue,
                        icon: yieldDefinition.YieldType,
                        iconContext: "YIELD"
                    };
                    constructibleData.maintenanceMap.set(yieldDefinition.YieldType, maintenanceYieldData);
                }
            }
            switch (constructibleDefinition.ConstructibleClass) {
                case "BUILDING": {
                    let districtData = this.buildings.find((data) => {
                        return data.location.x == constructible.location.x && data.location.y == constructible.location.y;
                    });
                    if (districtData) {
                        districtData.constructibleData.push(constructibleData);
                        this.updateUniqueQuarterData(districtData);
                    } else {
                        districtData = {
                            location: constructible.location,
                            constructibleData: [constructibleData]
                        };
                        this.updateUniqueQuarterData(districtData);
                        this.buildings.push(districtData);
                    }
                    break;
                }
                case "IMPROVEMENT":
                    this.improvements.push(constructibleData);
                    break;
                case "WONDER":
                    this.wonders.push(constructibleData);
                    break;
                default:
                    console.error(
                        `model-city-details: Failed to add ${constructibleDefinition.Name} of class ${constructibleDefinition.ConstructibleClass} to constructible lists!`
                    );
            }
        }
        this.yields = [];
        const yields = cityYields.getYields();
        if (yields != null) {
            yields.forEach((y, i) => {
                const yieldInfo = GameInfo.Yields[i];
                if (yieldInfo) {
                    const topYieldData = {
                        name: Locale.plainText(yieldInfo.Name),
                        value: y.value,
                        icon: yieldInfo.YieldType,
                        iconContext: "YIELD",
                        children: []
                    };
                    if (y.base.steps?.length) {
                        this.addYieldSteps(topYieldData, y.base.steps, yieldInfo, false);
                        this.baseYieldValue = 0;
                    }
                    this.yields.push(topYieldData);
                }
            });
        }
        this.isBeingRazed = city.isBeingRazed;
        this.getTurnsUntilRazed = city.getTurnsUntilRazed;
        this.treasureFleetText = "";
        if (Game.age == Game.getHash("AGE_EXPLORATION") && city.isDistantLands) {
            const result = cityResources.canStartTreasureFleet();
            if (!result.Success) {
                if (result.FailureReasons) {
                    const failureString = formatStringArrayAsNewLineText(result.FailureReasons);
                    this.treasureFleetText += failureString;
                }
            } else {
                const turnsTillNextTreasureFleet = cityResources.getTurnsUntilTreasureGenerated();
                this.treasureFleetText = Locale.compose(
                    "LOC_UI_CITY_DETAILS_NEXT_TREASURE_FLEET_TURNS",
                    turnsTillNextTreasureFleet
                );
            }
        }
        this.connectedSettlementFood = [];
        const sendingFoodData = this.buildSendingFoodData(city);
        if (sendingFoodData) {
            if (city.isTown) {
                this.connectedSettlementFood.push({ name: city.name, amount: this.foodPerTurn });
                for (const cityData of sendingFoodData) {
                    for (const townData of cityData.data) {
                        if (ComponentID.isMatch(townData.town.id, city.id)) {
                            this.connectedSettlementFood.push({ name: cityData.city.name, amount: -townData.amount });
                            this.foodPerTurn = 0;
                        }
                    }
                }
            } else {
                let foodFromSelectedCity = this.foodPerTurn;
                const dataForCity = sendingFoodData.find((value) => {
                    return ComponentID.isMatch(value.city.id, city.id);
                });
                if (dataForCity) {
                    for (const townData of dataForCity.data) {
                        this.connectedSettlementFood.push({ name: townData.town.name, amount: townData.amount });
                        foodFromSelectedCity -= townData.amount;
                    }
                }
                if (foodFromSelectedCity > 0) {
                    this.connectedSettlementFood.unshift({ name: city.name, amount: foodFromSelectedCity });
                }
            }
        }
        this.onUpdate?.(this);
        window.dispatchEvent(new UpdateCityDetailsEvent());
    });
    buildSendingFoodData(selectedSettlement) {
        const sendingFoodData = [];
        const ownerSettlements = Players.get(selectedSettlement.owner)?.Cities?.getCities();
        if (!ownerSettlements) {
            console.error("model-city-details: buildSendingFoodData() - Failed to get ownerSettlements");
            return;
        }
        for (const town of ownerSettlements) {
            if (town.isTown && town.Growth?.growthType == GrowthTypes.PROJECT) {
                const connectedToTown = town.getConnectedCities();
                const foodForEachCity = town.getSentFoodPerCity();
                for (const connectedSettlement of connectedToTown) {
                    const city = Cities.get(connectedSettlement);
                    if (city && !city.isTown) {
                        const existingData = sendingFoodData.find((value) => {
                            return ComponentID.isMatch(value.city.id, city.id);
                        });
                        if (existingData) {
                            existingData.data.push({ town, amount: foodForEachCity });
                        } else {
                            sendingFoodData.push({ city, data: [{ town, amount: foodForEachCity }] });
                        }
                    }
                }
            }
        }
        return sendingFoodData;
    }
    updateUniqueQuarterData(districtData) {
        const uniqueQuarterDefinition = this.getUniqueQuarterDefinition();
        if (!uniqueQuarterDefinition) {
            return;
        }
        let isBuildingType1Complete = false;
        for (const constructibleData of districtData.constructibleData) {
            if (constructibleData.type == uniqueQuarterDefinition.BuildingType1) {
                isBuildingType1Complete = true;
            }
        }
        let isBuildingType2Complete = false;
        for (const constructibleData of districtData.constructibleData) {
            if (constructibleData.type == uniqueQuarterDefinition.BuildingType2) {
                isBuildingType2Complete = true;
            }
        }
        if (isBuildingType1Complete && isBuildingType2Complete) {
            districtData.name = Locale.compose(uniqueQuarterDefinition.Name);
            districtData.description = Locale.stylize(uniqueQuarterDefinition.Description);
            return;
        } else if (isBuildingType1Complete) {
            const buildingDefinition = GameInfo.Constructibles.lookup(uniqueQuarterDefinition.BuildingType2);
            if (!buildingDefinition) {
                console.error(
                    `model-city-details: Failed to find definition for unique building 2 ${uniqueQuarterDefinition.BuildingType2}`
                );
                return;
            }
            districtData.name = Locale.compose(uniqueQuarterDefinition.Name);
            districtData.description = Locale.compose(
                "LOC_UI_CITY_DETAILS_UNIQUE_QUARTER_NEEDS",
                buildingDefinition.Name
            );
            return;
        } else if (isBuildingType2Complete) {
            const buildingDefinition = GameInfo.Constructibles.lookup(uniqueQuarterDefinition.BuildingType1);
            if (!buildingDefinition) {
                console.error(
                    `model-city-details: Failed to find definition for unique building 1 ${uniqueQuarterDefinition.BuildingType1}`
                );
                return;
            }
            districtData.name = Locale.compose(uniqueQuarterDefinition.Name);
            districtData.description = Locale.compose(
                "LOC_UI_CITY_DETAILS_UNIQUE_QUARTER_NEEDS",
                buildingDefinition.Name
            );
            return;
        }
        districtData.name = void 0;
        districtData.description = void 0;
        return;
    }
    getUniqueQuarterDefinition() {
        const localPlayer = Players.get(GameContext.localPlayerID);
        if (!localPlayer) {
            console.error(
                `model-city-details: getUniqueQuarterDefinition() failed to find localPlayerID ${GameContext.localPlayerID}`
            );
            return;
        }
        const civilizationDefinition = GameInfo.Civilizations.lookup(localPlayer.civilizationType);
        if (!civilizationDefinition) {
            console.error(
                `model-city-details: getUniqueQuarterDefinition() failed to find Civilization ${localPlayer.civilizationType}`
            );
            return;
        }
        const civTraitDefinitions = GameInfo.CivilizationTraits.filter(
            (definition) => definition.CivilizationType == civilizationDefinition.CivilizationType
        );
        const uniqueQuarterDefinition = GameInfo.UniqueQuarters.find((quarterDefinition) => {
            if (civTraitDefinitions.find((traitDefinition) => {
                return quarterDefinition.TraitType == traitDefinition.TraitType;
            })) {
                return true;
            }
            return false;
        });
        return uniqueQuarterDefinition;
    }
    addYieldSteps(baseYield, steps, yieldDefinition, isModifier) {
        for (const step of steps) {
            if (step.description) {
                const yieldData = {
                    name: step.description,
                    value: isModifier ? 0.01 * step.value * this.baseYieldValue : step.value,
                    children: []
                };
                if (this.baseYieldValue == 0 && step.base) {
                    this.baseYieldValue = step.base.value;
                }
                this.setYieldAndGetIcon(yieldData, step, yieldDefinition);
                if (step.base && step.base.steps && step.base.steps.length > 0) {
                    this.addYieldSteps(yieldData, step.base.steps, yieldDefinition, false);
                }
                baseYield.children.push(yieldData);
                if (step.modifier && step.modifier.steps && step.modifier.steps.length > 0) {
                    this.addYieldSteps(yieldData, step.modifier.steps, yieldDefinition, true);
                }
            } else if (step.steps && step.steps.length > 0) {
                const idsMatch = step.steps.every((subStep) => subStep.id == step.id);
                if (step.steps[0]?.description && idsMatch) {
                    const yieldData = {
                        name: step.steps[0].description,
                        value: step.value,
                        children: []
                    };
                    baseYield.children.push(yieldData);
                } else {
                    this.addYieldSteps(baseYield, step.steps, yieldDefinition, false);
                }
            }
        }
    }
    setYieldAndGetIcon(yieldData, step, yieldDefinition) {
        let buildingData = null;
        for (const data of this.buildings) {
            for (const constructibleData of data.constructibleData) {
                if (constructibleData.id.id == step.id) {
                    buildingData = constructibleData;
                }
            }
        }
        if (buildingData) {
            this.addYieldAndGetIconForConstructible(yieldData, buildingData, step, yieldDefinition);
            return;
        }
        const improvementData = this.improvements.find((data) => {
            return data.id.id == step.id;
        });
        if (improvementData) {
            this.addYieldAndGetIconForConstructible(yieldData, improvementData, step, yieldDefinition);
            return;
        }
        const wonderData = this.wonders.find((data) => {
            return data.id.id == step.id;
        });
        if (wonderData) {
            this.addYieldAndGetIconForConstructible(yieldData, wonderData, step, yieldDefinition);
            return;
        }
    }
    addYieldAndGetIconForConstructible(yieldData, constructibleData, step, yieldDefinition) {
        if (!constructibleData.yieldMap) {
            constructibleData.yieldMap = /* @__PURE__ */ new Map();
        }
        const currentValue = constructibleData.yieldMap.get(yieldDefinition.YieldType);
        if (currentValue == void 0) {
            const constructibleYieldData = {
                name: yieldData.name,
                value: step.value,
                icon: yieldDefinition.YieldType,
                iconContext: "YIELD"
            };
            constructibleData.yieldMap.set(yieldDefinition.YieldType, constructibleYieldData);
        } else {
            currentValue.value += step.value;
            constructibleData.yieldMap.set(yieldDefinition.YieldType, currentValue);
        }
        yieldData.icon = constructibleData.icon;
        yieldData.iconContext = constructibleData.iconContext;
    }
}
const CityDetails = new CityDetailsModel();
engine.whenReady.then(() => {
    const updateModel = () => {
        engine.updateWholeModel(CityDetails);
    };
    engine.createJSModel("g_CityDetails", CityDetails);
    CityDetails.updateCallback = updateModel;
});

var ProductionPanelCategory = /* @__PURE__ */ ((ProductionPanelCategory2) => {
    ProductionPanelCategory2["BUILDINGS"] = "buildings";
    ProductionPanelCategory2["UNITS"] = "units";
    ProductionPanelCategory2["PROJECTS"] = "projects";
    ProductionPanelCategory2["WONDERS"] = "wonders";
    return ProductionPanelCategory2;
})(ProductionPanelCategory || {});
let agelessItemTypes = null;
function getAgelessItemTypes() {
    if (agelessItemTypes != null) {
        return agelessItemTypes;
    } else {
        agelessItemTypes = /* @__PURE__ */ new Set();
        for (const e of GameInfo.TypeTags) {
            if (e.Tag == "AGELESS") {
                agelessItemTypes.add(e.Type);
            }
        }
        return agelessItemTypes;
    }
}
window.addEventListener("hotkey-cycle-next-city", () => cycleCity(true));
window.addEventListener("hotkey-cycle-prev-city", () => cycleCity(false));
function cycleCity(isNext) {
    const currentCity = UI.Player.getHeadSelectedCity();
    if (currentCity) {
        const newCity = getAdjacentCityID(currentCity, isNext);
        if (ComponentID.isValid(newCity)) {
            UI.Player.selectCity(newCity);
        }
    }
}
const GetNextCityID = (cityID) => getAdjacentCityID(cityID, true);
const GetPrevCityID = (cityID) => getAdjacentCityID(cityID, false);
const getAdjacentCityID = (cityID, isNext) => {
    let targetCityID = null;
    const player = Players.get(cityID.owner);
    if (player) {
        const playerCities = player.Cities?.getCities();
        if (playerCities?.length) {
            const currentCityIndex = playerCities.findIndex((city) => ComponentID.isMatch(cityID, city.id));
            let targetCityIndex;
            if (isNext) {
                targetCityIndex = currentCityIndex != -1 && currentCityIndex < playerCities.length - 1 ? currentCityIndex + 1 : 0;
            } else {
                targetCityIndex = currentCityIndex > 0 ? currentCityIndex - 1 : playerCities.length - 1;
            }
            const targetCity = playerCities[targetCityIndex];
            targetCityID = targetCity.id;
        }
    }
    return targetCityID;
};
const GetUnitStatsFromDefinition = (definition) => {
    const stats = [];
    if (definition.BaseMoves > 0) {
        stats.push({
            name: "LOC_UNIT_INFO_MOVES_REMAINING",
            icon: "Action_Move",
            value: definition.BaseMoves.toString()
        });
    }
    if (definition.BuildCharges > 0) {
        stats.push({
            name: "LOC_UNIT_INFO_BUILD_CHARGES",
            icon: "Action_Construct",
            value: definition.BuildCharges.toString()
        });
    }
    const statsDefinition = GameInfo.Unit_Stats.lookup(definition.UnitType);
    if (statsDefinition) {
        if (statsDefinition.RangedCombat > 0) {
            stats.push({
                name: "LOC_UNIT_INFO_RANGED_STRENGTH",
                icon: "Action_Ranged",
                value: statsDefinition.RangedCombat.toString()
            });
            stats.push({
                name: "LOC_UNIT_INFO_RANGE",
                icon: "action_rangedattack",
                value: statsDefinition.Range.toString()
            });
        } else if (statsDefinition.Combat > 0) {
            stats.push({
                name: "LOC_UNIT_INFO_MELEE_STRENGTH",
                icon: "Action_Attack",
                value: statsDefinition.Combat.toString()
            });
        }
    }
    return stats;
};
const GetCurrentBestTotalYieldForConstructible = (city, constructibleType) => {
    const yields = [];
    const constructibleDef = GameInfo.Constructibles.lookup(constructibleType);
    if (!constructibleDef) {
        console.error(
            `production-chooser-helper: GetCurrentBestTotalYieldForConstructible() failed to find constructible definition for type ${constructibleType}`
        );
        return [];
    }
    const bestYieldChanges = BuildingPlacementManager.getBestYieldForConstructible(city.id, constructibleDef);
    for (let iYield = 0; iYield < GameInfo.Yields.length; iYield++) {
        if (bestYieldChanges.length <= iYield) {
            continue;
        }
        const change = bestYieldChanges[iYield];
        if (change <= 0) {
            continue;
        }
        const yieldDef = GameInfo.Yields.lookup(iYield);
        if (!yieldDef) {
            console.error(
                `production-chooser-helper: GetCurrentBestTotalYieldForConstructible() failed to find yield definition for yield index ${iYield}`
            );
            continue;
        }
        let isLastYield = true;
        for (let iNextYield = iYield + 1; iNextYield < GameInfo.Yields.length; iNextYield++) {
            const nextChange = bestYieldChanges[iNextYield];
            if (nextChange > 0) {
                isLastYield = false;
            }
        }
        yields.push({
            iconId: iYield.toString(),
            icon: Icon.getYieldIcon(yieldDef.YieldType),
            value: isLastYield ? Locale.compose("LOC_UI_CITY_DETAILS_YIELD_ONE_DECIMAL", change) : Locale.compose("LOC_UI_CITY_DETAILS_YIELD_ONE_DECIMAL_COMMA", change),
            name: yieldDef.Name,
            yieldType: yieldDef.YieldType,
            isMainYield: true
        });
    }
    return yields;
};
const GetSecondaryDetailsHTML = (items) => {
    return items.reduce((acc, { icon, value, name }) => {
        return acc + `<div class="flex items-center mr-2"><img aria-label="${Locale.compose(name)}" src="${icon}" class="size-8" />${value}</div>`;
    }, "");
};
const GetConstructibleItemData = (constructible, city, operationResult, hideIfUnavailable = false) => {
    const cityGold = city.Gold;
    if (!cityGold) {
        console.error("GetConstructibleItemData: getConstructibleItem: Failed to get cityGold!");
        return null;
    }
    const agelessTypes = getAgelessItemTypes();
    const ageless = agelessTypes.has(constructible.ConstructibleType);
    const insufficientFunds = operationResult.InsufficientFunds ?? false;
    if (operationResult.Success || insufficientFunds || !hideIfUnavailable || operationResult.NeededUnlock != -1 && !hideIfUnavailable) {
        const bestYields = GetCurrentBestTotalYieldForConstructible(city, constructible.ConstructibleType);
        const secondaryDetails = GetSecondaryDetailsHTML(bestYields);
        if (operationResult.Success || insufficientFunds || !hideIfUnavailable) {
            const possibleLocations = [];
            const pushPlots = (p) => {
                possibleLocations.push(p);
            };
            operationResult.Plots?.forEach(pushPlots);
            operationResult.ExpandUrbanPlots?.forEach(pushPlots);
            const turns = city.BuildQueue.getTurnsLeft(constructible.ConstructibleType);
            const isBuildingAlreadyQueued = constructible.ConstructibleClass === "BUILDING" && operationResult.InQueue;
            const category = getConstructibleClassPanelCategory(constructible.ConstructibleClass);
            if (possibleLocations.length > 0 && !isBuildingAlreadyQueued && !operationResult.InsufficientFunds) {
                let name = constructible.Name;
                if (operationResult.RepairDamaged && constructible.Repairable) {
                    name = Locale.compose("LOC_UI_PRODUCTION_REPAIR_NAME", constructible.Name);
                } else if (operationResult.MoveToNewLocation) {
                    name = Locale.compose("LOC_UI_PRODUCTION_MOVE_NAME", constructible.Name);
                }
                const locations = Locale.compose(
                    "LOC_UI_PRODUCTION_LOCATIONS",
                    constructible.Cost,
                    possibleLocations.length
                );
                const cost = operationResult.Cost ?? cityGold.getBuildingPurchaseCost(YieldTypes.YIELD_GOLD, constructible.ConstructibleType);
                const item = {
                    name,
                    type: constructible.ConstructibleType,
                    cost,
                    category,
                    ageless,
                    turns,
                    showTurns: turns > -1,
                    showCost: cost > 0,
                    insufficientFunds,
                    disabled: constructible.Cost < 0,
                    locations,
                    interfaceMode: "INTERFACEMODE_PLACE_BUILDING",
                    secondaryDetails,
                    repairDamaged: operationResult.RepairDamaged
                };
                return item;
            } else {
                if (!hideIfUnavailable || insufficientFunds && possibleLocations.length > 0) {
                    let name = constructible.Name;
                    let error = "";
                    let nodeNeededError = "";
                    if (operationResult.NeededUnlock != -1) {
                        const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(operationResult.NeededUnlock);
                        if (nodeInfo) {
                            nodeNeededError = Locale.compose("LOC_UI_PRODUCTION_REQUIRES", nodeInfo.Name);
                        }
                    }
                    if (operationResult.RepairDamaged && constructible.Repairable) {
                        name = Locale.compose("LOC_UI_PRODUCTION_REPAIR_NAME", constructible.Name);
                        error = operationResult.InsufficientFunds ? "LOC_CITY_PURCHASE_INSUFFICIENT_FUNDS" : "LOC_UI_PRODUCTION_ALREADY_IN_QUEUE";
                    } else {
                        error = operationResult.AlreadyExists ? "LOC_UI_PRODUCTION_ALREADY_EXISTS" : operationResult.NeededUnlock && operationResult.NeededUnlock != -1 ? nodeNeededError : operationResult.InsufficientFunds ? "LOC_CITY_PURCHASE_INSUFFICIENT_FUNDS" : possibleLocations.length === 0 ? "LOC_UI_PRODUCTION_NO_SUITABLE_LOCATIONS" : operationResult.InQueue ? "LOC_UI_PRODUCTION_ALREADY_IN_QUEUE" : "";
                    }
                    const cost = operationResult.Cost ?? cityGold.getBuildingPurchaseCost(YieldTypes.YIELD_GOLD, constructible.ConstructibleType);
                    return {
                        name,
                        type: constructible.ConstructibleType,
                        cost,
                        turns,
                        category,
                        ageless,
                        showTurns: turns > -1,
                        showCost: cost > 0,
                        insufficientFunds,
                        disabled: true,
                        error,
                        secondaryDetails
                    };
                }
            }
        } else {
            const prereq = operationResult.NeededUnlock;
            const canUnlockNode = CanPlayerUnlockNode(prereq, city.owner);
            if (canUnlockNode) {
                const item = {
                    turns: -1,
                    name: constructible.Name,
                    type: constructible.ConstructibleType,
                    showTurns: false,
                    showCost: false,
                    insufficientFunds: false,
                    disabled: true,
                    ageless,
                    category: getConstructibleClassPanelCategory(constructible.ConstructibleClass),
                    cost: -1,
                    secondaryDetails
                };
                const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(prereq);
                if (nodeInfo) {
                    item.error = Locale.compose("LOC_UI_PRODUCTION_REQUIRES", nodeInfo.Name);
                }
                return item;
            }
        }
    }
    return null;
};
const CanPlayerUnlockNode = (nodeType, playerId) => {
    if (!nodeType) return false;
    const nodeState = Game.ProgressionTrees.getNodeState(playerId, nodeType);
    return nodeState >= ProgressionTreeNodeState.NODE_STATE_OPEN;
};
const CreateProductionChooserItem = () => {
    const item = document.createElement("production-chooser-item");
    item.setAttribute("data-audio-group-ref", "city-actions");
    item.setAttribute("data-audio-focus-ref", "data-audio-city-production-focus");
    return item;
};
const getProjectItems = (city, isPurchase) => {
    const projects = [];
    if (!city) {
        console.error(`getProjectItems: received a null/undefined city!`);
        return projects;
    }
    GameInfo.Projects.forEach((project) => {
        if (project.CityOnly && city.isTown || !project.CanPurchase && isPurchase) {
            return;
        }
        const result = Game.CityOperations.canStart(
            city.id,
            CityOperationTypes.BUILD,
            { ProjectType: project.$index },
            false
        );
        if (result.Requirements && result.Requirements?.FullFailure != true) {
            if (result.Requirements.MeetsRequirements) {
                const turns = city.BuildQueue.getTurnsLeft(project.ProjectType);
                const cost = city.Production.getProjectProductionCost(project.ProjectType);
                const projectItem = {
                    name: project.Name,
                    description: project.Description,
                    type: project.ProjectType,
                    cost,
                    turns,
                    category: "projects" /* PROJECTS */,
                    showTurns: project.UpgradeToCity && project.TownOnly,
                    showCost: false,
                    insufficientFunds: false,
                    disabled: !result.Success
                };
                if (project.UpgradeToCity && project.TownOnly) {
                    projects.unshift(projectItem);
                } else {
                    projects.push(projectItem);
                }
            }
        }
    });
    return projects;
};
const GetUniqueQuarterForPlayer = (playerId) => {
    const player = Players.get(playerId);
    if (!player) {
        console.error(`GetUniqueQuarterForPlayer: Failed to get player with id ${playerId}`);
        return null;
    }
    const civilizationDefinition = GameInfo.Civilizations.lookup(player.civilizationType);
    if (!civilizationDefinition) {
        console.error(`GetUniqueQuarterForPlayer: Failed to get civilization definition for player: ${playerId}`);
        return null;
    }
    const traitTypes = GameInfo.CivilizationTraits.filter(
        (trait) => trait.CivilizationType === civilizationDefinition.CivilizationType
    ).map((trait) => trait.TraitType);
    const uniqueQuarterDef = GameInfo.UniqueQuarters.find((uq) => traitTypes.includes(uq.TraitType));
    if (!uniqueQuarterDef) {
        return null;
    }
    const buildingOneDef = GameInfo.Constructibles.lookup(uniqueQuarterDef.BuildingType1);
    const buildingTwoDef = GameInfo.Constructibles.lookup(uniqueQuarterDef.BuildingType2);
    if (!buildingOneDef || !buildingTwoDef) {
        console.error(
            `GetUniqueQuarterForPlayer: Failed to get building definitions for UniqueQuarterDefinition: ${uniqueQuarterDef.Name}`
        );
        return null;
    }
    return {
        uniqueQuarterDef,
        buildingOneDef,
        buildingTwoDef
    };
};
const GetNumUniqueQuarterBuildingsCompleted = (city, uq) => {
    const buildingOneCompleted = !!city.Constructibles?.hasConstructible(uq.BuildingType1, false);
    const buildingTwoCompleted = !!city.Constructibles?.hasConstructible(uq.BuildingType2, false);
    return buildingOneCompleted && buildingTwoCompleted ? 2 : buildingOneCompleted || buildingTwoCompleted ? 1 : 0;
};
const ShouldShowUniqueQuarter = (...results) => {
    return results.some((result) => {
        return result.Success || result.InQueue || result.InProgress || result.InsufficientFunds || result.AlreadyExists;
    });
};
const GetProductionItems = (city, recommendations, playerGoldBalance, isPurchase, viewHidden, uqInfo) => {
    console.warn(`TRIX GET-PRODUCTION-ITEMS`);
    const items = {
        ["buildings" /* BUILDINGS */]: [],
        ["wonders" /* WONDERS */]: [],
        ["units" /* UNITS */]: getUnits(city, playerGoldBalance, isPurchase, recommendations, viewHidden),
        ["projects" /* PROJECTS */]: getProjectItems(city, isPurchase)
    };
    if (!city) {
        console.error(`GetProductionItems: received a null/undefined city!`);
        return items;
    }
    let results;
    if (isPurchase) {
        results = Game.CityCommands.canStartQuery(city.id, CityCommandTypes.PURCHASE, CityQueryType.Constructible);
    } else {
        results = Game.CityOperations.canStartQuery(city.id, CityOperationTypes.BUILD, CityQueryType.Constructible);
    }
    let uqBuildingOneResult = results.find(({ index }) => index === uqInfo?.buildingOneDef.$index)?.result;
    let uqBuildingTwoResult = results.find(({ index }) => index === uqInfo?.buildingTwoDef.$index)?.result;
    let shouldShowUniqueQuarter = false;
    let repairableItemCount = 0;
    let repairableTotalCost = 0;
    let repairableTotalTurns = 0;
    if (uqInfo) {
        let uqBuildingOneCompleted = false;
        let uqBuildingTwoCompleted = false;
        if (!uqBuildingOneResult) {
            uqBuildingOneResult = isPurchase ? Game.CityCommands.canStart(
                city.id,
                CityCommandTypes.PURCHASE,
                { ConstructibleType: uqInfo.buildingOneDef.$index },
                false
            ) : Game.CityOperations.canStart(
                city.id,
                CityOperationTypes.BUILD,
                { ConstructibleType: uqInfo.buildingOneDef.$index },
                false
            );
            uqBuildingOneCompleted = uqBuildingOneResult.AlreadyExists;
        }
        if (!uqBuildingTwoResult) {
            uqBuildingTwoResult = isPurchase ? Game.CityCommands.canStart(
                city.id,
                CityCommandTypes.PURCHASE,
                { ConstructibleType: uqInfo.buildingTwoDef.$index },
                false
            ) : Game.CityOperations.canStart(
                city.id,
                CityOperationTypes.BUILD,
                { ConstructibleType: uqInfo.buildingTwoDef.$index },
                false
            );
            uqBuildingTwoCompleted = uqBuildingTwoResult.AlreadyExists;
        }
        if (!uqBuildingOneCompleted || !uqBuildingTwoCompleted) {
            results.push({ index: uqInfo.buildingOneDef.$index, result: uqBuildingOneResult });
            results.push({ index: uqInfo.buildingTwoDef.$index, result: uqBuildingTwoResult });
            results.sort((a, b) => {
                return a.index - b.index;
            });
        }
        shouldShowUniqueQuarter = ShouldShowUniqueQuarter(uqBuildingOneResult, uqBuildingTwoResult);
    }
    const repairItems = [];
    for (const { index, result } of results) {
        const definition = index === uqInfo?.buildingOneDef.$index ? uqInfo?.buildingOneDef : index === uqInfo?.buildingTwoDef.$index ? uqInfo?.buildingTwoDef : GameInfo.Constructibles.lookup(index);
        if (!definition) {
            console.error(`GetProductionItems: Failed to find ConstructibleDefinition for ConstructibleType: ${index}`);
            continue;
        }
        const isUniqueQuarterBuilding = uqInfo?.buildingOneDef.ConstructibleType === definition.ConstructibleType || uqInfo?.buildingTwoDef.ConstructibleType === definition.ConstructibleType;
        const hideIfUnavailable = isUniqueQuarterBuilding ? !shouldShowUniqueQuarter : !viewHidden;
        const data = GetConstructibleItemData(definition, city, result, hideIfUnavailable);
        if (!data) {
            continue;
        }
        if (!repairItems.find((item) => item.type == data.type)) {
            if (result.RepairDamaged && result.Plots && result.Plots.length > 1) {
                const numberOfPlots = result.Plots.length;
                repairableItemCount += numberOfPlots;
                repairableTotalCost += data.cost * numberOfPlots;
                repairableTotalTurns += data.turns * numberOfPlots;
                repairItems.push(data);
            } else {
                if (data.repairDamaged) {
                    repairableItemCount++;
                    repairableTotalCost += data.cost;
                    repairableTotalTurns += data.turns;
                    repairItems.push(data);
                }
            }
            data.recommendations = AdvisorUtilities.getBuildRecommendationIcons(recommendations, data.type);
            items[data.category].push(data);
        }
    }
    if (repairableItemCount > 1) {
        const repairAllItem = createRepairAllProductionChooserItemData(repairableTotalCost, repairableTotalTurns);
        if (repairAllItem) {
            items.buildings.unshift(repairAllItem);
        }
    }
    return items;
};
const createRepairAllProductionChooserItemData = (cost, turns) => {
    const localPlayer = Players.get(GameContext.localPlayerID);
    if (!localPlayer) {
        console.error(
            `production-chooser-helper: Failed to retrieve PlayerLibrary for Player ${GameContext.localPlayerID}`
        );
        return null;
    }
    const isInsufficientFunds = cost > (localPlayer.Treasury?.goldBalance || 0);
    return {
        type: "IMPROVEMENT_REPAIR_ALL",
        category: "buildings" /* BUILDINGS */,
        name: "LOC_UI_PRODUCTION_REPAIR_ALL",
        cost,
        turns,
        showTurns: turns > -1,
        showCost: cost > 0,
        insufficientFunds: isInsufficientFunds,
        error: isInsufficientFunds ? "LOC_CITY_PURCHASE_INSUFFICIENT_FUNDS" : void 0,
        disabled: isInsufficientFunds
    };
};
const getConstructibleClassPanelCategory = (constructibleClass) => {
    switch (constructibleClass) {
        case "IMPROVEMENT":
            return "buildings" /* BUILDINGS */;
        case "WONDER":
            return "wonders" /* WONDERS */;
        default:
            return "buildings" /* BUILDINGS */;
    }
};
const getUnits = (city, playerGoldBalance, isPurchase, recommendations, viewHidden) => {
    const units = [];
    if (!city?.Gold) {
        console.error(`getUnits: received a null/undefined city`);
        return units;
    }
    const cityGoldLibrary = city.Gold;
    let results;
    if (isPurchase) {
        results = Game.CityCommands.canStartQuery(city.id, CityCommandTypes.PURCHASE, CityQueryType.Unit);
    } else {
        results = Game.CityOperations.canStartQuery(city.id, CityOperationTypes.BUILD, CityQueryType.Unit);
    }
    for (const { index, result } of results) {
        if (!viewHidden && !result.Success && !(result.InsufficientFunds && result.FailureReasons?.length == 1)) {
            continue;
        }
        if (result.Requirements?.FullFailure || result.Requirements?.Obsolete) {
            continue;
        }
        const definition = GameInfo.Units.lookup(index);
        if (!definition) {
            console.error(`getUnits: Failed to find UnitDefinition for UnitType: ${index}`);
            continue;
        }
        const cost = cityGoldLibrary.getUnitPurchaseCost(YieldTypes.YIELD_GOLD, definition.UnitType);
        const secondaryDetails = GetSecondaryDetailsHTML(GetUnitStatsFromDefinition(definition));
        const turns = isPurchase ? -1 : city.BuildQueue.getTurnsLeft(definition.UnitType) ?? -1;
        const data = {
            name: definition.Name,
            type: definition.UnitType,
            ageless: false,
            cost,
            turns,
            showTurns: false,
            showCost: cost > 0,
            insufficientFunds: cost > playerGoldBalance,
            disabled: !result.Success,
            category: "units" /* UNITS */,
            secondaryDetails
        };
        if (result.Requirements?.MeetsRequirements) {
            data.recommendations = AdvisorUtilities.getBuildRecommendationIcons(recommendations, data.type);
        }
        if (result.Requirements?.NeededProgressionTreeNode) {
            const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(result.Requirements.NeededProgressionTreeNode);
            if (nodeInfo) {
                data.error = Locale.compose("LOC_UI_PRODUCTION_REQUIRES", nodeInfo.Name);
            }
        }
        if (result.Requirements?.NeededPopulation) {
            data.error = Locale.compose("LOC_UI_PRODUCTION_REQUIRES_POPULATION", result.Requirements.NeededPopulation);
        }
        if (result.FailureReasons) {
            data.error = result.FailureReasons.join("\n");
        }
        units.push(data);
    }
    return units;
};
const Construct = (city, item, isPurchase) => {
    const typeInfo = GameInfo.Types.lookup(item.type);
    if (typeInfo) {
        let args;
        switch (typeInfo.Kind) {
            case "KIND_CONSTRUCTIBLE":
                args = {
                    ConstructibleType: typeInfo.Hash
                };
                break;
            case "KIND_UNIT":
                args = {
                    UnitType: typeInfo.Hash
                };
                break;
            case "KIND_PROJECT":
                args = {
                    ProjectType: typeInfo.Hash
                };
                break;
            default:
                console.error(`Construct: Constructing unsupported kind ${typeInfo.Kind}.`);
                return false;
        }
        let result;
        if (isPurchase && typeInfo.Kind != "KIND_PROJECT") {
            result = Game.CityCommands.canStart(city.id, CityCommandTypes.PURCHASE, args, false);
        } else {
            result = Game.CityOperations.canStart(city.id, CityOperationTypes.BUILD, args, false);
        }
        if (result.Success) {
            if (item.interfaceMode && !result.InProgress) {
                InterfaceMode.switchTo(item.interfaceMode, {
                    CityID: city.id,
                    OperationArguments: args,
                    IsPurchasing: isPurchase
                });
                return false;
            } else {
                if (result.InProgress && result.Plots) {
                    const loc = GameplayMap.getLocationFromIndex(result.Plots[0]);
                    args.X = loc.x;
                    args.Y = loc.y;
                }
                if (isPurchase && typeInfo.Kind != "KIND_PROJECT") {
                    Game.CityCommands.sendRequest(city.id, CityCommandTypes.PURCHASE, args);
                } else {
                    if (typeInfo.Kind == "KIND_PROJECT" && city.isTown) {
                        args.InsertMode = CityOperationsParametersValues.Exclusive;
                    }
                    Game.CityOperations.sendRequest(city.id, CityOperationTypes.BUILD, args);
                }
                return true;
            }
        }
    } else {
        if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_PLACE_BUILDING")) {
            InterfaceMode.switchToDefault();
        }
        return false;
    }
    return false;
};
const RepairConstruct = (city, item, isPurchase) => {
    const typeInfo = GameInfo.Types.lookup(item.type);
    if (typeInfo) {
        let args;
        switch (typeInfo.Kind) {
            case "KIND_CONSTRUCTIBLE":
                args = {
                    ConstructibleType: typeInfo.Hash
                };
                break;
            case "KIND_UNIT":
                args = {
                    UnitType: typeInfo.Hash
                };
                break;
            case "KIND_PROJECT":
                args = {
                    ProjectType: typeInfo.Hash
                };
                break;
            default:
                console.error(`Construct: Constructing unsupported kind ${typeInfo.Kind}.`);
                return;
        }
        let result;
        if (isPurchase) {
            result = Game.CityCommands.canStart(city.id, CityCommandTypes.PURCHASE, args, false);
        } else {
            result = Game.CityOperations.canStart(city.id, CityOperationTypes.BUILD, args, false);
        }
        if (result.Success) {
            if (result.Plots) {
                result.Plots.forEach((plot) => {
                    const loc = GameplayMap.getLocationFromIndex(plot);
                    args.X = loc.x;
                    args.Y = loc.y;
                    if (isPurchase) {
                        Game.CityCommands.sendRequest(city.id, CityCommandTypes.PURCHASE, args);
                    } else {
                        Game.CityOperations.sendRequest(city.id, CityOperationTypes.BUILD, args);
                    }
                });
            }
        }
    }
};
const GetCityBuildReccomendations = (city) => {
    if (!city) return [];
    const recommendationParams = {
        cityId: city.id,
        subject: AdvisorySubjectTypes.PRODUCTION,
        maxReturnedEntries: 0
    };
    return Players.Advisory.get(city.owner)?.getBuildRecommendations(recommendationParams) ?? [];
};
const GetTownFocusItems = (cityID) => {
    const projects = [];
    projects.push({
        name: "LOC_UI_FOOD_CHOOSER_FOCUS_GROWTH",
        description: "LOC_PROJECT_TOWN_FOOD_INCREASE_DESCRIPTION",
        growthType: GrowthTypes.EXPAND,
        projectType: ProjectTypes.NO_PROJECT,
        tooltipDescription: "LOC_PROJECT_TOWN_FOOD_INCREASE_TOOLTIP_DESCRIPTION"
    });
    const resultsTax = Game.CityCommands.canStart(
        cityID,
        CityCommandTypes.CHANGE_GROWTH_MODE,
        { Type: GrowthTypes.PROJECT },
        false
    );
    resultsTax.Projects?.forEach((ID) => {
        const projectInfo = GameInfo.Projects.lookup(ID);
        if (projectInfo) {
            projects.push({
                name: projectInfo.Name,
                description: projectInfo.Description,
                growthType: GrowthTypes.PROJECT,
                projectType: projectInfo.$hash,
                tooltipDescription: "LOC_PROJECT_DEFAULT_TOOLTIP_DESCRIPTION"
            });
        }
    });
    return projects;
};
const isSelectedFocusItem = (currentGrowthType, currentProjectType, item) => {
    return currentGrowthType === GrowthTypes.PROJECT ? currentProjectType === item.projectType : currentGrowthType === item.growthType;
};
const GetCurrentTownFocus = (cityID, currentGrowthType, currentProjectType) => {
    const focusProjects = GetTownFocusItems(cityID);
    const currentFocus = focusProjects.find((item) => isSelectedFocusItem(currentGrowthType, currentProjectType, item)) ?? null;
    return currentFocus;
};
const SetTownFocus = (cityID, sType, projectType) => {
    const args = {
        Type: parseInt(sType),
        ProjectType: parseInt(projectType),
        City: cityID.id
    };
    const result = Game.CityCommands.canStart(cityID, CityCommandTypes.CHANGE_GROWTH_MODE, args, false);
    if (result.Success) {
        Game.CityCommands.sendRequest(cityID, CityCommandTypes.CHANGE_GROWTH_MODE, args);
        Audio.playSound("data-audio-activate", projectType);
        return null;
    } else {
        return result;
    }
};
const GetTownFocusBlp = (growthType, projectType) => {
    growthType = typeof growthType === "string" ? parseInt(growthType) : growthType;
    projectType = typeof projectType === "string" ? parseInt(projectType) : projectType;
    let iconBlp = UI.getIconBLP("DEFAULT_PROJECT");
    if (growthType != null && growthType === GrowthTypes.EXPAND) {
        iconBlp = UI.getIconBLP("PROJECT_GROWTH");
    }
    if (projectType != null && projectType !== ProjectTypes.NO_PROJECT) {
        const projectTypeName = GameInfo.Projects.lookup(projectType)?.ProjectType;
        if (projectTypeName) {
            iconBlp = UI.getIconBLP(projectTypeName);
        }
    }
    return iconBlp;
};
const GetLastProductionData = (cityID) => {
    const city = Cities.get(cityID);
    if (!city) {
        console.error(`production-chooser-helper: GetLastProductionData failed to get city for ID ${cityID}`);
        return;
    }
    const buildQueue = city.BuildQueue;
    if (!buildQueue) {
        console.error(`production-chooser-helper: GetLastProductionData failed to get build queue for ID ${cityID}`);
        return;
    }
    const lastTypeHash = buildQueue.previousProductionTypeHash;
    if (lastTypeHash == 0) {
        return;
    }
    const constructibles = city.Constructibles;
    if (!constructibles) {
        console.error(`production-chooser-helper: GetLastProductionData failed to get constructible for ID ${cityID}`);
        return;
    }
    const ids = constructibles.getIdsOfType(lastTypeHash);
    if (ids.length > 0) {
        const lastCompletedID = ids[0];
        const lastCompleted = Constructibles.getByComponentID(lastCompletedID);
        if (lastCompleted) {
            const lastDefinition = GameInfo.Constructibles.lookup(lastCompleted.type);
            if (lastDefinition) {
                const yields = [];
                if (lastDefinition.ConstructibleClass == "BUILDING") {
                    for (const district of CityDetails.buildings) {
                        for (const building of district.constructibleData) {
                            if (ComponentID.isMatch(building.id, lastCompletedID) && building.yieldMap) {
                                for (const yieldData of building.yieldMap) {
                                    yields.push({
                                        icon: yieldData[0],
                                        value: Locale.compose(
                                            "LOC_UI_CITY_DETAILS_YIELD_ONE_DECIMAL",
                                            yieldData[1].value
                                        )
                                    });
                                }
                                break;
                            }
                        }
                    }
                } else if (lastDefinition.ConstructibleClass == "WONDER") {
                    for (const wonder of CityDetails.wonders) {
                        if (ComponentID.isMatch(wonder.id, lastCompletedID) && wonder.yieldMap) {
                            for (const yieldData of wonder.yieldMap) {
                                yields.push({
                                    icon: yieldData[0],
                                    value: Locale.compose("LOC_UI_CITY_DETAILS_YIELD_ONE_DECIMAL", yieldData[1].value)
                                });
                            }
                            break;
                        }
                    }
                }
                const data = {
                    typeHash: lastTypeHash,
                    name: lastDefinition.Name,
                    type: lastDefinition.ConstructibleType,
                    isUnit: false,
                    details: yields
                };
                return data;
            }
        }
    }
    const unitDefinition = GameInfo.Units.lookup(lastTypeHash);
    if (unitDefinition) {
        const data = {
            typeHash: lastTypeHash,
            name: unitDefinition.Name,
            type: unitDefinition.UnitType,
            isUnit: true,
            details: []
        };
        const unitStats = GetUnitStatsFromDefinition(unitDefinition);
        for (const stat of unitStats) {
            data.details.push({ icon: stat.icon, value: stat.value });
        }
        return data;
    }
    console.error(
        `production-chooser-helper: GetLastProductionData failed to return valid last production data for city ID ${cityID}`
    );
    return;
};

export { CityDetails as C, GetPrevCityID as G, ProductionPanelCategory as P, RepairConstruct as R, SetTownFocus as S, UpdateCityDetailsEventName as U, GetNextCityID as a, GetTownFocusItems as b, GetTownFocusBlp as c, GetLastProductionData as d, GetCityBuildReccomendations as e, GetUniqueQuarterForPlayer as f, GetProductionItems as g, Construct as h, CreateProductionChooserItem as i, GetNumUniqueQuarterBuildingsCompleted as j, GetCurrentTownFocus as k };
//# sourceMappingURL=production-chooser-helpers.chunk.js.map
