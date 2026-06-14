import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
import { BuildingPlacementManager as BPM } from '/base-standard/ui/building-placement/building-placement-manager.js';
import { AdvisorUtilities } from '/base-standard/ui/tutorial/advisor-utilities.js';
import { ConstructibleHasTagType, getConstructibleTagsFromType } from '/base-standard/ui/utilities/utilities-tags.js';

import { getNodeName } from '/base-standard/ui/utilities/utilities-textprovider.js';
// TODO: test and remove
function _getNodeName(nodeData) {
    if (!nodeData) {
        return "";
    }
    const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(nodeData.nodeType);
    if (!nodeInfo) {
        return "";
    }
    let nodeName = Locale.compose(nodeInfo.Name ?? nodeInfo.ProgressionTreeNodeType);
    if (nodeData.depthUnlocked >= 1) {
        const depthNumeral = Locale.toRomanNumeral(nodeData.depthUnlocked + 1);
        if (depthNumeral) {
            nodeName += " " + depthNumeral;
        }
    }
    return nodeName;
}

const isUnlockable = (playerID, nodeType) => {
    if (nodeType == null) return false;  // null or undefined
    const state = Game.ProgressionTrees.getNodeState(playerID, nodeType);
    return ProgressionTreeNodeState.NODE_STATE_OPEN <= state;
}
const unlockName = (playerID, nodeType) => {
    const nodeData = Game.ProgressionTrees.getNode(playerID ?? -1, nodeType ?? -1);
    if (!nodeData) return null;
    return Locale.compose("LOC_UI_PRODUCTION_REQUIRES", getNodeName(nodeData));
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
    const cstats = GameInfo.Unit_Stats.lookup(definition.UnitType);
    if (cstats) {
        if (0 < cstats.Combat) {
            stats.push({
                name: "LOC_UNIT_INFO_MELEE_STRENGTH",
                icon: "Action_Attack",
                value: cstats.Combat.toString()
            });
        }
        if (cstats.RangedCombat < cstats.Bombard) {
            stats.push({
                name: "LOC_DISCIPLINE_FLEET_BOMBARDMENT_NAME",
                icon: "Action_Ranged",
                value: cstats.Bombard.toString()
            });
        } else if (0 < cstats.RangedCombat) {
            stats.push({
                name: "LOC_UNIT_INFO_RANGED_STRENGTH",
                icon: "Action_Ranged",
                value: cstats.RangedCombat.toString()
            });
        }
        if (1 < cstats.Range) {
            stats.push({
                name: "LOC_UNIT_INFO_RANGE",
                icon: "action_rangedattack",
                value: cstats.Range.toString()
            });
        }
    }
    return stats;
};
const GetCurrentBestTotalYieldForConstructible = (city, constructibleType) => {
    const results = [];
    const constructibleDef = GameInfo.Constructibles.lookup(constructibleType);
    if (!constructibleDef) {
        console.error(
            `production-chooser-helper: GetCurrentBestTotalYieldForConstructible() failed to find constructible definition for type ${constructibleType}`
        );
        return results;
    }
    if (!BPM.cityID || !ComponentID.isMatch(BPM.cityID, city.id)) {
        BPM.initializePlacementData(city.id);
    }
    const allPlacementData = BPM.allPlacementData;
    if (!allPlacementData || !allPlacementData.buildings) {
        return results;
    }
    const constructiblePlacementData = allPlacementData.buildings.find(
        (b) => b.constructibleType == constructibleDef.$hash
    );
    if (!constructiblePlacementData) {
        return results;
    }
    let bestPlacement = null;
    let bestTotal = Number.MIN_SAFE_INTEGER;
    for (const placement of constructiblePlacementData.placements) {
        const totalChanges = BPM.getTotalYieldChangesFromPlacementData(placement);
        let total = 0;
        for (const change of totalChanges) total += change.yieldChange;
        if (total > bestTotal) {
            bestTotal = total;
            bestPlacement = placement;
        }
    }
    if (!bestPlacement) {
        return results;
    }
    const yieldsCopy = [...bestPlacement.yieldChanges];
    let ignoreNaturalYields = true;
    if (constructibleDef.ConstructibleClass == "IMPROVEMENT") {
        const improvementDef = GameInfo.Improvements.lookup(constructibleDef.ConstructibleType);
        if (improvementDef) {
            ignoreNaturalYields = improvementDef.IgnoreNaturalYields;
        }
    }
    const plotCoord = GameplayMap.getLocationFromIndex(bestPlacement.plotID);
    const constructibles = MapConstructibles.getConstructibles(plotCoord.x, plotCoord.y);
    for (const constructible of constructibles) {
        const instance = Constructibles.getByComponentID(constructible);
        if (!instance) continue;
        const info = GameInfo.Constructibles.lookup(instance.type);
        if (info && info.ConstructibleClass == "IMPROVEMENT" && BPM.cityID && ignoreNaturalYields) {
            const improvementYields = GameplayMap.getYieldsWithCity(
                bestPlacement.plotID,
                BPM.cityID
            );
            for (const improvementYield of improvementYields) {
                const yieldDefinition = GameInfo.Yields.lookup(improvementYield[0]);
                if (yieldDefinition) {
                    yieldsCopy[yieldDefinition.$index] -= improvementYield[1];
                }
            }
        }
    }
    const cityConstructibles = city.Constructibles;
    if (cityConstructibles) {
        if (bestPlacement.overbuiltConstructibleID != void 0 && bestPlacement.overbuiltConstructibleID != -1) {
            const previousConstructibleDefinition = GameInfo.Constructibles.find(
                (d) => d.$index == bestPlacement.overbuiltConstructibleID
            );
            if (previousConstructibleDefinition) {
                const prevMaint = cityConstructibles.getMaintenance(previousConstructibleDefinition.ConstructibleType);
                for (let i = 0; i < prevMaint.length; i++) yieldsCopy[i] += prevMaint[i];
            }
        }
        const newMaint = cityConstructibles.getMaintenance(constructibleDef.ConstructibleType);
        for (let i = 0; i < newMaint.length; i++) yieldsCopy[i] -= newMaint[i];
    }
    const nonZeroEntries = [];
    GameInfo.Yields.forEach((yieldDef, idx) => {
        const change = yieldsCopy[idx];
        if (change && change !== 0) {
            nonZeroEntries.push({ def: yieldDef, change });
        }
    });
    nonZeroEntries.sort((a, b) => b.change - a.change);
    for (let i = 0; i < nonZeroEntries.length; i++) {
        const { def, change } = nonZeroEntries[i];
        let valueText = Locale.compose("LOC_UI_CITY_DETAILS_YIELD_ONE_DECIMAL", change);
        if (change < 0) {
            valueText = `<span class="text-negative">${valueText}</span>`;
        }
        results.push({
            iconId: def.$index.toString(),
            icon: Icon.getYieldIcon(def.YieldType),
            value: valueText,
            name: def.Name,
            yieldType: def.YieldType
        });
    }
    return results;
};
const GetSecondaryDetailsHTML = (items) => {
    const outer = items.length < 5 ? "mr-2" : "mr-0\\.5";
    const inner = items.length < 5 ? "mr-0" : "-mr-0\\.5";
    return items.reduce((acc, { icon, value, name }) => {
        return acc + `<div class="flex items-center ${outer}"><img aria-label="${Locale.compose(name)}" src="${icon}" class="size-6 ${inner}" />${value}</div>`;
    }, "");
};
const GetConstructibleItemData = ({
    constructible,
    city,
    operationResult,
    isPurchase,
    hideIfUnavailable = false,
    infoDisplayType
}) => {
    const info = constructible;
    const result = operationResult;
    const type = info.ConstructibleType;
    const hash = info.$hash;
    const building = GameInfo.Buildings.lookup(info.ConstructibleType);
    const improvement = GameInfo.Improvements.lookup(info.ConstructibleType);
    const wonder = GameInfo.Wonders.lookup(info.ConstructibleType);
    const unique = (building ?? improvement ?? wonder)?.TraitType;
    const category = wonder ? "wonders" : "buildings";
    // queue entry, if any
    const queue = city.BuildQueue.getQueue();
    const qindex = city.BuildQueue.getQueuedPositionOfType(hash);
    const inQueue = qindex != -1;
    // repairs
    const repairDamaged =
        (result.RepairDamaged ?? (inQueue && !result.InQueue) ?? false) &&
        info.Repairable;
    const altName =
        repairDamaged ? "LOC_UI_PRODUCTION_REPAIR_NAME" :
        result.MoveToNewLocation? "LOC_UI_PRODUCTION_MOVE_NAME" : null;
    const name = altName ? Locale.compose(altName, info.Name) : info.Name;
    const description = repairDamaged ? "LOC_UI_PRODUCTION_REPAIR_DESCRIPTION" : "";
    const ageless = ConstructibleHasTagType(type, "AGELESS");
    const insufficientFunds = result.InsufficientFunds ?? false;
    // note: some items are not researchable (like locked legacy items)
    const locked = result.Locked ?? false;
    const lockType = result.NeededUnlock ?? -1;  // research type
    const unlockable = isUnlockable(city.owner, lockType);
    if (locked && !unlockable && !unique) return null;
    const hasProgress = result.InProgress || result.InQueue || repairDamaged;
    const buyout = isPurchase && hasProgress || insufficientFunds;
    const viewWonder = wonder && hasProgress;
    const viewHidden = viewWonder || !hideIfUnavailable;
    if (result.Success || result.InProgress || buyout || viewHidden) {
        const plots = [];
        if (result.InQueue) {
            // get placement from the build queue
            plots.push(GameplayMap.getIndexFromLocation(queue[qindex].location));
        } else {
            if (result.Plots) plots.push(...result.Plots);
            if (result.ExpandUrbanPlots) plots.push(...result.ExpandUrbanPlots);
        }
        if (!plots.length && !viewHidden) return null;
        const locations = Locale.compose("LOC_UI_PRODUCTION_LOCATIONS", plots.length);
        // cost
        const cost = result.Cost ??
            city.Gold?.getBuildingPurchaseCost(YieldTypes.YIELD_GOLD, hash) ?? 0;
        const turns = city.BuildQueue.getTurnsLeft(hash);
        const productionPercent = city.BuildQueue.getPercentComplete(hash) ?? 0;
        const productionProgress = city.BuildQueue.getProgress(hash) ?? 0;
        const productionCost = city.Production.getConstructibleProductionCost(hash) -
            productionProgress;
        const isInProgress = 0 < productionProgress || inQueue;
        // error handling
        const disableQueued = result.InQueue && !buyout;
        const disabled = !result.Success || !plots.length || disableQueued;
        if (disabled && !buyout && !viewHidden) return null;
        const error =
            result.AlreadyExists ? "LOC_UI_PRODUCTION_ALREADY_EXISTS" :
            locked && lockType != -1 ? unlockName(city.owner, lockType) :
            insufficientFunds ? "LOC_CITY_PURCHASE_INSUFFICIENT_FUNDS" :
            inQueue && disabled ? "LOC_UI_PRODUCTION_ALREADY_IN_QUEUE" :
            !plots.length ? "LOC_UI_PRODUCTION_NO_SUITABLE_LOCATIONS" : void 0;
        // tags
        const tags = wonder ? [] : getConstructibleTagsFromType(type);
        // yield preview details
        // base yield details
        const baseYields = [];
        if (!disabled) {
            for (const yieldChange of GameInfo.Constructible_YieldChanges) {
                if (yieldChange.$hash != hash) continue;
                baseYields.push({
                    yieldType: yieldChange.YieldType,
                    value: yieldChange.YieldChange,
                });
            }
        }
        const bestYields = GetCurrentBestTotalYieldForConstructible(city, type);
        const secondaryDetails = GetSecondaryDetailsHTML(bestYields);
        const canGetWarehouseBonuses = disabled ? void 0 :
            ConstructibleHasTagType(type, "WAREHOUSE");
        const warehouseCount = disabled ? void 0 : BPM.getNumberOfWarehouseBonuses(hash);
        const canGetAdjacencyBonuses = disabled ? void 0 :
            BPM.canGetAdjacencyBonuses(type);
        const highestAdjacency = disabled ? void 0 : BPM.getHighestAdjacencyBonus(hash);
        const infoDisplayType = Configuration.getUser().productionPanelBuildingInfoType;
        // sort items
        const buildingTier = building && unique ? 2 : improvement ? 1 : ageless ? -1 : 0;
        const yieldScore = building || improvement ?
            baseYields.reduce((acc, { value }) => acc + value, 0) +
            (warehouseCount ?? 0) + (highestAdjacency ?? 0) : 0;
        const topTier = Boolean(result.InProgress || inQueue);
        const sortTier =
            topTier ? 9 :
            repairDamaged ? 8 :
            buildingTier;
        const sortValue =
            topTier ? -qindex :
            sortTier == buildingTier ? yieldScore : buildingTier;
        // assemble item
        const item = {
            sortTier,
            sortValue,
            name,
            description,
            type,
            cost,
            productionCost,
            productionPercent,
            productionProgress,
            isInProgress,
            category,
            ageless,
            turns,
            showTurns: turns > -1,
            showCost: cost > 0,
            insufficientFunds,
            disabled,
            error,
            locations,
            interfaceMode: "INTERFACEMODE_PLACE_BUILDING",
            secondaryDetails,
            repairDamaged,
            tags,
            baseYields,
            infoDisplayType,
            canGetWarehouseBonuses,
            warehouseCount,
            canGetAdjacencyBonuses,
            highestAdjacency
        };
        return item;
    }
    return null;
};
const getProjectItems = (city, isPurchase) => {
    const projects = [];
    if (!city) {
        console.error(`getProjectItems: received a null/undefined city!`);
        return projects;
    }
    for (const project of GameInfo.Projects) {
        if (project.CityOnly && city.isTown) continue;
        if (isPurchase && !project.CanPurchase) continue;
        const result = Game.CityOperations.canStart(
            city.id,
            CityOperationTypes.BUILD,
            { ProjectType: project.$index },
            false
        );
        if (result.Requirements?.FullFailure) continue;
        if (!result.Requirements?.MeetsRequirements) continue;
        const hash = project.$hash;
        const turns = city.BuildQueue.getTurnsLeft(hash);
        const cost = city.Production.getProjectProductionCost(hash);
        const productionPercent = city.BuildQueue.getPercentComplete(hash) ?? 0;
        const productionProgress = city.BuildQueue.getProgress(hash) ?? 0;
        const productionCost = cost - productionProgress;
        const qindex = city.BuildQueue.getQueuedPositionOfType(hash);
        const isInProgress = 0 < productionProgress || qindex != -1;
        // limit queuing to MaxPlayerInstances
        const queue = city.BuildQueue.getQueue();
        const inQueue = queue.filter(i => i.type == hash)?.length ?? 0;
        const limited = (project.MaxPlayerInstances ?? 999) <= inQueue;
        const error = limited ? "LOC_UI_PRODUCTION_ALREADY_IN_QUEUE" : void 0;
        // sort projects
        const sortTier = productionProgress ? 9 : 0;
        const sortValue = cost;
        const projectItem = {
            sortTier,
            sortValue,
            name: project.Name,
            description: project.Description,
            type: project.ProjectType,
            cost,
            turns,
            category: "projects" /* PROJECTS */,
            showTurns: project.UpgradeToCity && project.TownOnly,
            showCost: false,
            productionCost,
            productionPercent,
            productionProgress,
            isInProgress,
            insufficientFunds: false,
            disabled: !result.Success || limited,
            error,
        };
        if (project.UpgradeToCity && project.TownOnly) {
            projects.unshift(projectItem);
        } else {
            projects.push(projectItem);
        }
    }
    return projects;
};
const ShouldShowUniqueQuarter = (...results) => {
    const allCompleted = results.every((result) => result.AlreadyExists);
    if (allCompleted) {
        return false;
    }
    return results.some((result) =>
        result.Success ||
        result.InQueue ||
        result.InProgress ||
        result.InsufficientFunds ||
        result.AlreadyExists
    );
};
const GetProductionItems = (city, recommendations, playerGoldBalance, isPurchase, viewHidden, uniqueQuarterInfos) => {
    const items = {
        ["buildings" /* BUILDINGS */]: [],
        ["wonders" /* WONDERS */]: [],
        ["units" /* UNITS */]:
        getUnits(city, playerGoldBalance, isPurchase, recommendations, viewHidden),
        ["projects" /* PROJECTS */]:
        getProjectItems(city, isPurchase)
    };
    if (!city) {
        console.error(`GetProductionItems: received a null/undefined city!`);
        return items;
    }
    const results = isPurchase ?
        Game.CityCommands.canStartQuery(
            city.id,
            CityCommandTypes.PURCHASE,
            CityQueryType.Constructible
        ) :
        Game.CityOperations.canStartQuery(
            city.id,
            CityOperationTypes.BUILD,
            CityQueryType.Constructible
        );
    const uniqueBuildingMap = /* @__PURE__ */ new Map();
    for (const uniqueQuarterInfo of uniqueQuarterInfos) {
        const uq1index = uniqueQuarterInfo.buildingOneDef.$index;
        const uq2index = uniqueQuarterInfo.buildingTwoDef.$index;
        let uq1result = results.find(({ index }) => index === uq1index)?.result;
        let uq2result = results.find(({ index }) => index === uq2index)?.result;
        const uq1status = uq1result ?? isPurchase ? Game.CityCommands.canStart(
            city.id,
            CityCommandTypes.PURCHASE,
            { ConstructibleType: uq1index },
            false
        ) : Game.CityOperations.canStart(
            city.id,
            CityOperationTypes.BUILD,
            { ConstructibleType: uq1index },
            false
        );
        const uq2status = uq2result ?? isPurchase ? Game.CityCommands.canStart(
            city.id,
            CityCommandTypes.PURCHASE,
            { ConstructibleType: uq2index },
            false
        ) : Game.CityOperations.canStart(
            city.id,
            CityOperationTypes.BUILD,
            { ConstructibleType: uq2index },
            false
        );
        if (!uq1result) results.push({ index: uq1index, result: uq1status });
        if (!uq2result) results.push({ index: uq2index, result: uq2status });
        const shouldShow = viewHidden || ShouldShowUniqueQuarter(uq1status, uq2status);
        uniqueBuildingMap.set(uniqueQuarterInfo.buildingOneDef.ConstructibleType, {
          type: uniqueQuarterInfo.buildingOneDef.ConstructibleType,
          showBuilding: shouldShow
        });
        uniqueBuildingMap.set(uniqueQuarterInfo.buildingTwoDef.ConstructibleType, {
          type: uniqueQuarterInfo.buildingTwoDef.ConstructibleType,
          showBuilding: shouldShow
        });
    }
    results.sort((a, b) => {
        return a.index - b.index;
    });
    let repairableItemCount = 0;
    let repairableTotalCost = 0;
    let repairableTotalTurns = 0;
    const repairItems = [];
    for (const { index, result } of results) {
        const definition = GameInfo.Constructibles.lookup(index);
        if (!definition) {
            console.error(`GetProductionItems: Failed to find ConstructibleDefinition for ConstructibleType: ${index}`);
            continue;
        }
        const uniqueBuilding = uniqueBuildingMap.get(definition.ConstructibleType);
        const data = GetConstructibleItemData({
            constructible: definition,
            city,
            operationResult: result,
            isPurchase,
            hideIfUnavailable: !(uniqueBuilding?.showBuilding ?? viewHidden),
            infoDisplayType: undefined  // TODO
        });
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
            } else if (data.repairDamaged && !data.disabled) {
                repairableItemCount++;
                repairableTotalCost += data.cost;
                repairableTotalTurns += data.turns;
                repairItems.push(data);
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
        bzSortProductionItems(list);
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
    const isInsufficientFunds = cost > (localPlayer.Treasury?.playerGoldBalance || 0);
    return {
        sortTier: 8,
        sortValue: 8,
        type: "IMPROVEMENT_REPAIR_ALL",
        category: "buildings" /* BUILDINGS */,
        name: "LOC_UI_PRODUCTION_REPAIR_ALL",
        description: "LOC_UI_PRODUCTION_REPAIR_ALL_DESCRIPTION",
        cost,
        turns,
        showTurns: turns > -1,
        showCost: cost > 0,
        insufficientFunds: isInsufficientFunds,
        error: isInsufficientFunds ? "LOC_CITY_PURCHASE_INSUFFICIENT_FUNDS" : void 0,
        disabled: isInsufficientFunds
    };
};
const getUnits = (city, playerGoldBalance, isPurchase, recommendations, viewHidden) => {
    const units = [];
    if (!city?.Gold) {
        console.error(`getUnits: received a null/undefined city`);
        return units;
    }
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
            console.error(`getUnits: no UnitDefinition for UnitType: ${index}`);
            continue;
        }
        const type = info.UnitType;
        const hash = info.$hash;
        const lockType = result.Requirements?.NeededProgressionTreeNode;
        const locked = lockType != null;
        const unlockable = isUnlockable(city.owner, lockType);
        if (locked && !unlockable) continue;
        const cost = city.Gold.getUnitPurchaseCost(YieldTypes.YIELD_GOLD, info.UnitType);
        const turns = city.BuildQueue.getTurnsLeft(hash);
        const productionCost = city.Production.getUnitProductionCost(hash);
        const productionPercent = city.BuildQueue.getPercentComplete(hash) ?? 0;
        const isInProgress = city.BuildQueue.getQueuedPositionOfType(hash) != -1;
        const unitDetails = GetUnitStatsFromDefinition(info);
        const secondaryDetails = GetSecondaryDetailsHTML(unitDetails);
        // error handling
        const errors = [];
        if (locked) errors.push(unlockName(city.owner, lockType));
        if (result.Requirements?.NeededPopulation) {
            errors.push(Locale.compose(
                "LOC_UI_PRODUCTION_REQUIRES_POPULATION",
                result.Requirements.NeededPopulation
            ));
        }
        if (result.FailureReasons) errors.push(...result.FailureReasons);
        const error = errors.join("[n]");
        // sorting
        const stats = GameInfo.Unit_Stats.lookup(hash);
        const cv = info.CanEarnExperience ? Number.MAX_VALUE : stats?.Combat || 0;
        const sortTier =
            city.BuildQueue.getProgress(hash) ? 9 :
            info.FoundCity ? 2 :  // settlers
            info.CoreClass == "CORE_CLASS_RECON" ? 1 :  // scouts
            cv <= 0 ? 0 :  // civilians
            info.Domain == "DOMAIN_LAND" ? -1 :
            info.Domain == "DOMAIN_SEA" ? -2 :
            info.Domain == "DOMAIN_AIR" ? -3 :
            9;  // unknown (list first for investigation)
        const sortValue = cv;
        const data = {
            sortTier,
            sortValue,
            name: info.Name,
            type: info.UnitType,
            ageless: false,
            cost,
            turns,
            showTurns: false,
            showCost: cost > 0,
            productionCost,
            productionPercent,
            insufficientFunds: cost > playerGoldBalance,
            disabled: !result.Success,
            category: "units" /* UNITS */,
            isInProgress,
            error,
            secondaryDetails
        };
        if (result.Requirements?.MeetsRequirements) {
            data.recommendations = AdvisorUtilities.getBuildRecommendationIcons(recommendations, data.type);
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
            // get queue index and chosen location
            const qindex = city.BuildQueue.getQueuedPositionOfType(typeInfo.Hash);
            const qloc = (() => {
                if (qindex == -1) return void 0;
                const queue = city.BuildQueue.getQueue();
                return queue[qindex].location;
            })();
            if ((result.InProgress || item.repairDamaged) && result.Plots?.length == 1) {
                // finish constructible in progress / one-click repairs
                const loc = GameplayMap.getLocationFromIndex(result.Plots[0]);
                args.X = loc.x;
                args.Y = loc.y;
            } else if (isPurchase && qindex != -1 && !item.repairDamaged) {
                // purchase from queue (excluding repairs)
                args.X = qloc.x;
                args.Y = qloc.y;
            } else if (item.interfaceMode && !result.InProgress) {
                // choose constructible location
                InterfaceMode.switchTo(item.interfaceMode, {
                    CityID: city.id,
                    OperationArguments: args,
                    IsPurchasing: isPurchase
                });
                return false;
            }
            if (isPurchase && typeInfo.Kind != "KIND_PROJECT") {
                if (qloc && qloc.x == args.X && qloc.y == args.Y) {
                    // remove from queue before purchasing
                    const cancel = {
                        InsertMode: CityOperationsParametersValues.RemoveAt,
                        QueueLocation: qindex,
                    };
                    Game.CityOperations.sendRequest(city.id, CityOperationTypes.BUILD, cancel);
                }
                Game.CityCommands.sendRequest(city.id, CityCommandTypes.PURCHASE, args);
            } else {
                if (typeInfo.Kind == "KIND_PROJECT" && city.isTown) {
                    args.InsertMode = CityOperationsParametersValues.Exclusive;
                }
                Game.CityOperations.sendRequest(city.id, CityOperationTypes.BUILD, args);
            }
            return true;
        }
    } else {
        if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_PLACE_BUILDING")) {
            InterfaceMode.switchToDefault();
        }
        return false;
    }
    return false;
};

function bzSortProductionItems(list) {
    for (const item of list) {
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

export { GetProductionItems, Construct };
//# sourceMappingURL=production-chooser-helpers.chunk.js.map
