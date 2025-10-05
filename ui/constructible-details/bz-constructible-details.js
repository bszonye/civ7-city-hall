class bzConstructibleDetails {
    static c_prototype;
    constructor(component) {
        this.component = component;
        component.bzComponent = this;
        this.patchPrototypes(component);
    }
    patchPrototypes(component) {
        const c_prototype = Object.getPrototypeOf(component);
        if (bzConstructibleDetails.c_prototype == c_prototype) return;
        // patch PanelCityDetails methods
        const proto = bzConstructibleDetails.c_prototype = c_prototype;
        // wrap render method to extend it
        const c_render = proto.render;
        const after_render = this.afterRender;
        proto.render = function(...args) {
            const c_rv = c_render.apply(this, args);
            const after_rv = after_render.apply(this.bzComponent, args);
            return after_rv ?? c_rv;
        }
    }
    beforeAttach() { }
    afterAttach() { }
    beforeDetach() { }
    afterDetach() { }
    afterRender() {
        const c = this.component;
        c.warehouseBonusContainer.classList.remove("mb-2");
        c.adjacencyBonusContainer.classList.remove("mb-2");
    }
}
Controls.decorate("constructible-details", (c) => new bzConstructibleDetails(c));
for (const adjacency of GameInfo.Constructible_Adjacencies) {
    console.warn(`TRIX ADJ ${JSON.stringify(adjacency)}`);
}
