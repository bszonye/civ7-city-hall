// decorate ProductionChooserScreen to:
// - update the list after selecting repairs (fixes "sticky" repairs)
// - always leave the list open when building repairs
// - remember Production/Purchase tab selection
const BZ_HEAD_STYLE = [
`
.bz-city-hall .panel-production__frame {
    min-width: 28.4444444444rem;
    max-width: 28.4444444444rem;
}
.bz-city-hall .production-chooser__city-details-button {
    position: fixed;
    top: 4rem;
    right: 2rem;
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
    static isCDPanelOpen = false;
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
    beforeAttach() { }
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
}
Controls.decorate('panel-production-chooser', (val) => new bzProductionChooserScreen(val));
