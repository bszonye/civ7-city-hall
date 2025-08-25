// TODO: shift scrollbar to the right
// TOOD: item sorting
import bzCityHallOptions from '/bz-city-hall/ui/options/bz-city-hall-options.js';
import { D as Databind } from '../../../core/ui/utilities/utilities-core-databinding.chunk.js';
import FocusManager from '../../../core/ui/input/focus-manager.js';

// TODO: verify these goals
// decorate ProductionChooserScreen to:
// - update the list after selecting repairs (fixes "sticky" repairs)
// - always leave the list open when building repairs
// - remember Production/Purchase tab selection

const BZ_HEAD_STYLE = [
// compact mode
`
.bz-city-compact .panel-production__frame {
    min-width: 28.4444444444rem;
    max-width: 28.4444444444rem;
}
.bz-city-hall .panel-production-chooser .subsystem-frame__content {
    padding-right: 0.2222222222rem;
    margin-bottom: -0.3333333333rem;
}
.bz-city-hall .production-category {
    margin-right: 0.4444444444rem;
    margin-bottom: 0.7222222222rem;
}
.bz-city-hall .production-category:last-child {
    margin-bottom: 0;
}
.bz-city-hall .production-category > div > div.pl-3 {
    padding-left: 0;
}
.bz-city-hall .panel-production-chooser .fxs-scrollbar__track--vertical {
    margin-left: -0.2222222222rem;
}
.bz-city-hall .bz-pci-details img.size-8 {
    width: 1.3333333333rem;
    height: 1.3333333333rem;
}
.bz-city-hall .advisor-recommendation__container .advisor-recommendation__icon {
    width: 1.1111111111rem;
    height: 1.1111111111rem;
}
`,  // improve panel header layout
`
.bz-city-hall .panel-production-chooser .fxs-editable-header .fxs-edit-button {
    top: -0.5555555556rem;
    left: -2.6666666667rem;
}
.bz-city-hall .bz-city-name .fxs-nav-help {
    top: -0.1111111111rem;
    left: -2.4444444444rem;
}
.bz-city-hall .bz-city-name .font-fit-shrink {
    min-height: 1.5rem;
}
.bz-city-hall .bz-city-name .max-w-84 {
    max-width: 100%;
}
.bz-city-hall .bz-city-name-wrapper .fxs-nav-help {
    margin: 0;
}
.bz-city-hall .bz-city-name-wrapper .bz-cycle-city {
    position: relative;
}
.bz-city-hall .bz-city-name-wrapper.bz-nav-help .bz-cycle-city {
    top: 1.8333333333rem;
    left: 4rem;
}
.bz-city-hall .bz-city-name-wrapper.bz-no-help .bz-cycle-city {
    top: 1.3888888889rem;
    left: 4rem;
}
`,  // relocate City Details button
`
.bz-city-hall .production-chooser__city-details-button {
    position: fixed;
    top: 3rem;
    right: 1.2222222222rem;
    width: 2.5rem;
    height: 2.5rem;
}
.bz-city-hall .production-chooser__city-details-button:focus .city-details-highlight,
.bz-city-hall .production-chooser__city-details-button:hover .city-details-highlight,
.bz-city-hall .production-chooser__city-details-button.pressed .city-details-highlight {
    box-shadow: #e5d2ac 0 0 0.2222222222rem 0.3333333333rem;
}
.bz-city-hall .img-city-details {
    width: 2.6666666667rem;
    height: 2.6666666667rem;
}
`,
];
BZ_HEAD_STYLE.map(style => {
    const e = document.createElement("style");
    e.textContent = style;
    document.head.appendChild(e);
});
document.body.classList.add("bz-city-hall");
document.body.classList.toggle("bz-city-compact", bzCityHallOptions.compact);
class bzProductionChooserScreen {
    static c_prototype;
    static isPurchase = false;
    static isCDPanelOpen = true;
    isGamepadActive = Input.getActiveDeviceType() == InputDeviceType.Controller;
    constructor(component) {
        this.component = component;
        component.bzComponent = this;
        this.patchPrototypes(this.component);
    }
    patchPrototypes(component) {
        const c_prototype = Object.getPrototypeOf(component);
        if (bzProductionChooserScreen.c_prototype == c_prototype) return;
        // patch PanelCityDetails methods
        const proto = bzProductionChooserScreen.c_prototype = c_prototype;
        // wrap render method to extend it
        const c_render = proto.render;
        const after_render = this.afterRender;
        proto.render = function(...args) {
            const c_rv = c_render.apply(this, args);
            const after_rv = after_render.apply(this.bzComponent, args);
            return after_rv ?? c_rv;
        }
        // override isPurchase property
        const c_isPurchase =
            Object.getOwnPropertyDescriptor(proto, "isPurchase");
        const isPurchase = {
            configurable: c_isPurchase.configurable,
            enumerable: c_isPurchase.enumerable,
            get: c_isPurchase.get,
            set(value) {
                // remember tab selection
                bzProductionChooserScreen.isPurchase = value;
                c_isPurchase.set.apply(this, [value]);
            },
        };
        Object.defineProperty(proto, "isPurchase", isPurchase);
        // override cityID property
        const c_cityID =
            Object.getOwnPropertyDescriptor(proto, "cityID");
        const cityID = {
            configurable: c_cityID.configurable,
            enumerable: c_cityID.enumerable,
            get: c_cityID.get,
            set(value) {
                c_cityID.set.apply(this, [value]);
                // restore tab selection (if needed & possible)
                if (this._isPurchase || this.city.Happiness?.hasUnrest) return;
                if (bzProductionChooserScreen.isPurchase) this.isPurchase = true;
            },
        };
        Object.defineProperty(proto, "cityID", cityID);
        // override items property
        const c_items =
            Object.getOwnPropertyDescriptor(proto, "items");
        const items = {
            configurable: c_items.configurable,
            enumerable: c_items.enumerable,
            get: c_items.get,
            set(value) {
                // sort items
                for (const list of Object.values(value)) {
                    this.bzComponent.sortItems(list);
                }
                // call vanilla property
                c_items.set.apply(this, [value]);
                // adjust UQ formatting
                if (this.uniqueQuarter) this.bzComponent.afterUniqueQuarter();
            },
        };
        Object.defineProperty(proto, "items", items);
    }
    sortItems(list) {
        list.sort((a, b) => {
            // TODO: assign sort tiers and values
            if (a.sortTier != b.sortTier) return b.sortTier - a.sortTier;
            if (a.sortValue != b.sortValue) return b.sortValue - a.sortValue;
            // sort by name
            const aName = Locale.compose(a.name);
            const bName = Locale.compose(b.name);
            return aName.localeCompare(bName);
        });
    }
    afterUniqueQuarter() {
        const uq = this.component.uniqueQuarter;
        uq.uqInfoCols.className = "production-chooser-item flex items-center mx-2 mb-2 hover\\:text-secondary-1 focus\\:text-secondary-1";
        const uqCol1 = uq.uqInfoCols.firstChild;
        uqCol1.className = "size-10 ml-2\\.5 mr-3";
        uq.nameElement.className = "font-title-sm leading-tight uppercase text-gradient-secondary transition-color";
        const labelElement = uq.nameElement.nextSibling;
        labelElement.className = "font-body-xs leading-tight transition-color";
        uq.completionStatusText.className = "font-body text-xs leading-tight transition-color";
        uq.buildingContainer.className = "flex flex-col pl-2\\.5";
    }
    beforeAttach() {
        // replace event handlers to fix nav-help glitches
        this.component.onCityDetailsClosedListener = this.onCityDetailsClosed.bind(this);
        engine.on("input-source-changed", (deviceType, _deviceLayout) => {
            this.onActiveDeviceTypeChanged(deviceType);
        });
    }
    afterAttach() {
        engine.on("ConstructibleChanged", this.component.onConstructibleAddedToMap, this.component);
        // restore the city details panel if it was open previously
        if (bzProductionChooserScreen.isCDPanelOpen && !this.component.isSmallScreen()) {
            this.component.showCityDetails();
        }
    }
    beforeDetach() {
        if (!this.component.isSmallScreen()) {
            // remember whether the city details panel is open
            const cdSlot = this.component.cityDetailsSlot;
            const cdPanel = cdSlot?.querySelector(".panel-city-details");
            bzProductionChooserScreen.isCDPanelOpen =
                cdPanel && !cdPanel.classList.contains("hidden");
        }
    }
    afterDetach() {
        // clear Purchase tab memory when closing the panel.
        // this includes switches to the building-placement interface,
        // but that has its own means of restoring the Purchase tab.
        bzProductionChooserScreen.isPurchase = false;
        engine.off("ConstructibleChanged", this.component.onConstructibleAddedToMap, this.component);
    }
    afterRender() {
        const c = this.component;
        // move status icon below name
        const cityStatus = c.cityStatusContainerElement;
        cityStatus.parentElement.appendChild(cityStatus);
        cityStatus.classList.add("bz-city-status");
        c.cityStatusTextElement.classList.add("pulse-warn", "pr-6");
        // arrow buttons
        c.prevCityButton.classList.add("bz-prev-city", "bz-cycle-city");
        c.nextCityButton.classList.add("bz-next-city", "bz-cycle-city");
        // create a containing block for the arrow buttons
        const cityName = c.cityNameElement;
        const nameContainer = cityName.parentElement;
        const nameWrapper = nameContainer.parentElement;
        cityName.classList.add("bz-city-name");
        nameContainer.classList.add("bz-city-name-container");
        nameContainer.classList.remove("px-6");
        nameWrapper.classList.add("bz-city-name-wrapper");
        nameWrapper.removeAttribute("data-bind-class-toggle");
        Databind.classToggle(nameWrapper, "bz-no-help", "!{{g_NavTray.isTrayRequired}}");
        Databind.classToggle(nameWrapper, "bz-nav-help", "{{g_NavTray.isTrayRequired}}");
        nameWrapper.classList.add("mx-2");
        // make Production/Purchase tabs more compact and consistent
        const tabs = JSON.parse(c.productionPurchaseTabBar.getAttribute("tab-items"));
        tabs.forEach(t => t.className = "px-2 text-sm tracking-100");
        c.productionPurchaseTabBar.setAttribute("tab-items", JSON.stringify(tabs));
        c.townPurchaseLabel.innerHTML = c.townPurchaseLabel.innerHTML
            .replaceAll("text-xs", "text-sm tracking-100 mt-1");
    }
    onActiveDeviceTypeChanged(deviceType) {
        this.isGamepadActive = deviceType == InputDeviceType.Controller;
        if (this.isGamepadActive) {
            const focus = FocusManager.getFocus();
            const focusedPanel = this.component.getElementParentPanel(focus);
            focusedPanel?.classList.add("trigger-nav-help");
            this.component.lastFocusedPanel = focusedPanel;
            if (focusedPanel === this.component.frame) this.component.updateNavTray();
        } else {
            this.component.lastFocusedPanel?.classList.remove("trigger-nav-help");
        }
    };
    onCityDetailsClosed() {
        this.component.panelProductionSlot.classList.remove("hidden");
        if (this.isGamepadActive) {
            FocusManager.setFocus(this.component.productionAccordion);
            this.component.frame.classList.add("trigger-nav-help");
            this.component.cityNameElement.classList.add("trigger-nav-help");
        }
    }
}
Controls.decorate("panel-production-chooser", (val) => new bzProductionChooserScreen(val));

class bzProductionChooserItem {
    static c_prototype;
    static c_render;
    comma = Locale.compose("LOC_UI_CITY_DETAILS_YIELD_ONE_DECIMAL_COMMA", 0).at(2);
    data = {};
    pCostContainer = document.createElement("div");
    pCostIconElement = document.createElement("span");
    pCostAmountElement = document.createElement("span");
    progressBar = document.createElement("div");
    progressBarFill = document.createElement("div");
    constructor(component) {
        this.component = component;
        component.bzComponent = this;
        this.patchPrototypes(this.component);
    }
    patchPrototypes(component) {
        const c_prototype = Object.getPrototypeOf(component);
        if (bzProductionChooserScreen.c_prototype == c_prototype) return;
        // patch PanelCityDetails methods
        const proto = bzProductionChooserScreen.c_prototype = c_prototype;
        // wrap onAttributeChanged method to extend it
        const c_onAttributeChanged = proto.onAttributeChanged;
        const onAttributeChanged = this.onAttributeChanged;
        proto.onAttributeChanged = function(...args) {
            const more = onAttributeChanged.apply(this.bzComponent, args);
            if (more) return c_onAttributeChanged.apply(this, args);
        }
        // override render method
        bzProductionChooserItem.c_render = proto.render;
        proto.render = function() {
            return this.bzComponent.render();
        }
    }
    beforeAttach() { }
    afterAttach() {
        const c = this.component;
        // remove commas from yield and unit icons
        if (this.comma) {
            c.secondaryDetailsElement.innerHTML = c.secondaryDetailsElement.innerHTML
                .replaceAll(`${this.comma}</div>`, "</div>");
        }
    }
    beforeDetach() { }
    afterDetach() { }
    onAttributeChanged(name, _oldValue, newValue) {
        const c = this.component;
        switch (name) {
            case "data-category":
                this.data.category = newValue;
                this.updateProductionCost();
                break;
            // case "data-name":
            case "data-type":
                this.data.type = newValue;
                this.updateProductionCost();
                break;
            // case "data-cost":
            // case "data-prereq":
            // case "data-description":
            // case "data-error":
            // case "data-is-purchase":
            case "data-is-ageless": {
                const isAgeless = newValue === "true";
                this.component.agelessContainer.classList.toggle("hidden", !isAgeless);
                c.itemNameElement.classList.toggle("text-accent-2", !isAgeless);
                c.itemNameElement.classList.toggle("text-gradient-secondary", isAgeless);
                return false;
            }
            // case "data-secondary-details":
            // case "data-recommendations":
        }
        return true;  // continue to component
    }
    render() {
        const c = this.component;
        c.Root.classList.add("production-chooser-item", "text-xs", "leading-tight");
        c.container.classList.add("flex", "justify-start", "items-center");
        c.iconElement.classList.value = "size-12 bg-contain bg-center bg-no-repeat m-1";
        c.container.appendChild(c.iconElement);
        const infoContainer = document.createElement("div");
        infoContainer.classList.value = "relative flex flex-col flex-auto justify-between";
        const nameContainer = document.createElement("div");
        nameContainer.classList.value = "flex justify-start items-center";
        c.itemNameElement.classList.value = "font-title-xs text-accent-2 mx-1 uppercase";
        nameContainer.appendChild(c.itemNameElement);
        c.agelessContainer.classList.value = "hidden flex items-center mx-1";
        c.agelessContainer.innerHTML =
            '<img src="fs://game/city_ageless.png" class="size-5"/>';
        nameContainer.appendChild(c.agelessContainer);
        c.recommendationsContainer.classList.value = "flex items-center justify-center mx-1 h-7";
        nameContainer.appendChild(c.recommendationsContainer);
        infoContainer.appendChild(nameContainer);
        c.errorTextElement.classList.value = "font-body-xs text-negative-light mx-1 -mt-1 z-1 pointer-events-none";
        infoContainer.appendChild(c.errorTextElement);
        c.secondaryDetailsElement.classList.value = "invisible flex font-body-xs mb-1 bz-pci-details";
        infoContainer.appendChild(c.secondaryDetailsElement);
        c.container.appendChild(infoContainer);
        // progress bar
        this.progressBar.classList.add(
            "build-queue__item-progress-bar",
            "relative",
            "p-0\\.5",
            "flex",
            "flex-col-reverse",
            "h-10",
            "w-4",
            "bg-contain",
            "mr-2",
            "hidden",
        );
        this.progressBarFill.classList.add("build-queue__progress-bar-fill", "relative", "bg-contain", "w-3");
        this.progressBar.appendChild(this.progressBarFill);
        this.progressBarFill.style.heightPERCENT = 100;
        c.container.appendChild(this.progressBar);
        // production and purchase costs
        const rightColumn = document.createElement("div");
        rightColumn.classList.value = "relative flex flex-col items-end justify-between mr-1";
        this.pCostContainer.classList.value = "flex items-center";
        this.pCostAmountElement.classList.value = "font-body-xs text-accent-4";
        this.pCostContainer.appendChild(this.pCostAmountElement);
        this.pCostIconElement.classList.value = "size-6 bg-contain bg-center bg-no-repeat";
        this.pCostIconElement.style
            .setProperty("background-image", "url(Yield_Production)");
        this.pCostIconElement.ariaLabel = Locale.compose("LOC_YIELD_GOLD");
        this.pCostContainer.appendChild(this.pCostIconElement);
        rightColumn.appendChild(this.pCostContainer);
        c.costContainer.classList.value = "flex items-center";
        c.costAmountElement.classList.value = "font-title-sm mr-1";
        c.costContainer.appendChild(c.costAmountElement);
        c.costIconElement.classList.value = "size-8 bg-contain bg-center bg-no-repeat -m-1";
        c.costContainer.appendChild(c.costIconElement);
        rightColumn.appendChild(this.pCostContainer);
        rightColumn.appendChild(c.costContainer);
        c.container.appendChild(rightColumn);
    }
    updateProductionCost() {
        if (!this.data.type) return;
        const cityID = UI.Player.getHeadSelectedCity();
        const city = cityID && Cities.get(cityID);
        if (!city) return;
        const type = Game.getHash(this.data.type);
        switch (this.data.category) {
            case "buildings":
            case "wonders": {
                const cost = city.Production?.getConstructibleProductionCost(type);
                const progress = city.BuildQueue?.getProgress(type) ?? 0;
                const percent = city.BuildQueue?.getPercentComplete(type) ?? 0;
                this.data.productionCost = cost - progress;
                this.progressBar.classList.toggle("hidden", progress <= 0);
                this.progressBarFill.style.heightPERCENT = percent;
                break;
            }
            case "units":
                this.data.productionCost =
                    city.Production?.getUnitProductionCost(type);
                break;
            default:
                this.data.productionCost = void 0;
                break;
        }
        const pcost = this.data.productionCost;
        const hide = isNaN(pcost) || pcost < 0;
        this.pCostContainer.classList.toggle("hidden", hide);
        this.pCostAmountElement.textContent = pcost;
    }
}
Controls.decorate("production-chooser-item", (val) => new bzProductionChooserItem(val));
