import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { PlacePopulation } from '/base-standard/ui/place-population/model-place-population.js';
import PlotWorkersManager from '/base-standard/ui/plot-workers/plot-workers-manager.js';
// make sure the vanilla interface loads first
import '/base-standard/ui/interface-modes/interface-mode-acquire-tile.js';

// get registered interface mode object
const ATIM = InterfaceMode.getInterfaceModeHandler("INTERFACEMODE_ACQUIRE_TILE");

// patch ATIM.updateValidPlotsFromUnitID() to fix migrant interface
ATIM.updateValidPlotsFromUnitID = function(id) {
    this.validPlots = [];
    this.cityID = this.getUnitCityID(id);
    PlacePopulation.updateExpandPlotsForResettle(id);
    this.validPlots = PlacePopulation.getExpandPlotsIndexes();
    PlotWorkersManager.initializeWorkersData(this.cityID);
}
