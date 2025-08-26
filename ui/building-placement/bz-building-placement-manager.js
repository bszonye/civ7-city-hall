import { BuildingPlacementManager, BuildingPlacementConstructibleChangedEvent } from '/base-standard/ui/building-placement/building-placement-manager.js';
import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';

const proto = Object.getPrototypeOf(BuildingPlacementManager);

// building tag helpers
const tagTypes = (tag) => GameInfo.TypeTags.filter(e => e.Tag == tag).map(e => e.Type);
const BZ_AGELESS = new Set(tagTypes("AGELESS"));
const BZ_SLOTLESS = new Set(tagTypes("IGNORE_DISTRICT_PLACEMENT_CAP"));

// add BPM.bzReservedPlots property:
// plots that would block a unique quarter
BuildingPlacementManager._bzReservedPlots = [];
const BPM_expandablePlots = Object.getOwnPropertyDescriptor(proto, "expandablePlots");
const bzReservedPlots = {
    configurable: BPM_expandablePlots.configurable,
    enumerable: BPM_expandablePlots.enumerable,
    get() {
        return this._bzReservedPlots;
    }
};
Object.defineProperty(proto, "bzReservedPlots", bzReservedPlots);

// replace BPM.selectPlacementData method:
// implements unique quarter assistant
proto.selectPlacementData = function(cityID, operationResult, constructible) {
    if (!ComponentID.isMatch(cityID, this.cityID)) {
        console.error(
            `building-placement-manager: cityID ${cityID} passed into selectPlacementData does not match cityID used for initializePlacementData ${this.cityID}`
        );
        return;
    }
    if (!this.allPlacementData) {
        console.error(`building-placement-manager: invalid allPlacementData for cityID ${cityID}`);
        return;
    }
    this._currentConstructible = constructible;
    this.isRepairing = operationResult.RepairDamaged;
    // is the new building part of a unique quarter?
    const btype = GameInfo.Buildings.lookup(constructible.ConstructibleType);
    const newUB = btype?.TraitType;  // for example: TRAIT_ROME
    // get the civilization's unique quarter
    const city = Cities.get(cityID);
    const player = Players.get(city.owner);
    const civ = GameInfo.Civilizations.lookup(player.civilizationType);
    const civTraits = GameInfo.CivilizationTraits
        .filter(trait => trait.CivilizationType === civ.CivilizationType)
        .map(trait => trait.TraitType);
    const civUQ = GameInfo.UniqueQuarters.find(uq => civTraits.includes(uq.TraitType));
    // find a partial unique quarter, if any
    const partialUQ = this.findExistingUniqueBuilding(civUQ);  // -1 if not found
    // check whether a district can make a unique quarter
    // TODO: account for potential blockers in queue / in progress
    const hasUQBlocker = (p) => {
        const loc = GameplayMap.getLocationFromIndex(p);
        const ids = MapConstructibles.getConstructibles(loc.x, loc.y);
        // get building slots, ignoring walls
        const slots = ids.map(id => Constructibles.getByComponentID(id))
            .map(c => GameInfo.Constructibles.lookup(c.type))
            .filter(c => c.ConstructibleClass == "BUILDING")
            .filter(c => !BZ_SLOTLESS.has(c.ConstructibleType));
        // ageless buildings are blockers
        if (slots.find(c => BZ_AGELESS.has(c.ConstructibleType))) return true;
        // current-age buildings are blockers
        const current = Game.age;
        if (slots.find(c => Database.makeHash(c.Age ?? "") == current)) return true;
        // otherwise, this district can still make a unique quarter
        return false;
    };
    // check whether placement is UQ-compatible
    const isUQCompatible = (p) => {
        // repairs and walls are always compatible with UQs
        if (this.isRepairing) return true;
        if (BZ_SLOTLESS.has(btype?.ConstructibleType)) return true;
        // unique district selected
        if (p == partialUQ) {
            // good: a unique building here finishes the UQ
            if (newUB) return true;
            // bad: non-unique building in a unique district
            return false;
        }
        // new unique building NOT on a partial UQ
        if (newUB) {
            // bad: there's a partial UQ somewhere else
            if (partialUQ != -1) return false;
            // bad: this would create a non-unique quarter
            if (hasUQBlocker(p)) return false;
        }
        return true;
    };
    // evaluate existing districts
    operationResult.Plots?.forEach(p => {
        if (isUQCompatible(p)) {
            this._urbanPlots.push(p);
        } else {
            this._bzReservedPlots.push(p);
        }
    });
    // evaluate rural and undeveloped tiles
    operationResult.ExpandUrbanPlots?.forEach(p => {
        const loc = GameplayMap.getLocationFromIndex(p);
        const city = MapCities.getCity(loc.x, loc.y);
        // still need to check UQ compatibility outside of districts
        if (!isUQCompatible(p)) {
            // placement clashes with a unique quarter in queue
            this._bzReservedPlots.push(p);
        } else if (city && MapCities.getDistrict(loc.x, loc.y) != null) {
            // rural tile: ok, will move citizen
            this._developedPlots.push(p);
        }
        else {
            // undeveloped tile: good
            this._expandablePlots.push(p);
        }
    });
    this.selectedPlacementData = this.allPlacementData.buildings.find((buildingData) => {
        return buildingData.constructibleType == constructible.$hash;
    });
    if (!this.selectedPlacementData) {
        // This can be an expected case. Example: Repairing a constructible.
        console.warn(
            `building-placement-manager: Failed to find type ${constructible.ConstructibleType} in allPlacementData`
        );
    }
    window.dispatchEvent(new BuildingPlacementConstructibleChangedEvent());
}
// extend BPM.isPlotIndexSelectable method:
// also accept BPM.bzReservedPlots
const BPM_isPlotIndexSelectable = proto.isPlotIndexSelectable;
proto.isPlotIndexSelectable = function(...args) {
    const [plotIndex] = args;
    return this.bzReservedPlots.find((index) => {
        return index == plotIndex;
    }) != void 0 || BPM_isPlotIndexSelectable.apply(this, args);
}
// extend BPM.reset method:
// also reset BPM._bzReservedPlots
const BPM_reset = proto.reset;
proto.reset = function(...args) {
    this._bzReservedPlots = [];
    return BPM_reset.apply(this, args);
}
// extend BPM.isValidPlacementPlot method:
// also accept BPM.bzReservedPlots
const BPM_isValidPlacementPlot = proto.isValidPlacementPlot;
proto.isValidPlacementPlot = function(...args) {
    const [plotIndex] = args;
    if (this.bzReservedPlots.find((p) => p == plotIndex)) return true;
    return BPM_isValidPlacementPlot.apply(this, args);
}
// replace BPM.findExistingUniqueBuilding method:
// find in-progress and queued buildings in addition to finished ones
proto.findExistingUniqueBuilding = function(uniqueQuarterDef) {
    // get city info
    if (!this.cityID || ComponentID.isInvalid(this.cityID)) {
        console.error(`bz-bpm: invalid cityID ${ComponentID.toLogString(this.cityID)}`);
        return -1;
    }
    const city = Cities.get(this.cityID);
    if (!city) {
        console.error(`bz-bpm: broken cityID ${ComponentID.toLogString(this.cityID)}`);
        return -1;
    }
    // a building can appear in three places:
    // - Game.CityCommands.canStart (in-progress buildings)
    // - city.BuildQueue (production queue)
    // - city.Constructibles (finished buildings)
    const ublist = [
        uniqueQuarterDef?.BuildingType1,
        uniqueQuarterDef?.BuildingType2,
    ].filter(ub => ub);  // eliminate empty/null/undefined buildings
    // match UQ buildings by their hashed constructible IDs
    const ubset = new Set(ublist.map(ub => Game.getHash(ub)));
    if (!ubset.size) return -1;  // no unique quarter
    // check for a unique building in progress
    for (const ConstructibleType of ubset) {
        const result = Game.CityCommands.canStart(
            city.id, CityCommandTypes.PURCHASE, { ConstructibleType }, false);
        if (result.InProgress && result.Plots) return result.Plots[0];
    }
    // check the production queue
    const queued = city.BuildQueue?.getQueue().find(q => ubset.has(q.constructibleType));
    if (queued) return GameplayMap.getIndexFromLocation(queued.location);
    // check the finished buildings
    for (const id of city.Constructibles.getIds()) {
        const con = Constructibles.getByComponentID(id);
        if (con && ubset.has(con.type)) {
            return GameplayMap.getIndexFromLocation(con.location);
        }
    }
    // not found
    return -1;
}
// replace getBestYieldForConstructible method:
// improve yield scoring and refactor it into a new method
proto.bzYieldScore = function(yields) {
    // given an array of yields, rank by absolute value and sum:
    // first + 1/2 second + 1/3 third ...
    const score = [...yields];
    score.sort((a, b) => Math.abs(b) - Math.abs(a));
    return score.reduce((a, b, i) => a + b/(i+1), 0);
}
proto.getBestYieldForConstructible = function(cityID, constructibleDef) {
    if (!ComponentID.isMatch(cityID, this.cityID)) {
        console.error(
            `building-placement-manager: getBestYieldForConstructible() - cityID ${cityID} passed into selectPlacementData does not match cityID used for initializePlacementData ${this.cityID}`
        );
        return [];
    }
    if (!this.allPlacementData) {
        console.error(
            `building-placement-manager: getBestYieldForConstructible() - invalid allPlacementData for cityID ${cityID}`
        );
        return [];
    }
    const constructiblePlacementData = this.allPlacementData.buildings.find((data) => {
        return data.constructibleType == constructibleDef.$hash;
    });
    if (!constructiblePlacementData) {
        console.error(
            `building-placement-manager: getBestYieldForConstructible() - failed to find placement data for type ${constructibleDef.ConstructibleType}`
        );
        return [];
    }
    let bestYieldChanges = [];
    let bestYieldChangesScore = Number.MIN_SAFE_INTEGER;
    if (constructiblePlacementData) {
        for (const placement of constructiblePlacementData.placements) {
            const score = this.bzYieldScore(placement.yieldChanges);
            if (bestYieldChangesScore < score) {
                bestYieldChangesScore = score;
                bestYieldChanges = placement.yieldChanges;
            }
        }
    }
    return bestYieldChanges;
}
