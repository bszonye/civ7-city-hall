import { Icon } from '/core/ui/utilities/utilities-image.chunk.js';
import { D as Databind } from '../../../core/ui/utilities/utilities-core-databinding.chunk.js';
import { PlacePopulation } from '/base-standard/ui/place-population/model-place-population.js';
import PlotWorkersManager from '/base-standard/ui/plot-workers/plot-workers-manager.js';

const BASE_ICON = "blp:city_special_base";
const ARROW_ICON = "blp:adjacencyarrow_east";
const BONUS_ICON = "blp:city_special_empty";
Controls.preloadImage(BASE_ICON, "place-population");
Controls.preloadImage(ARROW_ICON, "place-population");
Controls.preloadImage(BONUS_ICON, "place-population");

function getYieldHTML(rowIcon, yieldChanges, sorted=false) {
    const details = [];
    for (const [i, net] of yieldChanges.entries()) {
        if (!net) continue;
        const info = GameInfo.Yields.lookup(i);
        if (!info) continue;
        const icon = Icon.getYieldIcon(info.YieldType);
        const value = Locale.compose("LOC_UI_CITY_DETAILS_YIELD_ONE_DECIMAL", net);
        details.push({ icon, value });
    }
    if (sorted) details.sort((a, b) => b.value - a.value);
    if (!details.length) return "";
    const prefix = rowIcon ?
        `<div class="flex items-center"><img src="${rowIcon}" class="size-5" /></div>` :
        "";
    return details.reduce((acc, { icon, value }) => {
        const margin = acc ? "ml-1\\.5" : "-ml-1";
        const color = value < 0 ? "text-negative-light" : "text-accent-2";
        return acc + `<div class="flex items-center ${margin} ${color}"><img src="${icon}" class="size-6" />${value}</div>`;
    }, prefix);
}
function getTotalHTML(totalYields) {
    const sum = (list) => list.reduce((acc, value) => acc + value);
    const totalText = Locale.compose(
        "LOC_UI_CITY_DETAILS_YIELD_ONE_DECIMAL",
        sum(totalYields)
    );
    return Locale.compose("LOC_PLOT_TOTAL_YIELDS", totalText);
}

PlacePopulation.bzBaseWorkerYields = "";
PlacePopulation.bzBaseWorkerMaintenance = "";
PlacePopulation.bzHoveredWorkerYields = "";
PlacePopulation.bzHoveredWorkerMaintenance = "";
PlacePopulation.bzHoveredWorkerTotalSummary = "";

const proto = Object.getPrototypeOf(PlacePopulation);
const PP_update = proto.update;
proto.update = function(...args) {
    PP_update.apply(this, args);
    if (!this.hasHoveredWorkerPlot) return;
    const plotIndex = this.hoveredPlotWorkerIndex;
    const changes = PlotWorkersManager.bzGetWorkerChanges(plotIndex);
    if (!changes) return;
    this.bzBaseWorkerYields = getYieldHTML(BASE_ICON, changes.baseYields);
    this.bzBaseWorkerMaintenance = getYieldHTML(BASE_ICON, changes.baseMaintenance);
    this.bzHoveredWorkerYields = getYieldHTML(ARROW_ICON, changes.plotYields);
    this.bzHoveredWorkerMaintenance = getYieldHTML(BONUS_ICON, changes.plotMaintenance);
    const totalYields = changes.netYields.map((a, i) => a + changes.netMaintenance[i]);
    this.bzHoveredWorkerTotalSummary = getTotalHTML(totalYields);
    this.bzHoveredWorkerTotalYields = getYieldHTML(null, totalYields, true);
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
            const c_rv = c_buildSpecialistInfo.apply(this, args);
            return after_buildSpecialistInfo.apply(this.bzComponent, [c_rv, ...args]);
        }
    }
    beforeAttach() { }
    afterAttach() { }
    beforeDetach() { }
    afterDetach() { }
    afterBuildSpecialistInfo(specialistInfoFrame) {
        // fix styling
        const infoContainer = specialistInfoFrame.lastChild;
        infoContainer.classList.remove("ml-5", "ml-8");
        infoContainer.classList.add("self-center");
        const iconElement = infoContainer.firstChild;
        iconElement.classList.add("img-add_specialists_icon");
        const textContainer = infoContainer.lastChild;
        textContainer.classList.remove("ml-2", "max-w-84");
        textContainer.classList.add("ml-4", "w-84");
        // add yield changes
        const changesContainer = document.createElement("div");
        const yieldHeader = document.createElement("div");
        yieldHeader.className = "text-secondary mt-2 mb-0\\.5";
        yieldHeader.setAttribute("data-l10n-id", "LOC_BUILDING_PLACEMENT_SPECIALIST_BONUS");
        changesContainer.appendChild(yieldHeader);
        // base yield changes
        const baseYields = document.createElement("div");
        baseYields.className = "flex text-xs";
        Databind.html(baseYields, "{{g_PlacePopulation.bzBaseWorkerYields}}");
        changesContainer.appendChild(baseYields);
        // plot yield changes
        const plotYields = document.createElement("div");
        plotYields.className = "flex text-xs";
        Databind.html(plotYields, "{{g_PlacePopulation.bzHoveredWorkerYields}}");
        changesContainer.appendChild(plotYields);
        // add maintenance changes
        const maintenanceHeader = document.createElement("div");
        maintenanceHeader.className = "text-secondary mt-2 mb-0\\.5";
        maintenanceHeader.setAttribute("data-l10n-id", "LOC_BUILDING_PLACEMENT_SPECIALIST_MAINTENANCE");
        changesContainer.appendChild(maintenanceHeader);
        // base maintenance
        const baseMaintenance = document.createElement("div");
        baseMaintenance.className = "flex text-xs";
        Databind.html(baseMaintenance, "{{g_PlacePopulation.bzBaseWorkerMaintenance}}");
        changesContainer.appendChild(baseMaintenance);
        // maintenance discounts
        const plotMaintenance = document.createElement("div");
        plotMaintenance.className = "flex text-xs";
        Databind.html(plotMaintenance, "{{g_PlacePopulation.bzHoveredWorkerMaintenance}}");
        changesContainer.appendChild(plotMaintenance);
        // total yield summary
        const workerTotals = document.createElement("div");
        workerTotals.className = "text-secondary mt-2";
        Databind.html(workerTotals, "{{g_PlacePopulation.bzHoveredWorkerTotalSummary}}");
        changesContainer.appendChild(workerTotals);
        // total yield details
        const totalYields = document.createElement("div");
        totalYields.className = "flex text-xs";
        Databind.html(totalYields, "{{g_PlacePopulation.bzHoveredWorkerTotalYields}}");
        changesContainer.appendChild(totalYields);
        // wrap up
        textContainer.appendChild(changesContainer);
        return specialistInfoFrame;
    }
}
Controls.decorate("panel-place-population", (c) => new bzPlacePopulationPanel(c));
