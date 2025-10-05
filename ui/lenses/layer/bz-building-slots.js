import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';

const YIELD_ORDER = new Map([...GameInfo.Yields].map(y => [y.YieldType, y.$index]));
const yieldSort = (a, b) => YIELD_ORDER.get(a.YieldType) - YIELD_ORDER.get(b.YieldType);
const yieldChangeSort = (a, b) => (b.YieldChange - a.YieldChange) || yieldSort(a, b);

function getYields(building) {
    if (!building) return [];
    const type = Game.getHash(building.ConstructibleType);
    const base = GameInfo.Constructible_YieldChanges.filter(y => y.$hash == type);
    const atypes = GameInfo.Constructible_Adjacencies
        .filter(a => a.$hash == type && !a.RequiresActivation)
        .map(a => Game.getHash(a.YieldChangeId));
    const bonus = atypes.map(atype => GameInfo.Adjacency_YieldChanges.lookup(atype));
    const types = (list) => list.sort(yieldChangeSort).map(y => y.YieldType);
    const baseYields = new Set(types(base));
    const bonusYields = new Set(types(bonus));
    return { baseYields, bonusYields };
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
    const slots = [];
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
        const { baseYields, bonusYields } = getYields(info);
        const isBuilding = info.ConstructibleClass == "BUILDING";
        slots.push({ iconURL, baseYields, bonusYields, isBuilding });
    }
    const origin = this.buildSlotSpritePosition ?? { x: 0, y: 24, z: 0 };
    const scale = this.buildSlotSpriteScale ?? 0.9;
    const padding = this.buildSlotSpritePadding;
    for (const [i, slot] of slots.entries()) {
        // get coordinates
        const groupWidth = (maxSlots - 1) * padding;
        const position = { ...origin };
        position.x = origin.x + i * padding - groupWidth / 2;
        // show constructible icon (or empty slot)
        const icon = slot ? slot.iconURL : UI.getIconBLP("BUILDING_EMPTY");
        const params = { scale: slot ? scale : 8/9 * scale };
        slotGrid.addSprite(loc, icon, position, params);
        if (!slot) continue;
        // show constructible yields
        // const yields = getYields(info).map(y => UI.getIconBLP(y + "_5"));
        const addBadges = (yields, mirror) => {
            const list = [...yields];
            const params = { scale: scale / 2 };
            const start = (1 - list.length) / 2;
            for (const [j, type] of list.entries()) {
                const icon = UI.getIconBLP(type + "_5");
                const p = { ...position };
                const a = (j + start) * 2/7 * Math.PI;
                const r = 7;
                const dx = scale * r * Math.sin(a) * (mirror ? -1 : 1);
                const dy = -scale * r * Math.cos(a);
                p.x += dx;
                p.y += dy * Math.cos(this.buildSlotAngle);
                p.z += dy * Math.sin(this.buildSlotAngle);
                yieldGrid.addSprite(loc, icon, p, params);
            }
        }
        const base = slot.baseYields;
        const bonus = slot.bonusYields;
        if (base.size == 1 && bonus.size == 1) {
            // always show at least two yields
            addBadges([...bonus, ...base]);
        } else {
            // otherwise, merge the sets
            addBadges(new Set([...bonus, ...base]));
        }
    }
}

export { realizeBuildSlots };
