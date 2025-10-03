import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';

function getYields(building) {
    if (!building) return [];
    const type = Game.getHash(building.ConstructibleType);
    const base = GameInfo.Constructible_YieldChanges.filter(y => y.$hash == type);
    base.sort((a, b) => b.YieldChange - a.YieldChange);
    const atypes = GameInfo.Constructible_Adjacencies
        .filter(a => a.$hash == type && !a.RequiresActivation)
        .map(a => Game.getHash(a.YieldChangeId));
    const bonus = atypes.map(atype => GameInfo.Adjacency_YieldChanges.lookup(atype));
    const yieldSet = new Set([...base, ...bonus].map(y => y.YieldType));
    return [...yieldSet];
}
function gatherBuildingsTagged(tag) {
    return new Set(GameInfo.TypeTags.filter(e => e.Tag == tag).map(e => e.Type));
}
const BZ_LARGE = gatherBuildingsTagged("FULL_TILE");

function realizeBuildSlots(district, slotGrid, yieldGrid) {
    if (!district || !slotGrid) return;
    const districtDefinition = GameInfo.Districts.lookup(district.type);
    if (!districtDefinition) {
        console.error(
            "building-placement-layer: Unable to retrieve a valid DistrictDefinition with DistrictType: " + district.type
        );
        return;
    }
    const loc = district.location;
    const constructibles = MapConstructibles.getConstructibles(loc.x, loc.y);
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
        const info = GameInfo.Constructibles.lookup(existingConstructible.type);
        if (!info) {
            console.error(
                "building-placement-layer: Unable to find a valid ConstructibleDefinition with type: " + existingConstructible.type
            );
            continue;
        }
        // skip walls
        if (info.ExistingDistrictOnly) continue;
        // large buildings take up an extra slot
        if (BZ_LARGE.has(info.ConstructibleType)) maxSlots -= 1;
        // building icon
        const iconURL = UI.getIconBLP(info.ConstructibleType) || "";
        // building yield type flag
        const yields = getYields(info).map(y => UI.getIconBLP(y + "_5"));
        buildingSlots.push({ iconURL, yields, });
    }
    const origin = this.buildSlotSpritePosition ?? { x: 0, y: 24, z: 0 };
    const scale = this.buildSlotSpriteScale ?? 0.9;
    const padding = this.buildSlotSpritePadding;
    for (let i = 0; i < maxSlots; i++) {
        const groupWidth = (maxSlots - 1) * padding;
        const slot = buildingSlots[i];
        const icon = slot ? slot.iconURL : UI.getIconBLP("BUILDING_EMPTY");
        const position = { ...origin };
        position.x = origin.x + i * padding - groupWidth / 2;
        const params = { scale: slot ? scale : 8/9 * scale };
        slotGrid.addSprite(loc, icon, position, params);
        if (slot && yieldGrid) {
            // TODO: move to bottom of icon
            for (const [j, yieldIcon] of slot.yields.entries()) {
                const p = { ...position };
                const w = slot.yields.length - 1;
                const a = (j - w/2) * 2/7 * Math.PI;
                const dx = 7 * scale * Math.sin(a);
                const dy = -7 * scale * Math.cos(a);
                const params = { scale: scale / 2 };
                p.x += dx;
                p.y += dy * Math.cos(this.buildSlotAngle);
                p.z += dy * Math.sin(this.buildSlotAngle);
                yieldGrid.addSprite(loc, yieldIcon, p, params);
            }
        }
    }
}

export { realizeBuildSlots };
