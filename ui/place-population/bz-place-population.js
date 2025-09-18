import { Icon } from '/core/ui/utilities/utilities-image.chunk.js';
import { D as Databind } from '../../../core/ui/utilities/utilities-core-databinding.chunk.js';
import { PlacePopulation } from '/base-standard/ui/place-population/model-place-population.js';
import PlotWorkersManager from '/base-standard/ui/plot-workers/plot-workers-manager.js';

const BASE_ICON = "blp:city_special_base";
const EXTRA_ICON = "blp:adjacencyarrow_east";
Controls.preloadImage(BASE_ICON, "place-population");
Controls.preloadImage(EXTRA_ICON, "place-population");

function getYieldHTML(icon, yieldChanges, sign=+1) {
    const details = [];
    for (const [i, dy] of yieldChanges.entries()) {
        if (dy <= 0) continue;
        const info = GameInfo.Yields.lookup(i);
        if (!info) continue;
        details.push({
            icon: Icon.getYieldIcon(info.YieldType),
            value: Locale.compose("LOC_UI_CITY_DETAILS_YIELD_ONE_DECIMAL", sign * dy),
        });
    }
    if (!details.length) return "";
    const prefix = `<div class="flex items-center"><img src="${icon}" class="size-5" /></div>`;
    return details.reduce((acc, { icon, value }) => {
        return acc + `<div class="flex items-center ml-1\\.5"><img src="${icon}" class="size-6" />${value}</div>`;
    }, prefix);
}
function getTotalHTML(changes) {
    const sum = (list) => list.reduce((acc, value) => acc + value);
    const totalYields = sum(changes.netYields);
    const totalMaintenance = sum(changes.netMaintenance);
    const totalText = Locale.compose(
        "LOC_UI_CITY_DETAILS_YIELD_ONE_DECIMAL",
        totalYields - totalMaintenance
    );
    return Locale.compose("LOC_PLOT_TOTAL_YIELDS", totalText);
}

PlacePopulation.bzBaseWorkerYields = "";
PlacePopulation.bzHoveredWorkerYields = "";
PlacePopulation.bzHoveredWorkerMaintenance = "";
PlacePopulation.bzHoveredWorkerTotals = "";

const proto = Object.getPrototypeOf(PlacePopulation);
const PP_update = proto.update;
proto.update = function(...args) {
    PP_update.apply(this, args);
    if (!this.hasHoveredWorkerPlot) return;
    const plotIndex = this.hoveredPlotWorkerIndex;
    const changes = PlotWorkersManager.bzGetWorkerChanges(plotIndex);
    this.bzBaseWorkerYields = getYieldHTML(BASE_ICON, changes.baseYields);
    this.bzHoveredWorkerYields = getYieldHTML(EXTRA_ICON, changes.extraYields);
    this.bzHoveredWorkerMaintenance = getYieldHTML(BASE_ICON, changes.netMaintenance, -1);
    this.bzHoveredWorkerTotals = getTotalHTML(changes);
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
        const baseChanges = document.createElement("div");
        baseChanges.className = "flex text-xs";
        Databind.html(baseChanges, "{{g_PlacePopulation.bzBaseWorkerYields}}");
        changesContainer.appendChild(baseChanges);
        // extra yield changes
        const yieldChanges = document.createElement("div");
        yieldChanges.className = "flex text-xs";
        Databind.html(yieldChanges, "{{g_PlacePopulation.bzHoveredWorkerYields}}");
        changesContainer.appendChild(yieldChanges);
        // maintenance changes
        const maintenanceHeader = document.createElement("div");
        maintenanceHeader.className = "text-secondary mt-2 mb-0\\.5";
        maintenanceHeader.setAttribute("data-l10n-id", "LOC_BUILDING_PLACEMENT_SPECIALIST_MAINTENANCE");
        changesContainer.appendChild(maintenanceHeader);
        const maintenanceChanges = document.createElement("div");
        maintenanceChanges.className = "flex text-xs";
        Databind.html(maintenanceChanges, "{{g_PlacePopulation.bzHoveredWorkerMaintenance}}");
        changesContainer.appendChild(maintenanceChanges);
        // totals
        const workerTotals = document.createElement("div");
        workerTotals.className = "text-secondary mt-2";
        Databind.html(workerTotals, "{{g_PlacePopulation.bzHoveredWorkerTotals}}");
        changesContainer.appendChild(workerTotals);
        textContainer.appendChild(changesContainer);
        return specialistInfoFrame;
    }
}
Controls.decorate("panel-place-population", (c) => new bzPlacePopulationPanel(c));
