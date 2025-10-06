import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';
import { C as CityZoomer } from '/base-standard/ui/city-zoomer/city-zoomer.chunk.js';
import PlotWorkersManager from '/base-standard/ui/plot-workers/plot-workers-manager.js';

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

const sortedYields = (yields) => {
    const iterator = yields
        .map((value, index) => ({ index, value }))
        .filter(y => y.value);
    return [...iterator].sort((a, b) => b.value - a.value);
}
// get registered interface mode object
const ATIM = InterfaceMode.getInterfaceModeHandler("INTERFACEMODE_ACQUIRE_TILE");

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
    const workablePlots = PlotWorkersManager.workablePlotIndexes.map(plot => {
        const changes = PlotWorkersManager.bzGetWorkerChanges(plot);
        return { plot, yields: sortedYields(changes.plotYields) };
    });
    workablePlots.sort((a, b) => {
        const a1 = a.yields.at(0) ?? { index: GameInfo.Yields.length, value: 0 };
        const b1 = b.yields.at(0) ?? { index: GameInfo.Yields.length, value: 0 };
        return b1.value - a1.value || b1.index - a1.index;
    });
    workablePlots.forEach(y => console.warn(`TRIX WORK ${JSON.stringify(y)}`));
    const basicPlots = new Set(workablePlots.map(info => info.plot));
    const usedPlots = new Set();
    const usedColors = new Set();
    const isRepeat = (i) => {
        if (!i) return false;
        const last = workablePlots[i - 1].yields[0];
        const next = workablePlots[i].yields[0];
        return next && last.index == next.index && last.value == next.value;
    }
    // highlight the best yields overall
    for (const [i, info] of workablePlots.entries()) {
        if (!info.yields.length) break;
        // get plots matching best change
        const plot = info.plot;
        const color = info.yields[0].index;
        if (usedColors.has(color) && !isRepeat(i)) continue;
        console.warn(`TRIX BEST ${plot} ${JSON.stringify(info.yields[0])}`);
        this.plotOverlay.addPlots(plot, {
            fillColor: YIELD_COLOR_LINEAR[color],
            edgeColor: YIELD_BORDER_COLOR_LINEAR[color],
        });
        usedColors.add(color);
        usedPlots.add(plot);
        basicPlots.delete(plot);
    }
    // highlight additional yields up to a limit
    const maxHighlights = GameInfo.Yields.length;
    // const maxHighlights = workablePlots.length * 2/5;
    for (const [i, info] of workablePlots.entries()) {
        if (!info.yields.length) break;
        if (usedPlots.has(info.plot)) continue;
        if (maxHighlights <= usedPlots.size && !isRepeat(i)) break;
        // get plots matching best change
        const plot = info.plot;
        const color = info.yields[0].index;
        console.warn(`TRIX EXTRA ${plot} ${JSON.stringify(info.yields[0])}`);
        this.plotOverlay.addPlots(plot, {
            fillColor: YIELD_COLOR_LINEAR[color],
            edgeColor: YIELD_BORDER_COLOR_LINEAR[color],
        });
        usedColors.add(color);
        usedPlots.add(plot);
        basicPlots.delete(plot);
    }
    // use basic specialist color for remaining yields
    this.plotOverlay.addPlots([...basicPlots], {
        fillColor: ADD_SPECIALIST_COLOR,
        edgeColor: ADD_SPECIALIST_BORDER_COLOR,
    });
    WorldUI.setUnitVisibility(false);
}
