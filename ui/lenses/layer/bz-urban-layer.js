import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
import { O as OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.chunk.js';
// make sure the city lenses load first
import '/base-standard/ui/lenses/lens/acquire-tile-lens.js';
import '/base-standard/ui/lenses/lens/building-placement-lens.js';
const BZ_LENSES = [
    'fxs-acquire-tile-lens',
    'fxs-building-placement-lens',
];

const BZ_GRID_SIZE = GameplayMap.getGridWidth() * GameplayMap.getGridHeight();
const BZ_GROUP_MAX = 65534;
const BZ_BORDER_STYLE = "CultureBorder_Closed";
const BZ_BORDER_CENTER = 0xffffffff;  // 0xffff00c0;
const BZ_BORDER_URBAN = 0xffacd2e5;  // 0xffff4000;
const BZ_URBAN_STYLE = {
    style: BZ_BORDER_STYLE,
    primaryColor: BZ_BORDER_URBAN,
    secondaryColor: 0
};
const BZ_CENTER_STYLE = {
    style: BZ_BORDER_STYLE,
    primaryColor: BZ_BORDER_CENTER,
    secondaryColor: 0
};
function borderGroup(id) {
    if (typeof id === 'number') return id < 0 ? id : BZ_GROUP_MAX - id;
    if (id.id == -1) return borderGroup(id.owner);
    const city = Cities.get(id);
    return city ? GameplayMap.getIndexFromLocation(city.location) : -1;
}
class bzUrbanLayer {
    constructor() {
        this.cityOverlayGroup = WorldUI.createOverlayGroup("bzCityBorderOverlayGroup", OVERLAY_PRIORITY.PLOT_HIGHLIGHT);
        this.urbanOverlay = this.cityOverlayGroup.addBorderOverlay(BZ_URBAN_STYLE);
        this.centerOverlay = this.cityOverlayGroup.addBorderOverlay(BZ_CENTER_STYLE);
        this.onLayerHotkeyListener = this.onLayerHotkey.bind(this);
        this.onPlotChange = (data) => {
            console.warn(`TRIX PLOT ${JSON.stringify(data)}`);
        }
        this.onPlotOwnershipChanged = (data) => {
            const plotIndex = GameplayMap.getIndexFromLocation(data.location);
            if (data.priorOwner != PlayerIds.NO_PLAYER) {
                this.urbanOverlay.clearPlotGroups(plotIndex);
                this.centerOverlay.clearPlotGroups(plotIndex);
            }
            if (data.owner != PlayerIds.NO_PLAYER && Players.isAlive(data.owner)) {
                const loc = data.location;
                const cid = GameplayMap.getOwningCityFromXY(loc.x, loc.y);
                const group = borderGroup(cid);
                this.urbanOverlay.setPlotGroups(plotIndex, group);
            }
        };
    }
    updateBorders() {
        this.urbanOverlay.clear();
        this.centerOverlay.clear();
        // update independent powers
        for (let plotIndex=0; plotIndex < BZ_GRID_SIZE; ++plotIndex) {
            const loc = GameplayMap.getLocationFromIndex(plotIndex);
            const ownerID = GameplayMap.getOwner(loc.x, loc.y);
            const owner = Players.get(ownerID);
            if (!owner || !owner.isAlive || !owner.isIndependent) continue;
            const group = borderGroup(ownerID);
            this.urbanOverlay.setPlotGroups(plotIndex, group);
        }
        // update city overlays
        for (const player of Players.getAlive()) {
            for (const city of player.Cities?.getCities() ?? []) {
                const urbanPlots = city.getPurchasedPlots().filter((plot) => {
                    const loc = GameplayMap.getLocationFromIndex(plot);
                    const district = Districts.getAtLocation(loc);
                    return district?.isUrbanCore;
                });
                const group = borderGroup(city.id);
                this.urbanOverlay.setPlotGroups(urbanPlots, group);
                const centerPlot = GameplayMap.getIndexFromLocation(city.location);
                this.centerOverlay.setPlotGroups(centerPlot, group);
            }
        }
    }
    initLayer() {
        this.updateBorders();
        engine.on('ConstructibleAddedToMap', this.onPlotChange);
        engine.on('ConstructibleRemovedFromMap', this.onPlotChange);
        engine.on('PlotOwnershipChanged', this.onPlotOwnershipChanged);
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
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == 'toggle-bz-urban-layer') {
            LensManager.toggleLayer('bz-urban-layer');
        }
    }
}
LensManager.registerLensLayer('bz-urban-layer', new bzUrbanLayer());
