import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
import PlotWorkersManager from '/base-standard/ui/plot-workers/plot-workers-manager.js';
import '/base-standard/ui/lenses/layer/worker-yields-layer.js';

// get registered lens layer
const WYLL = LensManager.layers.get('fxs-worker-yields-layer');

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
