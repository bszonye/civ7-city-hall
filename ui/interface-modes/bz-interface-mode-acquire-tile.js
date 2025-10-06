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
        .map((value, index) => ({ value, index }))
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
    const plotYields = new Map();
    const bestYields = [];
    for (const plot of PlotWorkersManager.workablePlotIndexes) {
        const changes = PlotWorkersManager.bzGetWorkerChanges(plot);
        plotYields.set(plot, [...changes.plotYields]);
        if (!bestYields.length) bestYields.push(...sortedYields(changes.bestPlotYields));
    }
    // highlight the best yields overall
    for (const best of bestYields) {
        if (!best.value) break;
        // get plots matching best change
        const bestPlots = [];
        for (const [plot, changes] of plotYields.entries()) {
            if (changes[best.index] == best.value) {
                bestPlots.push(plot);
                plotYields.delete(plot);
            }
        }
        this.plotOverlay.addPlots(bestPlots, {
            fillColor: YIELD_COLOR_LINEAR[best.index],
            edgeColor: YIELD_BORDER_COLOR_LINEAR[best.index],
        });
    }
    // highlight the best yield on each plot, if it's non-trivial
    if (bestYields.length) {
        const threshold = bestYields.at(-1).value;
        for (const [plot, yields] of plotYields.entries()) {
            const best = sortedYields(yields).at(0);
            if (!best || best.value < threshold) continue;
            plotYields.delete(plot);
            // highlight best yield
            this.plotOverlay.addPlots(plot, {
                fillColor: YIELD_COLOR_LINEAR[best.index],
                edgeColor: YIELD_BORDER_COLOR_LINEAR[best.index],
            });
        }
    }
    if (!plotYields.size) {  // TODO: remove debug block
        for (const [plot, yields] of plotYields.entries()) {
            const best = sortedYields(yields).at(0);
            const index = best?.index ?? 6;
            plotYields.delete(plot);
            this.plotOverlay.addPlots(plot, {
                fillColor: YIELD_COLOR_LINEAR[index],
                edgeColor: YIELD_BORDER_COLOR_LINEAR[index],
            });
        }
    }
    this.plotOverlay.addPlots([...plotYields.keys()], {
        fillColor: ADD_SPECIALIST_COLOR,
        edgeColor: ADD_SPECIALIST_BORDER_COLOR,
    });
    WorldUI.setUnitVisibility(false);
}
