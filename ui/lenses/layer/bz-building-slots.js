import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';
import { BuildingPlacementManager } from '/base-standard/ui/building-placement/building-placement-manager.js';

function adjacencyYield(building) {
    if (!building) return [];
    const adjTypes = GameInfo.Constructible_Adjacencies.filter(at =>
        at.ConstructibleType == building.ConstructibleType && !at.RequiresActivation
    );
    const adjYields = adjTypes.map(at => GameInfo.Adjacency_YieldChanges.find(
        ay => ay.ID == at.YieldChangeId));
    const yieldSet = new Set(adjYields.map(ay => ay.YieldType));
    return [...yieldSet];
}
function gatherBuildingsTagged(tag) {
    return new Set(GameInfo.TypeTags.filter(e => e.Tag == tag).map(e => e.Type));
}
const BZ_LARGE = gatherBuildingsTagged("FULL_TILE");

function realizeBuildSlots(district, grid) {
    if (!district || !grid) return;
    const districtDefinition = GameInfo.Districts.lookup(district.type);
    if (!districtDefinition) {
        console.error(
            "building-placement-layer: Unable to retrieve a valid DistrictDefinition with DistrictType: " + district.type
        );
        return;
    }
    const constructibles = MapConstructibles.getConstructibles(
        district.location.x,
        district.location.y
    );
    const buildingSlots = [];
    let maxSlots = districtDefinition.MaxConstructibles;
    for (const constructibleID of constructibles) {
        const existingConstructible = Constructibles.getByComponentID(constructibleID);
        if (!existingConstructible) {
            console.error(
                "building-placement-layer: Unable to find a valid Constructible with ComponentID: " + ComponentID.toLogString(constructibleID)
            );
            continue;
        }
        const building = GameInfo.Constructibles.lookup(
            existingConstructible.type
        );
        if (!building) {
            console.error("building-placement-layer: Unable to find a valid ConstructibleDefinition with type: " + existingConstructible.type);
            continue;
        }
        // skip walls
        if (building.ExistingDistrictOnly) continue;
        // large buildings take up an extra slot
        if (BZ_LARGE.has(building.ConstructibleType)) maxSlots -= 1;
        // building icon
        const iconURL = UI.getIconBLP(building.ConstructibleType) || "";
        // building yield type flag
        const yields = adjacencyYield(building)
            .map(y => BuildingPlacementManager.getYieldPillIcon(y, 1, true));
        buildingSlots.push({ iconURL, yields, });
    }
    for (let i = 0; i < maxSlots; i++) {
        const groupWidth = (maxSlots - 1) * this.BUILD_SLOT_SPRITE_PADDING;
        const xPos = (i * this.BUILD_SLOT_SPRITE_PADDING) + (groupWidth / 2) - groupWidth;
        grid.addSprite(district.location, UI.getIconBLP('BUILDING_UNFILLED'), { x: xPos, y: -28, z: 0 });
        const slot = buildingSlots[i];
        if (slot) {
            const p = { x: xPos, y: -27.5, z: 0 };
            for (const [j, yieldIcon] of slot.yields.entries()) {
                const w = slot.yields.length - 1;
                const dx = this.YIELD_SPRITE_PADDING * 2/3 * (j - w/2);
                const dy = this.YIELD_SPRITE_HEIGHT * Math.cos(this.YIELD_SPRITE_ANGLE);
                const dz = this.YIELD_SPRITE_HEIGHT * Math.sin(this.YIELD_SPRITE_ANGLE);
                const pf = { x: p.x + dx, y: p.y + dy, z: p.z + dz };
                grid.addSprite(district.location, yieldIcon, pf, { scale: 3/4 });
            }
            grid.addSprite(district.location, slot.iconURL, p, { scale: 0.7 });
        }
    }
}

export { realizeBuildSlots };
