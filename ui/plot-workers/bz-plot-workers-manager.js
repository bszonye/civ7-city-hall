import PlotWorkersManager from '/base-standard/ui/plot-workers/plot-workers-manager.js';

const proto = Object.getPrototypeOf(PlotWorkersManager);

// patch PWM.reset() to also reset the city ID
const PWM_reset = proto.reset;
proto.reset = function(...args) {
    PWM_reset.apply(this, args);
    this._cityID = null;
}
