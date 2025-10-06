import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';
import PlotWorkersManager from '/base-standard/ui/plot-workers/plot-workers-manager.js';

const proto = Object.getPrototypeOf(PlotWorkersManager);

PlotWorkersManager._bzWorkerBase = null;
PlotWorkersManager._bzWorkerInfo = new Map();

// patch PWM.reset() to reset base worker info
const PWM_reset = proto.reset;
proto.reset = function(...args) {
    this._bzWorkerBase = null;
    this._bzWorkerInfo = new Map();
    PWM_reset.apply(this, args);
}
// patch PWM.initializeWorkersData() to reset base worker info
const PWM_initializeWorkersData = proto.initializeWorkersData;
proto.initializeWorkersData = function(...args) {
    this._bzWorkerBase = null;
    this._bzWorkerInfo = new Map();
    PWM_initializeWorkersData.apply(this, args);
}
// patch PWM.update() to calculate base changes
proto.update = function() {
    if (!this._cityID) {
        return;
    }
    const city = Cities.get(this._cityID);
    if (!city?.Workers) {
        console.error(
            "plot-workers-manager: Unable to fetch valid city object for city with ID: " + ComponentID.toLogString(this._cityID)
        );
        return;
    }
    this._bzWorkerBase = null;
    this._bzWorkerInfo = new Map();
    this._allWorkerPlots = city.Workers.GetAllPlacementInfo();
    this._allWorkerPlots.forEach((info) => {
        this._allWorkerPlotIndexes.push(info.PlotIndex);
        if (info.IsBlocked) {
            this._blockedPlots.push(info);
            this._blockedPlotIndexes.push(info.PlotIndex);
        } else {
            this._workablePlots.push(info);
            this._workablePlotIndexes.push(info.PlotIndex);
            this.bzUpdateWorkerInfo(info);
        }
    });
    this._cityWorkerCap = city.Workers.getCityWorkerCap();
}
// add PWM.bzUpdateWorkerInfo() to calculate base changes
proto.bzUpdateWorkerInfo = function(info) {
    const netYields = info.NextYields
        .map((amount, i) => amount - info.CurrentYields[i]);
    const netMaintenance = info.NextMaintenance
        .map((amount, i) => info.CurrentMaintenance[i] - amount);
    this._bzWorkerInfo.set(info.PlotIndex, { netYields, netMaintenance });
    this._bzWorkerBase ??= { maxYields: netYields, netYields, netMaintenance };
    const base = this._bzWorkerBase;
    const arrayMax = (a, b) => a.map((v, i) => Math.max(v, b[i]));
    const arrayMin = (a, b) => a.map((v, i) => Math.min(v, b[i]));
    base.maxYields = arrayMax(netYields, base.maxYields);
    base.netYields = arrayMin(netYields, base.netYields);
    base.netMaintenance = arrayMin(netMaintenance, base.netMaintenance);
}
// add PWM.bzGetWorkerChanges() to get net changes from base
proto.bzGetWorkerChanges = function(plotIndex) {
    const info = this._bzWorkerInfo.get(plotIndex);
    if (!info) return void 0;
    const netYields = info.netYields;
    const netMaintenance = info.netMaintenance;
    const base = this._bzWorkerBase;
    const baseYields = base.netYields;
    const baseMaintenance = base.netMaintenance;
    const plotYields = netYields
        .map((amount, i) => amount - base.netYields[i]);
    const plotMaintenance = netMaintenance
        .map((amount, i) => amount - base.netMaintenance[i]);
    const bestYields = base.maxYields;
    const bestPlotYields = bestYields
        .map((amount, i) => amount - base.netYields[i]);
    return {
        netYields,
        netMaintenance,
        baseYields,
        baseMaintenance,
        plotYields,
        plotMaintenance,
        bestYields,
        bestPlotYields,
    };
}
