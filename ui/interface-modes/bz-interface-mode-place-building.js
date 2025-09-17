import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';
import { BuildingPlacementManager } from '/base-standard/ui/building-placement/building-placement-manager.js';
import { C as CityZoomer } from '/base-standard/ui/city-zoomer/city-zoomer.chunk.js';
import '/base-standard/ui/interface-modes/interface-mode-place-building.js';

var HighlightColors = /* @__PURE__ */ ((HighlightColors2) => {
    HighlightColors2[HighlightColors2["okay"] = 0xc800f2fe] = "okay";
    HighlightColors2[HighlightColors2["good"] = 0xc81de5b5] = "good";
    HighlightColors2[HighlightColors2["best"] = 0xc84db123] = "best";
    HighlightColors2[HighlightColors2["reserved"] = 0xc80055cc] = "reserved";
    return HighlightColors2;
})(HighlightColors || {});

// patch PBIM.decorate method
const PBIM = InterfaceMode.getInterfaceModeHandler("INTERFACEMODE_PLACE_BUILDING");
PBIM.decorate = function(overlay) {
    const context = this.Context;
    const selectedCity = Cities.get(context.CityID);
    if (!selectedCity) {
        console.error(
            "interface-mode-place-building: Unable to retrieve city with CityID: " + ComponentID.toLogString(context.CityID)
        );
        return;
    }
    CityZoomer.zoomToCity(selectedCity);
    // Darken all plots not in the city
    WorldUI.pushRegionColorFilter(selectedCity.getPurchasedPlots(), {}, this.OUTER_REGION_OVERLAY_FILTER);
    // display guide colors for building placement
    this.plotOverlay = overlay.addPlotOverlay();
    const reserved = new Set(BuildingPlacementManager.bzReservedPlots);
    const unreserved = (list) => new Set(list.filter(e => !reserved.has(e)));
    const urban = unreserved(BuildingPlacementManager.urbanPlots);
    const developed = unreserved(BuildingPlacementManager.developedPlots);
    const expandable = unreserved(BuildingPlacementManager.expandablePlots);
    // keep the center purple to aid orientation
    const center = selectedCity.location;
    const centerPlot = GameplayMap.getIndexFromLocation(center);
    if (reserved.has(centerPlot)) {
        // (but leave reserved tiles orange)
    } else if (urban.has(centerPlot)) {
        // center is a valid selection, keep it light purple
        this.plotOverlay.addPlots([center], { fillColor: 0x55ff00aa });
    } else {
        // center is blocked, use a darker purple
        this.plotOverlay.addPlots([center], { fillColor: 0xc8800055 });
    }
    urban.delete(centerPlot);
    // apply the other guide colors
    this.plotOverlay.addPlots([...reserved], { fillColor: HighlightColors.reserved });
    this.plotOverlay.addPlots([...urban], { fillColor: HighlightColors.best });
    this.plotOverlay.addPlots([...developed], { fillColor: HighlightColors.okay });
    this.plotOverlay.addPlots([...expandable], { fillColor: HighlightColors.good });
}
