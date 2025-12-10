import bzCityHallOptions from '/bz-city-hall/ui/options/bz-city-hall-options.js';
import { A as Audio } from '/core/ui/audio-base/audio-support.chunk.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InterfaceMode } from '../../../core/ui/interface-modes/interface-modes.js';
import { D as Databind } from '/core/ui/utilities/utilities-core-databinding.chunk.js';
import { U as UpdateGate } from '/core/ui/utilities/utilities-update-gate.chunk.js';
import { BuildQueue } from '/base-standard/ui/build-queue/model-build-queue.js';
import { P as ProductionPanelCategory } from '/base-standard/ui/production-chooser/production-chooser-helpers.chunk.js';
import { GetBaseYieldsHTML, g as GetProductionItems, h as Construct } from './bz-production-chooser-helpers.js';

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
.bz-city-hall .last-production-frame .ml-8 {
    margin-left: 0.8888888889rem;
}
.bz-city-compact .last-production-frame .size-8 {
    width: 1.3333333333rem;
    height: 1.3333333333rem;
}
.bz-city-compact .last-production-frame .pr-4 {
    padding-right: 0.4444444444rem;
}
`,  // general item styling
`
.bz-city-hall .text-negative,
.bz-city-hall .text-negative-light {
    color: #ff6644;
    text-shadow: 0 0.0555555556rem 0.1111111111rem black, 0 0 0.3333333333rem black;
}
`,  // production item styling
`
.bz-city-hall .panel-production-chooser .subsystem-frame__content {
    padding: 0.6666666667rem 0.4444444444rem;
    margin-bottom: -0.3333333333rem;
}
.bz-city-hall .production-category {
    margin-right: 0;
    margin-bottom: 0.7222222222rem;
}
.bz-city-hall .production-category:last-child {
    margin-bottom: 0;
}
.bz-city-hall panel-production-chooser .subsystem-frame__content .fxs-scrollbar__track--vertical {
    margin: 1.3333333333rem -0.1111111111rem;
    right: -0.2222222222rem;
}
.bz-city-hall .bz-pci-pcost,
.bz-city-hall .bz-pci-cost {
    text-shadow: 0.0555555556rem 0.0555555556rem 0.1111111111rem black,
                 0 0.0555555556rem 0.1666666667rem black;
}
.bz-city-hall .bz-pci-icon,
.bz-city-hall .bz-pci-recs,
.bz-city-hall .bz-pci-details img,
.bz-city-hall .bz-pci-pcost-icon,
.bz-city-hall .bz-pci-cost-icon,
.bz-city-hall .bz-pci-progress,
.bz-city-hall .bz-pci-ageless {
    filter: drop-shadow(0 0.0555555556rem 0.1111111111rem black);
}
.bz-city-hall .bz-pci-cost .production-chooser-tooltip__subtext-bg.rounded {
    display: none;
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
.bz-city-hall .advisor-recommendation__container .advisor-recommendation__icon {
    width: 1.1111111111rem;
    height: 1.1111111111rem;
}
.bz-city-hall .bz-show-progress .bz-pci-pcost-icon,
.bz-city-hall .bz-show-progress .bz-pci-cost-icon {
    opacity: 0;
}
.bz-city-hall .bz-is-purchase.bz-has-progress .build-queue__progress-bar-fill {
    filter: saturate(0) fxs-color-tint(${BZ_COLOR.gold}) brightness(2.0) contrast(1.8) saturate(0.7);
  background-position: center;
}
`,  // relocate View Hidden button
`
.bz-city-hall .bz-view-hidden {
    position: fixed;
    z-index: 1;
    top: calc(100vh - 1rem);
    height: 1rem;
    left: 1.5555555556rem;
    padding: 0 0.4444444444rem 0 0.3333333333rem;
    text-shadow: 0 0.0555555556rem 0.1666666667rem black;
    background-color: #23252bcc;
    border-style: solid;
    border-width: 0 0.1111111111rem;
    border-color: #4c473d;
}
.bz-city-hall .bz-view-hidden fxs-checkbox {
    width: 1rem;
    height: 1rem;
    filter: drop-shadow(0 0.0555555556rem 0.1111111111rem black);
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
    z-index: 1;
}
.bz-city-hall .bz-city-name-wrapper .bz-cycle-city.hidden {
    display: flex;
    opacity: 0;
}
.bz-city-hall .bz-city-name-wrapper.bz-nav-help .bz-cycle-city {
    top: 1.3333333333rem;
    left: 2.3888888889rem;
}
.bz-city-hall .bz-city-name-wrapper.bz-no-help .bz-cycle-city {
    top: 1.2777777778rem;
    left: 2.6666666667rem;
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
    static c_doOrConfirmConstruction;
    static isPurchase = false;
    static isCDPanelOpen = true;
    viewHiddenActiveLabel = document.createElement("fxs-activatable");
    isGamepadActive = Input.getActiveDeviceType() == InputDeviceType.Controller;
    constructor(component) {
        this.component = component;
        component.bzComponent = this;
        component.updateItems = new UpdateGate(() => this.updateItems());
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
        // wrap updateCategories method to extend it
        const c_updateCategories = proto.updateCategories;
        const after_updateCategories = this.afterUpdateCategories;
        proto.updateCategories = function(...args) {
            const c_rv = c_updateCategories.apply(this, args);
            const after_rv = after_updateCategories.apply(this.bzComponent, args);
            return after_rv ?? c_rv;
        }
        // override doOrConfirmConstruction method to patch Construct
        bzProductionChooserScreen.c_doOrConfirmConstruction =
            proto.doOrConfirmConstruction;
        proto.doOrConfirmConstruction = function(...args) {
            return this.bzComponent.doOrConfirmConstruction(...args);
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
    }
    beforeAttach() {
        // replace event handlers to fix nav-help glitches
        this.component.onCityDetailsClosedListener = this.onCityDetailsClosed.bind(this);
        engine.on("input-source-changed", this.onActiveDeviceTypeChanged, this);
        // replace name change handler to allow mixed-case names
        this.component.onSettlementNameChangedListener =
            this.onSettlementNameChanged.bind(this);
    }
    afterAttach() {
        const c = this.component;
        engine.on("ConstructibleChanged", c.onConstructibleAddedToMap, this.component);
        // restore the city details panel if it was open previously
        if (bzProductionChooserScreen.isCDPanelOpen && !this.component.isSmallScreen()) {
            this.component.showCityDetails();
        }
        requestAnimationFrame(() => {
            // make the View Hidden label clickable
            this.viewHiddenActiveLabel.addEventListener(
                "engine-input", c.viewHiddenCheckbox.component.engineInputListener
            );
            // show mixed case while editing settlement names
            c.cityNameElement.component.editableTextBox.classList.add("normal-case");
        });
    }
    beforeDetach() {
        const c = this.component;
        if (!this.component.isSmallScreen()) {
            // remember whether the city details panel is open
            const cdSlot = this.component.cityDetailsSlot;
            const cdPanel = cdSlot?.querySelector(".panel-city-details");
            bzProductionChooserScreen.isCDPanelOpen =
                cdPanel && !cdPanel.classList.contains("hidden");
        }
        engine.off("ConstructibleChanged", c.onConstructibleAddedToMap, this.component);
        this.viewHiddenActiveLabel.removeEventListener(
            "engine-input", c.viewHiddenCheckbox.component.engineInputListener);
    }
    afterDetach() {
        // clear Purchase tab memory when closing the panel.
        // this includes switches to the building-placement interface,
        // but that has its own means of restoring the Purchase tab.
        bzProductionChooserScreen.isPurchase = false;
        engine.off("input-source-changed", this.onActiveDeviceTypeChanged, this);
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
        c.productionPurchaseTabBar.classList.remove("mx-6");
        c.productionPurchaseTabBar.classList.add("mx-1\\.5");
        const tabs = JSON.parse(c.productionPurchaseTabBar.getAttribute("tab-items"));
        tabs.forEach(t => t.className = "px-2 text-sm tracking-100");
        c.productionPurchaseTabBar.setAttribute("tab-items", JSON.stringify(tabs));
        c.townPurchaseLabel.innerHTML = c.townPurchaseLabel.innerHTML
            .replaceAll("text-xs", "text-sm tracking-100 mt-1");
        // remove production-category margins
        for (const slot of Object.values(c.productionCategorySlots)) {
            slot.root.classList.remove("ml-4");
        }
        // move View Hidden interface
        const viewHiddenContainer = c.viewHiddenCheckbox.parentElement;
        const viewHiddenCheckboxLabel = viewHiddenContainer.lastChild;
        c.viewHiddenCheckbox.classList.add("mr-1");
        viewHiddenContainer.classList.add("bz-view-hidden", "group");
        viewHiddenCheckboxLabel.classList.add("relative");
        this.viewHiddenActiveLabel.classList.value =
            "absolute truncate pb-2 px-1 -mx-1 text-secondary text-xs opacity-0 group-hover\\:opacity-100 transition-opacity";
        this.viewHiddenActiveLabel.setAttribute("data-l10n-id", "LOC_UI_PRODUCTION_VIEW_HIDDEN");
        viewHiddenCheckboxLabel.appendChild(this.viewHiddenActiveLabel);
        // make room between checkbox and Convert to City button
        c.upgradeToCityButton.classList.add("mt-0\\.5", "mb-1\\.5");
        c.frame.dataset.footerClass = "px-5 pb-1 mx-0\\.5";
    }
    afterUpdateCategories() {
        const uq = this.component.uniqueQuarter;
        if (uq) {
            uq.uqInfoCols.className = "production-chooser-item flex items-center mx-2 mb-2 hover\\:text-secondary-1 focus\\:text-secondary-1";
            const uqCol1 = uq.uqInfoCols.firstChild;
            uqCol1.className = "size-10 ml-2\\.5 mr-3";
            uq.nameElement.className = "font-title-sm leading-tight uppercase text-gradient-secondary transition-color";
            const labelElement = uq.nameElement.nextSibling;
            labelElement.className = "font-body-xs leading-tight transition-color";
            uq.completionStatusText.className = "font-body text-xs leading-tight transition-color";
            uq.buildingContainer.className = "flex flex-col pl-2\\.5";
        }
    }
    updateItems() {
        const c = this.component;
        if (!c.isInitialLoadComplete) return;
        const city = c.city;
        const items = GetProductionItems(
            city,
            c.recommendations,
            c.playerGoldBalance,
            c.isPurchase,
            c.viewHidden,
            c.uqInfo
        );
        const newItems = Object.values(ProductionPanelCategory).flatMap(
            (category) => items[category].map((item) => item.type)
        );
        const newItemsSet = new Set(newItems);
        let resetFocus = false;
        const currentFocus = FocusManager.getFocus();
        for (const [type, item] of c.itemElementMap) {
            if (!newItemsSet.has(type)) {
                resetFocus ||= currentFocus === item;
                item.remove();
                c.itemElementMap.delete(type);
            }
        }
        c.items = items;
        if (resetFocus ||
            c.Root.contains(currentFocus) && !c.buildQueue.contains(currentFocus)) {
            FocusManager.setFocus(c.productionAccordion);
        }
    }
    doOrConfirmConstruction(category, type, animationConfirmCallback) {
        const c = this.component;
        const city = c.city;
        if (!city) {
            console.error(`panel-production-chooser: confirmSelection: Failed to get a valid city!`);
            return;
        }
        const item = c.items[category].find((item2) => item2.type === type);
        if (!item) {
            console.error(`panel-production-chooser: confirmSelection: Failed to get a valid item!`);
            return;
        }
        const queueLengthBeforeAdd = BuildQueue.items.length;
        const bSuccess = Construct(city, item, c.isPurchase);
        if (bSuccess) {
            if (queueLengthBeforeAdd > 0) {
                Audio.playSound("data-audio-queue-item", "audio-production-chooser");
            }
            animationConfirmCallback?.();
            if (c.wasQueueInitiallyEmpty && !c.isPurchase && !Configuration.getUser().isProductionPanelStayOpen) {
                UI.Player.deselectAllCities();
                InterfaceMode.switchToDefault();
                c.requestPlaceBuildingClose();
            }
        }
        if (queueLengthBeforeAdd == 0) {
            Audio.playSound("data-audio-city-production-activate", "city-actions");
        }
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
    onSettlementNameChanged(event) {
        const c = this.component;
        if (!c._cityID) {
            console.error(
                `panel-production-chooser: onSettlementNameChanged - cityID was null during name change operation!`
            );
            c.realizeProductionFocus();
            return;
        }
        const Name = event.detail.newStr;
        if (Name.trim().length == 0) {
            const city = Cities.get(c._cityID);
            if (city) c.cityNameElement.setAttribute("title", city.name);
            return;
        }
        const locName = Locale.compose(c.city.name);
        if (Name == locName) {
            // no change:  switch back to static header text
            c.cityNameElement.component.editableTextBox.classList.add("hidden");
            c.cityNameElement.component.staticText.classList.remove("hidden");
            return;
        }
        const args = { Name };
        const result = Game.CityCommands.canStart(c._cityID, CityCommandTypes.NAME_CITY, args, false);
        if (result.Success) {
            Game.CityCommands.sendRequest(c._cityID, CityCommandTypes.NAME_CITY, args);
        } else {
            console.error(
                "panel-production-chooser: onSettlementNameChanged - city name change operation failed!",
                result.FailureReasons
            );
        }
    }
}
Controls.decorate("panel-production-chooser", (val) => new bzProductionChooserScreen(val));

class bzProductionChooserItem {
    static c_prototype;
    static c_render;
    isRepair = false;
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
        if (bzProductionChooserItem.c_prototype == c_prototype) return;
        // patch PanelCityDetails methods
        const proto = bzProductionChooserItem.c_prototype = c_prototype;
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
    afterAttach() { }
    beforeDetach() { }
    afterDetach() { }
    onAttributeChanged(name, _oldValue, newValue) {
        const c = this.component;
        switch (name) {
            // case "disabled":
            // case "data-category":
            case "data-name":
                this.updateInfo();
                break;
            case "data-type":
                if (newValue) {
                    c.iconElement.setAttribute("data-icon-id", newValue);
                } else {
                    c.iconElement.removeAttribute("data-icon-id");
                }
                this.updateInfo();
                this.updateProductionCost();
                return false;
            case "data-cost": {
                const cost = newValue ? parseInt(newValue) : 0;
                const showCost = isNaN(cost) || cost < 0;
                c.costContainer.classList.toggle("hidden", showCost);
                const text = Locale.compose("LOC_BZ_GROUPED_DIGITS", cost);
                c.costAmountElement.textContent = text;
                return false;
            }
            // case "data-prereq":
            // case "data-description":
            // case "data-error":
            case "data-is-purchase":
                c.Root.classList.toggle("bz-is-purchase", newValue === "true");
                break;
            case "data-is-ageless":
            case "data-secondary-details":
                // hide details for repairs
                this.updateInfo();
                return false;
            // case "data-recommendations":
            // case "data-tags":
            case "data-base-yields": {
                if (newValue) {
                    const baseYields = JSON.parse(newValue);
                    c.itemBaseYieldsElement.innerHTML = GetBaseYieldsHTML(baseYields);
                    c.itemBaseYieldsElement.classList.remove("hidden");
                } else {
                    c.itemBaseYieldsElement.classList.add("hidden");
                }
                return false;
            }
            // case "data-can-get-warehouse":
            case "data-info-display-type":
                // hide details for repairs
                this.updateInfo();
                return false;
            // case "data-warehouse-count":
            // case "data-can-get-adjacency":
            // case "data-highest-adjacency":
            // case "data-highest-adjacency":
        }
        return true;  // continue to component
    }
    render() {
        const c = this.component;
        c.Root.classList.add("production-chooser-item", "text-xs", "leading-tight");
        c.container.classList.remove("tracking-100");
        c.container.classList.add(
            "bz-pci-container", "flex", "justify-start", "items-center"
        );
        c.iconElement.classList.value = "bz-pci-icon size-12 bg-contain bg-center bg-no-repeat m-1";
        c.container.appendChild(c.iconElement);
        const infoColumn = document.createElement("div");
        infoColumn.classList.value = "bz-pci-info relative flex flex-col flex-auto justify-center";
        // name and advisor icons
        const nameContainer = document.createElement("div");
        nameContainer.classList.value = "flex justify-start items-center tracking-25";
        c.itemNameElement.classList.value = "bz-pci-name font-title-xs text-accent-2 uppercase m-1 z-1";
        nameContainer.appendChild(c.itemNameElement);
        c.recommendationsContainer.classList.value = "bz-pci-recs flex items-center justify-center mx-1 -my-2";
        nameContainer.appendChild(c.recommendationsContainer);
        infoColumn.appendChild(nameContainer);
        // error messages
        c.errorTextElement.classList.value = "bz-pci-error font-body-xs text-negative-light mx-1 -mt-1 mb-1 z-1 pointer-events-none";
        infoColumn.appendChild(c.errorTextElement);
        // yield preview display + unit stats
        c.secondaryDetailsElement.classList.value =
            "bz-pci-details hidden flex font-body-xs -mt-1";
        infoColumn.appendChild(c.secondaryDetailsElement);
        // base yield display
        c.alternateYieldElement.classList.value =
            "bz-pci-details hidden flex font-body-xs -mt-1";
        infoColumn.appendChild(c.alternateYieldElement);
        c.itemBaseYieldsElement.classList.value = "flex items-center";
        c.alternateYieldElement.appendChild(c.itemBaseYieldsElement);
        c.warehouseCountContainer.classList.add("hidden", "flex", "items-center");
        c.alternateYieldElement.appendChild(c.warehouseCountContainer);
        const warehouseDivider = document.createElement("div");
        warehouseDivider.classList.add("mx-1");
        warehouseDivider.textContent = "|";
        c.warehouseCountContainer.appendChild(warehouseDivider);
        c.warehouseCountValue.className = "ml-1";
        c.warehouseCountContainer.appendChild(c.warehouseCountValue);
        const warehouseIcon = document.createElement("img");
        warehouseIcon.className = "size-6";
        warehouseIcon.setAttribute("src", "blp:yield_warehouse");
        c.warehouseCountContainer.appendChild(warehouseIcon);
        c.adjacencyBonusContainer.classList.add("hidden", "flex", "items-center");
        c.alternateYieldElement.appendChild(c.adjacencyBonusContainer);
        const adjacencyDivider = document.createElement("div");
        adjacencyDivider.classList.add("mx-1");
        adjacencyDivider.textContent = "|";
        c.adjacencyBonusContainer.appendChild(adjacencyDivider);
        c.adjacencyBonusValue.className = "ml-1";
        c.adjacencyBonusContainer.appendChild(c.adjacencyBonusValue);
        const adjacencyIcon = document.createElement("img");
        adjacencyIcon.className = "size-6";
        adjacencyIcon.setAttribute("src", "blp:yield_adjacency");
        c.adjacencyBonusContainer.appendChild(adjacencyIcon);
        c.container.appendChild(infoColumn);
        // production and purchase costs
        const costColumn = document.createElement("div");
        costColumn.classList.value =
            "relative flex flex-col items-end justify-between mr-1";
        this.pCostContainer.classList.value = "bz-pci-pcost flex items-center";
        this.pCostAmountElement.classList.value = "font-body-xs text-accent-4";
        this.pCostContainer.appendChild(this.pCostAmountElement);
        this.pCostIconElement.classList.value = "bz-pci-pcost-icon size-6 bg-contain bg-center bg-no-repeat mx-0\\.5";
        this.pCostIconElement.style
            .setProperty("background-image", "url(Yield_Production)");
        this.pCostIconElement.ariaLabel = Locale.compose("LOC_YIELD_PRODUCTION");
        this.pCostContainer.appendChild(this.pCostIconElement);
        costColumn.appendChild(this.pCostContainer);
        c.costContainer.classList.value = "bz-pci-cost flex justify-end items-center";
        c.costAmountElement.classList.value = "font-title-sm mr-1";
        c.costContainer.appendChild(c.costAmountElement);
        c.costIconElement.classList.value = "bz-pci-cost-icon size-8 bg-contain bg-center bg-no-repeat -m-1";
        c.costContainer.appendChild(c.costIconElement);
        costColumn.appendChild(this.pCostContainer);
        costColumn.appendChild(c.costContainer);
        c.container.appendChild(costColumn);
        // progress bar
        this.progressBar.classList.add(
            "bz-pci-progress",
            "build-queue__item-progress-bar",
            "absolute",
            "p-0\\.5",
            "flex",
            "flex-col-reverse",
            "h-10",
            "w-4",
            "right-2",
            "hidden",
        );
        this.progressBarFill.classList.add("build-queue__progress-bar-fill", "relative", "bg-contain", "w-3");
        this.progressBar.appendChild(this.progressBarFill);
        this.progressBarFill.style.heightPERCENT = 100;
        c.container.appendChild(this.progressBar);
        // ageless tag
        c.agelessContainer.classList.value =
            "bz-pci-ageless hidden flex items-center absolute right-20 top-1\\/2 -translate-y-1\\/2";
        c.agelessContainer.innerHTML = `
        <div class="img-hud-production-pill flex text-2xs items-center">
            <div class="px-2 uppercase leading-none truncate" data-l10n-id="LOC_UI_PRODUCTION_AGELESS"></div>
        </div>
        `;
        costColumn.appendChild(c.agelessContainer);
    }
    updateInfo() {
        // styling for repairs, ageless items, and secondary details
        const c = this.component;
        // get attributes
        const e = c.Root;
        const dataCategory = e.getAttribute("data-category");
        const dataType = e.getAttribute("data-type");
        const dataName = e.getAttribute("data-name");
        const dataIsAgeless = e.getAttribute("data-is-ageless") === "true";
        const dataSecondaryDetails = e.getAttribute("data-secondary-details");
        const dataInfoDisplayType = e.getAttribute("data-info-display-type");
        // interpret attributes
        const isRepair = this.isRepair = (() => {
            if (dataCategory != "buildings" && dataCategory != "wonders") return false;
            if (e.getAttribute("data-repair-all") === "true") return true;
            const type = Game.getHash(dataType);
            const info = GameInfo.Constructibles.lookup(type);
            return dataName != info.Name;
        })();
        const isAgeless = dataIsAgeless && !isRepair;
        const cname = c.itemNameElement;
        cname.classList.toggle("bz-city-repair", isRepair);
        cname.classList.toggle("text-accent-2", !isAgeless && !isRepair);
        cname.classList.toggle("text-gradient-secondary", isAgeless && !isRepair);
        c.agelessContainer.classList.toggle("hidden", !isAgeless);
        const details = !isRepair && dataSecondaryDetails || "";
        c.secondaryDetailsElement.innerHTML = details;
        c.secondaryDetailsElement.classList.toggle("hidden", !details);
        const baseYield = dataInfoDisplayType == "base-yield" && !isRepair;
        c.alternateYieldElement.classList.toggle("hidden", !baseYield);
    }
    updateProductionCost() {
        // styling for production costs and progress bars
        const cityID = UI.Player.getHeadSelectedCity();
        const city = cityID && Cities.get(cityID);
        if (!city) return;
        // get attributes
        const c = this.component;
        const e = c.Root;
        const dataCategory = e.getAttribute("data-category");
        const dataType = e.getAttribute("data-type");
        const type = Game.getHash(dataType);
        const qindex = city.BuildQueue.getQueuedPositionOfType(type);
        const progress = city.BuildQueue.getProgress(type) ?? 0;
        const percent = city.BuildQueue.getPercentComplete(type) ?? 0;
        const showProgress = (progress || qindex != -1) && !this.isRepair;
        const hasProgress = progress && dataCategory != "units";
        c.Root.classList.toggle("bz-has-progress", hasProgress);
        c.Root.classList.toggle("bz-show-progress", showProgress);
        this.progressBar.classList.toggle("hidden", !showProgress);
        this.progressBarFill.style.heightPERCENT = percent;
        const update = (base) => {
            if (isNaN(base) || base <= 0) {
                this.pCostContainer.classList.add("hidden");
                return;
            }
            this.pCostContainer.classList.remove("hidden");
            const text = Locale.compose("LOC_BZ_GROUPED_DIGITS", base - progress);
            this.pCostAmountElement.textContent = text;
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

class bzLastProductionSection {
    constructor(component) {
        this.component = component;
        component.bzComponent = this;
    }
    beforeAttach() {
        this.component.Root.classList.toggle("text-sm", bzCityHallOptions.compact);
        this.component.yieldDiv.classList.toggle("flex-wrap", bzCityHallOptions.compact);
        this.component.yieldDiv.classList.toggle("max-w-72", bzCityHallOptions.compact);
        this.component.yieldDiv.classList.add("mr-2");
    }
    afterAttach() { }
    beforeDetach() { }
    afterDetach() { }
}
Controls.decorate("last-production-section", (val) => new bzLastProductionSection(val));
