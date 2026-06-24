import { BuildingPlacementManager, BuildingPlacementConstructibleChangedEvent } from '/base-standard/ui/building-placement/building-placement-manager.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import { ConstructibleHasTagType } from '/base-standard/ui/utilities/utilities-tags.js';

const proto = Object.getPrototypeOf(BuildingPlacementManager);

// add BPM.bzReservedPlots property:
// plots that would block a unique quarter
BuildingPlacementManager._bzReservedPlots = [];
Object.defineProperty(proto, "bzReservedPlots", {
    configurable: true,
    enumerable: true,
    get() {
        return this._bzReservedPlots;
    }
});

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
    // find existing unique quarters, if any
    const uqPlots = new Map();
    const uqList = Players.Constructibles.get(cityID.owner)
        .getUnlockedUniqueQuarters()
        .map(id => GameInfo.UniqueQuarters.lookup(id));
    const city = Cities.get(cityID);
    for (const uq of uqList) {
        // attach UQ type to unique building locations
        const plot1 = this.bzFindConstructible(city, uq.BuildingType1);
        const plot2 = this.bzFindConstructible(city, uq.BuildingType2);
        if (plot1 != null) uqPlots.set(plot1, uq.UniqueQuarterType);
        if (plot2 != null) uqPlots.set(plot2, uq.UniqueQuarterType);
        // attach location to UQ type
        const plot = plot1 ?? plot2;
        if (plot != null) uqPlots.set(uq.UniqueQuarterType, plot);
    }
    // is the new building part of a unique quarter?
    const btype = constructible.ConstructibleType;
    const uqtype = uqList
        .find(uq => btype == uq.BuildingType1 || btype == uq.BuildingType2)
        ?.UniqueQuarterType;
    // check whether a district can make a unique quarter
    const hasUQBlocker = (p) => {
        const loc = GameplayMap.getLocationFromIndex(p);
        const ids = MapConstructibles.getConstructibles(loc.x, loc.y);
        // get building slots, ignoring walls
        const slots = ids.map(id => Constructibles.getByComponentID(id))
            .map(c => GameInfo.Constructibles.lookup(c.type))
            .filter(c => c.ConstructibleClass == "BUILDING")
            .filter(c => !c.ExistingDistrictOnly);
        // ageless buildings are blockers
        if (slots.find(c => ConstructibleHasTagType(c.ConstructibleType, "AGELESS"))) {
            return true;
        }
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
        if (constructible.ExistingDistrictOnly) return true;
        // unique district selected: ok if new building matches
        if (uqPlots.has(p)) return uqtype == uqPlots.get(p);
        // new unique building NOT on a partial UQ
        if (uqtype) {
            // bad: there's a partial UQ somewhere else
            if (uqPlots.has(uqtype)) return false;
            // bad: this would create a non-unique quarter
            if (hasUQBlocker(p)) return false;
        }
        return true;
    };
    // evaluate existing districts
    operationResult.Plots?.forEach(p => {
        if (!isUQCompatible(p)) {
            this._bzReservedPlots.push(p);
        } else if (uqPlots.has(p)) {
            this._uniqueQuarterPlots.push(p);
        }
        this._urbanPlots.push(p);
    });
    // evaluate rural and undeveloped tiles
    operationResult.ExpandUrbanPlots?.forEach(p => {
        if (!isUQCompatible(p)) this._bzReservedPlots.push(p);
        const loc = GameplayMap.getLocationFromIndex(p);
        const city = MapCities.getCity(loc.x, loc.y);
        if (city && MapCities.getDistrict(loc.x, loc.y) != null) {
            this._developedPlots.push(p);
        } else {
            this._expandablePlots.push(p);
        }
    });
    this.selectedPlacementData = this.allPlacementData.buildings
        .find((buildingData) => buildingData.constructibleType == constructible.$hash);
    if (!this.selectedPlacementData) {
        // This can be an expected case. Example: Repairing a constructible.
        console.warn(
            `building-placement-manager: Failed to find type ${constructible.ConstructibleType} in allPlacementData`
        );
    }
    window.dispatchEvent(new BuildingPlacementConstructibleChangedEvent());
}
// extend BPM.reset method:
// also reset BPM._bzReservedPlots
const BPM_reset = proto.reset;
proto.reset = function(...args) {
    this._bzReservedPlots = [];
    return BPM_reset.apply(this, args);
}
proto.bzFindConstructible = function(city, type) {
    // a constructible can appear in three places:
    // - city.BuildQueue (queued)
    // - Game.CityOperations.canStart (in progress)
    // - city.Constructibles (finished)
    const hash = Game.getHash(type);
    // queued
    const qindex = city.BuildQueue.getQueuedPositionOfType(hash);
    if (qindex != -1) {
        const queue = city.BuildQueue.getQueue();
        return GameplayMap.getIndexFromLocation(queue[qindex].location);
    }
    // in progress
    const result = Game.CityOperations.canStart(
        city.id, CityOperationTypes.BUILD, { ConstructibleType: hash }, false);
    if (result.InProgress && result.Plots) return result.Plots[0];
    // finished
    if (city.Constructibles.hasConstructible(hash, false)) {
        for (const id of city.Constructibles.getIds()) {
            const con = Constructibles.getByComponentID(id);
            if (con?.type != hash) continue;
            return GameplayMap.getIndexFromLocation(con.location);
        }
    }
    // not found
    return void 0;
}
// replace BPM.findExistingUniqueBuilding method:
// find in-progress and queued buildings in addition to finished ones
proto.findExistingUniqueBuilding = function(uq) {
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
    if (!uq) return -1;
    const plot =
        this.bzFindConstructible(city, uq.BuildingType1) ??
        this.bzFindConstructible(city, uq.BuildingType2) ??
        -1;
    return plot;
}
