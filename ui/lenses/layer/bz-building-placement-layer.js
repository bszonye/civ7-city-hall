import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
import { realizeBuildSlots } from '/bz-city-hall/ui/lenses/layer/bz-building-slots.js';
// make sure the vanilla layer loads first
import '/base-standard/ui/lenses/layer/building-placement-layer.js';

// get registered lens layer
// TODO: determine whether any of this is still necessary
const _WYLL = LensManager.layers.get("fxs-worker-yields-layer");
const WYLL = {};

// switch to reusable method (shared with other city screens)
WYLL.YIELD_SPRITE_HEIGHT = 6;
WYLL.YIELD_SPRITE_ANGLE = Math.PI / 6;  // 30°
WYLL.realizeBuildSlots = function(district) {
    return realizeBuildSlots.apply(this, [district, this.yieldSpriteGrid]);
}
