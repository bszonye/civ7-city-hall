import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
import PlotWorkersManager from '/base-standard/ui/plot-workers/plot-workers-manager.js';
import { realizeBuildSlots } from '/bz-city-hall/ui/lenses/layer/bz-building-slots.js';
// make sure the vanilla layer loads first
import '/base-standard/ui/lenses/layer/worker-yields-layer.js';

// get registered lens layer
const WYLL = LensManager.layers.get("fxs-worker-yields-layer");

// modify build slot rendering
const SPECIALIST_COLUMNS = 5;
const SPECIALIST_DX = 15;
const SPECIALIST_Y = 3;
const SPECIALIST_DY = 18;
const SPECIALIST_SHRINK_LIMIT = 4;
const SPECIALIST_SHRINK_SCALE = 0.7;
const ICON_Z_OFFSET = 5;
const YIELD_CHANGE_OFFSET = { x: 0, y: -10, z: 0 };
WYLL.buildSlotSpritePadding = 15 * 0.7;
WYLL.buildSlotSpritePosition = { x: 0, y: 0, z: ICON_Z_OFFSET };
WYLL.buildSlotSpriteScale = 0.625;
WYLL.buildSlotAngle = Math.PI / 6;  // 30°
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
WYLL.updateSpecialistPlot = function(info) {
    const yieldsToAdd = [];
    const maintenancesToAdd = [];
    info.NextYields.forEach((yieldNum, i) => {
        const yieldDefinition = GameInfo.Yields[i];
        const netYieldChange = Math.round((yieldNum - info.CurrentYields[i]) * 10) / 10;
        if (netYieldChange != 0 && yieldDefinition) {
            yieldsToAdd.push({ yieldDelta: netYieldChange, yieldType: yieldDefinition.YieldType });
        }
    });
    info.NextMaintenance.forEach((yieldNum, i) => {
        const yieldDefinition = GameInfo.Yields[i];
        const netYieldChange = Math.round((-yieldNum + info.CurrentMaintenance[i]) * 10) / 10;
        if (netYieldChange != 0 && yieldDefinition) {
            maintenancesToAdd.push({ yieldDelta: netYieldChange, yieldType: yieldDefinition.YieldType });
        }
    });
    const currentWorkers = info.NumWorkers;
    const workerCap = PlotWorkersManager.cityWorkerCap;
    const location = GameplayMap.getLocationFromIndex(info.PlotIndex);
    if (currentWorkers > 0) {
        for (let i = 0; i < workerCap; i++) {
            const offsetAndScale = this.getSpecialistPipOffsetsAndScale(i, workerCap);
            if (i < currentWorkers) {
                const texture = "specialist_tile_pip_full";
                this.yieldVisualizer.addSprite(
                    location,
                    texture,
                    {
                        x: offsetAndScale.xOffset,
                        y: offsetAndScale.yOffset,
                        z: ICON_Z_OFFSET
                    },
                    { scale: offsetAndScale.scale }
                );
            } else {
                const texture = "specialist_tile_pip_empty";
                this.yieldVisualizer.addSprite(
                    location,
                    texture,
                    {
                        x: offsetAndScale.xOffset,
                        y: offsetAndScale.yOffset,
                        z: ICON_Z_OFFSET
                    },
                    { scale: offsetAndScale.scale }
                );
            }
        }
    } else {
        for (let i = 0; i < workerCap; i++) {
            const offsetAndScale = this.getSpecialistPipOffsetsAndScale(i, workerCap);
            this.yieldVisualizer.addSprite(
                location,
                "specialist_tile_pip_empty",
                {
                    x: offsetAndScale.xOffset,
                    y: offsetAndScale.yOffset,
                    z: ICON_Z_OFFSET
                },
                { scale: offsetAndScale.scale }
            );
        }
    }
    if (!info.IsBlocked) {
        yieldsToAdd.forEach((yieldPillData, i) => {
            const groupWidth = (yieldsToAdd.length - 1) * this.yieldSpritePadding;
            const offset = { x: i * this.yieldSpritePadding + groupWidth / 2 - groupWidth, y: 6 };
            this.yieldVisualizer.addYieldChange(yieldPillData, location, offset, 4294967295, YIELD_CHANGE_OFFSET);
        });
        maintenancesToAdd.forEach((yieldPillData, i) => {
            const groupWidth = (maintenancesToAdd.length - 1) * this.yieldSpritePadding;
            const offset = { x: i * this.yieldSpritePadding + groupWidth / 2 - groupWidth, y: -10 };
            this.yieldVisualizer.addYieldChange(yieldPillData, location, offset, 4294967295, YIELD_CHANGE_OFFSET);
        });
    }
    const topOffset = this.getSpecialistPipOffsetsAndScale(-1, workerCap);
    this.buildSlotSpritePosition.y = topOffset.yOffset;
    const districtID = MapCities.getDistrict(location.x, location.y);
    const district = Districts.get(districtID);
    this.realizeBuildSlots(district);
}
WYLL.getSpecialistPipOffsetsAndScale = function(index, pips) {
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
