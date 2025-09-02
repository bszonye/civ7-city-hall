// TODO: fix nav-help lost when cycling cities from Details panel
import bzCityDetails, { bzUpdateCityDetailsEventName } from "/bz-city-hall/ui/city-details/bz-model-city-details.js";
import { C as CityDetails, U as UpdateCityDetailsEventName } from "/base-standard/ui/production-chooser/production-chooser-helpers.chunk.js";
import { N as NavTray } from "/core/ui/navigation-tray/model-navigation-tray.chunk.js";
import { D as Databind } from '../../../core/ui/utilities/utilities-core-databinding.chunk.js';
import { MustGetElement } from "/core/ui/utilities/utilities-dom.chunk.js";
import FocusManager from '/core/ui/input/focus-manager.js';

// vertical separator
const BZ_DIVIDER_STYLE = "flex w-96 self-center";
const BZ_DIVIDER_LINE = `\
<div class="w-1\\/2 h-5 bg-cover bg-no-repeat city-details-half-divider"></div>
<div class="w-1\\/2 h-5 bg-cover bg-no-repeat city-details-half-divider -scale-x-100"></div>
`
const BZ_DIVIDER = `<div class="${BZ_DIVIDER_STYLE}">${BZ_DIVIDER_LINE}</div>`

var cityDetailTabID;
(function (cityDetailTabID) {
    cityDetailTabID["overview"] = "city-details-tab-overview";
    cityDetailTabID["constructibles"] = "city-details-tab-constructibles";
    cityDetailTabID["growth"] = "city-details-tab-growth";
    cityDetailTabID["buildings"] = "city-details-tab-buildings";
    cityDetailTabID["yields"] = "city-details-tab-yields";
})(cityDetailTabID || (cityDetailTabID = {}));
const BZ_TAB_OVERVIEW = {
    id: cityDetailTabID.overview,
    icon: {
        default: UI.getIconBLP("CITY_BUILDINGS"),
        hover: UI.getIconBLP("CITY_BUILDINGS_HI"),
        focus: UI.getIconBLP("CITY_BUILDINGS_HI")
    },
    iconClass: "size-16",
    headerText: "LOC_BZ_UI_CITY_DETAILS_OVERVIEW_TAB"
};
const BZ_TAB_CONSTRUCTIBLES = {
    id: cityDetailTabID.constructibles,
    icon: {
        default: UI.getIconBLP("CITY_SETTLEMENT"),
        hover: UI.getIconBLP("CITY_SETTLEMENT_HI"),
        focus: UI.getIconBLP("CITY_SETTLEMENT_HI")
    },
    iconClass: "size-16",
    headerText: "LOC_UI_CITY_DETAILS_BUILDINGS_TAB"
};
// custom & adapted icons
const BZ_ICON_CITY = "YIELD_CITIES";  // total city population
const BZ_ICON_TOWN = "YIELD_TOWNS";  // total city population
const BZ_ICON_RURAL = "CITY_RURAL";  // urban population/yield
const BZ_ICON_URBAN = "CITY_URBAN";  // rural population/yield
const BZ_ICON_SPECIAL = "CITY_SPECIAL_BASE";  // specialists
const BZ_ICON_TIMER = "url('hud_turn-timer')";
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
// box metrics (for initialization, component can update)
// TODO: remove unneeded items
const BASE_FONT_SIZE = 18;
const BZ_FONT_SPACING = 1.5;
const BZ_PADDING = 0.6666666667;
const BZ_MARGIN = BZ_PADDING / 2;
const BZ_BORDER = 0.1111111111;
const BZ_RULES_WIDTH = 12;
let metrics = getFontMetrics();

// horizontal separator
const BZ_DOT_DIVIDER = Locale.compose("LOC_PLOT_DIVIDER_DOT");
const BZ_DOT_JOINER = metrics.isIdeographic ?
    BZ_DOT_DIVIDER : `&nbsp;${BZ_DOT_DIVIDER} `;

// additional CSS definitions
const BZ_HEAD_STYLE = [
`
.bz-city-hall .buildings-list .city-details-half-divider,
.bz-city-hall .bz-buildings-list .city-details-half-divider {
    margin: -0.2222222222rem 0;
}
.bz-city-hall .improvements-category .city-details-half-divider {
    margin-top: -0.2222222222rem;
}
.bz-city-hall .buildings-list .flex:last-child .city-details-half-divider,
.bz-city-hall .improvements-list .city-details-half-divider,
.bz-city-hall .wonders-list .city-details-half-divider {
    display: none;
}
.bz-city-hall .text-gradient-secondary {
    fxs-font-gradient-color: ${BZ_COLOR.bronze1};
    color: ${BZ_COLOR.bronze2};
}
.bz-city-hall #${cityDetailTabID.overview} .shadow {
    filter: drop-shadow(0 0.0555555556rem 0.0555555556rem black);
}
.bz-city-hall .panel-city-details .bz-cycle-city {
    position: relative;
    z-index: 1;
}
.bz-city-hall .panel-city-details.bz-nav-help .bz-cycle-city {
    top: 0.6111111111rem;
    left: 1rem;
}
.bz-city-hall .panel-city-details.bz-no-help .bz-cycle-city {
    top: 0.6111111111rem;
    left: 1rem;
}
.bz-overview-entry, .bz-city-hall .growth-entry {
    border-radius: 2rem;
}
.bz-city-hall .bz-overview-entry.bz-odd-row {
    background-color: ${BZ_COLOR.bronze6}99;
}
.bz-overview-entry:focus, .bz-overview-entry:hover, .bz-overview-entry.pressed {
    background: linear-gradient(90deg, #6b6250 0%, #545559 100%);
}
`,
];
BZ_HEAD_STYLE.map(style => {
    const e = document.createElement("style");
    e.textContent = style;
    document.head.appendChild(e);
});
document.body.classList.add("bz-city-hall");

function docIcon(image, size, resize, ...style) {
    // create an icon to fit size (with optional image resizing)
    const icon = document.createElement("div");
    icon.classList.value = "relative bg-contain bg-no-repeat shadow";
    if (style.length) icon.classList.add(...style);
    icon.style.height = size;
    icon.style.width = size;
    // note: this sets image width and auto height
    if (resize && resize != size) icon.style.backgroundSize = resize;
    icon.style.backgroundPosition = "center";
    icon.style.backgroundImage =
        image.startsWith("url(") ? image : UI.getIconCSS(image);
    return icon;
}
function docText(text, style) {
    const e = document.createElement("div");
    if (style) e.classList.value = style;
    e.setAttribute("data-l10n-id", text);
    return e;
}
function docTimer(size, resize, ...style) {
    if (!style.length) style = ["-mx-1"];
    return docIcon(BZ_ICON_TIMER, size, resize, ...style);
}
function dotJoin(list) {
    return localeJoin(list, BZ_DOT_JOINER);
}
function localeJoin(list, divider=" ") {
    return list.map(s => s && Locale.compose(s)).filter(e => e).join(divider);
}
function getFontMetrics() {
    // TODO: remove unneeded stuff
    const sizes = (rem, round=Math.round) => {
        const css = `${rem.toFixed(10)}rem`;
        const base = round(rem * BASE_FONT_SIZE);
        const scale = round(rem * GlobalScaling.currentScalePx);
        const px = `${scale}px`;
        return { rem, css, base, scale, px, };
    }
    // global metrics
    const padding = sizes(BZ_PADDING);
    const margin = sizes(BZ_MARGIN);  // top & bottom of each block
    padding.x = sizes(padding.rem);
    padding.y = sizes(padding.rem - margin.rem);  // room for end block margins
    padding.banner = sizes(padding.rem / 3);  // extra padding for banners
    const border = sizes(BZ_BORDER);
    // font metrics
    const font = (name, ratio=BZ_FONT_SPACING, cratio=3/4) => {
        const rem = typeof name === "string" ?
            GlobalScaling.getFontSizePx(name) / BASE_FONT_SIZE : name;
        const size = sizes(rem);  // font size
        const cap = sizes(size.rem * cratio);  // cap height
        const spacing = sizes(size.rem * ratio);  // line height
        const leading = sizes(spacing.rem - size.rem);  // interline spacing
        leading.half = sizes(leading.rem / 2);  // half-leading
        leading.internal = sizes((spacing.rem - cap.rem) / 2);  // space above caps
        const margin = sizes(BZ_MARGIN - leading.internal.rem);
        const figure = sizes(0.6 * size.rem, Math.ceil);  // figure width
        const digits = (n) => sizes(n * figure.rem, Math.ceil);
        return { size, ratio, cap, spacing, leading, margin, figure, digits, };
    }
    const head = font("base", 1.25);
    const body = font("base", 1.25);
    const note = font("sm", 1);
    const rules = font("base");
    rules.width = sizes(BZ_RULES_WIDTH);
    const table = font("base");
    const yields = font(8/9);
    const radius = sizes(2/3 * padding.rem);
    radius.content = sizes(radius.rem);
    radius.tooltip = sizes(radius.rem + border.rem);
    // minimum end banner height to avoid radius glitches
    const bumper = sizes(Math.max(table.spacing.rem, 2*radius.rem));
    const isIdeographic = Locale.getCurrentDisplayLocale().startsWith("zh_");
    return {
        sizes, font,
        padding, margin, border,
        head, body, note, rules, table, yields,
        radius, bumper, isIdeographic,
    };
}
function getTownFocus(city) {
    const ptype = city.Growth?.projectType ?? null;
    const info = ptype && GameInfo.Projects.lookup(ptype);
    const isGrowing = !info || city.Growth?.growthType == GrowthTypes.EXPAND;
    const town = "LOC_CAPITAL_SELECT_PROMOTION_NONE";
    const growth = "LOC_UI_FOOD_CHOOSER_FOCUS_GROWTH";
    const name = info?.Name ?? town;
    const note = isGrowing && name != growth ? growth : null;
    const icon = isGrowing ? "PROJECT_GROWTH" : info.ProjectType;
    return { isGrowing, name, note, icon, info, };
}
const BZ_PRELOADED_ICONS = {};
function preloadIcon(icon, context) {
    if (!icon) return;
    const url = icon.startsWith("url(") ? icon : UI.getIcon(icon, context);
    const name = url.replace(/url|[(\042\047)]/g, "");  // \042\047 = quotation marks
    if (!name || name in BZ_PRELOADED_ICONS) return;
    BZ_PRELOADED_ICONS[name] = true;
    Controls.preloadImage(name, "plot-tooltip");
}

// PanelCityDetails decorator
class bzPanelCityDetails {
    static c_prototype;
    static c_renderBuildingSlot;
    static c_addConstructibleData;
    static c_addDistrictData;
    static c_renderYieldsSlot;
    static lastTab = 0;
    static tableWidth = 0;
    tabs;
    slots;
    cityDetailsSlot;
    panelProductionSlot;
    focusRoot;
    focusInListener = this.onFocusIn.bind(this);
    updateListener = this.updateOverview.bind(this);
    onCityLinkListener = this.onCityLink.bind(this);
    constructor(component) {
        this.component = component;
        component.bzComponent = this;
        this.patchPrototypes(this.component);
        // replace onFocus to override default slot
        this.component.onFocus = () => {
            this.syncFocus(true);
            this.selectTab(bzPanelCityDetails.lastTab, true);
        };
        // remember last tab
        this.onTabSelected = (e) => {
            bzPanelCityDetails.lastTab = e.detail.index;
        };
        Loading.runWhenFinished(() => {
            const icons = [
                BZ_ICON_CITY, BZ_ICON_TOWN, BZ_ICON_RURAL,
                BZ_ICON_URBAN, BZ_ICON_SPECIAL, BZ_ICON_TIMER,
            ];
            for (const y of icons) preloadIcon(y);
        });
    }
    patchPrototypes(component) {
        const c_prototype = Object.getPrototypeOf(component);
        if (bzPanelCityDetails.c_prototype == c_prototype) return;
        // patch PanelCityDetails methods
        const proto = bzPanelCityDetails.c_prototype = c_prototype;
        // wrap render method to extend it
        const c_render = proto.render;
        const after_render = this.afterRender;
        proto.render = function(...args) {
            const c_rv = c_render.apply(this, args);
            const after_rv = after_render.apply(this.bzComponent, args);
            return after_rv ?? c_rv;
        }
        // wrap update method to extend it
        const c_update = proto.update;
        const before_update = this.beforeUpdate;
        proto.update = function(...args) {
            const before_rv = before_update.apply(this.bzComponent, args);
            const c_rv = c_update.apply(this, args);
            return c_rv ?? before_rv;
        }
        // also replace listener with patched version
        component.updateCityDetailersListener = component.update.bind(component);
        // replace vanilla methods for city-details-tab-buildings
        bzPanelCityDetails.c_renderBuildingSlot = proto.renderBuildingSlot;
        proto.renderBuildingSlot = function(...args) {
            return this.bzComponent.renderBuildingSlot(...args);
        }
        bzPanelCityDetails.c_addConstructibleData = proto.addConstructibleData;
        proto.addConstructibleData = function(...args) {
            return this.bzComponent.addConstructibleData(...args);
        }
        bzPanelCityDetails.c_addDistrictData = proto.addDistrictData;
        proto.addDistrictData = function(...args) {
            return this.bzComponent.addDistrictData(...args);
        }
        // replace component.renderYieldsSlot to fix a bug
        bzPanelCityDetails.c_renderYieldsSlot = proto.renderYieldsSlot;
        proto.renderYieldsSlot = function() {
            return this.bzComponent.renderYieldsSlot();
        }
    }
    patchTabSlots() {
        const tabItems = this.component.tabBar.getAttribute("tab-items");
        const tabs = JSON.parse(tabItems);
        // replace city-detail-tabs-buildings
        tabs.forEach((tab, index) => {
            if (tab.id == cityDetailTabID.buildings) {
                tabs.splice(index + 1, 0, BZ_TAB_CONSTRUCTIBLES);
            }
        });
        // add Overview tab
        tabs.unshift(BZ_TAB_OVERVIEW);
        this.component.tabBar.setAttribute("tab-items", JSON.stringify(tabs));
        // store updated tabs
        this.tabs = tabs;
    }
    selectTab(index, focus=false) {
        this.component.tabBar.setAttribute("selected-tab-index", index.toString());
        const tab = this.tabs.at(index);
        const slot = this.slots.at(index);
        if (!tab?.id || !slot) return;
        this.component.slotGroup.setAttribute("selected-slot", tab.id);
        this.component.Root.classList.toggle("trigger-nav-help", focus);
        if (!focus) return;
        FocusManager.setFocus(slot);
    }
    // empty decorators
    beforeAttach() {
        this.component.Root.classList.remove("trigger-nav-help");
        // get focus root and verify that it contains both panels
        this.panelProductionSlot = MustGetElement(".panel-production-slot", document);
        const focusRoot = this.focusRoot = this.panelProductionSlot.parentNode;
        this.cityDetailsSlot = MustGetElement(".panel-city-details-slot", focusRoot);
    }
    afterDetach() { }
    // attach new & replaced tabs to the panel
    afterAttach() {
        metrics = getFontMetrics();
        this.focusRoot.addEventListener("focusin", this.focusInListener);
        window.addEventListener(bzUpdateCityDetailsEventName, this.updateListener);
        window.addEventListener(UpdateCityDetailsEventName, this.updateListener);
        // slots by index
        this.slots = this.tabs.map(t => MustGetElement(`#${t.id}`, this.component.Root));
        // overview
        const oslot = this.overviewSlot =
            MustGetElement(`#${cityDetailTabID.overview}`, this.component.Root);
        this.growthContainer = MustGetElement(".growth-container", oslot);
        this.connectionsContainer = MustGetElement(".connections-container", oslot);
        this.improvementsContainer = MustGetElement(".improvements-container", oslot);
        // constructibles
        const cslot = this.constructibleSlot =
            MustGetElement(`#${cityDetailTabID.constructibles}`, this.component.Root);
        this.buildingsCategory = MustGetElement(".bz-buildings-category", cslot);
        this.buildingsList = MustGetElement(".bz-buildings-list", cslot);
        this.improvementsCategory = MustGetElement(".bz-improvements-category", cslot);
        this.improvementsList = MustGetElement(".bz-improvements-list", cslot);
        this.wondersCategory = MustGetElement(".bz-wonders-category", cslot);
        this.wondersList = MustGetElement(".bz-wonders-list", cslot);
        // enable navigation back to the left panel
        this.slots.forEach(slot => slot.removeAttribute("data-navrule-left"));
        // select tab
        this.component.tabBar.addEventListener("tab-selected", this.onTabSelected);
        this.selectTab(bzPanelCityDetails.lastTab);
        this.update();
    }
    beforeDetach() {
        this.component.tabBar.removeEventListener("tab-selected", this.onTabSelected);
        this.focusRoot.removeEventListener("focusin", this.focusInListener);
        window.removeEventListener(bzUpdateCityDetailsEventName, this.updateListener);
        window.removeEventListener(UpdateCityDetailsEventName, this.updateListener);
    }
    // render new & replaced tabs
    afterRender() {
        this.patchTabSlots();
        this.renderOverviewSlot();
        this.renderConstructibleSlot();
        // adjust arrow buttons
        const c = this.component;
        c.prevCityButton.classList.add("bz-prev-city", "bz-cycle-city");
        c.nextCityButton.classList.add("bz-next-city", "bz-cycle-city");
    }
    renderOverviewSlot() {
        const slot = document.createElement("fxs-vslot");
        slot.classList.add("mt-3", "pr-4");
        // slot.setAttribute("data-navrule-right", "stop");
        slot.id = cityDetailTabID.overview;
        slot.innerHTML = `
        <fxs-scrollable class="w-full">
            <div class="growth-container flex flex-col ml-6"></div>
            ${BZ_DIVIDER}
            <div class="connections-container flex flex-col ml-6"></div>
            ${BZ_DIVIDER}
            <div class="improvements-container flex flex-col ml-6"></div>
        </fxs-scrollable>
        `;
        this.component.slotGroup.appendChild(slot);
    }
    renderBuildingSlot() {
        const slot = document.createElement("fxs-vslot");
        slot.classList.add("pr-4");
        slot.setAttribute("data-navrule-right", "stop");
        slot.id = "city-details-tab-buildings" /* buildings */;
        slot.innerHTML = `
        <fxs-scrollable>
            <div class="flex flex-col w-full mb-2">
                <div class="buildings-category flex mt-2">
                    <fxs-icon class="size-12 ml-3 my-1" data-icon-id="CITY_BUILDINGS_LIST"></fxs-icon>
                    <div class="self-center font-title text-lg uppercase text-gradient-secondary ml-2" data-l10n-id="LOC_UI_CITY_DETAILS_BUILDINGS"></div>
                </div>
                <div class="buildings-list flex-col"></div>
                <div class="improvements-category flex-col mt-1">
                    ${BZ_DIVIDER}
                    <div class="flex">
                        <fxs-icon class="size-12 ml-3 my-1" data-icon-id="CITY_IMPROVEMENTS_LIST"></fxs-icon>
                        <div class="self-center font-title text-lg uppercase text-gradient-secondary ml-2" data-l10n-id="LOC_UI_CITY_DETAILS_IMPROVEMENTS"></div>
                    </div>
                </div>
                <div class="improvements-list flex-col"></div>
                <div class="wonders-category flex-col mt-1">
                    ${BZ_DIVIDER}
                    <div class="flex">
                        <fxs-icon class="size-12 ml-3 my-1" data-icon-id="CITY_WONDERS_LIST"></fxs-icon>
                        <div class="self-center font-title text-lg uppercase text-gradient-secondary ml-2" data-l10n-id="LOC_UI_CITY_DETAILS_WONDERS"></div>
                    </div>
                </div>
                <div class="wonders-list flex-col"></div>
            </div>
        </fxs-scrollable>
        `;
        this.component.slotGroup.appendChild(slot);
    }
    renderConstructibleSlot() {
        const slot = document.createElement("fxs-vslot");
        slot.classList.add("pr-4");
        slot.setAttribute("data-navrule-right", "stop");
        slot.id = cityDetailTabID.constructibles;
        slot.innerHTML = `
        <fxs-scrollable>
            <div class="flex flex-col w-full mb-2">
                <div class="bz-buildings-category flex mt-2">
                    <fxs-icon class="size-12 ml-3 my-1" data-icon-id="CITY_BUILDINGS_LIST"></fxs-icon>
                    <div class="self-center font-title text-lg uppercase text-gradient-secondary ml-2" data-l10n-id="LOC_UI_CITY_DETAILS_BUILDINGS"></div>
                </div>
                <div class="bz-buildings-list flex-col"></div>
                <div class="bz-improvements-category flex mt-1">
                    <fxs-icon class="size-12 ml-3 my-1" data-icon-id="CITY_IMPROVEMENTS_LIST"></fxs-icon>
                    <div class="self-center font-title text-lg uppercase text-gradient-secondary ml-2" data-l10n-id="LOC_UI_CITY_DETAILS_IMPROVEMENTS"></div>
                </div>
                <div class="bz-improvements-list flex-col"></div>
                <div class="bz-wonders-category flex mt-1">
                    <fxs-icon class="size-12 ml-3 my-1" data-icon-id="CITY_WONDERS_LIST"></fxs-icon>
                    <div class="self-center font-title text-lg uppercase text-gradient-secondary ml-2" data-l10n-id="LOC_UI_CITY_DETAILS_WONDERS"></div>
                </div>
                <div class="bz-wonders-list flex-col"></div>
            </div>
        </fxs-scrollable>
        `;
        this.component.slotGroup.appendChild(slot);
    }
    // fixes a mismatched tag in the base-standard function
    renderYieldsSlot() {
        const slot = document.createElement("fxs-vslot");
        slot.classList.add("pr-4");
        slot.setAttribute("data-navrule-left", "stop");
        slot.setAttribute("data-navrule-right", "stop");
        slot.id = cityDetailTabID.yields;
        // bugfix: game code incorrectly closes this with </div>
        slot.innerHTML = `
            <fxs-scrollable class="yields-scrollable">
                <div class="yields-container w-full"></div>
            </fxs-scrollable>
        `;
        this.component.slotGroup.appendChild(slot);
    }
    beforeUpdate() {
        // sort constructibles before rendering
        const buildings = CityDetails.buildings;
        const improvements = CityDetails.improvements;
        const wonders = CityDetails.wonders;
        bzCityDetails.sortConstructibles(buildings, improvements, wonders);
        // fix controller focus
        const c = this.component;
        const hasFocus = this.component.Root.contains(FocusManager.getFocus());
        c.Root.classList.toggle("trigger-nav-help", hasFocus);
        Databind.classToggle(c.Root, "bz-no-help", "!{{g_NavTray.isTrayRequired}}");
        Databind.classToggle(c.Root, "bz-nav-help", "{{g_NavTray.isTrayRequired}}");
    }
    // update data model for new tab slot
    updateOverview() {
        this.updateConstructibles();  // TODO: remove this
        // Flag so we can give the overview back focus after updating
        const overviewHasFocus = this.overviewSlot.contains(FocusManager.getFocus());
        this.renderGrowth(this.growthContainer);
        this.renderConnections(this.connectionsContainer);
        this.renderImprovements(this.improvementsContainer);
        if (overviewHasFocus) FocusManager.setFocus(this.overviewSlot);
    }
    renderGrowth(container) {
        container.innerHTML = "";
        container.style.lineHeight = metrics.table.ratio;
        this.renderTitleHeading(container, "LOC_UI_CITY_DETAILS_GROWTH_TAB");
        if (!bzCityDetails.growth) return;
        const { food, pop, religion, } = bzCityDetails.growth;
        const layout = [
            {
                icon: pop.isTown ? BZ_ICON_TOWN : BZ_ICON_CITY,
                label: "LOC_UI_CITY_STATUS_POPULATION_TITLE",
                value: pop.total.toFixed(),
            },
            {
                icon: religion.urban?.icon ?? BZ_ICON_URBAN,
                label: "LOC_UI_CITY_STATUS_URBAN_POPULATION",
                value: pop.urban.toFixed(),
            },
            {
                icon: religion.rural?.icon ?? BZ_ICON_RURAL,
                label: "LOC_UI_CITY_STATUS_RURAL_POPULATION",
                value: pop.rural.toFixed(),
            },
            {
                icon: BZ_ICON_SPECIAL,
                label: "LOC_UI_SPECIALISTS_SUBTITLE",
                value: pop.specialists.toFixed(),
            },
        ];
        const size = metrics.table.spacing.css;
        const small = metrics.sizes(5/6 * metrics.table.spacing.rem).css;
        if (food.isGrowing) {
            const row = document.createElement("div");
            row.classList.value = "bz-overview-entry self-start flex px-1 -mx-1";
            row.style.backgroundColor = `${BZ_COLOR.food}55`;
            row.style.minHeight = size;
            row.style.marginTop = metrics.body.leading.half.px;
            row.setAttribute("tabindex", "-1");
            row.setAttribute("role", "paragraph");
            row.appendChild(docIcon("YIELD_FOOD", size, small, "-mx-1"));
            const current = Locale.compose("LOC_BZ_GROUPED_DIGITS", food.current);
            const threshold = Locale.compose("LOC_BZ_GROUPED_DIGITS", food.threshold);
            const progress = `${current} / ${threshold}`;
            row.appendChild(docText(progress, "text-left flex-auto ml-2"));
            row.appendChild(docText(BZ_DOT_JOINER));
            row.appendChild(docText(food.turns.toFixed(), "mr-1 text-right"));
            row.appendChild(docTimer(size, size));
            container.appendChild(row);
        }
        const table = document.createElement("div");
        table.classList.value = "flex-col justify-start text-base -mx-1";
        table.style.marginBottom = metrics.table.margin.px;
        for (const item of layout) {
            const row = document.createElement("div");
            row.classList.value = "bz-overview-entry flex px-1";
            row.style.minHeight = size;
            row.setAttribute("tabindex", "-1");
            row.setAttribute("role", "paragraph");
            row.appendChild(docIcon(item.icon, size, small, "-mx-1"));
            row.appendChild(docText(item.label, "text-left flex-auto mx-2"));
            const value = docText(item.value, "mx-1 text-right");
            // keep width stable when flipping through cities
            value.style.minWidth = metrics.table.digits(2).css;
            row.appendChild(value);
            table.appendChild(row);
        }
        // wrap table to keep it from expanding to full width
        const wrap = document.createElement("div");
        wrap.classList.value = "flex justify-start";
        wrap.appendChild(table);
        container.appendChild(wrap);
    }
    renderConnections(container) {
        container.innerHTML = "";
        container.style.lineHeight = metrics.table.ratio;
        // show settlement count in the title
        const total = bzCityDetails.connections?.settlements?.length ?? 0;
        const title = dotJoin(["LOC_BZ_SETTLEMENT_CONNECTIONS", total.toFixed()]);
        this.renderTitleHeading(container, title);
        if (!total) return;
        const size = metrics.table.spacing.css;
        const small = metrics.sizes(2/3 * metrics.table.spacing.rem).css;
        const table = document.createElement("div");
        table.classList.value = "flex justify-start text-base -mx-1";
        const rows = [];
        const connections = [
            ...bzCityDetails.connections.cities,
            ...bzCityDetails.connections.growing,
            ...bzCityDetails.connections.focused,
        ];
        for (const conn of connections) {
            const row = document.createElement("fxs-activatable");
            row.classList.value = "bz-overview-entry bz-city-link relative flex justify-start pr-1";
            row.style.minHeight = size;
            row.setAttribute("tabindex", "-1");
            row.setAttribute("role", "paragraph");
            row.setAttribute("bz-city-id", JSON.stringify(conn.id));
            row.addEventListener("action-activate", this.onCityLinkListener);
            if (conn.isTown) {
                const focus = getTownFocus(conn);
                row.appendChild(docIcon(focus.icon, size, size));
            } else {
                row.appendChild(docIcon(BZ_ICON_CITY, size, small));
            }
            const name = document.createElement("div");
            name.classList.value = "mx-1 text-left";
            name.setAttribute("data-l10n-id", conn.name);
            row.appendChild(name);
            rows.push(row);
        }
        const columns = [];
        const half = rows.length < 5 ? rows.length : Math.ceil(rows.length / 2);
        columns.push(rows.slice(0, half));
        if (half < rows.length) columns.push(rows.slice(half));
        for (const [i, column] of columns.entries()) {
            const col = document.createElement("div");
            col.classList.value = "flex-col justify-start";
            if (i) col.classList.add("ml-3");  // aligns well in Chinese
            for (const row of column) col.appendChild(row);
            table.appendChild(col);
        }
        table.style.marginBottom = metrics.table.margin.px;
        container.appendChild(table);
    }
    renderImprovements(container) {
        container.innerHTML = "";
        container.style.lineHeight = metrics.table.ratio;
        this.renderTitleHeading(container,
            "LOC_BUILDING_PLACEMENT_WAREHOUSE_YIELDS_HEADER");
        if (!bzCityDetails.improvements?.length) {
            container.appendChild(docText("LOC_TERM_NONE"));
            return;
        }
        const size = metrics.table.spacing.css;
        const small = metrics.sizes(5/6 * metrics.table.spacing.rem).css;
        const table = document.createElement("div");
        table.classList.value = "flex-col justify-start text-base -mx-1";
        table.style.marginBottom = metrics.table.margin.px;
        table.style.minWidth = bzPanelCityDetails.tableWidth;
        for (const [i, item] of bzCityDetails.improvements.entries()) {
            const row = document.createElement("div");
            row.classList.value = "bz-overview-entry flex px-1";
            if (!(i % 2)) row.classList.add("bz-odd-row");
            row.style.minHeight = size;
            row.setAttribute("tabindex", "-1");
            row.setAttribute("role", "paragraph");
            row.appendChild(docIcon(item.icon, size, small, "-mx-1"));
            row.appendChild(docText(item.name, "text-left flex-auto mx-2"));
            const modifier = `+${item.count.toFixed()}`;
            const value = docText(modifier, "mx-1 text-right");
            row.appendChild(value);
            table.appendChild(row);
        }
        requestAnimationFrame(() => {
            const gcol = this.growthContainer.querySelector(".flex-col");
            const gwidth = gcol?.clientWidth;
            if (!gwidth) return;
            table.style.minWidth = bzPanelCityDetails.tableWidth = `${gwidth}px`;
        });
        // wrap table to keep it from expanding to full width
        const wrap = document.createElement("div");
        wrap.classList.value = "flex justify-start";
        wrap.appendChild(table);
        container.appendChild(wrap);
    }
    renderTitleHeading(container, text) {
        if (!text) return;
        const layout = document.createElement("div");
        layout.classList.value = "text-secondary font-title-base uppercase";
        layout.style.lineHeight = metrics.head.ratio;
        layout.style.marginTop = metrics.head.margin.px;
        const ttText = document.createElement("div");
        ttText.setAttribute("data-l10n-id", text);
        layout.appendChild(ttText);
        container.appendChild(layout);
    }
    // update data model for alternate Constructibles tab slot
    updateConstructibles() {
        // Flag so we can give the constructibles back focus after updating
        const constructiblesHaveFocus = this.constructibleSlot.contains(FocusManager.getFocus());
        // sort the data from CityDetails
        const buildings = CityDetails.buildings;
        const improvements = CityDetails.improvements;
        const wonders = CityDetails.wonders;
        bzCityDetails.sortConstructibles(buildings, improvements, wonders);
        // Buildings
        const shouldShowBuildings = buildings.length > 0;
        this.buildingsCategory.classList.toggle("hidden", !shouldShowBuildings);
        this.buildingsList.innerHTML = "";
        for (const building of buildings) {
            this.buildingsList.appendChild(this.addDistrictData(building));
            this.buildingsList.appendChild(this.component.createDivider());
        }
        // Improvements
        const shouldShowImprovements = improvements.length > 0;
        this.improvementsCategory.classList.toggle("hidden", !shouldShowImprovements);
        this.improvementsList.innerHTML = "";
        for (const improvement of improvements) {
            this.improvementsList.appendChild(this.addConstructibleData(improvement));
        }
        // Wonders
        const shouldShowWonders = wonders.length > 0;
        this.wondersCategory.classList.toggle("hidden", !shouldShowWonders);
        this.wondersList.innerHTML = "";
        for (const wonder of wonders) {
            this.wondersList.appendChild(this.addConstructibleData(wonder));
        }
        // separate improvements & wonders if we have both
        if (shouldShowImprovements && shouldShowWonders) {
            this.improvementsList.appendChild(this.component.createDivider());
        }
        if (constructiblesHaveFocus) {
            FocusManager.setFocus(this.constructibleSlot);
        }
    }
    addDistrictData(districtData) {
        const mainDiv = document.createElement("div");
        mainDiv.classList.add("flex", "flex-col");
        if (districtData.name && districtData.description) {
            const uniqueQuarterContainer = document.createElement("div");
            uniqueQuarterContainer.classList.add("flex");
            mainDiv.appendChild(uniqueQuarterContainer);
            const uniqueQuarterIcon = document.createElement("fxs-icon");
            uniqueQuarterIcon.classList.add("size-12", "ml-3");
            uniqueQuarterIcon.setAttribute("data-icon-context", "DEFAULT");
            uniqueQuarterIcon.setAttribute("data-icon-id", "CITY_UNIQUE_QUARTER");
            uniqueQuarterContainer.appendChild(uniqueQuarterIcon);
            const uniqueQuarterTextContainer = document.createElement("div");
            uniqueQuarterTextContainer.classList.add("flex", "flex-col", "flex-auto", "mx-2");
            uniqueQuarterContainer.appendChild(uniqueQuarterTextContainer);
            const districtName = document.createElement("div");
            districtName.classList.add("my-1", "font-title", "uppercase", "text-xs");
            districtName.innerHTML = districtData.name;
            uniqueQuarterTextContainer.appendChild(districtName);
            const districtDescription = document.createElement("div");
            districtDescription.classList.add("text-xs", "leading-normal");
            districtDescription.innerHTML = districtData.description;
            uniqueQuarterTextContainer.appendChild(districtDescription);
        }
        for (const constructibleData of districtData.constructibleData) {
            mainDiv.appendChild(this.addConstructibleData(constructibleData));
        }
        return mainDiv;
    }
    addConstructibleData(constructibleData) {
        const mainDiv = document.createElement("fxs-activatable");
        mainDiv.classList.add("constructible-entry", "flex", "flex-col");
        mainDiv.setAttribute("tabindex", "-1");
        mainDiv.setAttribute("data-type", constructibleData.type);
        mainDiv.setAttribute("data-tooltip-style", "production-constructible-tooltip");
        const topDiv = document.createElement("div");
        topDiv.classList.add("constructible-entry-highlight", "flex", "my-1", "pointer-events-none", "items-center");
        const icon = document.createElement("fxs-icon");
        icon.classList.add("size-12", "ml-3");
        icon.setAttribute("data-icon-context", constructibleData.iconContext);
        icon.setAttribute("data-icon-id", constructibleData.icon);
        topDiv.appendChild(icon);
        const rightContainer = document.createElement("div");
        rightContainer.classList.add("flex-auto", "flex", "flex-col", "relative", "mx-2");
        const nameContainer = document.createElement("div");
        nameContainer.classList.add("flex", "center");
        rightContainer.appendChild(nameContainer);
        const name = document.createElement("div");
        name.classList.add("font-title", "uppercase", "text-xs");
        name.textContent = Locale.compose(constructibleData.name);
        nameContainer.appendChild(name);
        const yieldAdjustContainer = document.createElement("div");
        yieldAdjustContainer.classList.add("flex", "justify-between");
        const yieldContainer = document.createElement("div");
        yieldContainer.classList.add("flex-auto", "flex", "flex-wrap", "items-center", "-ml-1");
        const maintenanceContainer = document.createElement("div");
        maintenanceContainer.classList.add("flex", "justify-end", "items-center");
        if (constructibleData.damaged) {
            const damagedText = document.createElement("div");
            // display warning in a yellow capsule
            damagedText.classList.value = "uppercase text-xs px-2 mr-1 rounded-full";
            damagedText.style.lineHeight = 1.25;
            damagedText.style.backgroundColor = BZ_COLOR.caution;
            damagedText.style.color = BZ_COLOR.black;
            damagedText.setAttribute("data-l10n-id",
                "LOC_UI_CITY_DETAILS_BUILDING_DAMAGED");
            yieldContainer.appendChild(damagedText);
        }
        if (constructibleData.yieldMap) {
            for (const [_yieldType, yieldData] of constructibleData.yieldMap) {
                if (yieldData.icon && yieldData.iconContext) {
                    const yieldEntry = document.createElement("div");
                    yieldEntry.classList.add("flex", "mr-2");
                    yieldContainer.appendChild(yieldEntry);
                    const yieldIcon = document.createElement("fxs-icon");
                    yieldIcon.setAttribute("data-icon-context", yieldData.iconContext);
                    yieldIcon.setAttribute("data-icon-id", yieldData.icon);
                    yieldIcon.classList.add("size-6");
                    yieldEntry.appendChild(yieldIcon);
                    const yieldValue = document.createElement("div");
                    yieldValue.classList.add("text-xs", "self-center");
                    yieldValue.textContent = Locale.compose("LOC_UI_CITY_DETAILS_YIELD_ONE_DECIMAL", yieldData.value);
                    yieldEntry.appendChild(yieldValue);
                }
            }
        }
        yieldAdjustContainer.appendChild(yieldContainer);
        if (constructibleData.maintenanceMap) {
            // const maintenanceText = document.createElement("div");
            // maintenanceText.classList.add("text-xs");
            // maintenanceText.textContent = Locale.compose("LOC_UI_PRODUCTION_BUILDING_MAINTENANCE");
            // maintenanceContainer.appendChild(maintenanceText);
            for (const [_maintenanceType, maintenanceData] of constructibleData.maintenanceMap) {
                if (maintenanceData.icon && maintenanceData.iconContext) {
                    const maintenanceEntry = document.createElement("div");
                    maintenanceEntry.classList.add("flex", "mr-2");
                    maintenanceContainer.appendChild(maintenanceEntry);
                    const maintenanceIcon = document.createElement("fxs-icon");
                    maintenanceIcon.setAttribute("data-icon-context", maintenanceData.iconContext);
                    maintenanceIcon.setAttribute("data-icon-id", maintenanceData.icon);
                    maintenanceIcon.classList.add("size-6");
                    maintenanceEntry.appendChild(maintenanceIcon);
                    const maintenanceValue = document.createElement("div");
                    maintenanceValue.classList.add("text-xs", "self-center", "text-negative-light");
                    maintenanceValue.textContent = Locale.compose("LOC_UI_CITY_DETAILS_YIELD_ONE_DECIMAL", maintenanceData.value);
                    maintenanceEntry.appendChild(maintenanceValue);
                }
            }
        }
        yieldAdjustContainer.appendChild(maintenanceContainer);
        rightContainer.appendChild(yieldAdjustContainer);
        mainDiv.setAttribute("data-constructible-data", JSON.stringify(constructibleData));
        mainDiv.addEventListener("mouseover", this.component.mouseOverBuildingListener);
        mainDiv.addEventListener("mouseout", this.component.mouseOutBuildingListener);
        mainDiv.addEventListener("focus", this.component.focusBuildingListener);
        mainDiv.addEventListener("focusout", this.component.focusOutBuildingListener);
        mainDiv.addEventListener("action-activate", this.component.activateBuildingListener);
        topDiv.appendChild(rightContainer);
        mainDiv.appendChild(topDiv);
        return mainDiv;
    }
    syncFocus(focus) {
        this.component.Root.classList.toggle("trigger-nav-help", focus);
        NavTray.clear();
        NavTray.addOrUpdateGenericBack();
        if (focus) {
            // clear production-chooser focus
            this.panelProductionSlot.querySelectorAll(".trigger-nav-help")
                .forEach((e) => e.classList.remove("trigger-nav-help"));
        }
    }
    onFocusIn(event) {
        const hadFocus = this.component.Root.classList.contains("trigger-nav-help");
        const gotFocus = this.component.Root.contains(event.target);
        if (gotFocus != hadFocus) this.syncFocus(gotFocus);
        // fix focus when returning to City Details tabs
        if (event.target.tagName == "FXS-VSLOT" && event.target.id) {
            const index = this.component.tabBar.getAttribute("selected-tab-index");
            const tab = this.tabs.at(index);  // string index coerced to integer
            if (tab && tab.id != event.target.id) {
                // switch focus to the selected tab
                setTimeout(() => FocusManager.setFocus(this.slots.at(index)));
            }
        }
    }
    onCityLink(event) {
        // get the linked cityID and select the city
        const linkID = event.target.getAttribute("bz-city-id");
        if (linkID) UI.Player.selectCity(JSON.parse(linkID));
    }
}
Controls.decorate("panel-city-details", (val) => new bzPanelCityDetails(val));
