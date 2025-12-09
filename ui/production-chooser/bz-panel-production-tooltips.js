import TooltipManager from '/core/ui/tooltips/tooltip-manager.js';
import { A as AdvisorUtilities } from '/base-standard/ui/tutorial/tutorial-support.chunk.js';
import '/core/ui/input/action-handler.js';
import '/core/ui/framework.chunk.js';
import '/core/ui/input/cursor.js';
import '/core/ui/input/focus-manager.js';
import '/core/ui/audio-base/audio-support.chunk.js';
import '/core/ui/views/view-manager.chunk.js';
import '/core/ui/panel-support.chunk.js';
import '/core/ui/input/input-support.chunk.js';
import '/core/ui/utilities/utilities-update-gate.chunk.js';
import '/core/ui/input/plot-cursor.js';
import '/core/ui/context-manager/context-manager.js';
import '/core/ui/context-manager/display-queue-manager.js';
import '/core/ui/dialog-box/manager-dialog-box.chunk.js';
import '/core/ui/utilities/utilities-layout.chunk.js';
import '/core/ui/interface-modes/interface-modes.js';
import '/core/ui/utilities/utilities-component-id.chunk.js';
import '/core/ui/utilities/utilities-image.chunk.js';
import '/base-standard/ui/building-placement/building-placement-manager.js';
import '/core/ui/utilities/utilities-core-textprovider.chunk.js';
import '/base-standard/ui/utilities/utilities-tags.chunk.js';
import '/core/ui/components/fxs-nav-help.chunk.js';
import '/core/ui/utilities/utilities-core-databinding.chunk.js';
import '/base-standard/ui/quest-tracker/quest-item.js';
import '/base-standard/ui/quest-tracker/quest-tracker.js';
import '/base-standard/ui/tutorial/tutorial-item.js';
import '/base-standard/ui/tutorial/tutorial-manager.js';
import '/core/ui/input/input-filter.chunk.js';
import '/base-standard/ui/tutorial/tutorial-events.chunk.js';
// make sure the vanilla tooltip loads first
import '/base-standard/ui/production-chooser/panel-production-tooltips.js';

class ProductionConstructibleTooltipType {
    definition;
    _target = null;
    get target() {
        return this._target?.deref() ?? null;
    }
    set target(value) {
        this._target = value ? new WeakRef(value) : null;
    }
    // #region Element References
    container = document.createElement("fxs-tooltip");
    header = document.createElement("fxs-header");
    gemsContainer = document.createElement("div");
    constructibleDetails = document.createElement("constructible-details");
    // #endregion
    data = {};
    constructor() {
        this.container.className = "flex flex-col w-96 font-body text-sm text-accent-2";
        this.header.setAttribute("filigree-style", "small");
        this.header.setAttribute("header-bg-glow", "true");
        this.header.classList.add("mb-1");
        this.constructibleDetails.classList.add("mb-1");
        this.container.append(this.header, this.constructibleDetails, this.gemsContainer);
    }
    getHTML() {
        return this.container;
    }
    reset() {
        return;
    }
    isUpdateNeeded(target) {
        const targetConstructibleItem = target.closest(
            '[data-tooltip-style="production-constructible-tooltip"]'
        );
        if (!targetConstructibleItem) {
            this.target = null;
            return false;
        }
        if (!targetConstructibleItem.dataset.type || targetConstructibleItem.dataset.type === this.definition?.ConstructibleType && targetConstructibleItem === this.target) {
            return false;
        }
        const definition = GameInfo.Constructibles.lookup(targetConstructibleItem.dataset.type);
        if (!definition) {
            return false;
        }
        this.constructibleDetails.setAttribute("constructible-type", definition.ConstructibleType);
        this.target = targetConstructibleItem;
        this.definition = definition;
        return true;
    }
    update() {
        const cityID = UI.Player.getHeadSelectedCity();
        if (!cityID) {
            return;
        }
        const city = Cities.get(cityID);
        if (!city) {
            return;
        }
        const definition = this.definition;
        if (!definition) {
            return;
        }
        if (!this.target) {
            console.error("production-constructible-tooltip: target element not found");
            return;
        }
        console.log("production-constructible-tooltip: updating tooltip");
        this.header.setAttribute("title", definition.Name);
        const recommendations = this.target.dataset.recommendations;
        if (recommendations) {
            const parsedRecommendations = JSON.parse(recommendations);
            const advisorList = parsedRecommendations.map((rec) => rec.class);
            while (this.gemsContainer.hasChildNodes()) {
                this.gemsContainer.removeChild(this.gemsContainer.lastChild);
            }
            const recommendationTooltipContent = AdvisorUtilities.createAdvisorRecommendationTooltip(advisorList);
            this.gemsContainer.appendChild(recommendationTooltipContent);
        }
        const canGetWarehouseBonuses = this.target.dataset.canGetWarehouse;
        const warehouseCount = this.target.dataset.warehouseCount;
        if (canGetWarehouseBonuses && warehouseCount) {
            this.constructibleDetails.setAttribute("warehouse-bonus", warehouseCount);
        } else {
            this.constructibleDetails.removeAttribute("warehouse-bonus");
        }
        const canGetAdjacencyBonuses = this.target.dataset.canGetAdjacency;
        const highestAdjacency = this.target.dataset.highestAdjacency;
        if (canGetAdjacencyBonuses && highestAdjacency) {
            this.constructibleDetails.setAttribute("adjacency-bonus", highestAdjacency);
        } else {
            this.constructibleDetails.removeAttribute("adjacency-bonus");
        }
        this.gemsContainer.classList.toggle("hidden", !recommendations);
    }
    isBlank() {
        return !this.definition;
    }
    didConstructibleDataChange() {
        if (!this.target) {
            console.error("production-constructible-tooltip: target element not found");
            return true;
        }
        return this.data.canGetWarehouseBonuses != this.target.dataset.canGetWarehouse || this.data.warehouseCount != this.target.dataset.warehouseCount || this.data.canGetAdjacencyBonuses != this.target.dataset.canGetAdjacency || this.data.highestAdjacency != this.target.dataset.highestAdjacency;
    }
}
TooltipManager.registerType("production-constructible-tooltip", new ProductionConstructibleTooltipType());
class ProductionUnitTooltipType {
    definition;
    _target = null;
    get target() {
        return this._target?.deref() ?? null;
    }
    set target(value) {
        this._target = value ? new WeakRef(value) : null;
    }
    // #region Element References
    container = document.createElement("fxs-tooltip");
    description = document.createElement("p");
    header = document.createElement("fxs-header");
    productionCost = document.createElement("div");
    maintenanceContainer = document.createElement("div");
    maintenanceCostText = document.createElement("div");
    gemsContainer = document.createElement("div");
    // #endregion
    constructor() {
        this.container.className = "flex flex-col w-96 font-body text-accent-2 text-sm";
        this.header.setAttribute("filigree-style", "small");
        this.header.setAttribute("header-bg-glow", "true");
        // FIX: improve layout
        this.productionCost.className = "mt-2";
        this.gemsContainer.className = "mt-1";
        this.maintenanceContainer.className = "flex items-center";
        const maintenanceLabel = document.createElement("div");
        maintenanceLabel.className = "text-accent-2";
        maintenanceLabel.setAttribute("data-l10n-id", "LOC_UI_PRODUCTION_MAINTENANCE");
        const goldIcon = document.createElement("fxs-icon");
        goldIcon.ariaLabel = Locale.compose("LOC_YIELD_GOLD");
        goldIcon.setAttribute("data-icon-id", "YIELD_GOLD");
        goldIcon.classList.add("size-5", "mr-1");
        this.maintenanceCostText.className = "text-negative-light";
        this.maintenanceContainer.append(maintenanceLabel, goldIcon, this.maintenanceCostText);
        this.container.append(
            this.header,
            this.description,
            this.productionCost,
            this.maintenanceContainer,
            this.gemsContainer
        );
    }
    getHTML() {
        return this.container;
    }
    reset() {
        return;
    }
    isUpdateNeeded(target) {
        const targetUnitItem = target.closest('[data-tooltip-style="production-unit-tooltip"]');
        if (!targetUnitItem) {
            this.target = null;
            return false;
        }
        if (!targetUnitItem.dataset.type || targetUnitItem.dataset.type === this.definition?.UnitType) {
            return false;
        }
        const definition = GameInfo.Units.lookup(targetUnitItem.dataset.type);
        if (!definition) {
            return false;
        }
        this.target = targetUnitItem;
        this.definition = definition;
        return true;
    }
    update() {
        const cityID = UI.Player.getHeadSelectedCity();
        if (!cityID) {
            return;
        }
        const city = Cities.get(cityID);
        if (!city) {
            return;
        }
        const definition = this.definition;
        if (!definition) {
          return;
        }
        this.header.setAttribute("title", definition.Name);
        // FIX: always show production cost
        const productionCost = city.Production?.getUnitProductionCost(definition.UnitType);
        this.productionCost.classList.toggle("hidden", productionCost === void 0);
        this.productionCost.innerHTML = Locale.stylize(
            "LOC_UI_PRODUCTION_CONSTRUCTIBLE_COST",
            productionCost,
            "YIELD_PRODUCTION"
        );
        if (this.definition?.Description) {
            this.description.setAttribute("data-l10n-id", this.definition.Description);
            this.description.classList.remove("hidden");
        } else {
            this.description.classList.add("hidden");
        }
        if (definition.Maintenance > 0) {
            this.maintenanceCostText.textContent = `-${definition.Maintenance}`;
            this.maintenanceContainer.classList.remove("hidden");
        } else {
            this.maintenanceContainer.classList.add("hidden");
        }
        const recommendations = this.target?.dataset.recommendations;
        if (recommendations) {
            const parsedRecommendations = JSON.parse(recommendations);
            const advisorList = parsedRecommendations.map((rec) => rec.class);
            while (this.gemsContainer.hasChildNodes()) {
                this.gemsContainer.removeChild(this.gemsContainer.lastChild);
            }
            const recommendationTooltipContent = AdvisorUtilities.createAdvisorRecommendationTooltip(advisorList);
            this.gemsContainer.appendChild(recommendationTooltipContent);
        }
        this.gemsContainer.classList.toggle("hidden", !recommendations);
    }
    isBlank() {
        return !this.definition;
    }
}
TooltipManager.registerType("production-unit-tooltip", new ProductionUnitTooltipType());
//# sourceMappingURL=panel-production-tooltips.js.map
