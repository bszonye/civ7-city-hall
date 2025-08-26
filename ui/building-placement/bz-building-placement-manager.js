import { BuildingPlacementManager } from '/base-standard/ui/building-placement/building-placement-manager.js';
import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';

const proto = Object.getPrototypeOf(BuildingPlacementManager);
console.warn(`TRIX PROTO ${Object.getOwnPropertyNames(proto)}`);

// building tag helpers
const tagTypes = (tag) => GameInfo.TypeTags.filter(e => e.Tag == tag).map(e => e.Type);
const BZ_AGELESS = new Set(tagTypes("AGELESS"));
const BZ_SLOTLESS = new Set(tagTypes("IGNORE_DISTRICT_PLACEMENT_CAP"));
console.warn(`TRIX AGELESS ${[...BZ_AGELESS]}`);
console.warn(`TRIX SLOTLESS ${[...BZ_SLOTLESS]}`);

// add reservedPlots property: plots that would block a unique quarter
BuildingPlacementManager._reservedPlots = [];
const proto_expandablePlots = Object.getOwnPropertyDescriptor(proto, "expandablePlots");
const reservedPlots = {
    configurable: proto_expandablePlots.configurable,
    enumerable: proto_expandablePlots.enumerable,
    get() {
        return this._reservedPlots;
    }
};
Object.defineProperty(proto, "reservedPlots", reservedPlots);

// patch findExistingUniqueBuilding method:
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
    console.warn(`TRIX UQ ${ublist} ${[...ubset]}`);
    if (!ubset.size) return -1;  // no unique quarter
    // check for a unique building in progress
    for (const ConstructibleType of ubset) {
        const result = Game.CityCommands.canStart(
            city.id, CityCommandTypes.PURCHASE, { ConstructibleType }, false);
        if (result.InProgress && result.Plots) return result.Plots[0];
    }
    // check the production queue
    const queued = city.BuildQueue?.getQueue().find(q => ubset.has(q.constructibleType));
    console.warn(`TRIX QUEUE ${JSON.stringify(queued)}`);
    if (queued) return GameplayMap.getIndexFromLocation(queued.location);
    // check the finished buildings
    for (const id of city.Constructibles.getIds()) {
        const cons = Constructibles.getByComponentID(id);
        if (cons && ubset.has(cons.type)) {
            console.warn(`TRIX CONS ${JSON.stringify(id)} = ${JSON.stringify(cons)}`);
            return GameplayMap.getIndexFromLocation(cons.location);
        }
    }
    // not found
    return -1;
}

// patch getBestYieldForConstructible method:
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
