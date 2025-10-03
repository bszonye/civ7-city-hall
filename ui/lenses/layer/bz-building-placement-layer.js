import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
// import { Y as YieldChangeVisualizer } from '/base-standard/ui/lenses/layer/yield-change-visualizer.chunk.js';
import { realizeBuildSlots } from '/bz-city-hall/ui/lenses/layer/bz-building-slots.js';
// make sure the vanilla layer loads first
import '/base-standard/ui/lenses/layer/building-placement-layer.js';

// get registered lens layer
const BPL = LensManager.layers.get("fxs-building-placement-layer");

// modify build slot rendering
BPL.buildSlotAngle = Math.PI / 6;  // 30°
BPL.realizeBuildSlots = function(district) {
    const args = [
        district,
        this.yieldVisualizer.backgroundSpriteGrid,
        this.yieldVisualizer.foregroundSpriteGrid,
    ];
    return realizeBuildSlots.apply(this, args);
}
