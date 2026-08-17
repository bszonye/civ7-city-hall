// vim: sw=2 et
import { Audio } from '../../../core/ui/audio-base/audio-support.js';
import { EditableHeaderTextChangedEventName, EditableHeaderExitEditEventName } from '../../../core/ui/components/fxs-editable-header.js';
import ContextManager from '../../../core/ui/context-manager/context-manager.js';
import { DialogBoxManager } from '../../../core/ui/dialog-box/manager-dialog-box.js';
import ActionHandler from '../../../core/ui/input/action-handler.js';
import { Focus } from '../../../core/ui/input/focus-support.js';
import { InputEngineEventName } from '../../../core/ui/input/input-support.js';
import { PlotCursor } from '../../../core/ui/input/plot-cursor.js';
import { InterfaceModeChangedEventName, InterfaceMode } from '../../../core/ui/interface-modes/interface-modes.js';
import NavTray from '../../../core/ui/navigation-tray/model-navigation-tray.js';
import Panel, { AnchorType } from '../../../core/ui/panel-support.js';
import { ComponentID } from '../../../core/ui/utilities/utilities-component-id.js';
import Databind from '../../../core/ui/utilities/utilities-core-databinding.js';
import { MustGetElement, IsElement } from '../../../core/ui/utilities/utilities-dom.js';
import { Layout } from '../../../core/ui/utilities/utilities-layout.js';
import UpdateGate from '../../../core/ui/utilities/utilities-update-gate.js';
import ViewManager from '../../../core/ui/views/view-manager.js';
import { FocusManager } from '../../../core/ui-next/services/focus-manager.js';
import { BuildQueue } from '../build-queue/model-build-queue.js';
import { BuildingPlacementManager } from '../building-placement/building-placement-manager.js';
import { CityDetailsClosedEventName } from '../city-details/panel-city-details.js';
import { ProductionPanelCategory, GetCityBuildReccomendations, GetUniqueQuartersForPlayer, RepairConstruct, SetTownFocus, GetPrevCityID, GetNextCityID, CreateProductionChooserItem, GetNumUniqueQuarterBuildingsCompleted, GetCurrentTownFocus } from './production-chooser-helpers.js';
import { GetProductionItems, Construct } from '/bz-city-hall/ui/production-chooser/bz-production-chooser-helpers.js';
import { ConvertToCity, CanConvertToCity } from './production-chooser-operations.js';
import { UniqueQuarter } from './production-chooser-unique-quarter.js';
import { composeTagString } from '../utilities/utilities-tags.js';
import { FocusCityViewEventName } from '../views/view-city.js';
import styles from './panel-production-chooser.scss.js';
import '../../ui-next/components/production-chooser-item.js';
import '../../ui-next/components/production-chooser-unique-quarter-item.js';
import { TownFocusRefreshEvent } from './panel-town-focus.js';
import { ProductionChooserAccordionSection, ProductionChooserAccordionSectionToggleEventName } from './production-chooser-accordion.js';
import '../yield-bar-base/yield-bar-base.js';
import './town-focus-section.js';
import './town-unrest-display.js';
import './last-production-section.js';
import { DialogBoxAction } from '../../../core/ui/dialog-box/model-dialog-box.js';

const categoryLocalizationMap = {
  [ProductionPanelCategory.BUILDINGS]: "LOC_UI_PRODUCTION_BUILDINGS",
  [ProductionPanelCategory.UNITS]: "LOC_UI_PRODUCTION_UNITS",
  [ProductionPanelCategory.WONDERS]: "LOC_UI_PRODUCTION_WONDERS",
  [ProductionPanelCategory.PROJECTS]: "LOC_UI_PRODUCTION_PROJECTS"
};
const productionAccordionCategoryStates = {
  "production-category-buildings": true,
  "production-category-units": true,
  "production-category-wonders": true,
  "production-category-projects": true
};
const updateProductionChooserItemElement = (element, data, isPurchase) => {
  const infoDisplayType = data.infoDisplayType ?? null;
  element.setAttribute("data-name", data.name);
  element.setAttribute("data-type", data.type);
  element.setAttribute("data-category", data.category);
  element.setAttribute("data-is-purchase", isPurchase ? "true" : "false");
  element.setAttribute("data-is-repair", data.repairDamaged ? "true" : "false");
  element.setAttribute("data-is-ageless", data.ageless ? "true" : "false");
  element.setAttribute("data-disabled", (!!data.disabled).toString());
  element.setAttribute("data-disable-focus", data.insufficientFunds ? "true" : "false");
  if (infoDisplayType) {
    element.setAttribute("data-info-display-type", infoDisplayType);
  } else {
    element.removeAttribute("data-info-display-type");
  }
  if (data.description) {
    element.setAttribute("data-description", data.description);
  } else {
    element.removeAttribute("data-description");
  }
  if (data.error) {
    element.setAttribute("data-error", data.error);
  } else {
    element.removeAttribute("data-error");
  }
  if (data.secondaryDetails && (!infoDisplayType || infoDisplayType === "yield-preview")) {
    element.setAttribute("data-secondary-details", data.secondaryDetails);
  } else {
    element.removeAttribute("data-secondary-details");
  }
  if (data.tags && data.tags.length && (!infoDisplayType || infoDisplayType === "base-yield")) {
    element.setAttribute("data-tags", composeTagString(data.tags));
  } else {
    element.removeAttribute("data-tags");
  }
  if (data.baseYields?.length && (!infoDisplayType || infoDisplayType === "base-yield")) {
    element.setAttribute("data-base-yields", JSON.stringify(data.baseYields));
  } else {
    element.removeAttribute("data-base-yields");
  }
  const cost = isPurchase ? data.cost : data.turns;
  element.setAttribute("data-cost", cost.toString());
  element.setAttribute("data-production-cost", (data.productionCost ?? 0).toString());
  element.setAttribute("data-production-percent", (data.productionPercent ?? 0).toString());
  element.setAttribute("data-production-progress", (data.productionProgress ?? 0).toString());
  element.setAttribute("data-is-in-progress", (data.isInProgress ? "true" : "false"));
  if (data.canGetWarehouseBonuses) {
    element.setAttribute("data-can-get-warehouse", "true");
    element.setAttribute("data-warehouse-count", (data.warehouseCount ?? 0).toString());
  } else {
    element.removeAttribute("data-can-get-warehouse");
    element.removeAttribute("data-warehouse-count");
  }
  if (data.canGetAdjacencyBonuses) {
    element.setAttribute("data-can-get-adjacency", "true");
    element.setAttribute("data-highest-adjacency", (data.highestAdjacency ?? 0).toString());
  } else {
    element.removeAttribute("data-can-get-adjacency");
    element.removeAttribute("data-highest-adjacency");
  }
  if (data.recommendations?.length) {
    element.setAttribute("data-recommendations", JSON.stringify(data.recommendations));
  } else {
    element.removeAttribute("data-recommendations");
  }
  if (data.type === "IMPROVEMENT_REPAIR_ALL") {
    element.setAttribute("data-repair-all", "true");
  } else {
    element.removeAttribute("data-repair-all");
  }
  element.setAttribute("data-audio-activate-ref", isPurchase ? "data-audio-city-purchase-activate" : "none");
};
class ProductionChooserScreen extends Panel {
  SMALL_SCREEN_MODE_MAX_HEIGHT = 900;
  SMALL_SCREEN_MODE_MAX_WIDTH = 1700;
  // Used as a flag to tell the chooser to go back to purchase mode if we were just placing a purchased contructible
  static shouldReturnToPurchase = false;
  // #region Bindings
  focusInListener = this.onFocusIn.bind(this);
  focusOutListener = this.onFocusOut.bind(this);
  engineInputListener = this.onEngineInput.bind(this);
  inputContextChangedListener = this.onInputContextChanged.bind(this);
  frameEngineInputListener = this.onFrameEngineInput.bind(this);
  requestCloseListener = this.requestClose.bind(this);
  onUpgradeToCityButtonListener = this.onUpgradeToCityButton.bind(this);
  viewFocusListener = this.onViewReceiveFocus.bind(this);
  viewLoseFocusListener = this.onViewLoseFocus.bind(this);
  onNextCityButtonListener = this.onNextCityButton.bind(this);
  onPrevCityButtonListener = this.onPrevCityButton.bind(this);
  onCityDetailsClosedListener = this.onCityDetailsClosed.bind(this);
  onSettlementNameChangedListener = this.onSettlementNameChanged.bind(this);
  onSettlementNameExitListener = this.onSettlementNameExit.bind(this);
  cityYieldBar = document.createElement("yield-bar-base");
  updateCityYieldBar() {
    if (!this._cityID) {
      return;
    }
    const city = Cities.get(this._cityID);
    const cityYields = city?.Yields;
    if (!city || !cityYields) {
      return;
    }
    const yields = cityYields.getYields();
    if (!yields) {
      return;
    }
    const data = [];
    for (const [index, attribute] of yields.entries()) {
      const def = GameInfo.Yields[index];
      if (!def) continue;
      data.push({ type: def.YieldType, value: attribute.value, style: 0 });
    }
    this.cityYieldBar.setAttribute("data-yield-bar", JSON.stringify(data));
  }
  // #endregion
  // #region Component State
  isInitialLoadComplete = false;
  wasQueueInitiallyEmpty = false;
  lastFocusedPanel = null;
  _isPurchase = false;
  set isPurchase(value) {
    if (value === this._isPurchase || !value && this.city.isTown) {
      return;
    }
    this._isPurchase = value;
    this.productionPurchaseTabBar.setAttribute("selected-tab-index", value ? "1" : "0");
    this.updateItems.call("isPurchase");
  }
  get isPurchase() {
    return this._isPurchase;
  }
  _cityID = null;
  set cityID(value) {
    if (value === null || ComponentID.isMatch(value, this._cityID)) {
      return;
    }
    const city = Cities.get(value);
    if (!city) {
      console.error(`panel-production-chooser: Failed to get city with ID: ${ComponentID.toLogString(value)}`);
      return;
    }
    const hasUnrest = city.Happiness?.hasUnrest ?? false;
    const turnsOfUnrest = city.Happiness?.turnsOfUnrest ?? -1;
    const highestActiveUnrestDuration = city.Happiness?.highestActiveUnrestDuration ?? -1;
    const isTown = city.isTown;
    const growthType = city.Growth?.growthType;
    const projectType = city.Growth?.projectType;
    const canPurchaseDuringUnrest = city.Gold?.canPurchaseWhileInUnrest ?? true;
    this._cityID = value;
    this._recommendations = GetCityBuildReccomendations(city);
    this.uniqueQuarterInfos = GetUniqueQuartersForPlayer(city.owner);
    this._isPurchase = city.isTown || ProductionChooserScreen.shouldReturnToPurchase;
    ProductionChooserScreen.shouldReturnToPurchase = false;
    this.productionPurchaseTabBar.setAttribute("selected-tab-index", this._isPurchase ? "1" : "0");
    BuildingPlacementManager.initializePlacementData(this._cityID);
    BuildQueue.cityID = this._cityID;
    this.updateCityName(city);
    this.updateItems.call("cityID");
    const upgradeCost = city.Gold?.getTownUpgradeCost() ?? -1;
    this.updateUpgradeToCityButton(upgradeCost, city.isTown, city.id);
    this.updateCityStatus(city.isBeingRazed, hasUnrest);
    this.updateProductionPurchaseBar(isTown);
    this.updateTownFocusSection(city.id, isTown, hasUnrest, growthType, projectType);
    this.updateUnrestUi({ hasUnrest, turnsOfUnrest, canPurchaseDuringUnrest, highestActiveUnrestDuration });
    const playerCities = Players.get(city.owner)?.Cities?.getCities();
    const hasMultipleCities = playerCities && playerCities?.length > 1;
    this.nextCityButton.classList.toggle("hidden", !hasMultipleCities);
    this.prevCityButton.classList.toggle("hidden", !hasMultipleCities);
    Camera.lookAtPlot(city.location);
    this.lastProductionSection.dataset.cityid = JSON.stringify(this._cityID);
    this.updateCityYieldBar();
  }
  get cityID() {
    if (!this._cityID) {
      this.cityID = UI.Player.getHeadSelectedCity();
    }
    if (!this._cityID || ComponentID.isInvalid(this._cityID)) {
      throw new Error("panel-production-chooser: City ID is invalid or not set");
    }
    return this._cityID;
  }
  get city() {
    return Cities.get(this.cityID);
  }
  _recommendations;
  get recommendations() {
    this._recommendations ??= GetCityBuildReccomendations(this.city);
    return this._recommendations;
  }
  _playerGoldBalance = -1;
  set playerGoldBalance(value) {
    this._playerGoldBalance = value;
    this.updateItems.call("playerGoldBalance");
  }
  get playerGoldBalance() {
    if (this._playerGoldBalance === -1) {
      const value = Players.Treasury.get(GameContext.localPlayerID)?.goldBalance;
      if (value === void 0) {
        console.error(`panel-production-chooser: Failed to get player gold balance`);
        this._playerGoldBalance = -1;
      } else {
        this._playerGoldBalance = value;
      }
    }
    return this._playerGoldBalance;
  }
  itemElementMap = /* @__PURE__ */ new Map();
  _items;
  set items(value) {
    this._items = value;
    this.updateCategories(value);
  }
  get items() {
    this._items ??= GetProductionItems(
      this.city,
      this.recommendations,
      this.playerGoldBalance,
      this.isPurchase,
      this.viewHidden,
      this.uniqueQuarterInfos
    );
    return this._items;
  }
  get viewHiddenActionText() {
    return this.viewHidden ? "LOC_UI_PRODUCTION_HIDE_HIDDEN" : "LOC_UI_PRODUCTION_VIEW_HIDDEN";
  }
  _viewHidden = false;
  get viewHidden() {
    return this._viewHidden;
  }
  set viewHidden(value) {
    this.viewHiddenCheckbox.setAttribute("selected", value.toString());
    if (value === this._viewHidden) {
      return;
    }
    this._viewHidden = value;
    this.updateItems.call("viewHidden");
  }
  uniqueQuarterInfos = [];
  // #endregion
  // #region Element References
  frame = document.createElement("fxs-subsystem-frame");
  cityNameElement = document.createElement(
    Network.hasAccessUGCPrivilege(false) ? "fxs-editable-header" : "fxs-header"
  );
  cityStatusContainerElement = document.createElement("div");
  cityStatusIconElement = document.createElement("img");
  cityStatusTextElement = document.createElement("div");
  subPanelContainer = document.createElement("div");
  townFocusPanel = document.createElement("panel-town-focus");
  townFocusPanelCloseButton = document.createElement("fxs-close-button");
  buildQueue = document.createElement("panel-build-queue");
  prevCityButton = document.createElement("fxs-activatable");
  nextCityButton = document.createElement("fxs-activatable");
  productionPurchaseContainer = document.createElement("div");
  productionPurchaseTabBar = document.createElement("fxs-tab-bar");
  showCityDetailsButton = document.createElement("fxs-activatable");
  townFocusSection = document.createElement("town-focus-section");
  lastProductionSection = document.createElement("last-production-section");
  townUnrestDisplay = document.createElement("town-unrest-display");
  /* townPurchaseLabel replaces the production/purchase tab bar when the settlement is a town */
  townPurchaseLabel = document.createElement("div");
  viewHiddenCheckbox = document.createElement("fxs-checkbox");
  productionAccordion = document.createElement("fxs-vslot");
  productionCategorySlots = Object.values(ProductionPanelCategory).reduce(
    (acc, category) => {
      const id = `production-category-${category}`;
      const isOpen = productionAccordionCategoryStates[id];
      acc[category] = new ProductionChooserAccordionSection(id, categoryLocalizationMap[category], isOpen);
      return acc;
    },
    {}
  );
  upgradeToCityButton;
  upgradeToCityAlert;
  upgradeToCityButtonCostElement;
  cityDetailsSlot;
  panelProductionSlot;
  uniqueQuarters = [];
  // #endregion
  // #region Component Lifecycle
  constructor(root) {
    super(root);
    this.animateInType = this.animateOutType = AnchorType.RelativeToLeft;
    const [upgradeToCityButton, costElement] = this.renderUpgradeToCityButton();
    const [upgradeToCityAlert] = this.renderUpgradeToCityAlert();
    this.upgradeToCityButton = upgradeToCityButton;
    this.upgradeToCityAlert = upgradeToCityAlert;
    if (this.isCityCapReached()) {
      this.upgradeToCityButton.classList.add("hidden");
      this.upgradeToCityAlert.classList.remove("hidden");
    } else {
      this.upgradeToCityAlert.classList.add("hidden");
      this.upgradeToCityButton.classList.toggle("hidden");
    }
    this.upgradeToCityButtonCostElement = costElement;
    this.enableOpenSound = true;
    this.enableCloseSound = true;
    this.inputContext = InputContext.Dual;
  }
  onInitialize() {
    super.onInitialize();
    this.render();
    if (!this.Root.hasAttribute("data-show-town-focus")) {
      this.Root.setAttribute("data-show-town-focus", "false");
    }
    this.cityID = UI.Player.getHeadSelectedCity();
    this.townUnrestDisplay.setAttribute("data-slot", "header");
    this.wasQueueInitiallyEmpty = this.city.BuildQueue?.getQueue().length === 0;
    this.cityNameElement.classList.add("trigger-nav-help");
    this.cityNameElement.setAttribute("header-bg-glow", "true");
    this.productionAccordion.addEventListener(
      ProductionChooserAccordionSectionToggleEventName,
      this.onAccordionSectionToggle
    );
  }
  onAttach() {
    super.onAttach();
    this.cityDetailsSlot = MustGetElement(".panel-city-details-slot", document);
    this.panelProductionSlot = MustGetElement(".panel-production-slot", document);
    ContextManager.pushElement(this.Root);
    for (const [, section] of Object.entries(this.productionCategorySlots)) {
      const isOpen = productionAccordionCategoryStates[section.id];
      section.toggle(isOpen);
    }
    delayByFrame(() => {
      this.isInitialLoadComplete = true;
      engine.on("CityGovernmentLevelChanged", this.onCityGovernmentLevelChanged, this);
      engine.on("CityNameChanged", this.onCityNameChanged, this);
      engine.on("CityMadePurchase", this.onCityMadePurchase, this);
      engine.on("CityGrowthModeChanged", this.onCityGrowthModeChanged, this);
      engine.on("CityProductionQueueChanged", this.onCityProductionQueueChanged, this);
      engine.on("CitySelectionChanged", this.onCitySelectionChanged, this);
      engine.on("CityYieldChanged", this.onCityYieldChanged, this);
      engine.on("CityPopulationChanged", this.onCityPopulationChanged, this);
      engine.on("ConstructibleAddedToMap", this.onConstructibleAddedToMap, this);
      engine.on("InputContextChanged", this.inputContextChangedListener);
      engine.on("TreasuryChanged", this.onPlayerTreasuryChanged, this);
      window.addEventListener(InterfaceModeChangedEventName, this.onInterfaceModeChanged);
      window.addEventListener(CityDetailsClosedEventName, this.onCityDetailsClosedListener);
      window.addEventListener(FocusCityViewEventName, this.onFocusCityViewEvent);
      this.Root.addEventListener("focusin", this.focusInListener);
      this.Root.addEventListener("focusout", this.focusOutListener);
      this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
      this.Root.addEventListener("view-receive-focus", this.viewFocusListener);
      this.Root.addEventListener("view-lose-focus", this.viewLoseFocusListener);
      this.frame.addEventListener("subsystem-frame-close", this.requestCloseListener);
      this.frame.addEventListener(InputEngineEventName, this.frameEngineInputListener);
      this.townFocusPanel.addEventListener("chooser-item-selected", this.onTownFocusItemSelected);
      this.viewHiddenCheckbox.addEventListener(ComponentValueChangeEventName, this.onViewHiddenChanged);
      this.productionPurchaseTabBar.addEventListener("tab-selected", this.onProductionPurchaseTabSelected);
      this.nextCityButton.addEventListener("action-activate", this.onNextCityButtonListener);
      this.prevCityButton.addEventListener("action-activate", this.onPrevCityButtonListener);
      this.upgradeToCityButton.addEventListener("action-activate", this.onUpgradeToCityButtonListener);
      this.showCityDetailsButton.addEventListener("action-activate", this.onCityDetailsActivated);
      this.townFocusSection.addEventListener("chooser-item-selected", this.onCurrentFocusItemSelected);
      this.townFocusPanelCloseButton.addEventListener("action-activate", this.onCloseTownFocusPanel);
      this.productionAccordion.addEventListener("chooser-item-selected", this.onChooserItemSelected);
      this.cityNameElement.addEventListener(
        EditableHeaderTextChangedEventName,
        this.onSettlementNameChangedListener
      );
      this.cityNameElement.addEventListener(EditableHeaderExitEditEventName, this.onSettlementNameExitListener);
      this.onInterfaceModeChanged();
      this.updateItems.call("onAttach");
      if (this.city?.isTown) {
        Game.CityOperations.sendRequest(this.cityID, CityOperationTypes.CONSIDER_TOWN_PROJECT, {});
      }
    }, 3);
  }
  onDetach() {
    engine.off("CityGovernmentLevelChanged", this.onCityGovernmentLevelChanged, this);
    engine.off("CityNameChanged", this.onCityNameChanged, this);
    engine.off("CityMadePurchase", this.onCityMadePurchase, this);
    engine.off("CityGrowthModeChanged", this.onCityGrowthModeChanged, this);
    engine.off("CityProductionQueueChanged", this.onCityProductionQueueChanged, this);
    engine.off("CitySelectionChanged", this.onCitySelectionChanged, this);
    engine.off("CityYieldChanged", this.onCityYieldChanged, this);
    engine.off("CityPopulationChanged", this.onCityPopulationChanged, this);
    engine.off("ConstructibleAddedToMap", this.onConstructibleAddedToMap, this);
    engine.off("InputContextChanged", this.inputContextChangedListener);
    engine.off("TreasuryChanged", this.onPlayerTreasuryChanged, this);
    window.removeEventListener(InterfaceModeChangedEventName, this.onInterfaceModeChanged);
    window.removeEventListener(CityDetailsClosedEventName, this.onCityDetailsClosedListener);
    window.removeEventListener(FocusCityViewEventName, this.onFocusCityViewEvent);
    this.frame.removeEventListener(InputEngineEventName, this.frameEngineInputListener);
    this.frame.removeEventListener("subsystem-frame-close", this.requestCloseListener);
    this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
    this.Root.removeEventListener("focusin", this.focusInListener);
    this.Root.removeEventListener("focusout", this.focusOutListener);
    this.Root.removeEventListener("view-receive-focus", this.viewFocusListener);
    this.Root.removeEventListener("view-receive-focus", this.viewFocusListener);
    this.townFocusPanel.removeEventListener("chooser-item-selected", this.onTownFocusItemSelected);
    this.townFocusPanelCloseButton.removeEventListener("action-activate", this.onCloseTownFocusPanel);
    this.viewHiddenCheckbox.removeEventListener(ComponentValueChangeEventName, this.onViewHiddenChanged);
    this.productionPurchaseTabBar.removeEventListener("tab-selected", this.onProductionPurchaseTabSelected);
    this.nextCityButton.removeEventListener("action-activate", this.onNextCityButtonListener);
    this.prevCityButton.removeEventListener("action-activate", this.onPrevCityButtonListener);
    this.upgradeToCityButton.removeEventListener("action-activate", this.onUpgradeToCityButtonListener);
    this.showCityDetailsButton.removeEventListener("action-activate", this.onCityDetailsActivated);
    this.townFocusSection.removeEventListener("chooser-item-selected", this.onCurrentFocusItemSelected);
    this.productionAccordion.removeEventListener("chooser-item-selected", this.onChooserItemSelected);
    this.cityNameElement.removeEventListener(
      EditableHeaderTextChangedEventName,
      this.onSettlementNameChangedListener
    );
    this.cityNameElement.removeEventListener(EditableHeaderExitEditEventName, this.onSettlementNameExitListener);
    Object.values(this.productionCategorySlots).forEach((slot) => slot.disconnect());
    if (ActionHandler.deviceType == InputDeviceType.Mouse) {
      ActionHandler.forceCursorCheck();
    }
    ContextManager.pop(this.Root);
    super.onDetach();
  }
  // #endregion
  // #region Engine Events
  onCitySelectionChanged(data) {
    if (!data.selected) {
      return;
    }
    const c = Cities.get(data.cityID);
    if (!c || c.owner != GameContext.localPlayerID) {
      return;
    } else if (c.isJustConqueredFrom) {
      this.setHidden(true);
      this.cityID = data.cityID;
    } else {
      NavTray.clear();
      NavTray.addOrUpdateGenericBack();
      this.playAnimateInSound();
      this.cityID = data.cityID;
      this.playAnimateOutSound();
      this.setHidden(false);
      this.realizeProductionFocus();
    }
    this.updateNavTray();
  }
  onPlayerTreasuryChanged(data) {
    if (data.player != GameContext.localPlayerID) {
      return;
    }
    this._playerGoldBalance = data.goldBalance;
    const upgradeCost = this.city.Gold?.getTownUpgradeCost() ?? -1;
    const isTown = this.city.isTown;
    this.updateUpgradeToCityButton(upgradeCost, isTown, this.cityID);
  }
  onCityYieldChanged(data) {
    if (ComponentID.isMatch(this._cityID, data.cityID)) {
      this.updateCityYieldBar();
    }
  }
  onCityPopulationChanged(data) {
    if (ComponentID.isMatch(this._cityID, data.cityID)) {
      this.updateCityYieldBar();
    }
  }
  onConstructibleAddedToMap(data) {
    const owningCityID = GameplayMap.getOwningCityFromXY(data.location.x, data.location.y);
    if (owningCityID && ComponentID.isMatch(this.cityID, owningCityID)) {
      this.updateItems.call("onConstructibleAddedToMap");
    }
  }
  onCityProductionQueueChanged({ cityID }) {
    if (ComponentID.isMatch(this.cityID, cityID)) {
      BuildingPlacementManager.initializePlacementData(cityID);
      this.updateItems.call("onCityProductionQueueChanged");
    }
  }
  // #endregion
  // #region DOM Events
  onAccordionSectionToggle = (event) => {
    const { isOpen } = event.detail;
    const target = event.target;
    if (target instanceof HTMLElement) {
      productionAccordionCategoryStates[target.id] = isOpen;
    }
  };
  onChooserItemSelected = (event) => {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }
    if (event.target.classList.contains("fxs-chooser-item") && event.target.hasAttribute("data-repair-all")) {
      Audio.playSound("data-audio-repair-all", "audio-production-chooser");
      this.items.buildings.forEach((item) => {
        item.interfaceMode = "";
        if (item.repairDamaged) {
          RepairConstruct(this.city, item, this.isPurchase);
        }
      });
    } else if (!InterfaceMode.isInInterfaceMode("INTERFACEMODE_PLACE_BUILDING") && event.target.classList.contains("fxs-chooser-item")) {
      const category = event.target.dataset.category;
      const type = event.target.dataset.type;
      if (category && type) {
        this.doOrConfirmConstruction(category, type);
      }
    }
  };
  onTownFocusItemSelected = (event) => {
    if (IsElement(event.target, "town-focus-chooser-item")) {
      const { growthType, projectType } = event.target.dataset;
      if (growthType && projectType) {
        const showConfirmationDialog = parseInt(growthType) !== GrowthTypes.EXPAND;
        if (showConfirmationDialog) {
          DialogBoxManager.createDialog_ConfirmCancel({
            body: "LOC_TOWN_SET_FOCUS_DIALOG_BODY",
            title: "LOC_TOWN_SET_FOCUS_DIALOG_TITLE",
            callback: (eAction) => {
              if (eAction == DialogBoxAction.Confirm) {
                SetTownFocus(this.cityID, growthType, projectType);
                return;
              }
              Focus.setContextAwareFocus(this.townFocusPanel, this.Root);
            }
          });
        } else {
          SetTownFocus(this.cityID, growthType, projectType);
        }
      } else {
        console.error(
          `panel-production-chooser: onTownFocusItemSelected: Failed to get valid growthType or projectType`
        );
      }
      event.stopPropagation();
      event.preventDefault();
    }
  };
  onCloseTownFocusPanel = () => {
    this.Root.dataset.showTownFocus = "false";
  };
  onSettlementNameExit() {
    this.realizeProductionFocus();
  }
  onSettlementNameChanged(event) {
    const args = {
      Name: Locale.toUpper(event.detail.newStr)
    };
    if (!this._cityID) {
      console.error(
        `panel-production-chooser: onSettlementNameChanged - cityID was null during name change operation!`
      );
      this.realizeProductionFocus();
      return;
    }
    if (event.detail.newStr.trim().length == 0) {
      const city = Cities.get(this._cityID);
      if (city) {
        this.cityNameElement.setAttribute("title", city.name);
      }
      return;
    }
    const locName = Locale.compose(this.city.name);
    if (event.detail.newStr == locName) {
      return;
    }
    const result = Game.CityCommands.canStart(this._cityID, CityCommandTypes.NAME_CITY, args, false);
    if (result.Success) {
      Game.CityCommands.sendRequest(this._cityID, CityCommandTypes.NAME_CITY, args);
    } else {
      console.error(
        "panel-production-chooser: onSettlementNameChanged - city name change operation failed!",
        result.FailureReasons
      );
    }
  }
  onCityGrowthModeChanged({ cityID }) {
    const city = this.city;
    if (city && ComponentID.isMatch(this.cityID, cityID)) {
      this.updateTownFocusSection(
        city.id,
        city.isTown,
        city.Happiness?.hasUnrest,
        city.Growth?.growthType,
        city.Growth?.projectType
      );
      this.Root.dataset.showTownFocus = "false";
      Focus.setContextAwareFocus(this.townFocusSection, this.Root);
      this.updateItems.call("townFocus");
      this.townFocusPanel.dispatchEvent(new TownFocusRefreshEvent());
    }
  }
  onCityGovernmentLevelChanged({ cityID, governmentlevel }) {
    const city = Cities.get(cityID);
    if (city && ComponentID.isMatch(this.cityID, cityID)) {
      const isTown = governmentlevel === CityGovernmentLevels.TOWN;
      BuildingPlacementManager.initializePlacementData(cityID);
      this.updateProductionPurchaseBar(isTown);
      this.updateTownFocusSection(
        this.cityID,
        isTown,
        city.Happiness?.hasUnrest,
        city.Growth?.growthType,
        city.Growth?.projectType
      );
      this.updateUpgradeToCityButton(city.Gold?.getTownUpgradeCost() ?? -1, isTown, this.cityID);
      this.updateItems.call("onCityGovernmentLevelChanged");
    }
  }
  onCityNameChanged(data) {
    const city = Cities.get(data.cityID);
    if (city) {
      this.updateCityName(city);
    }
  }
  onCityMadePurchase({ cityID }) {
    const city = Cities.get(cityID);
    if (city && ComponentID.isMatch(this.cityID, cityID)) {
      BuildingPlacementManager.initializePlacementData(cityID);
      this.updateItems.call("onCityModePurchase");
    }
  }
  onCurrentFocusItemSelected = (event) => {
    this.Root.dataset.showTownFocus = "true";
    event.stopPropagation();
    event.preventDefault();
  };
  onViewHiddenChanged = (e) => {
    this.viewHidden = e.detail.value;
  };
  onPrevCityButton() {
    const prevCityId = GetPrevCityID(this.cityID);
    if (ComponentID.isValid(prevCityId)) {
      UI.Player.selectCity(prevCityId);
      const city = Cities.get(prevCityId);
      if (city) {
        PlotCursor.plotCursorCoords = city.location;
      }
    }
  }
  onCityDetailsClosed() {
    this.panelProductionSlot.classList.remove("hidden");
    this.frame.classList.add("trigger-nav-help");
    this.cityNameElement.classList.add("trigger-nav-help");
    Focus.setContextAwareFocus(this.productionAccordion, this.Root);
  }
  onNextCityButton() {
    const nextCityId = GetNextCityID(this.cityID);
    if (ComponentID.isValid(nextCityId)) {
      UI.Player.selectCity(nextCityId);
      const city = Cities.get(nextCityId);
      if (city) {
        PlotCursor.plotCursorCoords = city.location;
      }
    }
  }
  isSmallScreen() {
    return window.innerHeight <= Layout.pixelsToScreenPixels(this.SMALL_SCREEN_MODE_MAX_HEIGHT) || window.innerWidth <= Layout.pixelsToScreenPixels(this.SMALL_SCREEN_MODE_MAX_WIDTH);
  }
  onCityDetailsActivated = () => {
    this.panelProductionSlot.classList.toggle("hidden", this.isSmallScreen());
    this.frame.classList.remove("trigger-nav-help");
    this.showCityDetails();
  };
  onFocusIn(event) {
    const focusedPanel = event.target instanceof HTMLElement ? this.getElementParentPanel(event.target) : null;
    if (focusedPanel !== this.lastFocusedPanel) {
      this.lastFocusedPanel?.classList.remove("trigger-nav-help");
      focusedPanel?.classList.add("trigger-nav-help");
      this.lastFocusedPanel = focusedPanel;
      if (focusedPanel === this.frame) {
        this.updateNavTray();
      }
    }
  }
  onFocusOut(event) {
    const relatedTarget = event.relatedTarget;
    if (!(relatedTarget instanceof HTMLElement)) return;
    if (!this.Root.contains(relatedTarget)) {
      this.lastFocusedPanel?.classList.remove("trigger-nav-help");
      this.lastFocusedPanel = null;
    }
  }
  onUpgradeToCityButton() {
    DialogBoxManager.createDialog_ConfirmCancel({
      body: "LOC_PROJECT_TOWN_UPGRADE_DIALOG_BODY",
      title: "LOC_PROJECT_TOWN_UPGRADE_DIALOG_TITLE",
      callback: (eAction) => {
        if (eAction == DialogBoxAction.Confirm) {
          const success = ConvertToCity(this.cityID);
          // eslint-disable-next-line no-empty -- FXS
          if (!success) {
          }
        }
        this.updateNavTray();
      }
    });
  }
  onFocusCityViewEvent = (event) => {
    if (event.detail.destination != "left") {
      return;
    }
    Focus.setContextAwareFocus(this.productionAccordion, this.Root);
  };
  // #endregion
  showCityDetails() {
    const cityDetailsPanel = this.cityDetailsSlot.querySelector(".panel-city-details");
    if (cityDetailsPanel) {
      cityDetailsPanel.maybeComponent?.update();
      cityDetailsPanel.classList.toggle("hidden");
      if (!cityDetailsPanel.classList.contains("hidden")) {
        FocusManager.get().setFocus(cityDetailsPanel);
        Audio.playSound("data-audio-city-details-enter", "city-actions");
      } else {
        Audio.playSound("data-audio-city-details-exit", "city-actions");
      }
    } else {
      const newCityDetailsPanel = document.createElement("panel-city-details");
      this.cityDetailsSlot.appendChild(newCityDetailsPanel);
      FocusManager.get().setFocus(newCityDetailsPanel);
      Audio.playSound("data-audio-city-details-enter", "city-actions");
    }
    this.cityNameElement.classList.remove("trigger-nav-help");
    this.lastFocusedPanel?.classList.remove("trigger-nav-help");
    this.lastFocusedPanel = null;
  }
  getElementParentPanel(element) {
    if (this.frame.contains(element)) {
      return this.frame;
    } else if (this.townFocusPanel.contains(element)) {
      return this.townFocusPanel;
    } else if (this.buildQueue.contains(element)) {
      return this.buildQueue;
    } else {
      return null;
    }
  }
  requestPlaceBuildingClose(inputEvent) {
    if (!InterfaceMode.isInInterfaceMode("INTERFACEMODE_PLACE_BUILDING")) {
      return;
    }
    inputEvent?.stopPropagation();
    inputEvent?.preventDefault();
    this.playSound("data-audio-activate");
  }
  doOrConfirmConstruction(category, type, animationConfirmCallback) {
    const city = this.city;
    if (!city) {
      console.error(`panel-production-chooser: confirmSelection: Failed to get a valid city!`);
      return;
    }
    const item = this.items[category].find((item2) => item2.type === type);
    if (!item) {
      console.error(`panel-production-chooser: confirmSelection: Failed to get a valid item!`);
      return;
    }
    const queueLengthBeforeAdd = BuildQueue.items.length;
    const bSuccess = Construct(city, item, this.isPurchase);
    if (bSuccess) {
      if (queueLengthBeforeAdd > 0) {
        Audio.playSound("data-audio-queue-item", "audio-production-chooser");
      }
      animationConfirmCallback?.();
      if (this.wasQueueInitiallyEmpty && !this.isPurchase && !Configuration.getUser().isProductionPanelStayOpen) {
        UI.Player.deselectAllCities();
        InterfaceMode.switchToDefault();
        this.requestPlaceBuildingClose();
      }
    }
    if (queueLengthBeforeAdd == 0) {
      Audio.playSound("data-audio-city-production-activate", "city-actions");
    }
  }
  onProductionPurchaseTabSelected = (e) => {
    const isPurchase = e.detail.selectedItem.id === "production-chooser-tab-purchase";
    if (isPurchase === this.isPurchase) {
      return;
    }
    this.isPurchase = isPurchase;
    if (this.isPurchase) {
      Audio.playSound("data-audio-city-production-purchase-mode", "city-actions");
    }
  };
  requestClose() {
    const selectedCityID = UI.Player.getHeadSelectedCity();
    if (!selectedCityID && InterfaceMode.isInInterfaceMode("INTERFACEMODE_DEFAULT")) {
      ViewManager.setCurrentByName("World");
    }
    UI.Player.deselectAllCities();
    super.close();
  }
  updateItemElementMap(items) {
    for (const item of items) {
      let chooserItem = this.itemElementMap.get(item.type);
      if (!chooserItem) {
        chooserItem = CreateProductionChooserItem();
        this.itemElementMap.set(item.type, chooserItem);
      }
      updateProductionChooserItemElement(chooserItem, item, this.isPurchase);
    }
  }
  realizeCategory(category, items) {
    const { slot } = this.productionCategorySlots[category];
    for (const item of items) {
      let element = this.itemElementMap.get(item.type);
      if (!element) {
        element = CreateProductionChooserItem();
        this.itemElementMap.set(item.type, element);
      }
      updateProductionChooserItemElement(element, item, this.isPurchase);
      let bFoundInUniqueQuarter = false;
      for (const uniqueQuarter of this.uniqueQuarters) {
        if (uniqueQuarter.containsBuilding(element)) {
          bFoundInUniqueQuarter = true;
          break;
        }
      }
      if (!bFoundInUniqueQuarter) slot.appendChild(element);
    }
  }
  updateCategories(items) {
    const initialFocus = FocusManager.get().currentFocus();
    let initialFocusParent = null;
    for (const parent of this.itemElementMap.values()) {
      if (parent.contains(initialFocus)) {
        initialFocusParent = parent;
        break;
      }
    }
    for (const category of Object.values(ProductionPanelCategory)) {
      this.updateItemElementMap(items[category]);
    }
    const city = this.city;
    this.uniqueQuarterInfos = GetUniqueQuartersForPlayer(city.owner);
    const buildingSlot = this.productionCategorySlots[ProductionPanelCategory.BUILDINGS].slot;
    for (const uniqueQuarter of this.uniqueQuarters) {
      uniqueQuarter.root.remove();
    }
    this.uniqueQuarters = [];
    const hiddenItems = !this.viewHidden && this.uniqueQuarterInfos.length > 0 ? GetProductionItems(
      city,
      this.recommendations,
      this.playerGoldBalance,
      this.isPurchase,
      true,
      this.uniqueQuarterInfos
    ) : void 0;
    for (const uniqueQuarterInfo of this.uniqueQuarterInfos) {
      let buildingOneChooserItem = this.itemElementMap.get(uniqueQuarterInfo.uniqueQuarterDef.BuildingType1);
      let buildingTwoChooserItem = this.itemElementMap.get(uniqueQuarterInfo.uniqueQuarterDef.BuildingType2);
      if (buildingOneChooserItem || buildingTwoChooserItem) {
        const newQuarter = new UniqueQuarter();
        newQuarter.definition = uniqueQuarterInfo.uniqueQuarterDef;
        newQuarter.numCompleted = GetNumUniqueQuarterBuildingsCompleted(
          city,
          uniqueQuarterInfo.uniqueQuarterDef
        );
        if (hiddenItems && !(buildingOneChooserItem && buildingTwoChooserItem)) {
          if (!buildingOneChooserItem) {
            const item = hiddenItems.buildings.filter(
              (r) => r.type == uniqueQuarterInfo.uniqueQuarterDef.BuildingType1
            )[0];
            if (item) {
              buildingOneChooserItem = CreateProductionChooserItem();
              updateProductionChooserItemElement(buildingOneChooserItem, item, this.isPurchase);
            }
          }
          if (!buildingTwoChooserItem) {
            const item = hiddenItems.buildings.filter(
              (r) => r.type == uniqueQuarterInfo.uniqueQuarterDef.BuildingType2
            )[0];
            if (item) {
              buildingTwoChooserItem = CreateProductionChooserItem();
              updateProductionChooserItemElement(buildingTwoChooserItem, item, this.isPurchase);
            }
          }
        }
        if (buildingOneChooserItem && buildingTwoChooserItem) {
          newQuarter.setBuildings(buildingOneChooserItem, buildingTwoChooserItem);
          buildingSlot.insertAdjacentElement("afterbegin", newQuarter.root);
          this.uniqueQuarters.push(newQuarter);
        }
      }
    }
    for (const category of Object.values(ProductionPanelCategory)) {
      this.realizeCategory(category, items[category]);
    }
    if (!initialFocus.isConnected && initialFocusParent) {
      Focus.setContextAwareFocus(initialFocusParent, this.Root);
    }
  }
  updateItems = new UpdateGate(() => {
    if (!this.isInitialLoadComplete) {
      return;
    }
    const city = this.city;
    const items = GetProductionItems(
      city,
      this.recommendations,
      this.playerGoldBalance,
      this.isPurchase,
      this.viewHidden,
      this.uniqueQuarterInfos
    );
    const newItems = Object.values(ProductionPanelCategory).flatMap(
      (category) => items[category].map((item) => item.type)
    );
    const newItemsSet = new Set(newItems);
    let resetFocus = true;
    const currentFocus = FocusManager.get().currentFocus();
    for (const [type, item] of this.itemElementMap) {
      if (!newItemsSet.has(type)) {
        resetFocus ||= currentFocus === item;
        item.remove();
        this.itemElementMap.delete(type);
      }
    }
    this.items = items;
    if (resetFocus || this.Root.contains(currentFocus) && !this.buildQueue.contains(currentFocus)) {
      Focus.setContextAwareFocus(this.productionAccordion, this.Root);
    }
  });
  updateCityName(city) {
    this.cityNameElement.setAttribute("title", city.name);
  }
  isCityCapReached() {
    const player = Players.get(GameContext.localPlayerID);
    const cityCount = player?.Stats?.numCities;
    const cityLimit = player?.Cities?.getCityLimit();
    if (cityCount && cityLimit) {
      if (cityLimit == 0) {
        return false;
      }
      return cityCount >= cityLimit;
    }
    return false;
  }
  updateUpgradeToCityButton(upgradeCost, isTown, cityID) {
    if (this.isCityCapReached() && isTown) {
      this.upgradeToCityButton.classList.add("hidden");
      this.upgradeToCityAlert.classList.remove("hidden");
    } else {
      this.upgradeToCityAlert.classList.add("hidden");
      const result = CanConvertToCity(cityID);
      this.upgradeToCityButton.setAttribute("disabled", result.Success ? "false" : "true");
      this.upgradeToCityButton.classList.toggle("hidden", !isTown);
      this.upgradeToCityButtonCostElement.innerHTML = upgradeCost.toString();
      if (result.FailureReasons) {
        const failureTooltip = result.FailureReasons.join("\n");
        this.upgradeToCityButton.setAttribute("data-tooltip-content", failureTooltip);
      } else {
        this.upgradeToCityButton.removeAttribute("data-tooltip-content");
      }
    }
  }
  onFrameEngineInput(inputEvent) {
    const live = this.handleFrameEngineInput(inputEvent);
    if (!live) {
      inputEvent.preventDefault();
      inputEvent.stopImmediatePropagation();
    }
  }
  onInputContextChanged(contextData) {
    if (contextData.newContext != InputContext.Dual) {
      this.prevCityButton.classList.add("hidden");
      this.nextCityButton.classList.add("hidden");
    } else {
      this.prevCityButton.classList.remove("hidden");
      this.nextCityButton.classList.remove("hidden");
    }
  }
  handleFrameEngineInput(inputEvent) {
    const { name, status } = inputEvent.detail;
    if (status != InputActionStatuses.FINISH) {
      return !(name === "camera-zoom-in" || name === "camera-zoom-out");
    }
    let live = false;
    switch (name) {
      case "shell-action-1":
        if (this.city?.isTown && CanConvertToCity(this.cityID).Success) {
          this.onUpgradeToCityButton();
          Audio.playSound("data-audio-tab-selected");
          if (this.isPurchase) {
            Audio.playSound("data-audio-city-production-purchase-mode", "city-actions");
          }
          live = true;
        }
        break;
      case "shell-action-2":
        this.viewHidden = !this.viewHidden;
        Audio.playSound("data-audio-checkbox-press");
        break;
      case "camera-zoom-out":
        this.onPrevCityButton();
        break;
      case "camera-zoom-in":
        this.onNextCityButton();
        break;
      case "accept":
        live = false;
        break;
      default:
        live = true;
        break;
    }
    if (!live) {
      this.updateNavTray();
    }
    return live;
  }
  onEngineInput(inputEvent) {
    const live = this.handleEngineInput(inputEvent);
    if (!live) {
      inputEvent.preventDefault();
      inputEvent.stopImmediatePropagation();
    }
  }
  handleEngineInput(inputEvent) {
    const { name, status } = inputEvent.detail;
    if (status != InputActionStatuses.FINISH) {
      return !(name === "camera-zoom-in" || name === "camera-zoom-out" || name == "accept");
    }
    if (inputEvent.isCancelInput()) {
      if (this.Root.dataset.showTownFocus === "true") {
        this.Root.dataset.showTownFocus = "false";
        Focus.setContextAwareFocus(this.townFocusSection, this.Root);
        this.updateNavTray();
      } else {
        this.requestClose();
      }
      return false;
    }
    let live;
    switch (name) {
      case "accept":
        live = false;
        break;
      default:
        live = true;
        break;
    }
    if (!live) {
      this.updateNavTray();
    }
    return live;
  }
  updateNavTray() {
    NavTray.clear();
    NavTray.addOrUpdateGenericBack();
    const currentFocus = FocusManager.get().currentFocus();
    if (currentFocus?.closest("panel-build-queue") || currentFocus?.closest("panel-town-focus")) {
      return;
    }
    NavTray.addOrUpdateShellAction2(this.viewHiddenActionText);
  }
  onInterfaceModeChanged = () => {
    switch (InterfaceMode.getCurrent()) {
      case "INTERFACEMODE_CITY_PRODUCTION":
        if (!this.city.isJustConqueredFrom) {
          Focus.setContextAwareFocus(this.productionAccordion, this.Root);
          this.updateNavTray();
          this.setHidden(false);
        } else {
          this.setHidden(true);
        }
        break;
      default:
        this.setHidden(true);
        break;
    }
  };
  setHidden(hidden) {
    this.Root.classList.toggle("hidden", hidden);
    this.buildQueue?.classList.toggle("collapsed", hidden);
  }
  /**
   * City View receives focus
   */
  onReceiveFocus() {
    super.onReceiveFocus();
    this.realizeProductionFocus();
  }
  onViewReceiveFocus() {
    this.realizeProductionFocus();
  }
  onViewLoseFocus() {
    NavTray.clear();
  }
  realizeProductionFocus() {
    const cityDetailsPanel = this.cityDetailsSlot.querySelector(".panel-city-details");
    if (this.Root.dataset.showTownFocus === "true" || cityDetailsPanel && !cityDetailsPanel.classList.contains("hidden")) {
      return;
    }
    Focus.setContextAwareFocus(this.productionAccordion, this.Root);
    this.updateNavTray();
    if (this.city?.isTown) {
      Game.CityOperations.sendRequest(this.cityID, CityOperationTypes.CONSIDER_TOWN_PROJECT, {});
    }
  }
  updateCityStatus(isBeingRazed, hasUnrest) {
    let hideStatus = false;
    if (isBeingRazed) {
      this.cityStatusTextElement.setAttribute("data-l10n-id", "LOC_ATTR_RAZED_CITY_UNHAPPINESS");
    } else if (hasUnrest) {
      this.cityStatusTextElement.setAttribute("data-l10n-id", "LOC_CITY_UNREST");
    } else {
      hideStatus = true;
    }
    this.cityStatusContainerElement.classList.toggle("hidden", hideStatus);
  }
  updateTownFocusSection(cityID, isTown, hasUnrest, currentGrowthType, currentProjectType) {
    if (isTown) {
      const currentFocusProject = GetCurrentTownFocus(cityID, currentGrowthType, currentProjectType);
      if (!currentFocusProject) {
        return;
      }
      const { name, description, tooltipDescription, growthType, projectType } = currentFocusProject;
      const showDefaultLabel = growthType === GrowthTypes.EXPAND && projectType === ProjectTypes.NO_PROJECT;
      this.townFocusSection.dataset.growthType = growthType.toString();
      this.townFocusSection.dataset.projectType = projectType.toString();
      this.townFocusSection.dataset.name = name;
      if (window.innerHeight < Layout.pixelsToScreenPixels(768)) {
        this.townFocusSection.dataset.description = "";
      } else {
        this.townFocusSection.dataset.description = description;
      }
      if (tooltipDescription) {
        this.townFocusSection.dataset.tooltipDescription = window.innerHeight < Layout.pixelsToScreenPixels(768) ? `${Locale.compose(description)}[N]${Locale.compose(tooltipDescription)}` : tooltipDescription;
      } else {
        this.townFocusSection.removeAttribute("data-tooltip-description");
      }
      this.townFocusSection.dataset.disabled = hasUnrest ? "true" : "false";
      this.townFocusSection.dataset.showDefaultLabel = showDefaultLabel.toString();
      if (window.innerHeight < Layout.pixelsToScreenPixels(768)) {
        this.townFocusSection.classList.toggle("hidden", hasUnrest);
      } else {
        this.townFocusSection.classList.remove("hidden");
      }
      const city = Cities.get(cityID);
      if (city && city.Growth) {
        this.townFocusSection.dataset.settlementName = city.name;
        const connections = city.getConnectedCities().map((connectedCityID) => {
          return Cities.get(connectedCityID);
        });
        this.townFocusSection.dataset.connectedTowns = connections.filter((a) => {
          return a && a.isTown;
        }).length.toString();
        this.townFocusSection.dataset.connectedCities = connections.filter((a) => {
          return a && !a.isTown;
        }).length.toString();
        this.townFocusSection.dataset.foodExport = city.getSentFoodPerCity().toString();
      }
    } else {
      this.townFocusSection.classList.add("hidden");
      this.Root.dataset.showTownFocus = "false";
    }
  }
  updateUnrestUi({
    hasUnrest,
    turnsOfUnrest,
    canPurchaseDuringUnrest,
    highestActiveUnrestDuration
  }) {
    this.townFocusSection.dataset.disabled = hasUnrest ? "true" : "false";
    this.townUnrestDisplay.classList.toggle("hidden", !hasUnrest);
    this.productionPurchaseContainer.classList.toggle("hidden", hasUnrest && !canPurchaseDuringUnrest);
    if (hasUnrest) {
      this.townUnrestDisplay.dataset.turnsOfUnrest = turnsOfUnrest.toString();
    }
    this.townUnrestDisplay.dataset.highestActiveUnrestDuration = highestActiveUnrestDuration.toString();
  }
  updateProductionPurchaseBar(isTown) {
    this.productionPurchaseTabBar.classList.toggle("hidden", isTown);
    this.townPurchaseLabel.classList.toggle("hidden", !isTown);
  }
  onAttributeChanged(name, oldValue, newValue) {
    switch (name) {
      case "data-show-town-focus":
        this.townFocusPanel.classList.toggle("hidden", newValue !== "true");
        if (oldValue === "false" && newValue === "true") {
          Focus.setContextAwareFocus(this.townFocusPanel, this.Root);
          Audio.playSound("data-audio-showing", "town-specialization-panel");
        } else if (oldValue === "true" && newValue === "false") {
          Audio.playSound("data-audio-hiding", "town-specialization-panel");
        }
        this.updateNavTray();
        break;
    }
  }
  renderUpgradeToCityAlert() {
    const backgroundColor = "rgb(72, 36, 36)";
    const capReachedBar = document.createElement("div");
    capReachedBar.classList.add("flex-row-reverse", "flex", "h-10");
    capReachedBar.dataset.slot = "footer";
    capReachedBar.style.backgroundColor = backgroundColor;
    const capReachedContent = document.createElement("div");
    capReachedContent.classList.add("flex-auto", "relative", "flex", "items-center", "justify-center");
    const capReachedLabel = document.createElement("div");
    capReachedLabel.classList.add("ml-1", "accent-2", "uppercase", "text-center", "w-full");
    capReachedLabel.setAttribute("data-l10n-id", "LOC_UI_CITY_CAP_REACHED");
    const costElement = document.createElement("div");
    costElement.className = "text-sm font-body tracking-25";
    capReachedContent.appendChild(capReachedLabel);
    capReachedBar.appendChild(capReachedContent);
    return [capReachedBar, costElement];
  }
  renderUpgradeToCityButton() {
    const upgradeToCityButton = document.createElement("chooser-item");
    upgradeToCityButton.setAttribute("hover-only-trigger", "false");
    upgradeToCityButton.setAttribute("action-key", "inline-shell-action-1");
    waitForLayout(() => upgradeToCityButton.removeAttribute("tabindex"));
    upgradeToCityButton.classList.add(
      "flex-row-reverse",
      "flex",
      "text-accent-2",
      "font-title",
      "uppercase",
      "p-2"
    );
    upgradeToCityButton.dataset.slot = "footer";
    const upgradeToCityButtonContent = document.createElement("div");
    upgradeToCityButtonContent.classList.add("flex-auto", "relative", "flex", "items-center");
    const upgradeToCityButtonLabel = document.createElement("div");
    upgradeToCityButtonLabel.classList.add("ml-1", "flex-auto", "text-base");
    upgradeToCityButtonLabel.setAttribute("data-l10n-id", "LOC_UI_CONVERT_TO_CITY");
    const costWrapper = document.createElement("div");
    costWrapper.className = "flex items-center";
    const costElement = document.createElement("div");
    costElement.className = "text-sm font-body tracking-25";
    const fxsIcon = document.createElement("fxs-icon");
    fxsIcon.className = "size-8 bg-no-repeat bg-center bg-contain";
    fxsIcon.ariaLabel = Locale.compose("LOC_YIELD_GOLD");
    fxsIcon.setAttribute("data-icon-context", "YIELD");
    fxsIcon.setAttribute("data-icon-id", "YIELD_GOLD");
    costWrapper.appendChild(costElement);
    costWrapper.appendChild(fxsIcon);
    upgradeToCityButtonContent.appendChild(upgradeToCityButtonLabel);
    upgradeToCityButtonContent.appendChild(costWrapper);
    upgradeToCityButton.appendChild(upgradeToCityButtonContent);
    return [upgradeToCityButton, costElement];
  }
  render() {
    this.Root.classList.add("panel-production-chooser", "relative", "z-0", "flex", "flex-col", "flex-auto");
    this.Root.setAttribute("data-tooltip-anchor", "right");
    this.cityStatusContainerElement.classList.add(
      "hidden",
      "min-h-6",
      "flex",
      "items-center",
      "justify-center",
      "mb-1"
    );
    this.cityStatusContainerElement.dataset.slot = "header";
    this.cityStatusIconElement.src = "fs://game/yield_angry.png";
    this.cityStatusIconElement.classList.value = "size-6 bg-contain bg-center bg-no-repeat mr-1";
    this.cityStatusContainerElement.appendChild(this.cityStatusIconElement);
    this.cityStatusTextElement.classList.value = "font-title text-base text-negative-light tracking-100 uppercase";
    this.cityStatusContainerElement.appendChild(this.cityStatusTextElement);
    this.frame.appendChild(this.cityStatusContainerElement);
    const cityNameWrapper = document.createElement("div");
    cityNameWrapper.classList.add("flex", "items-start", "justify-between");
    Databind.classToggle(cityNameWrapper, "mx-14", "!{{g_NavTray.isTrayRequired}}");
    Databind.classToggle(cityNameWrapper, "mx-2", "{{g_NavTray.isTrayRequired}}");
    cityNameWrapper.classList.toggle("px-6", UI.getViewExperience() == UIViewExperience.Mobile);
    cityNameWrapper.dataset.slot = "header";
    this.prevCityButton.classList.add("flex", "flex-row", "items-center");
    this.prevCityButton.setAttribute("action-key", "inline-prev-city");
    const prevCityButtonArrow = document.createElement("div");
    prevCityButtonArrow.classList.add("img-arrow", "w-8", "h-12", "-mt-2");
    Databind.classToggle(prevCityButtonArrow, "hidden", "{{g_NavTray.isTrayRequired}}");
    this.prevCityButton.appendChild(prevCityButtonArrow);
    cityNameWrapper.appendChild(this.prevCityButton);
    const cityNameContainer = document.createElement("div");
    cityNameContainer.classList.add("flex", "flex-col", "max-w-full", "flex-auto", "px-6");
    cityNameContainer.appendChild(this.cityStatusContainerElement);
    this.cityNameElement.classList.add(
      "flex-auto",
      "px-4",
      "text-lg",
      "text-center",
      "font-title",
      "uppercase",
      "tracking-100"
    );
    this.cityNameElement.classList.toggle("mx-8", UI.getViewExperience() == UIViewExperience.Mobile);
    this.cityNameElement.setAttribute("header-bg-glow", "true");
    this.cityNameElement.setAttribute("font-fit-mode", "shrink");
    this.cityNameElement.setAttribute("filigree-style", "small");
    this.cityNameElement.setAttribute("wrap", "nowrap");
    this.cityNameElement.setAttribute("tab-for", "panel-production-chooser");
    cityNameContainer.appendChild(this.cityNameElement);
    cityNameWrapper.appendChild(cityNameContainer);
    this.nextCityButton.classList.add("flex", "flex-row-reverse", "items-center");
    this.nextCityButton.setAttribute("action-key", "inline-next-city");
    const nextCityButtonArrow = document.createElement("div");
    nextCityButtonArrow.classList.add("img-arrow", "w-8", "h-12", "-mt-2", "-scale-x-100");
    Databind.classToggle(nextCityButtonArrow, "hidden", "{{g_NavTray.isTrayRequired}}");
    this.nextCityButton.appendChild(nextCityButtonArrow);
    cityNameWrapper.appendChild(this.nextCityButton);
    this.frame.appendChild(cityNameWrapper);
    this.frame.classList.add("shrink", "pointer-events-auto", "panel-production__frame");
    Databind.classToggle(this.frame, "mb-16", "{{g_NavTray.isTrayRequired}}");
    this.frame.dataset.headerClass = "flex flex-col px-3 mx-0\\.5";
    this.frame.dataset.footerClass = "px-5 pb-2 mx-0\\.5";
    const yieldBarRow = document.createElement("div");
    yieldBarRow.classList.value = "flex self-center justify-center items-center";
    yieldBarRow.dataset.slot = "header";
    this.frame.appendChild(yieldBarRow);
    this.showCityDetailsButton.setAttribute("data-tooltip-content", "LOC_UI_SHOW_CITY_DETAILS");
    this.showCityDetailsButton.classList.value = "relative flex items-center justify-center production-chooser__city-details-button mr-2";
    this.showCityDetailsButton.setAttribute("tabindex", "-1");
    const buttonHighlight = document.createElement("div");
    buttonHighlight.classList.add("absolute", "inset-0", "city-details-highlight");
    this.showCityDetailsButton.appendChild(buttonHighlight);
    const showCityDetailsIcon = document.createElement("div");
    showCityDetailsIcon.classList.value = "img-city-details relative";
    this.showCityDetailsButton.appendChild(showCityDetailsIcon);
    this.showCityDetailsButton.setAttribute("data-audio-press-ref", "data-audio-select-press");
    this.showCityDetailsButton.setAttribute("data-audio-activate-ref", "none");
    yieldBarRow.appendChild(this.showCityDetailsButton);
    this.cityYieldBar.classList.add("flex", "self-center");
    yieldBarRow.appendChild(this.cityYieldBar);
    this.updateCityYieldBar();
    this.townFocusSection.dataset.slot = "header";
    this.frame.appendChild(this.townFocusSection);
    this.lastProductionSection.dataset.slot = "header";
    this.frame.appendChild(this.lastProductionSection);
    const viewHiddenCheckboxLabel = document.createElement("p");
    viewHiddenCheckboxLabel.classList.value = "text-xs";
    viewHiddenCheckboxLabel.setAttribute("data-l10n-id", "LOC_UI_PRODUCTION_VIEW_HIDDEN");
    const viewHiddenContainer = document.createElement("div");
    Databind.classToggle(viewHiddenContainer, "hidden", "{{g_NavTray.isTrayRequired}}");
    viewHiddenContainer.classList.value = "flex items-center self-end pr-7 pb-3";
    viewHiddenContainer.appendChild(this.viewHiddenCheckbox);
    viewHiddenContainer.appendChild(viewHiddenCheckboxLabel);
    viewHiddenContainer.dataset.slot = "header";
    this.frame.appendChild(viewHiddenContainer);
    this.productionPurchaseContainer.classList.value = "flex items-center";
    this.productionPurchaseContainer.setAttribute("data-slot", "header");
    this.townPurchaseLabel.classList.value = "flex flex-auto items-center justify-center";
    this.townPurchaseLabel.insertAdjacentHTML(
      "beforeend",
      `
		 	<div class="text-secondary-2 text-gradient-secondary text-xs font-title uppercase" data-l10n-id="LOC_UI_PURCHASE_TAB"></div>
		`
    );
    this.productionPurchaseContainer.appendChild(this.townPurchaseLabel);
    const productionPurchaseTabBarTabs = [
      {
        id: "production-chooser-tab-production",
        label: "LOC_UI_PRODUCTION_TAB",
        className: "px-2"
      },
      {
        id: "production-chooser-tab-purchase",
        label: "LOC_UI_PURCHASE_TAB",
        className: "px-2"
      }
    ];
    this.productionPurchaseTabBar.classList.add("flex-auto", "max-h-12", "mb-1", "mx-6");
    this.productionPurchaseTabBar.setAttribute("tab-style", "flat");
    this.productionPurchaseTabBar.setAttribute("nav-help-left-class", "pl-2");
    this.productionPurchaseTabBar.setAttribute("nav-help-right-class", "pr-2");
    this.productionPurchaseTabBar.setAttribute("tab-items", JSON.stringify(productionPurchaseTabBarTabs));
    this.productionPurchaseTabBar.setAttribute("data-slot", "header");
    this.productionPurchaseTabBar.setAttribute("tab-for", ".panel-production__frame");
    this.productionPurchaseTabBar.setAttribute("alt-controls", "false");
    this.productionPurchaseTabBar.setAttribute("data-audio-group-ref", "city-actions");
    this.productionPurchaseTabBar.setAttribute("data-audio-tab-selected", "none");
    this.productionPurchaseContainer.appendChild(this.productionPurchaseTabBar);
    this.frame.appendChild(this.productionPurchaseContainer);
    this.upgradeToCityButton.dataset.slot = "footer";
    this.upgradeToCityButton.setAttribute("caption", "LOC_PROJECT_TOWN_PROMOTION_NAME");
    this.upgradeToCityButton.setAttribute("data-audio-group-ref", "city-actions");
    this.upgradeToCityButton.setAttribute("data-audio-activate-ref", "data-audio-city-production-upgrade");
    this.upgradeToCityButton.setAttribute("tabindex", "-1");
    this.frame.appendChild(this.upgradeToCityButton);
    this.upgradeToCityAlert.dataset.slot = "footer";
    this.upgradeToCityAlert.setAttribute("tabindex", "-1");
    this.frame.appendChild(this.upgradeToCityAlert);
    this.frame.appendChild(this.townUnrestDisplay);
    this.productionAccordion.classList.add("relative");
    this.productionAccordion.setAttribute("disable-focus-allowed", "true");
    for (const category of Object.values(ProductionPanelCategory)) {
      const section = this.productionCategorySlots[category];
      this.productionAccordion.appendChild(section.root);
    }
    this.frame.appendChild(this.productionAccordion);
    this.subPanelContainer.classList.add("-z-1", "mt-32", "mb-12", "-ml-10", "relative", "shrink");
    this.buildQueue.classList.add("absolute", "left-3", "h-full");
    this.subPanelContainer.appendChild(this.buildQueue);
    this.townFocusPanelCloseButton.classList.add("absolute", "top-0", "right-0");
    this.townFocusPanel.appendChild(this.townFocusPanelCloseButton);
    this.subPanelContainer.appendChild(this.townFocusPanel);
    const productionChooserHSlot = document.createElement("fxs-hslot");
    productionChooserHSlot.classList.add("flex-auto");
    productionChooserHSlot.appendChild(this.frame);
    productionChooserHSlot.appendChild(this.subPanelContainer);
    this.Root.appendChild(productionChooserHSlot);
  }
}
Controls.define("panel-production-chooser", {
  createInstance: ProductionChooserScreen,
  description: "",
  attributes: [{ name: "data-show-town-focus" }],
  styles: [styles]
});

export { ProductionChooserScreen };
//# sourceMappingURL=panel-production-chooser.js.map
