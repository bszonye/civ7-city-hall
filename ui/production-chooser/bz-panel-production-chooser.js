import FocusManager from '../../../core/ui/input/focus-manager.js';
// decorate ProductionChooserScreen to:
// - update the list after selecting repairs (fixes "sticky" repairs)
// - always leave the list open when building repairs
// - remember Production/Purchase tab selection
const BZ_PANEL_WIDTH = 37.3333333333;
// const BZ_PANEL_WIDTH = 28.4444444444;

const BZ_HEAD_STYLE = [
`
.bz-city-hall .panel-production__frame {
    min-width: ${BZ_PANEL_WIDTH}rem;
    max-width: ${BZ_PANEL_WIDTH}rem;
}
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
.bz-city-hall .advisor-recommendation__container .advisor-recommendation__icon {
    width: 1.1111111111rem;
    height: 1.1111111111rem;
}
`,
];
BZ_HEAD_STYLE.map(style => {
    const e = document.createElement('style');
    e.textContent = style;
    document.head.appendChild(e);
});
document.body.classList.add("bz-city-hall");
export class bzProductionChooserScreen {
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
                for (const [_key, list] of Object.entries(value)) {
                    list.sort((a, b) => {
                        // TODO: implement .sortvalue and .sortCost
                        // sort by value (higher absolute value is better)
                        const aValue = a.sortValue ?? 0;
                        const bValue = b.sortValue ?? 0;
                        if (aValue != bValue) {
                            // negative values sort first (repairs & civilians)
                            const dir = aValue < 0 || bValue < 0 ? -1 : +1;
                            return dir * (bValue - aValue);
                        }
                        // sort by cost (lower is better)
                        const aCost = a.sortCost ?? 0;
                        const bCost = b.sortCost ?? 0;
                        if (aCost != bCost) return aCost - bCost;
                        // finally, sort by name
                        const aName = Locale.compose(a.name);
                        const bName = Locale.compose(b.name);
                        return aName.localeCompare(bName);
                    });
                }
                c_items.set.apply(this, [value]);
            },
        };
        Object.defineProperty(proto, "items", items);
    }
    beforeAttach() {
        // replace event handlers to fix nav-help glitches
        this.component.onCityDetailsClosedListener = this.onCityDetailsClosed.bind(this);
        engine.on("input-source-changed", (deviceType, _deviceLayout) => {
            this.onActiveDeviceTypeChanged(deviceType);
        });
    }
    afterAttach() {
        engine.on('ConstructibleChanged', this.component.onConstructibleAddedToMap, this.component);
        // restore the city details panel if it was open previously
        if (bzProductionChooserScreen.isCDPanelOpen && !this.component.isSmallScreen()) {
            this.component.showCityDetails();
        }
    }
    onAttributeChanged(_name, _prev, _next) { }
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
        engine.off('ConstructibleChanged', this.component.onConstructibleAddedToMap, this.component);
    }
    afterRender() {
        const prevButton = this.component.prevCityButton;
        const nextButton = this.component.nextCityButton;
        prevButton.style.position = nextButton.style.position = 'absolute';
        prevButton.style.top = nextButton.style.top = '4.3333333333rem';
        const inset = 1.3333333333;
        const arrow = 1.7777777778;
        prevButton.style.left = `${inset}rem`;
        nextButton.style.left = `${BZ_PANEL_WIDTH - arrow - inset}rem`;
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
Controls.decorate('panel-production-chooser', (val) => new bzProductionChooserScreen(val));
