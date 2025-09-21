import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';
import { BuildingPlacementManager } from '/base-standard/ui/building-placement/building-placement-manager.js';
import { realizeBuildSlots } from '/bz-city-hall/ui/lenses/layer/bz-building-slots.js';
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
// improved adjacency arrows
WYLL.buildingPlacementPlotChangedListener = onBuildingPlacementPlotChanged.bind(WYLL);
// switch to reusable method (shared with other city screens)
WYLL.YIELD_SPRITE_HEIGHT = 6;
WYLL.YIELD_SPRITE_ANGLE = Math.PI / 6;  // 30°
WYLL.realizeBuildSlots = function(district) {
    return realizeBuildSlots.apply(this, [district, this.yieldSpriteGrid]);
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
