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
const GetConstructibleItemData = (info, result, city, recs, isPurchase, viewHidden) => {
    const type = info.ConstructibleType;
    const hash = info.$hash;
    const building = GameInfo.Buildings.lookup(info.ConstructibleType);
    const improvement = GameInfo.Improvements.lookup(info.ConstructibleType);
    const wonder = GameInfo.Wonders.lookup(info.ConstructibleType);
    const unique = (building ?? improvement ?? wonder)?.TraitType;
    const multiple = Boolean(improvement && !improvement.OnePerSettlement);
    const category = wonder ? "wonders" : "buildings";
    // queue entry, if any
    const queue = city.BuildQueue.getQueue();
    const qslot = queue?.find(i => i.type == hash);
    const inProgress = Boolean(result.InProgress || qslot && qslot === queue[0]);
    // repairs
    const repairDamaged = result.RepairDamaged ?? (qslot && !result.InQueue) ?? false;
    const altName =
        repairDamaged && info.Repairable ? "LOC_UI_PRODUCTION_REPAIR_NAME" :
        result.MoveToNewLocation? "LOC_UI_PRODUCTION_MOVE_NAME" : null;
    const name = altName ? Locale.compose(altName, info.Name) : info.Name;
    const ageless = BZ_AGELESS_TYPES.has(hash);
    const insufficientFunds = result.InsufficientFunds ?? false;
    const recommendations = AdvisorUtilities.getBuildRecommendationIcons(recs, type);
    // note: some items are not researchable (like locked legacy items)
    const locked = result.Locked ?? false;
    const lockType = result.NeededUnlock ?? -1;  // research type
    const unlockable = isUnlockable(city.owner, lockType);
    if (locked && !unlockable && !unique) return null;
    if (result.Success || inProgress || insufficientFunds || viewHidden) {
        const plots = [];
        if (inProgress) console.warn(`TRIX RESULT ${hash} ${type} ${JSON.stringify(result)}`);
        if (result.InQueue) {
            // get placement from the build queue
            console.warn(`TRIX QUEUE ${hash} ${type} ${JSON.stringify(queue)}`);
            plots.push(GameplayMap.getIndexFromLocation(qslot.location));
        } else {
            if (result.Plots) plots.push(...result.Plots);
            if (result.ExpandUrbanPlots) plots.push(...result.ExpandUrbanPlots);
        }
        const plotIndex = plots.length == 1 ? plots[0] : -1;
        const locations = Locale.compose("LOC_UI_PRODUCTION_LOCATIONS", plots.length);
        const yieldChanges = bzGetYieldChanges(city, info, plotIndex);
        const yieldDetails = bzGetYieldDetails(yieldChanges);
        const secondaryDetails = GetSecondaryDetailsHTML(yieldDetails);
        const cost = result.Cost ??
            city.Gold?.getBuildingPurchaseCost(YieldTypes.YIELD_GOLD, hash) ?? 0;
        const turns = city.BuildQueue.getTurnsLeft(hash);
        // error handling
        const buyout = isPurchase && inProgress;  // potential buyout
        const repairQueued = repairDamaged && !plots.length;
        const disableQueued = qslot && !(result.Success && (buyout || multiple));
        const disabled = !result.Success || !plots.length || disableQueued;
        const showError = buyout || insufficientFunds && (plots.length || repairDamaged);
        if (disabled && !viewHidden && !showError) return null;
        const error =
            result.AlreadyExists ? "LOC_UI_PRODUCTION_ALREADY_EXISTS" :
            locked && lockType != -1 ? unlockName(city.owner, lockType) :
            insufficientFunds ? "LOC_CITY_PURCHASE_INSUFFICIENT_FUNDS" :
            disableQueued || repairQueued ? "LOC_UI_PRODUCTION_ALREADY_IN_QUEUE" :
            !plots.length ? "LOC_UI_PRODUCTION_NO_SUITABLE_LOCATIONS" : void 0;
        if (error) console.warn(`TRIX ERROR ${type} ${error} ${JSON.stringify(result)}`);
        // sort items
        const buildingTier = improvement ? 1 : ageless ? -1 : 0;
        const yieldScore = building || improvement ? BPM.bzYieldScore(yieldChanges) : 0;
        const sortTier =
            building && unique ? 10 :
            inProgress ? 9 :
            repairDamaged ? 7 :
            !yieldChanges.length ? -10 :
            buildingTier;
        const sortValue = sortTier == buildingTier ? yieldScore : buildingTier;
        // assemble item
        const item = {
            sortTier,
            sortValue,
            interfaceMode: "INTERFACEMODE_PLACE_BUILDING",
            // disabled
            disabled,
            // data-category
            category,
            // data-name
            name,
            // data-type
            type,
            repairDamaged,
            // data-cost
            cost,
            turns,
            showTurns: turns > -1,
            showCost: cost > 0,
            // data-error
            insufficientFunds,
            error,
            // data-is-ageless
            ageless,
            // data-secondary-details
            locations,
            yieldChanges,
            secondaryDetails,
            // data-recommendations
            recommendations,
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
    for (const info of GameInfo.Projects) {
        if (info.CityOnly && city.isTown) continue;
        if (isPurchase && !info.CanPurchase) continue;
        const result = Game.CityOperations.canStart(
            city.id,
            CityOperationTypes.BUILD,
            { ProjectType: info.$index },
            false
        );
        if (result.Requirements?.FullFailure) continue;
        if (!result.Requirements?.MeetsRequirements) continue;
        const type = info.ProjectType;
        const hash = info.$hash;
        const turns = city.BuildQueue.getTurnsLeft(hash);
        const cost = city.Production.getProjectProductionCost(hash);
        // limit queuing to MaxPlayerInstances
        const queue = city.BuildQueue.getQueue();
        const inQueue = queue.filter(i => i.type == hash)?.length ?? 0;
        const limited = (info.MaxPlayerInstances ?? 999) <= inQueue;
        const error = limited ? "LOC_UI_PRODUCTION_ALREADY_IN_QUEUE" : void 0;
        // sort projects
        const sortTier = city.BuildQueue.getProgress(hash) ? 9 : 0;
        const sortValue = cost;
        const projectItem = {
            sortTier,
            sortValue,
            // disabled
            disabled: !result.Success || limited,
            // data-category
            category: "projects" /* PROJECTS */,
            // data-name
            name: info.Name,
            // data-type
            type,
            // data-cost
            cost,
            turns,
            showTurns: info.UpgradeToCity && info.TownOnly,
            showCost: false,
            // data-prereq
            // data-description
            description: info.Description,
            // data-error
            insufficientFunds: false,
            error,
        };
        if (info.UpgradeToCity && info.TownOnly) {
            projects.unshift(projectItem);
        } else {
            projects.push(projectItem);
        }
    }
    return projects;
};
const ShouldShowUniqueQuarter = (...results) => {
    return results.some((result) =>
        result.Success ||
        result.AlreadyExists ||
        result.InProgress ||
        result.InQueue ||
        result.InsufficientFunds
    );
};
const GetProductionItems = (city, recs, goldBalance, isPurchase, viewHidden, uqInfo) => {
    const items = {
        ["buildings" /* BUILDINGS */]: [],
        ["wonders" /* WONDERS */]: [],
        ["units" /* UNITS */]:
        getUnits(city, goldBalance, isPurchase, recs, viewHidden),
        ["projects" /* PROJECTS */]:
        getProjectItems(city, isPurchase)
    };
    if (!city) {
        console.error(`GetProductionItems: received a null/undefined city!`);
        return items;
    }
    let results;
    if (isPurchase) {
        results = Game.CityCommands.canStartQuery(
            city.id,
            CityCommandTypes.PURCHASE,
            CityQueryType.Constructible
        );
    } else {
        results = Game.CityOperations.canStartQuery(
            city.id,
            CityOperationTypes.BUILD,
            CityQueryType.Constructible
        );
    }
    let shouldShowUniqueQuarter = false;
    let repairableItemCount = 0;
    let repairableTotalCost = 0;
    let repairableTotalTurns = 0;
    if (uqInfo) {
        const uq1index = uqInfo.buildingOneDef.$index;
        const uq2index = uqInfo.buildingTwoDef.$index;
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
        const uq2status = uq1result ?? isPurchase ? Game.CityCommands.canStart(
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
        if (!uq1status.AlreadyExists || !uq2status.AlreadyExists) {
            if (!uq1result) results.push({ index: uq1index, result: uq1status });
            if (!uq2result) results.push({ index: uq2index, result: uq2status });
        }
        shouldShowUniqueQuarter = ShouldShowUniqueQuarter(uq1status, uq2status);
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
            result,
            city,
            recs,
            isPurchase,
            isUniqueQuarterBuilding ? shouldShowUniqueQuarter : viewHidden,
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
            } else if (data.repairDamaged && !data.disabled) {
                repairableItemCount++;
                repairableTotalCost += data.cost;
                repairableTotalTurns += data.turns;
                repairItems.push(data);
            }
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
    const isInsufficientFunds = cost > (localPlayer.Treasury?.goldBalance || 0);
    return {
        sortTier: 8,
        sortValue: 0,
        disabled: isInsufficientFunds,
        category: "buildings" /* BUILDINGS */,
        name: "LOC_UI_PRODUCTION_REPAIR_ALL",
        type: "IMPROVEMENT_REPAIR_ALL",
        cost,
        turns,
        showTurns: turns > -1,
        showCost: cost > 0,
        insufficientFunds: isInsufficientFunds,
        error: isInsufficientFunds ? "LOC_CITY_PURCHASE_INSUFFICIENT_FUNDS" : void 0,
    };
};
const getUnits = (city, goldBalance, isPurchase, recs, viewHidden) => {
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
        const unitDetails = GetUnitStatsFromDefinition(info);
        const secondaryDetails = GetSecondaryDetailsHTML(unitDetails);
        const recommendations = AdvisorUtilities.getBuildRecommendationIcons(recs, type);
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
        const cv = info.CanEarnExperience ? Number.MAX_VALUE :
            stats?.RangedCombat || stats?.Combat || 0;
        const sortTier =
            city.BuildQueue.getProgress(hash) ? 9 :
            info.FoundCity ? 2 :  // settlers
            info.CoreClass == "CORE_CLASS_RECON" ? 1 :  // scouts
            cv <= 0 ? 0 :  // civilians
            info.Domain == "DOMAIN_LAND" ? -1 :
            info.Domain == "DOMAIN_SEA" ? -2 :
            info.Domain == "DOMAIN_AIR" ? -3 :
            10;  // unknown (list first for investigation)
        const sortValue = cv;
        const data = {
            sortTier,
            sortValue,
            // disabled
            disabled: !result.Success,
            // data-category
            category: "units" /* UNITS */,
            // data-name
            name: info.Name,
            // data-type
            type: info.UnitType,
            // data-cost
            cost,
            turns,
            showTurns: false,
            showCost: cost > 0,
            // data-error
            insufficientFunds: cost > goldBalance,
            error,
            // data-is-ageless
            ageless: false,
            // data-secondary-details
            secondaryDetails,
            // data-recommendations
            recommendations,
        };
        units.push(data);
    }
    return units;
};

function bzGetYieldChanges(city, constructibleDef, plotIndex=-1) {
    const changes = plotIndex != -1 ?
        BPM.bzGetPlotYieldForConstructible(city.id, constructibleDef, plotIndex) :
        BPM.getBestYieldForConstructible(city.id, constructibleDef);
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

export { GetProductionItems as g };
//# sourceMappingURL=production-chooser-helpers.chunk.js.map
