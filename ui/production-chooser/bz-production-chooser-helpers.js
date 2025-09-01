import { Icon } from '/core/ui/utilities/utilities-image.chunk.js';
import { BuildingPlacementManager as BPM } from '/base-standard/ui/building-placement/building-placement-manager.js';
import { A as AdvisorUtilities } from '/base-standard/ui/tutorial/tutorial-support.chunk.js';
import { c as getNodeName } from '/base-standard/ui/utilities/utilities-textprovider.chunk.js';

// building tag helpers
const tagTypes = (tag) => GameInfo.TypeTags
    .filter(e => e.Tag == tag).map(e => Game.getHash(e.Type));
const BZ_AGELESS_TYPES = new Set(tagTypes("AGELESS"));

const isUnlockable = (playerID, nodeType) => {
    if (nodeType == null) return false;  // null or undefined
    const state = Game.ProgressionTrees.getNodeState(playerID, nodeType);
    return ProgressionTreeNodeState.NODE_STATE_OPEN <= state;
}
const unlockName = (playerID, nodeType) => {
    const nodeData = Game.ProgressionTrees.getNode(playerID ?? -1, nodeType ?? -1);
    if (!nodeData) return null;
    const nodeName = getNodeName(nodeData);
    return Locale.compose("LOC_UI_PRODUCTION_REQUIRES", nodeName);
}

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
const GetConstructibleItemData = (info, city, result, viewHidden) => {
    const type = info.ConstructibleType;
    const hash = info.$hash;
    const building = GameInfo.Buildings.lookup(info.ConstructibleType);
    const improvement = GameInfo.Improvements.lookup(info.ConstructibleType);
    const wonder = GameInfo.Wonders.lookup(info.ConstructibleType);
    const unique = (building ?? improvement ?? wonder)?.TraitType;
    if (unique) console.warn(`TRIX UNIQUE ${type} ${unique}`);
    const altName =
        result.RepairDamaged && info.Repairable ? "LOC_UI_PRODUCTION_REPAIR_NAME" :
        result.MoveToNewLocation? "LOC_UI_PRODUCTION_MOVE_NAME" : null;
    const name = altName ? Locale.compose(altName, info.Name) : info.Name;
    const ageless = BZ_AGELESS_TYPES.has(hash);
    const insufficientFunds = result.InsufficientFunds ?? false;
    const repairDamaged = result.RepairDamaged ?? false;
    // note: some items are not researchable (like locked legacy items)
    const locked = result.Locked ?? false;
    const lockType = result.NeededUnlock;  // research type
    const unlockable = isUnlockable(city.owner, lockType);
    const viewable = !locked || unlockable || unique;
    if (result.Success || viewable && (insufficientFunds || viewHidden)) {
        const plots = [];
        if (result.InProgress || repairDamaged) {
            plots.push(...result.Plots);
        } else if (result.InQueue) {
            // TODO: limit this to the queued location
            const queue = city.BuildQueue?.getQueue();
            const loc = queue?.find(i => i.type == hash)?.location;
            plots.push(GameplayMap.getIndexFromLocation(loc));
        } else {
            if (result.Plots) plots.push(...result.Plots);
            if (result.ExpandUrbanPlots) plots.push(...result.ExpandUrbanPlots);
        }
        // console.warn(`TRIX PLOTS ${type} ${result.Plots?.length}`);
        const plotIndex = plots.length == 1 ? plots[0] : -1;
        const yieldChanges = bzGetYieldChanges(city, info, plotIndex);
        const yieldDetails = bzGetYieldDetails(yieldChanges);
        const secondaryDetails = GetSecondaryDetailsHTML(yieldDetails);
        const turns = city.BuildQueue.getTurnsLeft(hash);
        const isPurchase = result.Cost;
        const buildingTier = improvement ? 1 : ageless ? -1 : 0;
        const sortTier =
            result.Locked ? -9 :
            result.InProgress ? 9 :
            repairDamaged ? 7 :
            buildingTier;
        const sortValue =
            locked || result.InProgress || repairDamaged ? buildingTier :
            building || improvement ? BPM.bzYieldScore(yieldChanges) : -1;
        console.warn(`TRIX SORT ${type} ${sortTier}:${sortValue}`);
        console.warn(`TRIX RESULT ${JSON.stringify(result)}`);
        const disableQueued = result.InQueue && !isPurchase &&
            info.ConstructibleClass === "BUILDING";
        const category = getConstructibleClassPanelCategory(info.ConstructibleClass);
        const disabled = !plots.length || disableQueued || insufficientFunds;
        if (!disabled) {
            const locations = Locale.compose(
                "LOC_UI_PRODUCTION_LOCATIONS",
                plots.length
            );
            const cost = result.Cost ??
                city.Gold?.getBuildingPurchaseCost(YieldTypes.YIELD_GOLD, hash) ?? 0;
            const item = {
                name,
                type,
                cost,
                category,
                ageless,
                turns,
                showTurns: turns > -1,
                showCost: cost > 0,
                insufficientFunds,
                disabled,
                locations,
                interfaceMode: "INTERFACEMODE_PLACE_BUILDING",
                yieldChanges,
                secondaryDetails,
                repairDamaged,
                sortTier,
                sortValue,
            };
            return item;
        } else if (insufficientFunds && plots.length || disableQueued || viewHidden) {
            let error = "";
            const nodeNeededError = unlockable && unlockName(city.owner, lockType) || "";
            if (result.RepairDamaged && info.Repairable) {
                error = result.InsufficientFunds ? "LOC_CITY_PURCHASE_INSUFFICIENT_FUNDS" : "LOC_UI_PRODUCTION_ALREADY_IN_QUEUE";
            } else {
                error =
                    result.AlreadyExists ? "LOC_UI_PRODUCTION_ALREADY_EXISTS" :
                    locked && result.NeededUnlock != -1 ? nodeNeededError :
                    insufficientFunds ? "LOC_CITY_PURCHASE_INSUFFICIENT_FUNDS" :
                    !plots.length ? "LOC_UI_PRODUCTION_NO_SUITABLE_LOCATIONS" :
                    disableQueued ? "LOC_UI_PRODUCTION_ALREADY_IN_QUEUE" : "";
            }
            const cost = result.Cost ??
                city.Gold?.getBuildingPurchaseCost(YieldTypes.YIELD_GOLD, hash) ?? 0;
            return {
                name,
                type,
                cost,
                turns,
                category,
                ageless,
                showTurns: turns > -1,
                showCost: cost > 0,
                insufficientFunds,
                disabled,
                error,
                yieldChanges,
                secondaryDetails,
                sortTier,
                sortValue,
            };
        }
    }
    return null;
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
                const hash = project.$hash;
                const turns = city.BuildQueue.getTurnsLeft(hash);
                const cost = city.Production.getProjectProductionCost(hash);
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
                    disabled: !result.Success,
                    sortTier: 0,
                    sortValue: cost,
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
        const data = GetConstructibleItemData(
            definition,
            city,
            result,
            viewHidden || isUniqueQuarterBuilding && shouldShowUniqueQuarter
        );
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
        disabled: isInsufficientFunds,
        sortTier: 8,
        sortValue: 0,
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
        const info = GameInfo.Units.lookup(index);
        if (!info) {
            console.error(`getUnits: Failed to find UnitDefinition for UnitType: ${index}`);
            continue;
        }
        const lockType = result.Requirements?.NeededProgressionTreeNode;
        const locked = lockType != null;
        const unlockable = isUnlockable(city.owner, lockType);
        if (locked && !unlockable) continue;
        const cost = cityGoldLibrary.getUnitPurchaseCost(YieldTypes.YIELD_GOLD, info.UnitType);
        const secondaryDetails = GetSecondaryDetailsHTML(GetUnitStatsFromDefinition(info));
        const turns = isPurchase ? -1 : city.BuildQueue.getTurnsLeft(info.UnitType) ?? -1;
        const data = {
            name: info.Name,
            type: info.UnitType,
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
        if (locked) {
            data.error = unlockName(city.owner, lockType);
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
function bzSortProductionItems(list, city) {
    for (const item of list) {
        const type = Game.getHash(item.type);
        const progress = city.BuildQueue?.getProgress(type) ?? 0;
        if ("sortTier" in item) {
            // already set
        } else if (progress) {
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
