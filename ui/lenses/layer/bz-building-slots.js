import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';
import { C as ConstructibleHasTagType } from '/base-standard/ui/utilities/utilities-tags.chunk.js';

const WORKER_TEXT_PARAMS = {
    fonts: ["TitleFont"],
    fill: 0xff000000,
    stroke: 0,
    fontSize: 4,
    faceCamera: true,
};
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
function realizeBuildSlots(district, slotGrid, yieldGrid, showBase=true) {
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
        if (ConstructibleHasTagType(info.ConstructibleType, "FULL_TILE")) maxSlots -= 1;
        // building icon
        const iconURL = UI.getIconBLP(info.ConstructibleType) || "";
        // building yield type flag
        const { baseYields, bonusYields } = getYields(info);
        const isBuilding = info.ConstructibleClass == "BUILDING";
        slots.push({ iconURL, baseYields, bonusYields, isBuilding });
    }
    const origin = this.bzGridSpritePosition ?? { x: 0, y: 24, z: 0 };
    const scale = this.bzGridSpriteScale ?? 0.9;
    const padding = this.buildSlotSpritePadding;
    // show specialists
    const city = Cities.get(district.cityId);
    const plotIndex = GameplayMap.getIndexFromLocation(loc);
    const workers = city.Workers.GetAllPlacementInfo()
        .find(p => p.PlotIndex == plotIndex)?.NumWorkers;
    if (workers && showBase) {
        const y = 4/5 * padding;
        const offset = { x: 0, y };
        const params = { offset, scale: 4/5 * scale };
        slotGrid.addSprite(loc, "specialist_tile_pip_full", origin, params);
        const fontSize = WORKER_TEXT_PARAMS.fontSize * scale;
        slotGrid.addText(loc, workers.toString(), origin, {
            ...WORKER_TEXT_PARAMS,
            fontSize,
            offset: { x: 0, y: y - 3 * scale },
        });
    }
    // show building slots
    for (let i = 0; i < maxSlots; ++i) {
        const slot = slots[i];  // undefined => BUILDING_EMPTY
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
            const start = (1 - list.length) / 2;
            for (const [j, type] of list.entries()) {
                const icon = UI.getIconBLP(type + "_5");
                const r = 7 * scale;
                const a = (j + start) * 2/7 * Math.PI;
                const offset = {
                    x: r * Math.sin(a) * (mirror ? -1 : 1),
                    y: -r * Math.cos(a),
                }
                const params = { offset, scale: scale / 2 };
                yieldGrid.addSprite(loc, icon, position, params);
            }
        }
        const base = slot.baseYields;
        const bonus = slot.bonusYields;
        const merged = showBase ? new Set([...bonus, ...base]) : bonus;
        addBadges(merged);
    }
}

export { realizeBuildSlots };
