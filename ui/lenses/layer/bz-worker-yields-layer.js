import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
import PlotWorkersManager from '/base-standard/ui/plot-workers/plot-workers-manager.js';
// make sure the vanilla layer loads first
import '/base-standard/ui/lenses/layer/worker-yields-layer.js';

// get registered lens layer
const WYLL = LensManager.layers.get("fxs-worker-yields-layer");

// patch WYLL.updatePlot() to fix fractional yields under 5
WYLL.updatePlot = function(location) {
    const yieldsToAdd = [];
    for (const workablePlotIndex of PlotWorkersManager.allWorkerPlotIndexes) {
        if (workablePlotIndex == location) {
            return;
        }
    }
    this.yieldSpriteGrid.clearPlot(location);
    const yields = PlotWorkersManager.cityID ? GameplayMap.getYieldsWithCity(location, PlotWorkersManager.cityID) : GameplayMap.getYields(location, GameContext.localPlayerID);
    for (const [yieldType, amount] of yields) {
        const yieldDef = GameInfo.Yields.lookup(yieldType);
        if (yieldDef) {
            const icons = this.yieldIcons.get(yieldType);
            if (icons) {
                if (amount >= 5 || Math.ceil(amount) != amount) {
                    yieldsToAdd.push({ icon: icons[4], amount });
                } else {
                    yieldsToAdd.push({ icon: icons[amount - 1] });
                }
            }
        }
    }
    const groupWidth = (yieldsToAdd.length - 1) * this.yieldSpritePadding;
    const groupOffset = groupWidth * 0.5 - groupWidth;
    const iconOffset = {
        x: 0,
        y: 0,
        z: this.iconZOffset
    };
    yieldsToAdd.forEach((yieldData, i) => {
        const xPos = i * this.yieldSpritePadding + groupOffset;
        iconOffset.x = xPos;
        if (yieldData.icon) {
            this.yieldSpriteGrid.addSprite(location, yieldData.icon, iconOffset);
        }
        if (yieldData.amount) {
            this.yieldSpriteGrid.addText(location, yieldData.amount.toString(), iconOffset, this.fontData);
        }
    });
}
// patch WYLL.updateWorkablePlot()
// TODO: yield to Concise Specialist Lens
WYLL.updateWorkablePlot = updateWorkablePlot;
function updateWorkablePlot(info) {
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
        // const totalIcon = "hud_diplo_hex";  // TODO
        // const totalIcon = "hud_mini_box";  // TODO
        const yieldsToAdd = [];
        const maintenancesToAdd = [];
        changes.extraYields.forEach((yieldNum, i) => {
            const netYieldChange = Math.round(yieldNum * 10) / 10;
            if (netYieldChange) {
                const iconURL = PlotWorkersManager.getYieldPillIcon(
                    GameInfo.Yields[i].YieldType,
                    netYieldChange
                );
                yieldsToAdd.push({ iconURL, yieldDelta: netYieldChange });
            }
        });
        changes.extraMaintenance.forEach((yieldNum, i) => {
            const netYieldChange = Math.round(-yieldNum * 10) / 10;
            if (netYieldChange) {
                const iconURL = PlotWorkersManager.getYieldPillIcon(
                    GameInfo.Yields[i].YieldType,
                    netYieldChange
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
                { x: xPos, y: yPos - 3, z: this.iconZOffset },
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
            const yPos = yieldsToAdd.length > 0 ? -16 : 0;
            this.yieldSpriteGrid.addSprite(location, yieldPillData.iconURL, {
                x: xPos,
                y: yPos,
                z: this.iconZOffset
            });
            this.yieldSpriteGrid.addText(
                location,
                yieldPillData.yieldDelta.toString(),
                { x: xPos, y: yPos - 3, z: this.iconZOffset },
                {
                    fonts: ["TitleFont"],
                    fontSize: 4,
                    faceCamera: true
                }
            );
        });
    }
}
