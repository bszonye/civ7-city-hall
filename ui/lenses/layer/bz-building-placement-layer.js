import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
// import { Y as YieldChangeVisualizer } from '/base-standard/ui/lenses/layer/yield-change-visualizer.chunk.js';
import { realizeBuildSlots } from '/bz-city-hall/ui/lenses/layer/bz-building-slots.js';
// make sure the vanilla layer loads first
import '/base-standard/ui/lenses/layer/building-placement-layer.js';

// get registered lens layer
const BPL = LensManager.layers.get("fxs-building-placement-layer");

// remove vanilla sprite grids
// BPL.yieldVisualizer.release();
// BPL.adjacenciesSpriteGrid.destroy();
// create new grids for building slots and yields
BPL.slotGrid = WorldUI.createSpriteGrid(
    "bzBPLSlot_SpriteGroup",
    SpriteMode.Billboard
);
BPL.yieldGrid = WorldUI.createSpriteGrid(
    "bzBPLSlot_SpriteGroup",
    SpriteMode.Billboard
);
// recreate vanilla sprite grids for proper layering
// BPL.yieldVisualizer = new YieldChangeVisualizer("BuildingPlacement");
BPL.adjacenciesSpriteGrid = WorldUI.createSpriteGrid(
    "Adjacencies_SpriteGroup",
    SpriteMode.Default
);
// modify build slot rendering
BPL.buildSlotAngle = Math.PI / 6;  // 30°
BPL.realizeBuildSlots = function(district) {
    const args = [district, this.slotGrid, this.yieldGrid];
    return realizeBuildSlots.apply(this, args);
}
const BPL_initLayer = BPL.initLayer;
BPL.initLayer = function(...args) {
    BPL.slotGrid.setVisible(false);
    BPL.yieldGrid.setVisible(false);
    return BPL_initLayer.apply(this, args);
}
const BPL_applyLayer = BPL.applyLayer;
BPL.applyLayer = function(...args) {
    BPL.slotGrid.setVisible(true);
    BPL.yieldGrid.setVisible(true);
    return BPL_applyLayer.apply(this, args);
}
const BPL_removeLayer = BPL.removeLayer;
BPL.removeLayer = function(...args) {
    BPL.slotGrid.clear(false);
    BPL.slotGrid.setVisible(false);
    BPL.yieldGrid.clear(false);
    BPL.yieldGrid.setVisible(false);
    return BPL_removeLayer.apply(this, args);
}
