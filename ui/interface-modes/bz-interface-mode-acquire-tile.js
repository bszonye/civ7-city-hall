import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';
import { C as CityZoomer } from '/base-standard/ui/city-zoomer/city-zoomer.chunk.js';
import PlotWorkersManager from '/base-standard/ui/plot-workers/plot-workers-manager.js';

const VFX_RING = "VFX_3dUI_Tut_SelectThis_01";
const VFX_OFFSET = { x: 0, y: 0, z: 0 };
const VFX_PARAMS = { placement: PlacementMode.TERRAIN };

const YIELD_COLOR = [
    0x4db380,  // #80b34d   90° 40 50 green
    0x293da3,  // #a33d29   10° 60 40 red
    0x55cef6,  // #f6ce55   45° 90 65 yellow
    0xe0a66c,  // #6ca6e0  210° 65 65 cyan
    0xff817c,  // #5c5cd6  240° 60 60 violet => #7c81ff
    0x3d99f5,  // #f5993d   30° 90 60 orange
    0xcfb7af,  // #afb7cf  225° 25 75 gray
];
const YIELD_COLOR_LINEAR = YIELD_COLOR.map(c => ({
    ...Color.convertToLinear(c), w: 8/9,
}));
const YIELD_BORDER_COLOR_LINEAR = YIELD_COLOR_LINEAR.map(c => ({
    x: c.x / 4, y: c.y / 4, z: c.z / 4, w: 1,
}));

// get registered interface mode object
const ATIM = InterfaceMode.getInterfaceModeHandler("INTERFACEMODE_ACQUIRE_TILE");

// initialize VFX model
ATIM.growthModelGroup = WorldUI.createModelGroup("bzGrowthModelGroup");

// patch ATIM.undecorate() and ATIM.transitionFrom() to clear VFX
const ATIM_transitionFrom = ATIM.transitionFrom;
ATIM.transitionFrom = function transitionFrom(...args) {
    this.growthModelGroup.clear();
    return ATIM_transitionFrom.apply(this, args);
}
const ATIM_undecorate = ATIM.undecorate;
ATIM.undecorate = function(...args) {
    this.growthModelGroup.clear();
    return ATIM_undecorate.apply(this, args);
}

// patch ATIM.decorate() to extend its overlay
ATIM.decorate = function(overlay) {
    const selectedCity = Cities.get(this.cityID);
    if (!selectedCity) {
        console.error(
            "interface-mode-acquire-tile: Unable to retrieve city with CityID: " + ComponentID.toLogString(this.cityID)
        );
        return;
    }
    CityZoomer.zoomToCity(selectedCity);
    const validPlots = /* @__PURE__ */ new Set([...this.validPlots, ...selectedCity.getPurchasedPlots()]);
    WorldUI.pushRegionColorFilter([...validPlots], {}, this.OUTER_REGION_OVERLAY_FILTER);
    const CITY_TILE_GRAY_COLOR = { x: 0, y: 0, z: 0, w: 0.1 };
    const EXPAND_CITY_COLOR_LINEAR = { x: 0.8, y: 1, z: 0, w: 0.6 };
    const EXPAND_CITY_BORDER_COLOR_LINEAR = { x: 0.2, y: 0.3, z: 0, w: 1 };
    const ADD_SPECIALIST_COLOR = { x: 0.05, y: 0, z: 0.4, w: 0.9 };
    const ADD_SPECIALIST_BORDER_COLOR = { x: 0.1, y: 0, z: 0.1, w: 1 };
    this.plotOverlay = overlay.addPlotOverlay();
    this.plotOverlay.addPlots([...validPlots], { fillColor: CITY_TILE_GRAY_COLOR });
    this.plotOverlay.addPlots(this.validPlots, {
        fillColor: EXPAND_CITY_COLOR_LINEAR,
        edgeColor: EXPAND_CITY_BORDER_COLOR_LINEAR
    });
    // get all workable plots
    const workablePlots = PlotWorkersManager.workablePlotIndexes.map(plot => {
        const changes = PlotWorkersManager.bzGetWorkerChanges(plot).plotYields
            .map((value, color) => ({ color, value }))
            .filter(y => y.value);
        const yields = [...changes].sort((a, b) => b.value - a.value);
        const total = yields.reduce((a, y) => a + y.value, 0);
        return { plot, total, yields };
    });
    const basicPlots = new Set(workablePlots.map(info => info.plot));
    // highlight the most important plots
    const usedColors = new Map();
    const usedPlots = new Set();
    const highlight = (plot, color) => {
        this.plotOverlay.addPlots(plot, {
            fillColor: YIELD_COLOR_LINEAR[color],
            edgeColor: YIELD_BORDER_COLOR_LINEAR[color],
        });
        usedPlots.add(plot);
        basicPlots.delete(plot);
    }
    // highlight the best plots for each yield
    workablePlots.sort((a, b) => {
        const a1 = a.yields.at(0) ?? { color: GameInfo.Yields.length, value: 0 };
        const b1 = b.yields.at(0) ?? { color: GameInfo.Yields.length, value: 0 };
        return b1.value - a1.value || a1.color - b1.color;
    });
    for (const info of workablePlots) {
        if (!info.yields.length) break;
        const plot = info.plot;
        const value = info.yields[0].value;  // best yield delta on this plot
        for (const { color } of info.yields.filter(y => y.value == value)) {
            // consider all yields tied for best
            const used = usedColors.get(color);
            if (used != null && used != value) continue;  // already used
            usedColors.set(color, value);  // record best value for yield
            // if multiple yields are valid, only use the first
            if (!usedPlots.has(plot)) highlight(plot, color);
        }
    }
    // highlight the best plots overall
    const bestTotal = Math.max(0, ...workablePlots.map(({ total }) => total));
    this.growthModelGroup.clear();
    for (const info of workablePlots) {
        if (!bestTotal || !info.yields.length) break;
        if (info.total != bestTotal) continue;
        // add a ring highlight to all plots with the best total
        const plot = info.plot;
        this.growthModelGroup.addVFXAtPlot(VFX_RING, plot, VFX_OFFSET, VFX_PARAMS);
        if (usedPlots.has(plot)) continue;
        // also add a color highlight if the plot isn't already colored
        const color = info.yields[0].color;
        highlight(plot, color);
    }
    // use basic specialist color for remaining yields
    this.plotOverlay.addPlots([...basicPlots], {
        fillColor: ADD_SPECIALIST_COLOR,
        edgeColor: ADD_SPECIALIST_BORDER_COLOR,
    });
    WorldUI.setUnitVisibility(false);
}
