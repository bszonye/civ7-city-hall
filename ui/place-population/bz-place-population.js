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
PlacePopulation.bzTotalYields = null;
PlacePopulation.bzTotalYieldsText = "";

// patch PlacePopulation.update
const proto = Object.getPrototypeOf(PlacePopulation);
const PP_update = proto.update;
proto.update = function(...args) {
    // apply base updates
    PP_update.apply(this, args);
    const m = PlacePopulation;
    // fix panel title
    this.bzGrowthTitle = this.isTown ?
        Locale.compose("LOC_UI_TOWN_GROWTH_TITLE") :
        Locale.compose("LOC_UI_CITY_GROWTH_TITLE");
    // calculate total yield changes
    const sum = (list) => list.reduce((acc, value) => acc + value, 0);
    if (this.hoveredPlotWorkerIndex) {
        const info = this.hoveredPlotWorkerPlacementInfo;
        const totalYields = sum(info.NextYields) - sum(info.CurrentYields);
        const totalMaintenance =
            sum(info.NextMaintenance) - sum(info.CurrentMaintenance);
        m.bzTotalYields = totalYields - totalMaintenance;
    } else if (this.constructibleToBeBuiltOnExpand && this.hoveredPlotIndex) {
        const deltas = JSON.parse(this.afterYieldDeltasJSONd);
        const values = deltas.map(d => d.value);
        m.bzTotalYields = sum(values);
    } else {
        m.bzTotalYields = null;
    }
    // format total yields
    if (m.bzTotalYields != null) {
        const total =
            Locale.compose("LOC_UI_CITY_DETAILS_YIELD_ONE_DECIMAL", m.bzTotalYields);
        m.bzTotalYieldsText = Locale.compose("LOC_PLOT_TOTAL_YIELDS", total);
    } else {
        m.bzTotalYieldsText = "";
    }
}

class bzPlacePopulationPanel {
    constructor(component) {
        this.component = component;
        component.bzComponent = this;
    }
    beforeAttach() { }
    afterAttach() {
        const c = this.component;
        // fix title: City Growth or Town Growth
        const header = c.subsystemFrame.querySelector("fxs-header");
        Databind.attribute(header, "title", "g_PlacePopulation.bzGrowthTitle");
        // add yield totals
        const views = [
            c.improvementMinimizedContainer,
            c.improvementMaximizedContainer,
            c.specialistMinimizedContainer,
            c.specialistMaximizedContainer,
        ];
        for (const view of views) {
            // Results: add total changes
            const resultsHeading = view.querySelector(
                `[data-l10n-id="LOC_BUILDING_PLACEMENT_RESULTS"]`
            );
            if (resultsHeading) {
                const results = resultsHeading.parentElement;
                results.classList.remove("my-2", "my-2\\.5");
                results.classList.add("mt-2");
                const totals = document.createElement("div");
                totals.className = "self-center text-sm mt-1 mb-2";
                Databind.loc(totals, "{{g_PlacePopulation.bzTotalYieldsText}}");
                results.insertAdjacentElement("afterend", totals);
            }
            // Breakdown: improve layout
            const breakdownHeadings = view.querySelectorAll(
                [
                    `[data-bind-attr-data-l10n-id="{{entry.description}}"]`,
                    `[data-l10n-id="LOC_BUILDING_PLACEMENT_TILE_TYPE"]`,
                    `[data-l10n-id="LOC_BUILDING_PLACEMENT_SPECIALIST_BONUS"]`,
                    `[data-l10n-id="LOC_BUILDING_PLACEMENT_SPECIALIST_MAINTENANCE"]`,
                ].join(",")
            );
            for (const head of breakdownHeadings) {
                // shrink and align text
                const section = head.parentElement;
                section.classList.remove("mx-2");
                section.classList.add(
                    "flex-wrap", "items-center", "mt-1", "mx-1",
                    "text-xs", "leading-normal",
                );
                // remove all text-sm classes
                for (const text of section.querySelectorAll(".text-sm")) {
                    text.classList.remove("text-sm");
                }
                // match improvement yield spacing to workers
                const imp = section.querySelector(`[data-bind-html="{{bonusHtml}}"]`);
                imp?.classList.add("ml-1");
            }
        }
    }
    beforeDetach() { }
    afterDetach() { }
}
Controls.decorate("panel-place-population", (c) => new bzPlacePopulationPanel(c));
