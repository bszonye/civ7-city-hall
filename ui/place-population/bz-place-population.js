import { D as Databind } from '../../../core/ui/utilities/utilities-core-databinding.chunk.js';
import { PlacePopulation } from '/base-standard/ui/place-population/model-place-population.js';

const YIELD_NEUTRAL = "blp:yield_container_neutral";
const YIELD_POSITIVE = "blp:yield_container_positive";
const YIELD_NEGATIVE = "blp:yield_container_negative";
for (const icon of [YIELD_NEUTRAL, YIELD_POSITIVE, YIELD_NEGATIVE]) {
    Controls.preloadImage(icon, "place-population");
}

// initializate PlacePopulation
PlacePopulation.bzGrowthTitle = "";
PlacePopulation.bzTotalYieldsText = "";

// patch PlacePopulation.update
const proto = Object.getPrototypeOf(PlacePopulation);
const PP_update = proto.update;
proto.update = function(...args) {
    PP_update.apply(this, args);
    this.bzGrowthTitle = this.isTown ? Locale.compose("LOC_UI_TOWN_GROWTH_TITLE") : Locale.compose("LOC_UI_CITY_GROWTH_TITLE");
    const info = this.hoveredPlotWorkerPlacementInfo;
    if (!info) return;
    const sum = (list) => list.reduce((acc, value) => acc + value, 0);
    const totalYields = sum(info.NextYields) - sum(info.CurrentYields);
    const totalMaintenance = sum(info.NextMaintenance) - sum(info.CurrentMaintenance);
    const totalChange = totalYields - totalMaintenance;
    const total = Locale.compose("LOC_UI_CITY_DETAILS_YIELD_ONE_DECIMAL", totalChange);
    PlacePopulation.bzTotalYieldsText = Locale.compose("LOC_PLOT_TOTAL_YIELDS", total);
}

class bzPlacePopulationPanel {
    static c_prototype;
    constructor(component) {
        this.component = component;
        component.bzComponent = this;
        this.patchPrototypes(this.component);
    }
    patchPrototypes(component) {
        const c_prototype = Object.getPrototypeOf(component);
        if (bzPlacePopulationPanel.c_prototype == c_prototype) return;
        // patch PanelCityDetails methods
        const proto = bzPlacePopulationPanel.c_prototype = c_prototype;
        // wrap buildSpecialistInfo method to extend it
        const c_buildSpecialistInfo = proto.buildSpecialistInfo;
        const after_buildSpecialistInfo = this.afterBuildSpecialistInfo;
        proto.buildSpecialistInfo = function(...args) {
            const rv = c_buildSpecialistInfo.apply(this, args);
            after_buildSpecialistInfo.apply(this.bzComponent, args);
            return rv;
        }
    }
    beforeAttach() { }
    afterAttach() {
        const c = this.component;
        const header = c.subsystemFrame.querySelector("fxs-header");
        Databind.attribute(header, "title", "g_PlacePopulation.bzGrowthTitle");
    }
    beforeDetach() { }
    afterDetach() { }
    afterBuildSpecialistInfo() {
        const c = this.component;
        const views = [c.specialistMinimizedContainer, c.specialistMaximizedContainer];
        for (const view of views) {
            // Results: add total changes
            const resultsHeading = view.querySelector(
                `[data-l10n-id="LOC_BUILDING_PLACEMENT_RESULTS"]`
            );
            const results = resultsHeading.parentElement;
            const totals = document.createElement("div");
            totals.className = "self-center text-sm -mt-1 mb-2";
            Databind.loc(totals, "{{g_PlacePopulation.bzTotalYieldsText}}");
            results.insertAdjacentElement("afterend", totals);
            // Breakdown: improve layout
            const breakdownHeadings = view.querySelectorAll(
                [
                    `[data-l10n-id="LOC_BUILDING_PLACEMENT_TILE_TYPE"]`,
                    `[data-l10n-id="LOC_BUILDING_PLACEMENT_SPECIALIST_BONUS"]`,
                    `[data-l10n-id="LOC_BUILDING_PLACEMENT_SPECIALIST_MAINTENANCE"]`,
                ].join(",")
            );
            for (const head of breakdownHeadings) {
                const section = head.parentElement;
                section.classList.remove("mx-2");
                section.classList.add("flex-wrap", "mt-1", "mx-1");
                for (const text of section.querySelectorAll(".text-sm")) {
                    // shrink and align text
                    text.parentElement.classList.add("items-center");
                    text.classList.remove("text-sm");
                    text.classList.add("text-xs");
                }
            }
        }
    }
}
Controls.decorate("panel-place-population", (c) => new bzPlacePopulationPanel(c));
