import { Icon } from '/core/ui/utilities/utilities-image.chunk.js';
import { BuildingPlacementManager as BPM } from '/base-standard/ui/building-placement/building-placement-manager.js';
import { A as AdvisorUtilities } from '/base-standard/ui/tutorial/tutorial-support.chunk.js';

const BZ_REPAIR_ALL = "IMPROVEMENT_REPAIR_ALL";
const BZ_REPAIR_ALL_ID = Game.getHash(BZ_REPAIR_ALL);
const BZ_ALREADY_IN_QUEUE = "LOC_UI_PRODUCTION_ALREADY_IN_QUEUE";
const BZ_INSUFFICIENT_FUNDS = "LOC_CITY_PURCHASE_INSUFFICIENT_FUNDS";

// building tag helpers
const tagTypes = (tag) => GameInfo.TypeTags.filter(e => e.Tag == tag).map(e => e.Type);
const BZ_AGELESS_TYPES = new Set(tagTypes("AGELESS"));

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
    const ageless = BZ_AGELESS_TYPES.has(constructible.ConstructibleType);
    const insufficientFunds = operationResult.InsufficientFunds ?? false;
    if (operationResult.Success || insufficientFunds || !hideIfUnavailable || operationResult.NeededUnlock != -1 && !hideIfUnavailable) {
        const yieldChanges = bzGetYieldChanges(city, constructible);
        const yieldDetails = bzGetYieldDetails(yieldChanges);
        const secondaryDetails = GetSecondaryDetailsHTML(yieldDetails);
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
                    yieldChanges,
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
                        yieldChanges,
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
                    yieldChanges,
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
        const cost = isPurchase ? repairableTotalCost : 0;
        const turns = isPurchase ? -1 : repairableTotalTurns;
        const repairAllItem = createRepairAllProductionChooserItemData(cost, turns);
        if (repairAllItem) {
            items.buildings.unshift(repairAllItem);
        }
    }
    // add queued buildings
    bzAddQueuedItems(items.buildings, "BUILDING", city, recommendations, isPurchase);
    bzAddQueuedItems(items.wonders, "WONDER", city, recommendations, isPurchase);
    // sort items
    for (const list of Object.values(items)) {
        bzSortProductionItems(list, city);
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

const bzGetQueuedItemData = (city, constructible, operationResult) => {
    const cityGold = city.Gold;
    if (!cityGold) {
        console.error("GetConstructibleItemData: getConstructibleItem: Failed to get cityGold!");
        return null;
    }
    const ageless = BZ_AGELESS_TYPES.has(constructible.ConstructibleType);
    const insufficientFunds = operationResult.InsufficientFunds ?? false;
    const possibleLocations = [];
    const pushPlots = (p) => {
        possibleLocations.push(p);
    };
    operationResult.Plots?.forEach(pushPlots);
    operationResult.ExpandUrbanPlots?.forEach(pushPlots);
    const turns = city.BuildQueue.getTurnsLeft(constructible.ConstructibleType);
    const category = "buildings";
    if (!possibleLocations.length) return null;
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
        // secondaryDetails,
        repairDamaged: operationResult.RepairDamaged
    };
    return item;
};
function bzGetYieldChanges(city, constructibleDef, plotIndex=-1) {
    const changes = plotIndex != -1 ?
        BPM.bzGetPlotYieldForConstructible(city.id, constructibleDef, plotIndex) :
        BPM.getBestYieldForConstructible(city.id, constructibleDef);
    console.warn(`TRIX CHANGES ${JSON.stringify(changes)}`);
    return changes;
}
function bzGetYieldDetails(yieldChanges) {
    const details = [];
    for (const [i, dy] of yieldChanges.entries()) {
        if (dy <= 0) continue;
        const info = GameInfo.Yields.lookup(i);
        if (!info) continue;
        details.push({
            iconId: i.toString(),
            icon: Icon.getYieldIcon(info.YieldType),
            value: Locale.compose("LOC_UI_CITY_DETAILS_YIELD_ONE_DECIMAL", dy),
            name: info.Name,
            yieldType: info.YieldType,
            isMainYield: true
        });
    }
    return details;
}
function bzAddQueuedItems(list, constructibleClass, city, recommendations, isPurchase) {
    // TODO: integrate these changes into GetConstructibleItemData
    // always show queued buildings with progress
    if (!list) return;
    const results = isPurchase ?
        Game.CityCommands.canStartQuery(
            city.id, CityCommandTypes.PURCHASE, CityQueryType.Constructible
        ) : Game.CityOperations.canStartQuery(
            city.id, CityOperationTypes.BUILD, CityQueryType.Constructible
        );
    const items = [];
    const types = new Set();
    for (const { index, result } of results) {
        // create entries for in-progress and queued buildings
        // TODO: exclude repairs?
        if (!result.InProgress && !result.InQueue) continue;
        const info = GameInfo.Constructibles.lookup(index);
        if (info.ConstructibleClass != constructibleClass) continue;
        // create a new item
        const item = bzGetQueuedItemData(city, info, result);
        items.push(item);
        types.add(item.type);
        // get advisor recommendations
        item.recommendations = AdvisorUtilities.getBuildRecommendationIcons(
            recommendations,
            item.type
        );
        // get yields
        const plot = result.InProgress ? result.Plots[0] : (() => {
            const queue = city.BuildQueue?.getQueue();
            const loc = queue?.find(i => i.type == info.$hash)?.location;
            if (!loc) return -1;
            return GameplayMap.getIndexFromLocation(loc);
        })();
        item.yieldChanges = bzGetYieldChanges(city, info, plot);
        console.warn(`TRIX YIELDS ${JSON.stringify(item.yieldChanges)}`);
        item.sortValue = BPM.bzYieldScore(item.yieldChanges);
        const yieldDetails = bzGetYieldDetails(item.yieldChanges);
        item.secondaryDetails = GetSecondaryDetailsHTML(yieldDetails);
        // update item status and error message
        if (result.InQueue && !isPurchase) {
            item.disabled = true;
            item.error ??= BZ_ALREADY_IN_QUEUE;
        } else if (item.insufficientFunds) {
            item.disabled = true;
            item.error = BZ_INSUFFICIENT_FUNDS;
        }
    }
    if (items.length) {
        // filter duplicate items and merge lists
        const dedup = list.filter(item => !types.has(item.type));
        list.splice(0, Infinity, ...items, ...dedup);
    }
}
function bzSortProductionItems(list, city) {
    const buildingTier = (item, info) =>
        info?.ConstructibleClass == "IMPROVEMENT" ? 1 : item.ageless ? -1 : 0;
    for (const item of list) {
        const type = Game.getHash(item.type);
        const progress = city.BuildQueue?.getProgress(type) ?? 0;
        const consInfo = GameInfo.Constructibles.lookup(type);
        if (progress) {
            // show in-progress items first
            item.sortTier = 9;
            item.sortValue = city.BuildQueue.getPercentComplete(type);
        } else if (item.category == "units") {
            const unitInfo = GameInfo.Units.lookup(type);
            const unitStats = GameInfo.Unit_Stats.lookup(type);
            const cv = unitInfo.CanEarnExperience ? Number.MAX_VALUE :
                unitStats?.RangedCombat || unitStats?.Combat || 0;
            item.sortTier =
                unitInfo.FoundCity ? 2 :  // settlers
                unitInfo.CoreClass == "CORE_CLASS_RECON" ? 1 :  // scouts
                cv <= 0 ? 0 :  // civilians
                unitInfo.Domain == "DOMAIN_LAND" ? -1 :
                unitInfo.Domain == "DOMAIN_SEA" ? -2 :
                unitInfo.Domain == "DOMAIN_AIR" ? -3 :
                9;  // unknown (list first for investigation)
            item.sortValue = cv;
        } else if (type == BZ_REPAIR_ALL_ID) {
            item.sortTier = 8;
            item.sortValue = 0;
        } else if (item.repairDamaged) {
            item.sortTier = 7;
            item.sortValue = buildingTier(item, consInfo);
        } else if (item.category == "buildings") {
            item.sortTier = buildingTier(item, consInfo);
            const info = GameInfo.Constructibles.lookup(type);
            const yieldChanges = BPM.getBestYieldForConstructible(city.id, info);
            item.sortValue ??= BPM.bzYieldScore(yieldChanges);
        } else if (item.category == "projects") {
            item.sortTier = 0;
            item.sortValue = city.Production?.getProjectProductionCost(type) ?? 0;
        }
        item.sortTier ??= 0;
        item.sortValue ??= 0;
    }
    list.sort((a, b) => {
        if (a.sortTier != b.sortTier) return b.sortTier - a.sortTier;
        if (a.sortValue != b.sortValue) return b.sortValue - a.sortValue;
        // sort by name
        const aName = Locale.compose(a.name).toUpperCase();
        const bName = Locale.compose(b.name).toUpperCase();
        return aName.localeCompare(bName);
    });
}

// export { CityDetails as C, GetPrevCityID as G, ProductionPanelCategory as P, RepairConstruct as R, SetTownFocus as S, UpdateCityDetailsEventName as U, GetNextCityID as a, GetTownFocusItems as b, GetTownFocusBlp as c, GetLastProductionData as d, GetCityBuildReccomendations as e, GetUniqueQuarterForPlayer as f, GetProductionItems as g, Construct as h, CreateProductionChooserItem as i, GetNumUniqueQuarterBuildingsCompleted as j, GetCurrentTownFocus as k };
export { GetProductionItems as g };
//# sourceMappingURL=production-chooser-helpers.chunk.js.map
