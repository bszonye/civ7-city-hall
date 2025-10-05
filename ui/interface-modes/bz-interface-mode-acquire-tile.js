import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';
import { C as CityZoomer } from '/base-standard/ui/city-zoomer/city-zoomer.chunk.js';
import PlotWorkersManager from '/base-standard/ui/plot-workers/plot-workers-manager.js';

const YIELD_COLOR = [
    0xff4db380,  // #80b34d   90° 40 50 green
    0xff293da3,  // #a33d29   10° 60 40 red
    0xff55cef6,  // #f6ce55   45° 90 65 yellow
    0xffe0a66c,  // #6ca6e0  210° 65 65 cyan
    0xffd65c5c,  // #5c5cd6  240° 60 60 violet
    0xff3d99f5,  // #f5993d   30° 90 60 orange
    0xffcfb7af,  // #afb7cf  225° 25 75 gray
];

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
    // const ADD_SPECIALIST_COLOR = { x: 0.05, y: 0, z: 0.4, w: 0.9 };
    const ADD_SPECIALIST_COLOR = { x: 0.02, y: 0, z: 0.16, w: 0.9 };
    const ADD_SPECIALIST_BORDER_COLOR = { x: 0.1, y: 0, z: 0.1, w: 1 };
    this.plotOverlay = overlay.addPlotOverlay();
    this.plotOverlay.addPlots([...validPlots], { fillColor: CITY_TILE_GRAY_COLOR });
    this.plotOverlay.addPlots(this.validPlots, {
        fillColor: EXPAND_CITY_COLOR_LINEAR,
        edgeColor: EXPAND_CITY_BORDER_COLOR_LINEAR
    });
    const yields = new Set([...GameInfo.Yields].map(y => y.$index));
    const plotYields = new Map();
    for (const plot of PlotWorkersManager.workablePlotIndexes) {
        const changes = PlotWorkersManager.bzGetWorkerChanges(plot);
        plotYields.set(plot, [...changes.plotYields]);
    }
    while (yields.size) {
        // get best change across all plots and yields
        let bestIndex;
        let bestChange = 0;
        for (const changes of plotYields.values()) {
            for (const index of yields) {
                const change = changes[index];
                if (bestChange < change) {
                    bestIndex = index;
                    bestChange = change;
                }
            }
        }
        if (!bestChange) break;
        // get plots matching best change
        const bestPlots = [];
        for (const [plot, changes] of plotYields.entries()) {
            if (changes[bestIndex] == bestChange) {
                bestPlots.push(plot);
                plotYields.delete(plot);
            }
        }
        // highlight best plots
        const color = YIELD_COLOR[bestIndex];
        const fillColor = Color.convertToLinear(color);
        const edgeColor = {
            x: fillColor.x / 4,
            y: fillColor.y / 4,
            z: fillColor.z / 4,
            w: 1,
        };
        this.plotOverlay.addPlots(bestPlots, { fillColor, edgeColor });
        yields.delete(bestIndex);
    }
    this.plotOverlay.addPlots([...plotYields.keys()], {
        fillColor: ADD_SPECIALIST_COLOR,
        edgeColor: ADD_SPECIALIST_BORDER_COLOR,
    });
    WorldUI.setUnitVisibility(false);
}
