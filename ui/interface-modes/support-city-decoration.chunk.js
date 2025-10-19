import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';
import { O as OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.chunk.js';
import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
import { U as UpdateGate } from '/core/ui/utilities/utilities-update-gate.chunk.js';
import { realizeBuildSlots } from '/bz-city-hall/ui/lenses/layer/bz-building-slots.js';
// make sure the urban layer loads first
import '/bz-city-hall/ui/lenses/layer/bz-urban-layer.js';

var CityDecorationSupport;
((CityDecorationSupport2) => {
    let HighlightColors;
    (function (HighlightColors2) {
        HighlightColors2[HighlightColors2["centerSelection"] = 0x80ff80e0] = "centerSelection";
        HighlightColors2[HighlightColors2["urbanSelection"] = 0x80ffa080] = "urbanSelection";
        HighlightColors2[HighlightColors2["ruralSelection"] = 0x8080ff80] = "ruralSelection";
        HighlightColors2[HighlightColors2["coastalSelection"] = 0x80ffff80] = "coastalSelection";
        HighlightColors2[HighlightColors2["centerFill"] = 0x55ff00c0] = "centerFill";
        HighlightColors2[HighlightColors2["urbanFill"] = 0x55ff4000] = "urbanFill";
        HighlightColors2[HighlightColors2["ruralFill"] = 0x5500ff00] = "ruralFill";
        HighlightColors2[HighlightColors2["coastalFill"] = 0x55ffff00] = "coastalFill";
    })(HighlightColors = CityDecorationSupport2.HighlightColors || (CityDecorationSupport2.HighlightColors = {}));
    class Instance {
        cityOverlayGroup = null;
        cityOverlay = null;
        slotGrid = null;
        yieldGrid = null;
        beforeUnloadListener = () => {
            this.onUnload();
        };
        onPlotChange = () => this.updateGate.call('onPlotChange');
        updateGate = new UpdateGate(this.updatePlots.bind(this));
        bzGridSpritePosition = { x: 0, y: 0, z: 10 };
        bzGridSpriteScale = 1.2;
        buildSlotSpritePadding = 20;
        OUTER_REGION_OVERLAY_FILTER = { brightness: 4/9 }; // darken outside plots
        cityID = null;
        filtered = false;
        initializeOverlay() {
            // don't cover urban & landmark layers (== PLOT_HIGHLIGHT)
            const op = OVERLAY_PRIORITY.PLOT_HIGHLIGHT - 1;
            this.cityOverlayGroup = WorldUI.createOverlayGroup("CityOverlayGroup", op);
            this.cityOverlay = this.cityOverlayGroup.addPlotOverlay();
            this.slotGrid = WorldUI.createSpriteGrid("bzCitySlot_SpriteGroup", true);
            this.yieldGrid = WorldUI.createSpriteGrid("bzCityYield_SpriteGroup", true);
            this.slotGrid.setVisible(false);
            this.yieldGrid.setVisible(false);
            this.urbanLayer = LensManager.layers.get('bz-urban-layer');
            engine.on("BeforeUnload", this.beforeUnloadListener);
        }
        // borrow the realizeBuildSlots method
        realizeBuildSlots = realizeBuildSlots;
        decoratePlots(cityID) {
            this.cityID = cityID;  // remember cityID for update handler
            this.updatePlots(cityID);
            this.urbanLayer.applyLayer();  // apply urban core outline
            engine.on('ConstructibleAddedToMap', this.onPlotChange);
            engine.on('ConstructibleRemovedFromMap', this.onPlotChange);
        }
        updatePlots(cityID=this.cityID) {
            if (!cityID) return;  // not initialized yet
            this.cityOverlayGroup?.clearAll();
            this.slotGrid?.clear();
            this.slotGrid?.setVisible(true);
            this.yieldGrid?.clear();
            this.yieldGrid?.setVisible(true);
            const city = Cities.get(cityID);
            if (!city) {
                console.error(`City Decoration support: Failed to find city (${ComponentID.toLogString(cityID)})!`);
                return;
            }
            if (this.filtered) WorldUI.popFilter();  // city changes don't use clearDecorations
            WorldUI.pushRegionColorFilter(city.getPurchasedPlots(), {}, this.OUTER_REGION_OVERLAY_FILTER);
            this.filtered = true;
            const rural = [];
            const urban = [];
            const coastal = [];
            const districts = city.Districts.getIds().map(id => Districts.get(id));
            for (const district of districts) {
                const loc = district.location;
                if (!LensManager.isLayerEnabled("fxs-yields-layer")) {
                    // don't obscure Yields layer
                    this.realizeBuildSlots(district, this.slotGrid, this.yieldGrid);
                }
                if (district.type == DistrictTypes.CITY_CENTER) {
                    // skip
                } else if (district.type == DistrictTypes.URBAN) {
                    urban.push(loc);
                } else if (district.type == DistrictTypes.RURAL) {
                    const ttypeID = GameplayMap.getTerrainType(loc.x, loc.y);
                    const ttype = GameInfo.Terrains.lookup(ttypeID);
                    const isWater =
                        ttype.TerrainType == "TERRAIN_COAST" ||
                        ttype.TerrainType == "TERRAIN_NAVIGABLE_RIVER";
                    (isWater ? coastal : rural).push(loc);
                }
            }
            this.cityOverlay?.addPlots(coastal, { edgeColor: HighlightColors.coastalSelection, fillColor: HighlightColors.coastalFill });
            this.cityOverlay?.addPlots(rural, { edgeColor: HighlightColors.ruralSelection, fillColor: HighlightColors.ruralFill });
            this.cityOverlay?.addPlots(urban, { edgeColor: HighlightColors.urbanSelection, fillColor: HighlightColors.urbanFill });
            this.cityOverlay?.addPlots([city.location], { edgeColor: HighlightColors.centerSelection, fillColor: HighlightColors.centerFill });
        }
        onUnload() {
            this.clearDecorations();
        }
        clearDecorations() {
            this.cityID = null;
            this.urbanLayer.removeLayer();
            if (this.filtered) WorldUI.popFilter();
            this.filtered = false;
            this.cityOverlayGroup?.clearAll();
            this.slotGrid?.setVisible(false);
            this.slotGrid?.clear();
            this.yieldGrid?.setVisible(false);
            this.yieldGrid?.clear();
            engine.off('ConstructibleAddedToMap', this.onPlotChange);
            engine.off('ConstructibleRemovedFromMap', this.onPlotChange);
        }
    }
    CityDecorationSupport2.manager = new Instance();
})(CityDecorationSupport || (CityDecorationSupport = {}));

export { CityDecorationSupport as C };
//# sourceMappingURL=support-city-decoration.chunk.js.map
