import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
import { O as OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.chunk.js';
import { U as UpdateGate } from '/core/ui/utilities/utilities-update-gate.chunk.js';
import { BuildingPlacementManager } from '/base-standard/ui/building-placement/building-placement-manager.js';
import PlotWorkersManager from '/base-standard/ui/plot-workers/plot-workers-manager.js';
// make sure the city lenses load first
import '/base-standard/ui/lenses/lens/acquire-tile-lens.js';
import '/base-standard/ui/lenses/lens/building-placement-lens.js';
const BZ_LENSES = [
    'fxs-acquire-tile-lens',
    'fxs-building-placement-lens',
];

const BZ_URBAN_STYLE = {
    style: "CultureBorder_Closed",
    primaryColor: 0xffffffff,
    secondaryColor: 0
};
class bzUrbanLayer {
    cityOverlayGroup = WorldUI.createOverlayGroup("bzUrbanOverlayGroup", OVERLAY_PRIORITY.PLOT_HIGHLIGHT + 0.5);
    urbanOverlay = this.cityOverlayGroup.addBorderOverlay(BZ_URBAN_STYLE);
    centerOverlay = this.cityOverlayGroup.addBorderOverlay(BZ_URBAN_STYLE);
    updateGate = new UpdateGate(this.updateBorders.bind(this));
    onPlotChange = () => this.updateGate.call('onPlotChange');
    updateBorders() {
        this.urbanOverlay.clear();
        this.centerOverlay.clear();
        // update city overlays
        const cityID = UI.Player.getHeadSelectedCity() ??
            BuildingPlacementManager.cityID ??
            PlotWorkersManager.cityID;
        const city = Cities.get(cityID);
        if (!city) return;
        const centerPlot = GameplayMap.getIndexFromLocation(city.location);
        const urbanPlots = city.getPurchasedPlots().filter((plot) => {
            const loc = GameplayMap.getLocationFromIndex(plot);
            const district = Districts.getAtLocation(loc);
            return district?.isUrbanCore;
        });
        this.centerOverlay.setPlotGroups(centerPlot, 0);
        this.urbanOverlay.setPlotGroups(urbanPlots, 0);
    }
    initLayer() {
        this.updateBorders();
        engine.on('ConstructibleAddedToMap', this.onPlotChange);
        engine.on('ConstructibleRemovedFromMap', this.onPlotChange);
        window.addEventListener('layer-hotkey', this.onLayerHotkeyListener);
        this.cityOverlayGroup.setVisible(false);
        // add layer to lenses
        for (const lens of BZ_LENSES) {
            LensManager.lenses.get(lens)?.activeLayers.add('bz-urban-layer');
        }
    }
    applyLayer() {
        this.updateBorders();
        this.cityOverlayGroup.setVisible(true);
    }
    removeLayer() {
        this.cityOverlayGroup.setVisible(false);
    }
}
LensManager.registerLensLayer('bz-urban-layer', new bzUrbanLayer());
