import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
import PlotWorkersManager from '/base-standard/ui/plot-workers/plot-workers-manager.js';
import { realizeBuildSlots } from '/bz-city-hall/ui/lenses/layer/bz-building-slots.js';
// make sure the vanilla layer loads first
import '/base-standard/ui/lenses/layer/worker-yields-layer.js';

// get registered lens layer
const WYLL = LensManager.layers.get("fxs-worker-yields-layer");

// modify build slot rendering
const SPECIALIST_PIP_WRAP_AT = 5;
const SPECIALIST_PIP_X_OFFSET = 15;
const SPECIALIST_PIP_Y_INITIAL_OFFSET = 12;
const SPECIALIST_PIP_Y_OFFSET = 18;
const SPECIALIST_PIP_SHRINK_COUNT = 4;
const SPECIALIST_PIP_SHRINK_SCALE = 0.7;
const ICON_Z_OFFSET = 5;
WYLL.buildSlotSpritePadding = 15 * 0.7;
WYLL.buildSlotSpritePosition = {
    x: 0,
    y: SPECIALIST_PIP_Y_INITIAL_OFFSET +
       SPECIALIST_PIP_Y_OFFSET * SPECIALIST_PIP_SHRINK_SCALE,
    z: ICON_Z_OFFSET,
};
WYLL.buildSlotSpriteScale = 0.625;
WYLL.buildSlotAngle = Math.PI / 6;  // 30°
WYLL.realizeBuildSlots = function(district) {
    const args = [
        district,
        this.yieldVisualizer.backgroundSpriteGrid,
        this.yieldVisualizer.foregroundSpriteGrid,
    ];
    return realizeBuildSlots.apply(this, args);
}
const WYLL_updateSpecialistPlot = WYLL.updateSpecialistPlot;
WYLL.updateSpecialistPlot = function(...args) {
    const rv = WYLL_updateSpecialistPlot.apply(this, args);
    const [info] = args;
    const loc = GameplayMap.getLocationFromIndex(info.PlotIndex);
    const districtID = MapCities.getDistrict(loc.x, loc.y);
    const district = Districts.get(districtID);
    realizeBuildSlots.apply(this, [
        district,
        this.yieldVisualizer.backgroundSpriteGrid,
        this.yieldVisualizer.foregroundSpriteGrid,
    ]);
    return rv;
}
WYLL.getSpecialistPipOffsetsAndScale = function(index, maxIndex) {
    const pips = maxIndex + 1;
    const scale = maxIndex >= SPECIALIST_PIP_SHRINK_COUNT ? SPECIALIST_PIP_SHRINK_SCALE : 1;
    const numOfRows = Math.ceil(pips / SPECIALIST_PIP_WRAP_AT);
    const numOfCols = Math.ceil(pips / numOfRows);
    const numInFirst = pips % numOfCols || numOfCols;
    const columnIndex = Math.floor((index - numInFirst) / numOfCols) + 1;
    const rowIndex = index < numInFirst ? index : (index - numInFirst) % numOfCols;
    const numInRow = columnIndex? numOfCols : numInFirst;
    const startingSlotIconsXOffset = -(numInRow - 1) * SPECIALIST_PIP_X_OFFSET / 2;
    const xOffset = (startingSlotIconsXOffset + rowIndex * SPECIALIST_PIP_X_OFFSET) * scale;
    const yOffset = (numOfRows - (columnIndex + 1)) * SPECIALIST_PIP_Y_OFFSET * scale + SPECIALIST_PIP_Y_INITIAL_OFFSET;
    return { xOffset, yOffset, scale };
}
// patch WYLL.updateWorkablePlot()
// TODO: rework this and attach it to WYLL.updateSpecialistPlot()
WYLL.updateWorkablePlot = function(info) {
    if (info.IsBlocked) {
        const location = GameplayMap.getLocationFromIndex(info.PlotIndex);
        this.yieldSpriteGrid.addSprite(location, "city_special_base", this.blockedSpecialistSpriteOffset, {
            scale: this.plotSpriteScale
        });
        this.yieldSpriteGrid.addText(location, info.NumWorkers.toString(), this.blockedSpecialistSpriteOffset, {
            fonts: ["TitleFont"],
            fontSize: this.specialistFontSize,
            faceCamera: true
        });
    } else {
        const changes = PlotWorkersManager.bzGetWorkerChanges(info.PlotIndex);
        const yieldsToAdd = [];
        const maintenancesToAdd = [];
        changes.plotYields.forEach((yieldNum, i) => {
            const netYieldChange = Math.round(yieldNum * 10) / 10;
            if (netYieldChange) {
                const iconURL = PlotWorkersManager.getYieldPillIcon(
                    GameInfo.Yields[i].YieldType,
                    netYieldChange
                );
                yieldsToAdd.push({ iconURL, yieldDelta: netYieldChange });
            }
        });
        changes.plotMaintenance.forEach((yieldNum, i) => {
            const netYieldChange = Math.round(yieldNum * 10) / 10;
            if (netYieldChange) {
                const iconURL = PlotWorkersManager.getYieldPillIcon(
                    GameInfo.Yields[i].YieldType,
                    -netYieldChange  // use the negative background
                );
                maintenancesToAdd.push({ iconURL, yieldDelta: netYieldChange });
            }
        });
        const location = GameplayMap.getLocationFromIndex(info.PlotIndex);
        if (info.NumWorkers) {
            this.yieldSpriteGrid.addSprite(
                location,
                "city_special_base",
                { x: -this.specialistIconXOffset, y: this.specialistIconHeight, z: this.iconZOffset },
                { scale: this.plotSpriteScale }
            );
            this.yieldSpriteGrid.addText(
                location,
                info.NumWorkers.toString(),
                { x: -this.specialistIconXOffset, y: this.specialistIconHeight, z: this.iconZOffset },
                {
                    fonts: ["TitleFont"],
                    fontSize: this.specialistFontSize,
                    faceCamera: true
                }
            );
        }
        this.yieldSpriteGrid.addSprite(
            location,
            "city_special_empty",
            {
                x: info.NumWorkers ? this.specialistIconXOffset : 0,
                y: this.specialistIconHeight,
                z: this.iconZOffset
            },
            { scale: this.plotSpriteScale }
        );
        yieldsToAdd.forEach((yieldPillData, i) => {
            const groupWidth = (yieldsToAdd.length - 1) * this.yieldSpritePadding;
            const xPos = i * this.yieldSpritePadding + groupWidth / 2 - groupWidth;
            const yPos = maintenancesToAdd.length > 0 ? 4 : 0;
            this.yieldSpriteGrid.addSprite(location, yieldPillData.iconURL, {
                x: xPos,
                y: yPos,
                z: this.iconZOffset
            });
            this.yieldSpriteGrid.addText(
                location,
                "+" + yieldPillData.yieldDelta.toString(),
                { x: xPos - 1, y: yPos - 3, z: this.iconZOffset },
                {
                    fonts: ["TitleFont"],
                    fontSize: 4,
                    faceCamera: true
                }
            );
        });
        maintenancesToAdd.forEach((yieldPillData, i) => {
            const groupWidth = (maintenancesToAdd.length - 1) * this.yieldSpritePadding;
            const xPos = i * this.yieldSpritePadding + groupWidth / 2 - groupWidth;
            const yPos = yieldsToAdd.length > 0 ? -12 : 0;
            this.yieldSpriteGrid.addSprite(location, yieldPillData.iconURL, {
                x: xPos,
                y: yPos,
                z: this.iconZOffset
            });
            this.yieldSpriteGrid.addText(
                location,
                "+" + yieldPillData.yieldDelta.toString(),
                { x: xPos - 1, y: yPos - 3, z: this.iconZOffset },
                {
                    fonts: ["TitleFont"],
                    fontSize: 4,
                    faceCamera: true
                }
            );
        });
    }
}
