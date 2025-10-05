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
    ];
    return realizeBuildSlots.apply(this, args);
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
    realizeBuildSlots.apply(this, [
        district,
        this.yieldVisualizer.backgroundSpriteGrid,
        this.yieldVisualizer.foregroundSpriteGrid,
    ]);
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
// patch WYLL.updateWorkablePlot()
// TODO: rework this and merge with WYLL.updateSpecialistPlot()
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
