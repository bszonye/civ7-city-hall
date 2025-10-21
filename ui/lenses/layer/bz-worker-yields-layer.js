import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
import PlotWorkersManager from '/base-standard/ui/plot-workers/plot-workers-manager.js';
import { realizeBuildSlots } from '/bz-city-hall/ui/lenses/layer/bz-building-slots.js';
// make sure the vanilla layer loads first
import '/base-standard/ui/lenses/layer/worker-yields-layer.js';

// get registered lens layer
const WYLL = LensManager.layers.get("fxs-worker-yields-layer");

// modified layout constants
const SPECIALIST_COLUMNS = 5;
const SPECIALIST_DX = 15;
const SPECIALIST_Y = 3;
const SPECIALIST_DY = 18;
const SPECIALIST_SHRINK_LIMIT = 4;
const SPECIALIST_SHRINK_SCALE = 0.7;
const ICON_Z_OFFSET = 5;
// add WYLL.realizeBuildSlots method
WYLL.buildSlotSpritePadding = 15 * 0.7;
WYLL.bzGridSpritePosition = { x: 0, y: 0, z: ICON_Z_OFFSET };
WYLL.bzGridSpriteScale = 0.625;
WYLL.realizeBuildSlots = function(district) {
    const args = [
        district,
        this.yieldVisualizer.backgroundSpriteGrid,
        this.yieldVisualizer.foregroundSpriteGrid,
        false,
    ];
    return realizeBuildSlots.apply(this, args);
}
WYLL.realizeGrowthPlots = function() {
    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const revealedState = GameplayMap.getRevealedState(GameContext.localPlayerID, x, y);
            if (revealedState != RevealedStates.HIDDEN) {
                const plotIndex = GameplayMap.getIndexFromXY(x, y);
                this.updatePlot(plotIndex);
            }
        }
    }
}
// patch WYLL.updateSpecialistPlot to add building slots
const WYLL_updateSpecialistPlot = WYLL.updateSpecialistPlot;
WYLL.updateSpecialistPlot = function(...args) {
    WYLL_updateSpecialistPlot.apply(this, args);
    // show building slots
    const [info] = args;
    const workerCap = PlotWorkersManager.cityWorkerCap;
    const topOffset = this.getSpecialistPipOffsetsAndScale(-1, workerCap - 1);
    this.bzGridSpritePosition.y = topOffset.yOffset;
    const loc = GameplayMap.getLocationFromIndex(info.PlotIndex);
    const districtID = MapCities.getDistrict(loc.x, loc.y);
    const district = Districts.get(districtID);
    this.realizeBuildSlots(district);
}
// patch WYLL.getSpecialistPipOffsetAndScale to improve pip layout
WYLL.getSpecialistPipOffsetsAndScale = function(index, maxIndex) {
    const pips = maxIndex + 1;
    const scale = SPECIALIST_SHRINK_LIMIT < pips ? SPECIALIST_SHRINK_SCALE : 0.9;
    const rows = Math.ceil(pips / SPECIALIST_COLUMNS);
    const yOrigin = SPECIALIST_Y + (rows - 1/2) * SPECIALIST_DY * scale;
    if (index < 0) {
        const xOffset = 0;
        const yOffset = Math.max(24, yOrigin + SPECIALIST_DY * scale);
        return { xOffset, yOffset, scale };
    }
    const cols = Math.ceil(pips / rows);
    const firstSize = pips % cols || cols;
    const colIndex = Math.floor((index - firstSize) / cols) + 1;
    const rowSize = colIndex ? cols : firstSize;
    const xOrigin = (1 - rowSize) * SPECIALIST_DX / 2;
    const rowIndex = index < firstSize ? index : (index - firstSize) % cols;
    const xOffset = (xOrigin + rowIndex * SPECIALIST_DX) * scale;
    const yOffset = yOrigin - colIndex * SPECIALIST_DY * scale;
    return { xOffset, yOffset, scale };
}
// patch WYLL.updatePlot to show previews for unclaimed plots
const WYLL_updatePlot = WYLL.updatePlot;
WYLL.updatePlot = function(...args) {
    WYLL_updatePlot.apply(this, args);
    // show yield previews for unclaimed plots
    const [plot] = args;
    const loc = GameplayMap.getLocationFromIndex(plot);
    if (GameplayMap.getOwner(loc.x, loc.y) != PlayerIds.NO_PLAYER) return;
    const yields = GameplayMap.getYields(plot, GameContext.localPlayerID);
    const position = { x: 0, y: 0, z: 5 };
    const groupWidth = (yields.length - 1) * this.yieldSpritePadding;
    const groupOffset = (1 - groupWidth) / 2;
    this.yieldVisualizer.clearPlot(plot);
    for (const [i, [yieldType, yieldAmount]] of yields.entries()) {
        position.x = groupOffset + i * this.yieldSpritePadding;
        const icons = this.yieldIcons.get(yieldType);
        if (!icons) continue;
        if (4.5 <= yieldAmount) {
            this.yieldVisualizer.addSprite(plot, icons[4], position);
            this.yieldVisualizer.addText(plot, yieldAmount.toString(), position);
        } else if (0 <= yieldAmount) {
            const value = Math.round(yieldAmount) || 1;
            this.yieldVisualizer.addSprite(plot, icons[value - 1], position);
        }
    }
}
