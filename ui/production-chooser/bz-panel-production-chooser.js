import bzCityHallOptions from '/bz-city-hall/ui/options/bz-city-hall-options.js';
import { BuildingPlacementManager } from '/base-standard/ui/building-placement/building-placement-manager.js';
import { D as Databind } from '/core/ui/utilities/utilities-core-databinding.chunk.js';
import FocusManager from '/core/ui/input/focus-manager.js';

const BZ_REPAIR_ALL = "IMPROVEMENT_REPAIR_ALL";
const BZ_REPAIR_ALL_ID = Game.getHash(BZ_REPAIR_ALL);
const BZ_INSUFFICIENT_FUNDS = "LOC_CITY_PURCHASE_INSUFFICIENT_FUNDS";

// color palette
const BZ_COLOR = {
    // game colors
    silver: "#4c5366",  // = primary
    bronze: "#e5d2ac",  // = secondary
    primary: "#4c5366",
    primary1: "#8d97a6",
    primary2: "#4c5366",
    primary3: "#333640",
    primary4: "#23252b",
    primary5: "#12151f",
    secondary: "#e5d2ac",
    secondary1: "#e5d2ac",
    secondary2: "#8c7e62",
    secondary3: "#4c473d",
    accent: "#616266",
    accent1: "#e5e5e5",
    accent2: "#c2c4cc",
    accent3: "#9da0a6",
    accent4: "#85878c",
    accent5: "#616266",
    accent6: "#05070d",
    // bronze shades
    bronze1: "#f9ecd2",
    bronze2: "#e5d2ac",  // = secondary1
    bronze3: "#c7b28a",
    bronze4: "#a99670",
    bronze5: "#8c7e62",  // = secondary 2
    bronze6: "#4c473d",  // = secondary 3
    // rules background
    rules: "#8c7e6233",
    // alert colors
    black: "#000000",
    danger: "#af1b1c99",  // danger = militaristic 60% opacity
    caution: "#cea92f",  // caution = healthbar-medium
    note: "#ff800033",  // note = orange 20% opacity
    // geographic colors
    hill: "#a9967066",  // Rough terrain = dark bronze 40% opacity
    vegetated: "#aaff0033",  // Vegetated features = green 20% opacity
    wet: "#55aaff66",  // Wet features = teal 40% opacity
    road: "#f9ecd2cc",  // Roads & Railroads = pale bronze 80% opacity
    // yield types
    food: "#80b34d",        //  90° 40 50 green
    production: "#a33d29",  //  10° 60 40 red
    gold: "#f6ce55",        //  45° 90 65 yellow
    science: "#6ca6e0",     // 210° 65 65 cyan
    culture: "#5c5cd6",     // 240° 60 60 violet
    happiness: "#f5993d",   //  30° 90 60 orange
    diplomacy: "#afb7cf",   // 225° 25 75 gray
    // independent power types
    militaristic: "#af1b1c",
    scientific: "#4d7c96",
    economic: "#ffd553",
    cultural: "#892bb3",
};

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
.bz-city-hall .bz-pci-icon,
.bz-city-hall .bz-pci-name,
.bz-city-hall .bz-pci-cost {
    filter: drop-shadow(0 0.0555555556rem 0.1111111111rem black);
}
.bz-city-hall .bz-city-repair {
    color: black;
    background-color: ${BZ_COLOR.caution};
    font-weight: 700;
    line-height: 1.625;
    border-radius: 1rem;
    padding: 0 0.5rem;
    margin: 0.2777777778rem 0 0.3333333333rem;
}
.bz-city-hall .bz-pci-ageless {
    background-image: url("fs://game/city_ageless.png");
    background-size: cover;
}
.bz-city-hall .advisor-recommendation__container .advisor-recommendation__icon {
    width: 1.1111111111rem;
    height: 1.1111111111rem;
}
.bz-city-hall .bz-pci-details img.size-8 {
    width: 1.3333333333rem;
    height: 1.3333333333rem;
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
        const cityID = UI.Player.getHeadSelectedCity();
        const city = cityID && Cities.get(cityID);
        if (!city) return;
        const buildingTier = (item, info) =>
            info?.ConstructibleClass == "IMPROVEMENT" ? 1 : item.ageless ? -1 : 0;
        for (const item of list) {
            const type = Game.getHash(item.type);
            const progress = city.BuildQueue?.getProgress(type) ?? 0;
            const consInfo = GameInfo.Constructibles.lookup(type);
            if (progress) {
                // show in-progress items first
                item.sortTier = 9;
                item.sortValue = city.BuildQueue.getPercentComplete(type);
            } else if (item.category == "units") {
                const unitInfo = GameInfo.Units.lookup(type);
                const unitStats = GameInfo.Unit_Stats.lookup(type);
                const cv = unitInfo.CanEarnExperience ? Number.MAX_VALUE :
                    unitStats?.RangedCombat || unitStats?.Combat || 0;
                item.sortTier =
                    unitInfo.FoundCity ? 2 :  // settlers
                    unitInfo.CoreClass == "CORE_CLASS_RECON" ? 1 :  // scouts
                    cv <= 0 ? 0 :  // civilians
                    unitInfo.Domain == "DOMAIN_LAND" ? -1 :
                    unitInfo.Domain == "DOMAIN_SEA" ? -2 :
                    unitInfo.Domain == "DOMAIN_AIR" ? -3 :
                    9;  // unknown (list first for investigation)
                item.sortValue = cv;
            } else if (type == BZ_REPAIR_ALL_ID) {
                item.sortTier = 8;
                item.sortValue = 0;
            } else if (item.repairDamaged) {
                item.sortTier = 7;
                item.sortValue = buildingTier(item, consInfo);
            } else if (item.category == "buildings") {
                item.sortTier = buildingTier(item, consInfo);
                const info = GameInfo.Constructibles.lookup(type);
                const yields = BuildingPlacementManager
                    .getBestYieldForConstructible(city.id, info);
                item.sortValue = BuildingPlacementManager.bzYieldScore(yields);
            } else if (item.category == "projects") {
                item.sortTier = 0;
                item.sortValue = city.Production?.getProjectProductionCost(type) ?? 0;
            } else {
                item.sortTier = 0;
                item.sortValue = 0;
            }
        }
        list.sort((a, b) => {
            // TODO: assign sort tiers and values
            if (a.sortTier != b.sortTier) return b.sortTier - a.sortTier;
            if (a.sortValue != b.sortValue) return b.sortValue - a.sortValue;
            // sort by name
            const aName = Locale.compose(a.name).toUpperCase();
            const bName = Locale.compose(b.name).toUpperCase();
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
        switch (name) {
            case "disabled":
                if (newValue === "true") return this.fixRepairAll(name);
                break;
            case "data-category":
                this.updateProductionCost();
                break;
            case "data-name":
                this.updateInfo();
                break;
            case "data-type":
                this.fixRepairAll(name);
                this.updateInfo();
                this.updateProductionCost();
                break;
            // case "data-cost":
            // case "data-prereq":
            // case "data-description":
            case "data-error":
                if (newValue) return this.fixRepairAll(name);
                break;
            case "data-is-purchase":
                this.fixRepairAll(name);
                break;
            case "data-is-ageless": {
                this.updateInfo();
                return false;
            }
            // case "data-secondary-details":
            case "data-secondary-details": {
                this.updateInfo();
                return false;
            }
            // case "data-recommendations":
        }
        return true;  // continue to component
    }
    render() {
        const c = this.component;
        c.Root.classList.add("production-chooser-item", "text-xs", "leading-tight");
        c.container.classList.add("flex", "justify-start", "items-center");
        c.iconElement.classList.value = "bz-pci-icon size-12 bg-contain bg-center bg-no-repeat m-1";
        c.container.appendChild(c.iconElement);
        const infoColumn = document.createElement("div");
        infoColumn.classList.value = "bz-pci-info relative flex flex-col flex-auto justify-center";
        // name and ageless/advisor icons
        const nameContainer = document.createElement("div");
        nameContainer.classList.value = "flex justify-start items-center";
        c.itemNameElement.classList.value = "bz-pci-name font-title-xs text-accent-2 m-1 uppercase";
        nameContainer.appendChild(c.itemNameElement);
        c.agelessContainer.classList.value = "bz-pci-ageless hidden size-5 mx-1 -my-2";
        c.agelessContainer.innerHTML = "";
        nameContainer.appendChild(c.agelessContainer);
        c.recommendationsContainer.classList.value = "flex items-center justify-center mx-1 -my-2";
        nameContainer.appendChild(c.recommendationsContainer);
        infoColumn.appendChild(nameContainer);
        // error messages
        c.errorTextElement.classList.value = "bz-pci-error hidden font-body-xs text-negative-light mx-1 -mt-1 mb-1 z-1 pointer-events-none";
        infoColumn.appendChild(c.errorTextElement);
        // yields and unit stats
        c.secondaryDetailsElement.classList.value = "bz-pci-details hidden flex font-body-xs -mt-1";
        infoColumn.appendChild(c.secondaryDetailsElement);
        c.container.appendChild(infoColumn);
        // progress bar
        this.progressBar.classList.add(
            "build-queue__item-progress-bar",
            "relative",
            "p-0\\.5",
            "flex",
            "flex-col-reverse",
            "h-10",
            "w-4",
            "mr-2",
            "hidden",
        );
        this.progressBarFill.classList.add("build-queue__progress-bar-fill", "relative", "bg-contain", "w-3");
        this.progressBar.appendChild(this.progressBarFill);
        this.progressBarFill.style.heightPERCENT = 100;
        c.container.appendChild(this.progressBar);
        // production and purchase costs
        const costColumn = document.createElement("div");
        costColumn.classList.value = "relative flex flex-col items-end justify-between mr-1";
        this.pCostContainer.classList.value = "flex items-center";
        this.pCostAmountElement.classList.value = "font-body-xs text-accent-4";
        this.pCostContainer.appendChild(this.pCostAmountElement);
        this.pCostIconElement.classList.value = "size-6 bg-contain bg-center bg-no-repeat";
        this.pCostIconElement.style
            .setProperty("background-image", "url(Yield_Production)");
        this.pCostIconElement.ariaLabel = Locale.compose("LOC_YIELD_GOLD");
        this.pCostContainer.appendChild(this.pCostIconElement);
        costColumn.appendChild(this.pCostContainer);
        c.costContainer.classList.value = "bz-pci-cost flex items-center";
        c.costAmountElement.classList.value = "font-title-sm mr-1";
        c.costContainer.appendChild(c.costAmountElement);
        c.costIconElement.classList.value = "size-8 bg-contain bg-center bg-no-repeat -m-1";
        c.costContainer.appendChild(c.costIconElement);
        costColumn.appendChild(this.pCostContainer);
        costColumn.appendChild(c.costContainer);
        c.container.appendChild(costColumn);
    }
    fixRepairAll(attr) {
        // fix insufficient funds error on the Production tab
        const e = this.component.Root;
        if (e.getAttribute("disabled") !== "true" ||
            e.getAttribute("data-is-purchase") === "true" ||
            e.getAttribute("data-type") != BZ_REPAIR_ALL ||
            e.getAttribute("data-error") != BZ_INSUFFICIENT_FUNDS) {
            return true;  // continue onAttributeChanged chain
        }
        console.warn(`TRIX FIX =======================================================`);
        e.setAttribute("disabled", "false");
        e.removeAttribute("data-error");
        console.warn(`TRIX FIX =======================================================`);
        // block incorrect attribute updates
        return !(attr == "disabled" || attr == "data-error");
    }
    updateInfo() {
        const c = this.component;
        // get attributes
        const e = c.Root;
        const dataType = e.getAttribute("data-type");
        const type = Game.getHash(dataType);
        const info = GameInfo.Constructibles.lookup(type);
        if (!info) return;
        const dataName = e.getAttribute("data-name");
        const dataIsAgeless = e.getAttribute("data-is-ageless") === "true";
        const dataSecondaryDetails = e.getAttribute("data-secondary-details");
        // interpret attributes
        const isRepair = type == BZ_REPAIR_ALL_ID || dataName != info.Name;
        const isAgeless = dataIsAgeless && !isRepair;
        const details = !isRepair && dataSecondaryDetails || "";
        const cname = c.itemNameElement;
        cname.classList.toggle("bz-city-repair", isRepair);
        cname.classList.toggle("text-accent-2", !isAgeless && !isRepair);
        cname.classList.toggle("text-gradient-secondary", isAgeless && !isRepair);
        c.agelessContainer.classList.toggle("hidden", !isAgeless);
        c.secondaryDetailsElement.innerHTML = details;
        c.secondaryDetailsElement.classList.toggle("hidden", !details);
    }
    updateProductionCost() {
        const cityID = UI.Player.getHeadSelectedCity();
        const city = cityID && Cities.get(cityID);
        if (!city) return;
        const c = this.component;
        // get attributes
        const e = c.Root;
        const dataCategory = e.getAttribute("data-category");
        const dataType = e.getAttribute("data-type");
        const type = Game.getHash(dataType);
        const progress = city.BuildQueue?.getProgress(type) ?? 0;
        const percent = city.BuildQueue?.getPercentComplete(type) ?? 0;
        this.progressBar.classList.toggle("hidden", progress <= 0);
        this.progressBarFill.style.heightPERCENT = percent;
        const update = (base) => {
            if (isNaN(base)) {
                this.pCostContainer.classList.add("hidden");
                return;
            }
            this.pCostContainer.classList.remove("hidden");
            this.pCostAmountElement.textContent = base - progress;
        }
        switch (dataCategory) {
            case "buildings":
            case "wonders":
                update(city.Production?.getConstructibleProductionCost(type));
                break;
            case "units":
                update(city.Production?.getUnitProductionCost(type));
                break;
            case "projects":
                update(city.Production?.getProjectProductionCost(type));
                break;
            default:
                this.pCostContainer.classList.add("hidden");
                break;
        }
    }
}
Controls.decorate("production-chooser-item", (val) => new bzProductionChooserItem(val));
