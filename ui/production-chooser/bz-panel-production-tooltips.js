import TooltipManager from '/core/ui/tooltips/tooltip-manager.js';
import { IsElement } from '/core/ui/utilities/utilities-dom.chunk.js';
import { c as GetTownFocusBlp } from '/base-standard/ui/production-chooser/production-chooser-helpers.chunk.js';
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
import '/core/ui/context-manager/display-handler.chunk.js';
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
        // FIX: always show production cost (with progress)
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
class ProductionProjectTooltipType {
    _target = null;
    get target() {
      return this._target?.deref() ?? null;
    }
    set target(value) {
      this._target = value ? new WeakRef(value) : null;
    }
    // #region Element References
    tooltip = document.createElement("fxs-tooltip");
    icon = document.createElement("fxs-icon");
    header = document.createElement("fxs-header");
    description = document.createElement("p");
    requirementsContainer = document.createElement("div");
    requirementsText = document.createElement("div");
    gemsContainer = document.createElement("div");
    productionCost = document.createElement("div");
    // #endregion
    constructor() {
        this.tooltip.className = "flex w-96 text-accent-2 font-body text-sm";
        // FIX: better fit
        this.header.setAttribute("filigree-style", "small");
        this.header.setAttribute("header-bg-glow", "true");
        this.header.classList.add("mt-1");
        this.requirementsContainer.className = "flex justify-center mt-0\\.5 -mx-1\\.5 p-2 production-chooser-tooltip__subtext-bg";
        this.requirementsContainer.append(this.requirementsText);
        this.productionCost.className = "mt-1";
        this.gemsContainer.className = "mt-1";
        this.tooltip.append(
            this.header,
            this.description,
            this.requirementsContainer,
            this.productionCost,
            this.gemsContainer
        );
    }
    getHTML() {
        return this.tooltip;
    }
    reset() {
        return;
    }
    isUpdateNeeded(target) {
        const newTarget = target.closest("town-focus-chooser-item, production-chooser-item");
        if (this.target === newTarget) {
            return false;
        }
        this.target = newTarget;
        if (!this.target) {
            return false;
        }
        return true;
    }
    getProjectType() {
        if (!this.target) {
            return null;
        }
        // for town-focus-chooser-item (already hashed)
        if (this.target.hasAttribute("data-project-type")) {
            return Number(this.target.dataset.projectType);
        }
        // for production-chooser-item (string name)
        if (this.target.hasAttribute("data-type")) {
            return Game.getHash(this.target.dataset.type);
        }
        return null;
    }
    getDescription() {
        if (!this.target) return null;
        if (IsElement(this.target, "town-focus-chooser-item")) {
            return this.target.dataset.tooltipDescription ?? null;
        }
        return this.target.dataset.description ?? null;
    }
    update() {
        if (!this.target) {
            console.error("ProductionProjectTooltipType.update: update triggered with no valid target");
            return;
        }
        const name = this.target.dataset.name ?? "";
        const description = (this.target.dataset.tooltipDescription || this.target.dataset.description) ?? "";
        const growthType = Number(this.target.dataset.growthType);
        const projectType = this.getProjectType();
        this.header.setAttribute("title", name);
        this.description.setAttribute("data-l10n-id", description);
        const iconBlp = GetTownFocusBlp(growthType, projectType);
        this.icon.style.backgroundImage = `url(${iconBlp})`;
        const requirementsText = this.getRequirementsText();
        if (requirementsText) {
            this.requirementsText.innerHTML = requirementsText;
            this.requirementsContainer.classList.remove("hidden");
        } else {
            this.requirementsContainer.classList.add("hidden");
        }
        const recommendations = this.target?.dataset.recommendations;
        if (recommendations) {
            const parsedRecommendations = JSON.parse(recommendations);
            const advisorList = parsedRecommendations.map((rec) => rec.class);
            const recommendationTooltipContent = AdvisorUtilities.createAdvisorRecommendationTooltip(advisorList);
            this.gemsContainer.appendChild(recommendationTooltipContent);
        }
        this.gemsContainer.classList.toggle("hidden", !recommendations);
        // FIX: show production cost (with progress)
        const cityID = UI.Player.getHeadSelectedCity();
        if (!cityID) return;
        const city = Cities.get(cityID);
        if (!city) return;
        const productionCost = city.Production?.getProjectProductionCost(projectType);
        this.productionCost.classList.toggle("hidden", !productionCost);
        this.productionCost.innerHTML = Locale.stylize(
            "LOC_UI_PRODUCTION_CONSTRUCTIBLE_COST",
            productionCost,
            "YIELD_PRODUCTION"
        );
    }
    getRequirementsText() {
        const projectType = Number(this.target?.dataset.projectType);
        const project = GameInfo.Projects.lookup(projectType);
        if (!project) {
            return void 0;
        }
        if (project.PrereqPopulation)
            return Locale.compose("LOC_UI_PRODUCTION_REQUIRES_POPULATION", project.PrereqPopulation);
        if (project.PrereqConstructible)
            return Locale.compose("LOC_UI_PRODUCTION_REQUIRES_BUILDING", Locale.compose(project.PrereqConstructible));
        return void 0;
    }
    isBlank() {
        return !this.target;
    }
}
TooltipManager.registerType("production-project-tooltip", new ProductionProjectTooltipType());
//# sourceMappingURL=panel-production-tooltips.js.map
