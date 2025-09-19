import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';
import { BuildingPlacementManager } from '/base-standard/ui/building-placement/building-placement-manager.js';
// make sure the vanilla layer loads first
import '/base-standard/ui/lenses/layer/building-placement-layer.js';

// get registered lens layer
const WYLL = LensManager.layers.get("fxs-building-placement-layer");

const adjacencyIcons = /* @__PURE__ */ new Map([
    [DirectionTypes.DIRECTION_EAST, "adjacencyarrow_east"],
    [DirectionTypes.DIRECTION_NORTHEAST, "adjacencyarrow_northeast"],
    [DirectionTypes.DIRECTION_NORTHWEST, "adjacencyarrow_northwest"],
    [DirectionTypes.DIRECTION_SOUTHEAST, "adjacencyarrow_southeast"],
    [DirectionTypes.DIRECTION_SOUTHWEST, "adjacencyarrow_southwest"],
    [DirectionTypes.DIRECTION_WEST, "adjacencyarrow_west"]
]);
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

// improved adjacency arrows
WYLL.buildingPlacementPlotChangedListener = onBuildingPlacementPlotChanged.bind(WYLL);
// switch to reusable method (shared with other city screens)
WYLL.YIELD_SPRITE_HEIGHT = 6;
WYLL.YIELD_SPRITE_ANGLE = Math.PI / 6;  // 30°
WYLL.realizeBuildSlots = function(district) {
    return realizeBuildSlots.apply(this, [district, this.yieldSpriteGrid]);
}

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
function onBuildingPlacementPlotChanged() {
    this.adjacenciesSpriteGrid.clear();
    this.adjacenciesSpriteGrid.setVisible(false);
    if (!BuildingPlacementManager.cityID) {
        console.error(
            "building-placement-layer: No assigned cityID in the BuildingPlacementManager when attempting to realizeBuildingPlacementSprites"
        );
        return;
    }
    if (!BuildingPlacementManager.currentConstructible) {
        console.error(
            "building-placement-layer: No assigned currentConstructible in the BuildingPlacementManager when attempting to realizeBuildingPlacementSprites"
        );
        return;
    }
    const city = Cities.get(BuildingPlacementManager.cityID);
    if (!city) {
        console.error(
            "building-placement-layer: No valid city with city ID: " + ComponentID.toLogString(BuildingPlacementManager.cityID)
        );
        return;
    }
    if (!city.Yields) {
        console.error(
            "building-placement-layer: No valid Yields object attached to city with city ID: " + ComponentID.toLogString(BuildingPlacementManager.cityID)
        );
        return;
    }
    if (!BuildingPlacementManager.hoveredPlotIndex || !BuildingPlacementManager.isValidPlacementPlot(BuildingPlacementManager.hoveredPlotIndex)) {
        return;
    }
    const yieldAdjacencies = city.Yields.calculateAllAdjacencyYieldsForConstructible(
        BuildingPlacementManager.currentConstructible.ConstructibleType,
        BuildingPlacementManager.hoveredPlotIndex
    );
    if (yieldAdjacencies.length <= 0) {
        return;
    }
    const multiArrow = {};
    yieldAdjacencies.forEach((adjacency) => {
        const yieldDef = GameInfo.Yields.lookup(adjacency.yieldType);
        if (!yieldDef) {
            console.error(
                "building-placement-layer: No valid yield definition for yield type: " + adjacency.yieldType.toString()
            );
            return;
        }
        const buildingLocation = GameplayMap.getLocationFromIndex(BuildingPlacementManager.hoveredPlotIndex);
        const adjacencyLocation = GameplayMap.getLocationFromIndex(adjacency.sourcePlotIndex);
        const adjacencyDirection = GameplayMap.getDirectionToPlot(buildingLocation, adjacencyLocation);
        // show arrow icons
        const arrowIcon = adjacencyIcons.get(adjacencyDirection);
        if (arrowIcon === void 0) {
            console.error(
                "building-placement-layer: No valid adjacency icon for direction: " + adjacencyDirection.toString()
            );
            return;
        }
        const arrowOffset = this.calculateAdjacencyDirectionOffsetLocation(adjacencyDirection);
        // handle multiple adjacencies from the same direction
        const arrowCount = multiArrow[adjacencyDirection] ?? 0;
        multiArrow[adjacencyDirection] = arrowCount + 1;
        const shift = 1.5 + 0.3 * arrowCount;
        // show yield icons
        const yieldIcon = UI.getIconBLP(yieldDef.YieldType + "_5", "YIELD");
        const yieldOffset = { x: shift * arrowOffset.x, y: shift * arrowOffset.y };
        // scale -1 to flip the arrows to indicate incoming adjacencies
        this.adjacenciesSpriteGrid.addSprite(buildingLocation, arrowIcon, arrowOffset, { scale: -1 });
        this.adjacenciesSpriteGrid.addSprite(buildingLocation, yieldIcon, yieldOffset, { scale: 1 });
        // TODO: outgoing adjacencies once implemented in GameCore
    });
    this.adjacenciesSpriteGrid.setVisible(true);
}

export { realizeBuildSlots };
