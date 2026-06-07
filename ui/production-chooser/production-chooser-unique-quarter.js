import '../../ui-next/components/production-chooser-unique-quarter-item.js';

class UniqueQuarter {
  root = document.createElement("div");
  item = document.createElement("production-chooser-unique-quarter-item");
  buildingContainer = document.createElement("div");
  buildingElementOne = void 0;
  buildingElementTwo = void 0;
  set definition(value) {
    this.item.setAttribute("data-name", value.Name);
    this.item.setAttribute("data-description", value.Description);
  }
  set numCompleted(value) {
    this.item.setAttribute("data-current-completed", value.toString());
  }
  constructor() {
    this.root.className = "production-chooser__unique-quarter relative flex flex-col pointer-events-auto";
    this.buildingContainer.className = "flex flex-col";
    const uqBarDecor = document.createElement("div");
    uqBarDecor.className = "absolute -left-px h-full w-1\\.5 img-city-tab-line-vert";
    const uqDivider = document.createElement("div");
    uqDivider.className = "production-chooser__unique-quarter-divider";
    this.root.append(this.item, this.buildingContainer, uqBarDecor, uqDivider);
  }
  setBuildings(chooserItemOne, chooserItemTwo) {
    if (this.buildingElementOne == chooserItemOne && this.buildingElementTwo == chooserItemTwo) {
      return;
    }
    this.buildingContainer.innerHTML = "";
    this.buildingElementOne = chooserItemOne;
    this.buildingElementTwo = chooserItemTwo;
    this.buildingContainer.append(this.buildingElementOne, this.buildingElementTwo);
  }
  containsBuilding(item) {
    return this.buildingElementOne == item || this.buildingElementTwo == item;
  }
}

export { UniqueQuarter };
//# sourceMappingURL=production-chooser-unique-quarter.js.map
