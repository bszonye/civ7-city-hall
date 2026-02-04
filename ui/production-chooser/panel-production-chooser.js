// vim: sw=2 et
import { A as Audio } from '../../../core/ui/audio-base/audio-support.chunk.js';
import { b as FxsFrame, E as EditableHeaderTextChangedEventName, e as EditableHeaderExitEditEventName } from '../../../core/ui/components/fxs-editable-header.chunk.js';
import ContextManager from '../../../core/ui/context-manager/context-manager.js';
import { a as DialogBoxManager, D as DialogBoxAction } from '../../../core/ui/dialog-box/manager-dialog-box.chunk.js';
import ActionHandler from '../../../core/ui/input/action-handler.js';
import FocusManager from '../../../core/ui/input/focus-manager.js';
import { b as FxsVSlot, F as Focus } from '../../../core/ui/input/focus-support.chunk.js';
import { b as InputEngineEventName } from '../../../core/ui/input/input-support.chunk.js';
import { PlotCursor } from '../../../core/ui/input/plot-cursor.js';
import { InterfaceModeChangedEventName, InterfaceMode } from '../../../core/ui/interface-modes/interface-modes.js';
import { N as NavTray } from '../../../core/ui/navigation-tray/model-navigation-tray.chunk.js';
import { P as Panel, A as AnchorType } from '../../../core/ui/panel-support.chunk.js';
import { C as ComponentID } from '../../../core/ui/utilities/utilities-component-id.chunk.js';
import { D as Databind } from '../../../core/ui/utilities/utilities-core-databinding.chunk.js';
import { MustGetElement, IsElement } from '../../../core/ui/utilities/utilities-dom.chunk.js';
import { L as Layout } from '../../../core/ui/utilities/utilities-layout.chunk.js';
import { U as UpdateGate } from '../../../core/ui/utilities/utilities-update-gate.chunk.js';
import { V as ViewManager } from '../../../core/ui/views/view-manager.chunk.js';
import { BuildQueue } from '../build-queue/model-build-queue.js';
import { BuildingPlacementManager } from '../building-placement/building-placement-manager.js';
import { CityDetailsClosedEventName } from '../city-details/panel-city-details.js';
import { P as ProductionPanelCategory, b as GetTownFocusBlp, c as GetTownFocusItems, U as UpdateCityDetailsEventName, d as GetLastProductionData, e as GetCityBuildReccomendations, f as GetUniqueQuarterForPlayer, g as GetProductionItems, R as RepairConstruct, S as SetTownFocus, G as GetPrevCityID, a as GetNextCityID, h as Construct, i as CreateProductionChooserItem, j as GetNumUniqueQuarterBuildingsCompleted, k as GetCurrentTownFocus } from './production-chooser-helpers.chunk.js';
import { t as template, i as insert, s as setAttribute, C as ComponentRegistry, k as defineLegacyComponent, b as spread } from '../../../core/ui-next/components/tooltip-model.chunk.js';
import { I as Icon } from '../../../core/ui-next/components/nav-help.chunk.js';
import { L as L10n } from '../../../core/ui-next/components/slot.chunk.js';
import { T as Tooltip, c as TooltipHorizontalPosition, b as TooltipVerticalPosition } from '../../../core/ui-next/components/tooltip.chunk.js';
import { d as createComponent, f as createRenderEffect, p as splitProps, e as createMemo, m as mergeProps, F as For, S as Show, k as Switch, M as Match, a as createEffect } from '../../../core/ui-next/services/model-registry.chunk.js';
import { g as getConstructibleTagsFromType, c as composeTagString } from '../utilities/utilities-tags.chunk.js';
import { FocusCityViewEventName } from '../views/view-city.js';
import { C as ChooserItem } from '../../../core/ui-next/components/chooser-item.chunk.js';
import { P as PillText, A as AdvisorRecommendationPill, a as AdvisorRecommendationsList } from '../../ui-next/components/pills.chunk.js';
import { F as FiligreeTitle } from '../../../core/ui-next/components/filigree-title.chunk.js';
import { g as getModifierTextByContext, b as parseConstructibleAdjacencyNameOnly } from '../../../core/ui/utilities/utilities-core-textprovider.chunk.js';
import { F as Framework } from '../../../core/ui/framework.chunk.js';
import '../yield-bar-base/yield-bar-base.js';
import { F as FxsChooserItem } from '../../../core/ui/components/fxs-chooser-item.chunk.js';
import '../../../core/ui/components/fxs-activatable.chunk.js';
import '../../../core/ui/context-manager/display-queue-manager.js';
import '../../../core/ui/input/cursor.js';
import '../../../core/ui/spatial/spatial-manager.js';
import '../../../core/ui/utilities/utilities-image.chunk.js';
import '../utilities/utilities-overlay.chunk.js';
import '../tutorial/tutorial-support.chunk.js';
import '../../../core/ui/components/fxs-nav-help.chunk.js';
import '../quest-tracker/quest-item.js';
import '../quest-tracker/quest-tracker.js';
import '../../../core/ui/utilities/utility-serialize.chunk.js';
import '../tutorial/tutorial-item.js';
import '../tutorial/tutorial-manager.js';
import '../../../core/ui/input/input-filter.chunk.js';
import '../tutorial/tutorial-events.chunk.js';
import '../../../core/ui-next/components/activatable.chunk.js';
import '../../../core/ui-next/utilities/game-core-utilities.chunk.js';
import '../../../core/ui-next/components/filigree.chunk.js';
import '../../../core/ui-next/components/header.chunk.js';

// eslint-disable-next-line no-unused-vars -- FXS
const CanUpgradeToCity = (townID) => {
  const result = Game.CityCommands.canStart(
    townID,
    CityCommandTypes.PURCHASE,
    { Directive: OrderTypes.ORDER_TOWN_UPGRADE },
    false
  );
  return result.Success;
};
// eslint-disable-next-line no-unused-vars -- FXS
const CanCityConstruct = (cityID, constructible, isPurchase) => {
  if (isPurchase) {
    return Game.CityCommands.canStart(
      cityID,
      CityCommandTypes.PURCHASE,
      { ConstructibleType: constructible.$index },
      false
    );
  } else {
    return Game.CityOperations.canStart(
      cityID,
      CityOperationTypes.BUILD,
      { ConstructibleType: constructible.$index },
      false
    );
  }
};
const CanConvertToCity = (townID) => {
  return Game.CityCommands.canStart(
    townID,
    CityCommandTypes.PURCHASE,
    { Directive: OrderTypes.ORDER_TOWN_UPGRADE },
    false
  );
};
const ConvertToCity = (townID) => {
  const result = CanConvertToCity(townID);
  if (result.Success) {
    Game.CityCommands.sendRequest(townID, CityCommandTypes.PURCHASE, { Directive: OrderTypes.ORDER_TOWN_UPGRADE });
    UI.sendAudioEvent("city-upgrade-confirm");
    return true;
  }
  return false;
};

var _tmpl$$3 = /* @__PURE__ */ template(`<div class="production-chooser-item text-xs leading-tight flex items-center mb-2 mx-2 hover\\:text-secondary-1 focus\\:text-secondary-1"><div class="flex-auto flex flex-col ml-1"><div class="font-title text-sm tracking-25 uppercase text-gradient-secondary transition-color"></div><div class="font-body transition-color" data-l10n-id=LOC_UI_PRODUCTION_UNIQUE_QUARTER></div></div><div class="font-body self-end transition-color"></div></div>`);
// var _tmpl$$3 = /* @__PURE__ */ template(`<div class="production-chooser-item flex items-center mb-2 ml-2 hover\\\\:text-accent-1 focus\\\\:text-accent-1"><div class="flex-auto flex flex-col"><div class="font-title text-base tracking-100 uppercase transition-color"></div><div class="font-body text-sm transition-color"data-l10n-id=LOC_UI_PRODUCTION_UNIQUE_QUARTER></div></div><div class="font-body text-sm self-end transition-color"></div></div>`);
const ProductionChooserUniqueQuarterItemComponent = (props) => {
  return createComponent(Tooltip.Text, {
    get initialVPosition() {
      return TooltipVerticalPosition.CENTER;
    },
    get initialHPosition() {
      return TooltipHorizontalPosition.RIGHT;
    },
    offset: 30,
    get text() {
      return props.description;
    },
    get children() {
      var _el$ = _tmpl$$3(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$2.nextSibling;
      insert(_el$, createComponent(Icon, {
        "class": "size-10 ml-2\\.5 mr-2",
        name: "CITY_UNIQUE_QUARTER"
      }), _el$2);
      insert(_el$4, createComponent(L10n.Compose, {
        text: "LOC_UI_PRODUCTION_QUARTER_BUILDINGS_COMPLETED",
        get args() {
          return [props.currentCompleted];
        }
      }));
      createRenderEffect(() => setAttribute(_el$3, "data-l10n-id", props.name));
      return _el$;
    }
  });
};
const ProductionChooserUniqueQuarterItem = ComponentRegistry.register({
  name: "ProductionChooserUniqueQuarterItem",
  createInstance: ProductionChooserUniqueQuarterItemComponent
});
defineLegacyComponent("production-chooser-unique-quarter-item", {
  attrs: {
    "data-name": "",
    "data-description": "",
    "data-current-completed": "0",
    "data-total-completed": "2"
  }
}, (attrs) => {
  const name = attrs["data-name"] ?? "";
  const description = attrs["data-description"] ?? "";
  const currentCompleted = parseInt(attrs["data-current-completed"] ?? "0", 10);
  const totalCompleted = parseInt(attrs["data-total-completed"] ?? "2", 10);
  return createComponent(ProductionChooserUniqueQuarterItem, {
    name,
    description,
    currentCompleted,
    totalCompleted
  });
});

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
    this.buildingContainer.className = "flex flex-col pl-2\\.5";
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

const styles = "fs://game/base-standard/ui/production-chooser/panel-production-chooser.css";

var _tmpl$$2 = /* @__PURE__ */ template(`<div class="flex items-center w-full"><div class=constructible-details__divider-line-left></div><p class="mx-2 font-title text-secondary text-sm uppercase"></p><div class=constructible-details__divider-line-right></div></div>`), _tmpl$2$2 = /* @__PURE__ */ template(`<div class="mb-2 flex flex-wrap"></div>`), _tmpl$3$2 = /* @__PURE__ */ template(`<div class=mb-2></div>`), _tmpl$4$2 = /* @__PURE__ */ template(`<div class="img-shell-line-divider h-1 w-1/2 self-center mb-2"></div>`), _tmpl$5$2 = /* @__PURE__ */ template(`<div class="flex items-center"><div class=mr-2></div></div>`), _tmpl$6$2 = /* @__PURE__ */ template(`<div class="flex mb-2 items-center"><div class=mr-2></div></div>`), _tmpl$7$1 = /* @__PURE__ */ template(`<div><div class="w-full flex flex-wrap self-center justify-center"></div></div>`), _tmpl$8$1 = /* @__PURE__ */ template(`<div></div>`);
const bulletChar = String.fromCodePoint(8226);
const formatStylizedSpacing = (element) => {
  if (!element) {
    return;
  }
  let firstChild = true;
  let prevChildIsList = false;
  for (const node of Array.from(element.children)) {
    const isList = node.innerHTML.includes(bulletChar);
    if (isList) {
      node.classList.add("ml-4");
    }
    if (!firstChild && (!prevChildIsList || !isList)) {
      node.classList.add("mt-2");
    }
    firstChild = false;
    prevChildIsList = isList;
  }
};
const collectYieldChanges = (constructibleType) => {
  if (!constructibleType) {
    return [];
  }
  const results = [];
  for (const entry of GameInfo.Constructible_YieldChanges) {
    if (entry.ConstructibleType === constructibleType) {
      results.push({
        amount: entry.YieldChange,
        yieldType: entry.YieldType
      });
    }
  }
  return results;
};
const collectModifierTexts = (constructibleType) => {
  if (!constructibleType) {
    return [];
  }
  const modifiers = [];
  for (const modifier of GameInfo.ConstructibleModifiers) {
    if (modifier.ConstructibleType === constructibleType) {
      const text = getModifierTextByContext(modifier.ModifierId, "Description");
      if (text) {
        modifiers.push(text);
      }
    }
  }
  return modifiers;
};
const collectMaintenanceEntries = (constructibleType, selectedCity) => {
  if (!constructibleType || !selectedCity) {
    return [];
  }
  const values = selectedCity.Constructibles?.getMaintenance(constructibleType);
  if (!values || values.length === 0) {
    return [];
  }
  const entries = [];
  for (let index = 0; index < values.length; index += 1) {
    const amount = values[index];
    if (amount > 0) {
      const yieldDefinition = GameInfo.Yields[index];
      if (yieldDefinition) {
        entries.push({
          yieldType: yieldDefinition.YieldType,
          value: amount
        });
      }
    }
  }
  return entries;
};
const buildAdjacencyListMarkup = (entries) => {
  const items = entries.map((definition) => `[LI] ${parseConstructibleAdjacencyNameOnly(definition)}`).join("");
  return `[BLIST]${items}[/BLIST]`;
};
const collectAdjacencyGroups = (constructibleType, selectedCity) => {
  if (!constructibleType) {
    return [];
  }
  const adjacencyDefinitions = [];
  for (const definition of GameInfo.Constructible_Adjacencies) {
    if (definition.ConstructibleType !== constructibleType) {
      continue;
    }
    const yieldChangeDef = GameInfo.Adjacency_YieldChanges.find((entry) => entry.ID === definition.YieldChangeId);
    if (!yieldChangeDef) {
      continue;
    }
    if (definition.RequiresActivation && selectedCity?.Constructibles) {
      if (!selectedCity.Constructibles.isAdjacencyUnlocked(yieldChangeDef.ID)) {
        continue;
      }
    }
    adjacencyDefinitions.push(yieldChangeDef);
  }
  if (adjacencyDefinitions.length === 0) {
    return [];
  }
  const groups = [];
  let counter = 0;
  for (const yieldDefinition of GameInfo.Yields) {
    const perChangeMap = /* @__PURE__ */ new Map();
    for (const changeDefinition of adjacencyDefinitions) {
      if (changeDefinition.YieldType !== yieldDefinition.YieldType) {
        continue;
      }
      const list = perChangeMap.get(changeDefinition.YieldChange);
      if (list) {
        list.push(changeDefinition);
      } else {
        perChangeMap.set(changeDefinition.YieldChange, [changeDefinition]);
      }
    }
    perChangeMap.forEach((definitions, value) => {
      const id = `${yieldDefinition.YieldType}-${value}-${counter}`;
      counter += 1;
      if (definitions.length <= 1) {
        groups.push({
          id,
          textKey: "LOC_UI_ADJACENCY_INFO_OBJECT",
          args: [value, `[icon:${yieldDefinition.YieldType}]`, parseConstructibleAdjacencyNameOnly(definitions[0])]
        });
        return;
      }
      groups.push({
        id,
        textKey: "LOC_UI_ADJACENCY_INFO_GENERIC",
        args: [value, yieldDefinition.YieldType],
        listMarkup: buildAdjacencyListMarkup(definitions)
      });
    });
  }
  return groups;
};
const shouldShowBonus = (value) => value !== void 0 && value !== null && value !== "";
const ConstructibleDetails = (props) => {
  const [local, other] = splitProps(props, ["constructibleType", "isPurchase", "dividerStyle", "warehouseBonus", "adjacencyBonus", "cost", "class"]);
  const constructibleType = createMemo(() => local.constructibleType ?? void 0);
  const definition = createMemo(() => {
    const type = constructibleType();
    if (!type) {
      return void 0;
    }
    const entry = GameInfo.Constructibles.lookup(type);
    if (!entry) {
      console.error(`constructible-details: failed to find definition for constructible type ${type}`);
    }
    return entry ?? void 0;
  });
  const selectedCity = createMemo(() => {
    const cityID = UI.Player.getHeadSelectedCity();
    return cityID ? Cities.get(cityID) : null;
  });
  const dividerStyle = createMemo(() => local.dividerStyle ?? "normal");
  const tags = createMemo(() => {
    const type = constructibleType();
    return type ? getConstructibleTagsFromType(type) : [];
  });
  const baseYields = createMemo(() => collectYieldChanges(constructibleType()));
  const modifierTexts = createMemo(() => collectModifierTexts(constructibleType()));
  const tooltipText = createMemo(() => definition()?.Tooltip ?? "");
  const showTooltip = createMemo(() => !!tooltipText());
  const costIcon = createMemo(() => local.isPurchase ? "YIELD_GOLD" : "YIELD_PRODUCTION");
  const maintenanceEntries = createMemo(() => collectMaintenanceEntries(constructibleType(), selectedCity()));
  const adjacencyGroups = createMemo(() => collectAdjacencyGroups(constructibleType(), selectedCity()));
  const showWarehouseBonus = createMemo(() => shouldShowBonus(local.warehouseBonus));
  const showAdjacencyBonus = createMemo(() => shouldShowBonus(local.adjacencyBonus));
  const showMidSection = createMemo(() => {
    return baseYields().length > 0 || adjacencyGroups().length > 0 || modifierTexts().length > 0 || showTooltip();
  });
  const showBottomSection = createMemo(() => {
    return local.cost != 0 || maintenanceEntries().length > 0 || showWarehouseBonus() || showAdjacencyBonus();
  });
  return (() => {
    var _el$ = _tmpl$7$1(), _el$2 = _el$.firstChild;
    spread(_el$, mergeProps({
      get ["class"]() {
        return `mt-10 img-base-ticket-bg-container ${local.class ?? ""}`;
      }
    }, other), false, true);
    insert(_el$, createComponent(Icon, {
      "class": "size-20 self-center -mt-16 mb-2\\.5",
      get name() {
        return constructibleType() ?? void 0;
      }
    }), _el$2);
    insert(_el$2, createComponent(For, {
      get each() {
        return tags();
      },
      children: (tag) => createComponent(PillText, {
        "class": "mx-1 mb-2 text-sm",
        text: tag
      })
    }));
    insert(_el$, createComponent(Show, {
      get when() {
        return props.description;
      },
      get children() {
        return createComponent(L10n.Stylize, {
          get text() {
            return props.description;
          }
        });
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return showMidSection();
      },
      get children() {
        return [createComponent(Show, {
          get when() {
            return dividerStyle() === "text-divider";
          },
          get fallback() {
            return _tmpl$4$2();
          },
          get children() {
            var _el$3 = _tmpl$$2(), _el$4 = _el$3.firstChild, _el$5 = _el$4.nextSibling;
            insert(_el$5, createComponent(L10n.Compose, {
              text: "LOC_UI_CONTENT_MGR_DETAILS"
            }));
            return _el$3;
          }
        }), createComponent(Show, {
          get when() {
            return baseYields().length > 0;
          },
          get children() {
            var _el$6 = _tmpl$2$2();
            insert(_el$6, createComponent(For, {
              get each() {
                return baseYields();
              },
              children: (yieldValue) => createComponent(L10n.Stylize, {
                "class": "mr-2",
                text: "LOC_UI_POS_YIELD_ICON_ONLY",
                get args() {
                  return [yieldValue.amount, yieldValue.yieldType];
                }
              })
            }));
            return _el$6;
          }
        }), createComponent(Show, {
          get when() {
            return adjacencyGroups().length > 0;
          },
          get children() {
            var _el$7 = _tmpl$3$2();
            insert(_el$7, createComponent(For, {
              get each() {
                return adjacencyGroups();
              },
              children: (group, index) => (() => {
                var _el$17 = _tmpl$8$1();
                insert(_el$17, createComponent(L10n.Stylize, {
                  get ["class"]() {
                    return `block ${index() > 0 ? "mt-2" : ""} ${group.listMarkup ? "mb-2" : ""}`.trim();
                  },
                  get text() {
                    return group.textKey;
                  },
                  get args() {
                    return group.args;
                  }
                }), null);
                insert(_el$17, createComponent(Show, {
                  get when() {
                    return group.listMarkup;
                  },
                  children: (listText) => createComponent(L10n.Stylize, {
                    "class": "ml-4",
                    get text() {
                      return listText() ?? "";
                    }
                  })
                }), null);
                return _el$17;
              })()
            }));
            return _el$7;
          }
        }), createComponent(Show, {
          get when() {
            return modifierTexts().length > 0;
          },
          get children() {
            var _el$8 = _tmpl$3$2();
            insert(_el$8, createComponent(For, {
              get each() {
                return modifierTexts();
              },
              children: (text, index) => createComponent(L10n.Stylize, {
                get ["class"]() {
                  return `block ${index() > 0 ? "mt-1" : ""}`.trim();
                },
                text
              })
            }));
            return _el$8;
          }
        }), createComponent(Show, {
          get when() {
            return showTooltip();
          },
          get children() {
            return createComponent(L10n.Stylize, {
              "class": "mb-2",
              get text() {
                return tooltipText();
              },
              ref: formatStylizedSpacing
            });
          }
        })];
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return showBottomSection();
      },
      get children() {
        return [_tmpl$4$2(), createComponent(Show, {
          get when() {
            return local.cost;
          },
          children: (cost) => createComponent(L10n.Stylize, {
            text: "LOC_UI_PRODUCTION_CONSTRUCTIBLE_COST",
            get args() {
              return [cost(), costIcon()];
            }
          })
        }), createComponent(Show, {
          get when() {
            return maintenanceEntries().length > 0;
          },
          get children() {
            var _el$10 = _tmpl$5$2(), _el$11 = _el$10.firstChild;
            insert(_el$11, createComponent(L10n.Compose, {
              text: "LOC_UI_PRODUCTION_MAINTENANCE"
            }));
            insert(_el$10, createComponent(For, {
              get each() {
                return maintenanceEntries();
              },
              children: (entry) => createComponent(L10n.Stylize, {
                "class": "mr-2",
                text: "LOC_UI_PRODUCTION_MAINTENANCE_NEGATIVE_VALUE",
                get args() {
                  return [entry.value, entry.yieldType];
                }
              })
            }), null);
            return _el$10;
          }
        }), createComponent(Show, {
          get when() {
            return showWarehouseBonus();
          },
          get children() {
            var _el$12 = _tmpl$6$2(), _el$13 = _el$12.firstChild;
            insert(_el$13, createComponent(L10n.Compose, {
              text: "LOC_BUILDING_PLACEMENT_WAREHOUSE_IMPROVEMENTS"
            }));
            insert(_el$12, createComponent(L10n.Stylize, {
              "class": "mr-2",
              text: "{1_amount} [icon:{2_icon}]",
              get args() {
                return [local.warehouseBonus, "YIELD_WAREHOUSE"];
              }
            }), null);
            return _el$12;
          }
        }), createComponent(Show, {
          get when() {
            return showAdjacencyBonus();
          },
          get children() {
            var _el$14 = _tmpl$6$2(), _el$15 = _el$14.firstChild;
            insert(_el$15, createComponent(L10n.Compose, {
              text: "LOC_BUILDING_PLACEMENT_HIGHEST_ADJACENCIES"
            }));
            insert(_el$14, createComponent(L10n.Stylize, {
              "class": "mr-2",
              text: "{1_amount} [icon:{2_icon}]",
              get args() {
                return [local.adjacencyBonus, "YIELD_ADJACENCY"];
              }
            }), null);
            return _el$14;
          }
        })];
      }
    }), null);
    return _el$;
  })();
};

var _tmpl$$1 = /* @__PURE__ */ template(`<div class="flex flex-row flex-wrap items-center justify-center mt-2 -mb-1"></div>`), _tmpl$2$1 = /* @__PURE__ */ template(`<div></div>`), _tmpl$3$1 = /* @__PURE__ */ template(`<div class="flex items-center"><div class=text-negative-light></div></div>`), _tmpl$4$1 = /* @__PURE__ */ template(`<div><div class=img-base-ticket-bg-container><div class="img-shell-line-divider h-1 w-1/2 self-center mb-2"></div><div class="img-shell-line-divider h-1 w-1/2 self-center mb-2"></div></div></div>`), _tmpl$5$1 = /* @__PURE__ */ template(`<div class="flex flex-row flex-wrap items-center justify-center mt-4 -mb-1"></div>`), _tmpl$6$1 = /* @__PURE__ */ template(`<div><div class="flex flex-row items-center self-center"><div class=filigree-shell-small-left></div><div class=filigree-shell-small-right></div></div></div>`);
const BULLET_CHAR = String.fromCodePoint(8226);
const normalizeCategory$1 = (value) => {
  if (!value) {
    return ProductionPanelCategory.BUILDINGS;
  }
  switch (value) {
    case ProductionPanelCategory.UNITS:
      return ProductionPanelCategory.UNITS;
    case ProductionPanelCategory.PROJECTS:
      return ProductionPanelCategory.PROJECTS;
    case ProductionPanelCategory.WONDERS:
      return ProductionPanelCategory.WONDERS;
    default:
      return ProductionPanelCategory.BUILDINGS;
  }
};
const parseRecommendations$1 = (values) => values ?? [];
const ProductionConstructibleTooltipContent = (props) => {
  const [local, other] = splitProps(props, ["constructibleType", "name", "description", "recommendations", "warehouseCount", "canGetWarehouseBonuses", "highestAdjacency", "canGetAdjacencyBonuses", "isPurchase", "productionCost", "class"]);
  const definition = createMemo(() => local.constructibleType ? GameInfo.Constructibles.lookup(local.constructibleType) : null);
  const title = createMemo(() => definition()?.Name ?? local.name ?? "");
  const constructibleType = createMemo(() => definition()?.ConstructibleType ?? local.constructibleType ?? "");
  const showWarehouse = () => local.canGetWarehouseBonuses && !!local.warehouseCount;
  const showAdjacency = () => local.canGetAdjacencyBonuses && !!local.highestAdjacency;
  const showCostPill = () => local.productionCost !== void 0;
  const showBottomRow = () => local.recommendations.length > 0 || showCostPill();
  return (() => {
    var _el$ = _tmpl$2$1();
    spread(_el$, mergeProps({
      get ["class"]() {
        return `flex flex-col font-body text-sm text-accent-2 ${local.class ?? ""}`;
      }
    }, other), false, true);
    insert(_el$, createComponent(FiligreeTitle.Small, {
      "class": "mb-1",
      get text() {
        return title();
      },
      bgGlow: true
    }), null);
    insert(_el$, createComponent(ConstructibleDetails, {
      "class": "mb-1",
      get constructibleType() {
        return constructibleType();
      },
      get isPurchase() {
        return local.isPurchase;
      },
      get warehouseBonus() {
        return showWarehouse() ? local.warehouseCount ?? "0" : void 0;
      },
      get adjacencyBonus() {
        return showAdjacency() ? local.highestAdjacency ?? "0" : void 0;
      },
      cost: void 0,
      get description() {
        return local.description;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return showBottomRow();
      },
      get children() {
        var _el$2 = _tmpl$$1();
        insert(_el$2, createComponent(For, {
          get each() {
            return local.recommendations;
          },
          children: (rec, index) => createComponent(AdvisorRecommendationPill, {
            textOverride: "LOC_UI_RECOMMENDATION_DEFAULT",
            get ["class"]() {
              return index() > 0 ? "ml-2 mt-2" : "mt-2";
            },
            recommendation: rec
          })
        }), null);
        insert(_el$2, createComponent(Show, {
          get when() {
            return showCostPill();
          },
          get children() {
            return createComponent(PillText, {
              get ["class"]() {
                return local.recommendations.length > 0 ? "ml-2 mt-2" : "mt-2";
              },
              text: "LOC_CARD_COST",
              get args() {
                return [`${local.productionCost}[icon:${local.isPurchase ? "YIELD_GOLD" : "YIELD_PRODUCTION"}]`];
              }
            });
          }
        }), null);
        return _el$2;
      }
    }), null);
    return _el$;
  })();
};
const ProductionUnitTooltipContent = (props) => {
  const [local, other] = splitProps(props, ["unitType", "name", "description", "recommendations", "isPurchase", "cost", "class"]);
  const definition = createMemo(() => local.unitType ? GameInfo.Units.lookup(local.unitType) : null);
  const title = createMemo(() => definition()?.Name ?? local.name ?? "");
  const descriptionKey = createMemo(() => local.description ?? definition()?.Description ?? "");
  const maintenanceValue = createMemo(() => definition()?.Maintenance ?? 0);
  const maintenanceVisible = () => maintenanceValue() > 0;
  const productionCost = createMemo(() => {
    if (local.isPurchase) {
      return local.cost ? Number(local.cost) : void 0;
    }
    if (!definition()) {
      return void 0;
    }
    const cityID = UI.Player.getHeadSelectedCity();
    if (!cityID) {
      return void 0;
    }
    const city = Cities.get(cityID);
    return city?.Production?.getUnitProductionCost(definition().UnitType);
  });
  const showCostPill = () => productionCost() !== void 0;
  const showBottomRow = () => local.recommendations.length > 0 || showCostPill();
  return (() => {
    var _el$3 = _tmpl$4$1(), _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling;
    spread(_el$3, mergeProps({
      get ["class"]() {
        return `flex flex-col font-body text-sm text-accent-2 ${local.class ?? ""}`;
      }
    }, other), false, true);
    insert(_el$3, createComponent(FiligreeTitle.Small, {
      "class": "mb-1",
      get text() {
        return title();
      },
      bgGlow: true
    }), _el$4);
    insert(_el$4, createComponent(Show, {
      get when() {
        return descriptionKey();
      },
      get children() {
        return createComponent(L10n.Stylize, {
          "class": "mb-2",
          get text() {
            return descriptionKey() ?? "";
          }
        });
      }
    }), _el$6);
    insert(_el$4, createComponent(Show, {
      get when() {
        return maintenanceVisible();
      },
      get children() {
        var _el$7 = _tmpl$3$1(), _el$8 = _el$7.firstChild;
        insert(_el$7, createComponent(L10n.Stylize, {
          "class": "mr-2",
          text: "LOC_UI_PRODUCTION_MAINTENANCE"
        }), _el$8);
        insert(_el$7, createComponent(Icon, {
          "class": "size-5 mr-1",
          name: "YIELD_GOLD",
          get ["aria-label"]() {
            return Locale.compose("LOC_YIELD_GOLD");
          }
        }), _el$8);
        insert(_el$8, () => `-${maintenanceValue()}`);
        return _el$7;
      }
    }), null);
    insert(_el$3, createComponent(Show, {
      get when() {
        return showBottomRow();
      },
      get children() {
        var _el$9 = _tmpl$$1();
        insert(_el$9, createComponent(For, {
          get each() {
            return local.recommendations;
          },
          children: (rec, index) => createComponent(AdvisorRecommendationPill, {
            textOverride: "LOC_UI_RECOMMENDATION_DEFAULT",
            get ["class"]() {
              return index() > 0 ? "ml-2 mt-2" : "mt-2";
            },
            get classList() {
              return {
                "ml-2": index() > 0
              };
            },
            recommendation: rec
          })
        }), null);
        insert(_el$9, createComponent(Show, {
          get when() {
            return showCostPill();
          },
          get children() {
            return createComponent(PillText, {
              get ["class"]() {
                return local.recommendations.length > 0 ? "ml-2 mt-2" : "mt-2";
              },
              text: "LOC_CARD_COST",
              get args() {
                return [`${productionCost()}[icon:${local.isPurchase ? "YIELD_GOLD" : "YIELD_PRODUCTION"}]`];
              }
            });
          }
        }), null);
        return _el$9;
      }
    }), null);
    return _el$3;
  })();
};
const parseProjectTypeHash = (value) => {
  if (!value) {
    return void 0;
  }
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return numeric;
  }
  return Game.getHash(value);
};
const getProjectRequirements = (projectHash) => {
  if (!projectHash) {
    return void 0;
  }
  const project = GameInfo.Projects.lookup(projectHash);
  if (!project) {
    return void 0;
  }
  if (project.PrereqPopulation > 0) {
    return {
      key: "LOC_UI_PRODUCTION_REQUIRES_POPULATION",
      args: [project.PrereqPopulation]
    };
  }
  if (project.PrereqConstructible) {
    const definition = GameInfo.Constructibles.lookup(project.PrereqConstructible);
    if (definition) {
      return {
        key: "LOC_UI_PRODUCTION_REQUIRES_CONSTRUCTIBLE",
        args: [definition.Name ?? ""]
      };
    }
  }
  return void 0;
};
const ProductionProjectTooltipContent = (props) => {
  const [local, other] = splitProps(props, ["projectType", "name", "description", "recommendations", "growthType", "class"]);
  const projectHash = createMemo(() => parseProjectTypeHash(local.projectType));
  const iconUrl = createMemo(() => GetTownFocusBlp(local.growthType ?? null, projectHash() ?? null));
  const iconBackground = createMemo(() => iconUrl() ? `url(${iconUrl()})` : void 0);
  const productionCost = createMemo(() => {
    const hash = projectHash();
    if (!hash) {
      return void 0;
    }
    const cityID = UI.Player.getHeadSelectedCity();
    if (!cityID) {
      return void 0;
    }
    const city = Cities.get(cityID);
    return city?.Production?.getProjectProductionCost(hash);
  });
  const requirementsText = createMemo(() => getProjectRequirements(projectHash()));
  const applyDescriptionFormatting = (element) => {
    if (!element) {
      return;
    }
    let firstChild = true;
    let prevChildIsList = false;
    for (const node of Array.from(element.children)) {
      const isList = node.innerHTML.includes(BULLET_CHAR);
      if (isList) {
        node.classList.add("ml-4");
      }
      if (!firstChild && (!prevChildIsList || !isList)) {
        node.classList.add("mt-2");
      }
      firstChild = false;
      prevChildIsList = isList;
    }
  };
  const showCostPill = () => productionCost() !== void 0;
  const showBottomRow = () => local.recommendations.length > 0 || showCostPill();
  return (() => {
    var _el$10 = _tmpl$6$1(), _el$11 = _el$10.firstChild, _el$12 = _el$11.firstChild, _el$13 = _el$12.nextSibling;
    spread(_el$10, mergeProps({
      get ["class"]() {
        return `flex flex-col text-accent-2 font-body text-sm relative ${local.class ?? ""}`;
      }
    }, other), false, true);
    insert(_el$10, createComponent(FiligreeTitle.None, {
      get text() {
        return local.name ?? "";
      },
      bgGlow: true
    }), _el$11);
    insert(_el$11, createComponent(Icon, {
      "class": "size-12",
      get name() {
        return iconBackground() ?? "";
      },
      isUrl: true
    }), _el$13);
    insert(_el$10, createComponent(Show, {
      get when() {
        return local.description;
      },
      children: (text) => createComponent(L10n.Stylize, {
        "class": "mt-2",
        get text() {
          return text() ?? "";
        },
        ref: applyDescriptionFormatting
      })
    }), null);
    insert(_el$10, createComponent(Show, {
      get when() {
        return requirementsText();
      },
      children: (reqData) => createComponent(L10n.Stylize, {
        "class": "flex mt-2 p-2",
        style: {
          "background-color": "rgb(0 0 0 / 0.2)"
        },
        get text() {
          return reqData().key;
        },
        get args() {
          return reqData().args;
        }
      })
    }), null);
    insert(_el$10, createComponent(Show, {
      get when() {
        return showBottomRow();
      },
      get children() {
        var _el$14 = _tmpl$5$1();
        insert(_el$14, createComponent(For, {
          get each() {
            return local.recommendations;
          },
          children: (rec, index) => createComponent(AdvisorRecommendationPill, {
            textOverride: "LOC_UI_RECOMMENDATION_DEFAULT",
            get ["class"]() {
              return index() > 0 ? "ml-2 mt-2" : "mt-2";
            },
            recommendation: rec
          })
        }), null);
        insert(_el$14, createComponent(Show, {
          get when() {
            return showCostPill();
          },
          get children() {
            return createComponent(PillText, {
              get ["class"]() {
                return local.recommendations.length > 0 ? "ml-2 mt-2" : "mt-2";
              },
              text: "LOC_CARD_COST",
              get args() {
                return [`${productionCost()}[icon:YIELD_PRODUCTION]`];
              }
            });
          }
        }), null);
        return _el$14;
      }
    }), null);
    return _el$10;
  })();
};
const ProductionTooltipComponent = (props) => {
  const [local, other] = splitProps(props, ["category", "children", "class", "type", "name", "description", "tooltipDescription", "recommendations", "isPurchase", "cost", "warehouseCount", "highestAdjacency", "canGetWarehouseBonuses", "canGetAdjacencyBonuses", "projectGrowthType"]);
  const normalizedCategoryValue = createMemo(() => normalizeCategory$1(local.category));
  const recommendations = createMemo(() => parseRecommendations$1(local.recommendations));
  const constructibleProductionCost = createMemo(() => {
    if (local.isPurchase) {
      return local.cost ? Number(local.cost) : void 0;
    }
    if (!local.type) {
      return void 0;
    }
    const cityID = UI.Player.getHeadSelectedCity();
    if (!cityID) {
      return void 0;
    }
    const city = Cities.get(cityID);
    return city?.Production?.getConstructibleProductionCost(Game.getHash(local.type));
  });
  const tooltipContentClass = () => `w-128`;
  return createComponent(Tooltip, mergeProps({
    get initialHPosition() {
      return TooltipHorizontalPosition.RIGHT;
    },
    get initialVPosition() {
      return TooltipVerticalPosition.CENTER;
    },
    offset: 30
  }, other, {
    get children() {
      return [createComponent(Tooltip.Trigger, {
        get children() {
          return local.children;
        }
      }), createComponent(Tooltip.Content, {
        get ["class"]() {
          return local.class;
        },
        get children() {
          return createComponent(Tooltip.Frame, {
            get children() {
              return [createComponent(Switch, {
                get fallback() {
                  return createComponent(ProductionConstructibleTooltipContent, {
                    get ["class"]() {
                      return tooltipContentClass();
                    },
                    get constructibleType() {
                      return local.type;
                    },
                    get name() {
                      return local.name;
                    },
                    get description() {
                      return local.description;
                    },
                    get recommendations() {
                      return recommendations();
                    },
                    get warehouseCount() {
                      return local.warehouseCount;
                    },
                    get canGetWarehouseBonuses() {
                      return local.canGetWarehouseBonuses;
                    },
                    get highestAdjacency() {
                      return local.highestAdjacency;
                    },
                    get canGetAdjacencyBonuses() {
                      return local.canGetAdjacencyBonuses;
                    },
                    get isPurchase() {
                      return local.isPurchase;
                    },
                    get productionCost() {
                      return constructibleProductionCost();
                    }
                  });
                },
                get children() {
                  return [createComponent(Match, {
                    get when() {
                      return normalizedCategoryValue() === ProductionPanelCategory.UNITS;
                    },
                    get children() {
                      return createComponent(ProductionUnitTooltipContent, {
                        get ["class"]() {
                          return tooltipContentClass();
                        },
                        get unitType() {
                          return local.type;
                        },
                        get name() {
                          return local.name;
                        },
                        get description() {
                          return local.description;
                        },
                        get recommendations() {
                          return recommendations();
                        },
                        get isPurchase() {
                          return local.isPurchase;
                        },
                        get cost() {
                          return local.cost;
                        }
                      });
                    }
                  }), createComponent(Match, {
                    get when() {
                      return normalizedCategoryValue() === ProductionPanelCategory.PROJECTS;
                    },
                    get children() {
                      return createComponent(ProductionProjectTooltipContent, {
                        get ["class"]() {
                          return tooltipContentClass();
                        },
                        get projectType() {
                          return local.type;
                        },
                        get name() {
                          return local.name;
                        },
                        get description() {
                          return local.tooltipDescription ?? local.description;
                        },
                        get recommendations() {
                          return recommendations();
                        },
                        get growthType() {
                          return local.projectGrowthType;
                        }
                      });
                    }
                  })];
                }
              }), createComponent(Tooltip.InspectHint, {
                "class": "relative mt-1"
              })];
            }
          });
        }
      })];
    }
  }));
};
const ProductionTooltip = ComponentRegistry.register({
  name: "ProductionTooltip",
  createInstance: ProductionTooltipComponent,
  images: ["blp:base_ticket-bg", "blp:shell_line-divider"]
});

var
  _tmpl$ = /* @__PURE__ */ template(`<span class="font-body text-negative-light z-1 pointer-events-none"></span>`),
  _tmpl$2 = /* @__PURE__ */ template(`<div class="flex items-center text-xs -ml-1"></div>`),
  _tmpl$3 = /* @__PURE__ */ template(`<div class="flex items-center"></div>`),
  _tmpl$4 = /* @__PURE__ */ template(`<div class="flex items-center"><div class=mx-2>|</div><div class=mx-1></div></div>`),
  _tmpl$5 = /* @__PURE__ */ template(`<div class="flex items-center text-xs -mb-0\\.5 leading-normal"></div>`),
  _tmpl$6 = /* @__PURE__ */ template(`<div class="flex items-center justify-center mr-2"></div>`),
  _tmpl$7 = /* @__PURE__ */ template(`<div class="flex flex-row items-center self-end"><span></span><span class="size-8 bg-contain bg-center bg-no-repeat mr-1"></span></div>`),
  _tmpl$8 = /* @__PURE__ */ template(`<div class="flex flex-row flex-auto items-center"><div class="relative flex flex-col flex-auto justify-center ml-1"><span class="font-title text-accent-2 uppercase tracking-25 z-1"></span></div><div class="flex flex-col items-end justify-between"><div class="flex flex-auto self-end"></div></div></div>`);
// TRIX
// var _tmpl$ = /* @__PURE__ */ template(`<span class="font-body text-negative-light z-1 pointer-events-none"></span>`), _tmpl$2 = /* @__PURE__ */ template(`<div class="flex text-sm"></div>`), _tmpl$3 = /* @__PURE__ */ template(`<div class="flex items-center"></div>`), _tmpl$4 = /* @__PURE__ */ template(`<div class="flex items-center"><div class=mx-2>|</div><div class=mx-1></div></div>`), _tmpl$5 = /* @__PURE__ */ template(`<div class="flex items-center text-sm production-chooser__font-icon-positioning"></div>`), _tmpl$6 = /* @__PURE__ */ template(`<div class="flex items-center justify-center mr-2"></div>`), _tmpl$7 = /* @__PURE__ */ template(`<div class="flex flex-row items-center self-end"><span></span><span class="size-8 bg-contain bg-center bg-no-repeat mr-1"></span></div>`), _tmpl$8 = /* @__PURE__ */ template(`<div class="flex flex-row flex-auto items-stretch"><div class="relative flex flex-col flex-auto justify-between pt-2 pb-1.5"><span class="font-title text-accent-2 uppercase"></span></div><div class="flex flex-col items-end justify-between"><div class="flex flex-auto self-end"></div></div></div>`);
const parseJSON = (value, fallback) => {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error("production-chooser-item: failed to parse json", error);
    return fallback;
  }
};
const parseRecommendations = (value) => {
  if (!value) {
    return [];
  }
  try {
    return JSON.parse(value).map((entry) => entry.class);
  } catch (error) {
    console.error("production-chooser-item: failed to parse recommendations", error);
    return [];
  }
};
const normalizeCategory = (value) => {
  switch (value) {
    case ProductionPanelCategory.UNITS:
      return ProductionPanelCategory.UNITS;
    case ProductionPanelCategory.PROJECTS:
      return ProductionPanelCategory.PROJECTS;
    case ProductionPanelCategory.WONDERS:
      return ProductionPanelCategory.WONDERS;
    default:
      return ProductionPanelCategory.BUILDINGS;
  }
};
const ProductionChooserItemContent = (props) => {
  const attrs = () => props.attrs;
  createEffect(() => {
    props.host?.classList.add("text-base", "production-chooser-item");
    props.host?.removeAttribute("tabindex");
  });
  const category = createMemo(() => normalizeCategory(attrs()["data-category"]));
  const itemType = createMemo(() => attrs()["data-type"] ?? void 0);
  const isRepairAll = createMemo(() => attrs()["data-repair-all"] === "true");
  const nameKey = createMemo(() => attrs()["data-name"] ?? void 0);
  const descriptionKey = createMemo(() => attrs()["data-description"] ?? void 0);
  const isPurchase = createMemo(() => attrs()["data-is-purchase"] === "true");
  const isDisabled = createMemo(() => attrs()["data-disabled"] === "true");
  const disableFocus = createMemo(() => attrs()["data-disable-focus"] === "true");
  const isAgeless = createMemo(() => attrs()["data-is-ageless"] === "true");
  const infoDisplayType = createMemo(() => attrs()["data-info-display-type"] ?? void 0);
  const showAlternateYields = createMemo(() => infoDisplayType() === "base-yield");
  const showSecondaryDetails = createMemo(() => !!attrs()["data-secondary-details"]);
  const warehouseCount = createMemo(() => attrs()["data-warehouse-count"] ?? void 0);
  const highestAdjacency = createMemo(() => attrs()["data-highest-adjacency"] ?? void 0);
  const canShowWarehouse = createMemo(() => attrs()["data-can-get-warehouse"] === "true" && !!warehouseCount());
  const canShowAdjacency = createMemo(() => attrs()["data-can-get-adjacency"] === "true" && !!highestAdjacency());
  const baseYields = createMemo(() => parseJSON(attrs()["data-base-yields"], []));
  const showBaseYields = createMemo(() => baseYields().length > 0);
  const recommendations = createMemo(() => parseRecommendations(attrs()["data-recommendations"]));
  const showRecommendations = createMemo(() => recommendations().length > 0);
  const errorKey = createMemo(() => attrs()["data-error"] ?? void 0);
  const secondaryDetails = createMemo(() => attrs()["data-secondary-details"] ?? "");
  const isUnitType = createMemo(() => {
    const type = itemType();
    return !!type && !!GameInfo.Units.lookup(type);
  });
  const costValue = createMemo(() => attrs()["data-cost"] ?? "");
  const hideCost = createMemo(() => {
    const parsed = Number(costValue());
    return Number.isNaN(parsed) || parsed < 0;
  });
  const costIcon = createMemo(() => isPurchase() ? "Yield_Gold" : "hud_turn-timer");
  const costIconLabel = createMemo(() => Locale.compose(isPurchase() ? "LOC_YIELD_GOLD" : "LOC_UI_CITY_INSPECTOR_TURNS"));
  const audio = createMemo(() => {
    const group = attrs()["data-audio-group-ref"] ?? void 0;
    const onActivate = attrs()["data-audio-activate-ref"] ?? void 0;
    const onPress = attrs()["data-audio-press-ref"] ?? void 0;
    const onError = attrs()["data-audio-error-press-ref"] ?? void 0;
    const onFocus = attrs()["data-audio-focus-ref"] ?? void 0;
    if (!group && !onActivate && !onPress && !onError && !onFocus) {
      return void 0;
    }
    return {
      group,
      onActivate,
      onPress,
      onError,
      onFocus
    };
  });
  return createComponent(ProductionTooltip, {
    get category() {
      return category();
    },
    get type() {
      return itemType();
    },
    get name() {
      return nameKey();
    },
    get description() {
      return descriptionKey();
    },
    get recommendations() {
      return recommendations();
    },
    get isPurchase() {
      return isPurchase();
    },
    get cost() {
      return costValue();
    },
    get warehouseCount() {
      return warehouseCount();
    },
    get highestAdjacency() {
      return highestAdjacency();
    },
    get canGetWarehouseBonuses() {
      return canShowWarehouse();
    },
    get canGetAdjacencyBonuses() {
      return canShowAdjacency();
    },
    get children() {
      return createComponent(ChooserItem, {
        // TRIX
        // "class": "text-base production-chooser-item",
        // contentClass: "p-2 tracking-100 flex flex-row",
        "class": "production-chooser-item text-xs leading-tight",
        contentClass: "flex flex-row justify-start items-center",  // TRIX
        name: "ProductionChooserItem",
        selectOnActivate: true,
        get disabled() {
          return isDisabled();
        },
        get audio() {
          return audio();
        },
        get disableFocus() {
          return disableFocus();
        },
        get ["data-category"]() {
          return category();
        },
        get ["data-type"]() {
          return itemType();
        },
        get ["data-repair-all"]() {
          return isRepairAll() ? "true" : void 0;
        },
        get children() {
          var _el$ = _tmpl$8(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$14 = _el$2.nextSibling, _el$15 = _el$14.firstChild;
          insert(_el$, createComponent(Icon, {
            // TRIX
            // "class": "size-16 bg-contain bg-center bg-no-repeat mr-2 flex-shrink-0 pointer-events-none",
            "class": "size-12 bg-contain bg-center bg-no-repeat m-1 flex-shrink-0 pointer-events-none",
            get name() {
              return itemType();
            }
          }), _el$2);
          // TRIX
          // insert(_el$3, createComponent(L10n.Compose, {
          insert(_el$3, createComponent(L10n.Stylize, {
            get ["class"]() {
              return isAgeless() ? "text-secondary" : "";
            },
            get text() {
              return nameKey() ?? "";
            }
          }));
          insert(_el$2, createComponent(Show, {
            get when() {
              return errorKey();
            },
            get children() {
              var _el$4 = _tmpl$();
              insert(_el$4, createComponent(L10n.Compose, {
                get text() {
                  return errorKey();
                }
              }));
              return _el$4;
            }
          }), null);
          insert(_el$2, createComponent(Show, {
            get when() {
              return showSecondaryDetails();
            },
            get children() {
              var _el$5 = _tmpl$2();
              createRenderEffect((_p$) => {
                var _v$ = !!isUnitType(), _v$2 = secondaryDetails();
                _v$ !== _p$.e && _el$5.classList.toggle("-ml-1.5", _p$.e = _v$);
                _v$2 !== _p$.t && (_el$5.innerHTML = _p$.t = _v$2);
                return _p$;
              }, {
                e: void 0,
                t: void 0
              });
              return _el$5;
            }
          }), null);
          insert(_el$2, createComponent(Show, {
            get when() {
              return showAlternateYields();
            },
            get children() {
              var _el$6 = _tmpl$5();
              console.warn(`TRIX EL6 ${_el$6.classList.value}`);
              insert(_el$6, createComponent(Show, {
                get when() {
                  return showBaseYields();
                },
                get children() {
                  var _el$7 = _tmpl$3();
                  insert(_el$7, createComponent(For, {
                    get each() {
                      return baseYields();
                    },
                    children: (yieldValue, index) => createComponent(L10n.Stylize, {
                      get ["class"]() {
                        return `flex items-center ${index() > 0 ? "ml-1" : ""}`;
                      },
                      text: "LOC_BUILDING_PLACEMENT_YIELD_ICON_ONLY",
                      get args() {
                        return [yieldValue.value, yieldValue.yieldType];
                      }
                    })
                  }));
                  return _el$7;
                }
              }), null);
              insert(_el$6, createComponent(Show, {
                get when() {
                  return canShowWarehouse();
                },
                get children() {
                  var _el$8 = _tmpl$4(), _el$9 = _el$8.firstChild, _el$10 = _el$9.nextSibling;
                  insert(_el$10, warehouseCount);
                  insert(_el$8, createComponent(Icon, {
                    "class": "size-6",  // TRIX
                    // "class": "size-8",
                    name: "YIELD_WAREHOUSE"
                  }), null);
                  return _el$8;
                }
              }), null);
              insert(_el$6, createComponent(Show, {
                get when() {
                  return canShowAdjacency();
                },
                get children() {
                  var _el$11 = _tmpl$4(), _el$12 = _el$11.firstChild, _el$13 = _el$12.nextSibling;
                  insert(_el$13, highestAdjacency);
                  insert(_el$11, createComponent(Icon, {
                    "class": "size-6",  // TRIX
                    // "class": "size-8",
                    name: "YIELD_ADJACENCY"
                  }), null);
                  return _el$11;
                }
              }), null);
              return _el$6;
            }
          }), null);
          insert(_el$14, createComponent(Show, {
            get when() {
              return isAgeless();
            },
            get children() {
              // TRIX: compact Ageless pill
              const pill = createComponent(PillText, {
                "class": "text-xs leading-normal mt-1 mx-1",
                text: "LOC_UI_PRODUCTION_AGELESS"
              });
              pill.classList.remove("h-9", "text-sm");
              return pill;
            }
          }), _el$15);
          insert(_el$15, createComponent(Show, {
            get when() {
              return !hideCost();
            },
            get children() {
              var _el$16 = _tmpl$7(), _el$18 = _el$16.firstChild, _el$19 = _el$18.nextSibling;
              insert(_el$16, createComponent(Show, {
                get when() {
                  return showRecommendations();
                },
                get children() {
                  var _el$17 = _tmpl$6();
                  insert(_el$17, createComponent(AdvisorRecommendationsList, {
                    get recommendations() {
                      return recommendations();
                    },
                    direction: "horizontal",
                    iconOnly: true
                  }));
                  return _el$17;
                }
              }), _el$18);
              insert(_el$18, costValue);
              createRenderEffect((_p$) => {
                var _v$3 = `url(${costIcon()})`, _v$4 = costIconLabel();
                _v$3 !== _p$.e && ((_p$.e = _v$3) != null ? _el$19.style.setProperty("background-image", _v$3) : _el$19.style.removeProperty("background-image"));
                _v$4 !== _p$.t && setAttribute(_el$19, "aria-label", _p$.t = _v$4);
                return _p$;
              }, {
                e: void 0,
                t: void 0
              });
              return _el$16;
            }
          }));
          return _el$;
        }
      });
    }
  });
};
defineLegacyComponent("production-chooser-item", {
  attrs: {
    "data-disabled": null,
    "data-disable-focus": "false",
    "data-category": null,
    "data-name": null,
    "data-type": null,
    "data-cost": null,
    "data-prereq": null,
    "data-description": null,
    "data-error": null,
    "data-is-purchase": null,
    "data-is-ageless": null,
    "data-secondary-details": null,
    "data-recommendations": null,
    "data-tags": null,
    "data-base-yields": null,
    "data-can-get-warehouse": null,
    "data-info-display-type": null,
    "data-warehouse-count": null,
    "data-can-get-adjacency": null,
    "data-highest-adjacency": null,
    "data-repair-all": null,
    "data-audio-group-ref": null,
    "data-audio-press-ref": null,
    "data-audio-activate-ref": null,
    "data-audio-error-press-ref": null,
    "data-audio-focus-ref": null
  }
}, (attrs, element) => createComponent(ProductionChooserItemContent, {
  attrs,
  host: element
}));

const TownFocusRefreshEventName = "panel-town-focus-refresh";
class TownFocusRefreshEvent extends CustomEvent {
  constructor() {
    super(TownFocusRefreshEventName, { bubbles: false, cancelable: true });
  }
}
class PanelTownFocus extends FxsFrame {
  _cityID = null;
  get cityID() {
    return this._cityID;
  }
  set cityID(value) {
    if (ComponentID.isMatch(value, this._cityID)) {
      return;
    }
    if (value === null) {
      this.focusItems = [];
      this._cityID = null;
      return;
    }
    const city = Cities.get(value);
    if (!city) {
      this.focusItems = [];
      console.error(`panel-production-chooser: Failed to get city with ID: ${ComponentID.toLogString(value)}`);
      return;
    }
    this.focusItems = GetTownFocusItems(city.id);
    this._cityID = value;
  }
  set focusItems(items) {
    this.focusItemListElement.innerHTML = "";
    for (let i = 0; i < items.length; i++) {
      const { name, description, tooltipDescription, growthType, projectType } = items[i];
      const itemElement = document.createElement("town-focus-chooser-item");
      itemElement.classList.add("w-full");
      itemElement.dataset.name = name;
      itemElement.dataset.description = description;
      if (tooltipDescription) {
        itemElement.dataset.tooltipDescription = tooltipDescription;
      } else {
        itemElement.removeAttribute("data-tooltip-description");
      }
      itemElement.dataset.growthType = growthType.toString();
      itemElement.dataset.projectType = projectType.toString();
      this.focusItemListElement.appendChild(itemElement);
    }
  }
  // #region Element References
  headerElement = document.createElement("fxs-header");
  focusItemListElement = document.createElement("fxs-vslot");
  // #endregion
  onInitialize() {
    this.Root.setAttribute(
      "override-styling",
      "relative flex max-w-full max-h-full pt-3\\.5 px-3\\.5 pb-6 pointer-events-auto"
    );
    this.Root.setAttribute("frame-style", "simple");
    super.onInitialize();
    this.render();
  }
  onAttach() {
    super.onAttach();
    this.Root.addEventListener("focus", this.onFocus);
    engine.on("CitySelectionChanged", this.onCitySelectionChanged);
    engine.on("CityGrowthModeChanged", this.onCityGrowthModeChanged);
    this.Root.addEventListener(TownFocusRefreshEventName, this.onRefreshFocusList);
    this.cityID = UI.Player.getHeadSelectedCity();
  }
  onDetach() {
    this.Root.removeEventListener(TownFocusRefreshEventName, this.onRefreshFocusList);
    engine.off("CityGrowthModeChanged", this.onCityGrowthModeChanged);
    engine.off("CitySelectionChanged", this.onCitySelectionChanged);
    this.Root.removeEventListener("focus", this.onFocus);
    super.onDetach();
  }
  onCitySelectionChanged = ({ selected, cityID }) => {
    if (selected) {
      this.cityID = cityID;
    }
  };
  onCityGrowthModeChanged = ({ cityID }) => {
    if (this._cityID && ComponentID.isMatch(this._cityID, cityID)) {
      this.cityID = cityID;
    }
  };
  onRefreshFocusList = () => {
    const oldCityID = this._cityID;
    this.cityID = null;
    this.cityID = oldCityID;
  };
  onFocus = () => {
    if (this.cityID) {
      Game.CityOperations.sendRequest(this.cityID, CityOperationTypes.CONSIDER_TOWN_PROJECT, {});
    }
    Framework.FocusManager.setFocus(this.focusItemListElement);
  };
  render() {
    this.content.classList.add("flex", "flex-col");
    this.headerElement.classList.add("uppercase", "tracking-100");
    this.headerElement.setAttribute("title", "LOC_UI_TOWN_FOCUS");
    this.content.appendChild(this.headerElement);
    this.content.insertAdjacentHTML(
      "beforeend",
      `<div class="flex flex-col items-center justify-center mb-2 font-body text-xs text-accent-2" data-l10n-id="LOC_UI_TOWN_FOCUS_CTA"></div>`
    );
    const scrollable = document.createElement("fxs-scrollable");
    scrollable.classList.add("flex-auto", "px-3\\.5", "mr-1");
    this.focusItemListElement.setAttribute("data-navrule-up", "stop");
    this.focusItemListElement.setAttribute("data-navrule-down", "stop");
    this.focusItemListElement.setAttribute("data-navrule-left", "stop");
    this.focusItemListElement.setAttribute("data-navrule-right", "stop");
    scrollable.appendChild(this.focusItemListElement);
    this.content.appendChild(scrollable);
  }
}
Controls.define("panel-town-focus", {
  createInstance: PanelTownFocus,
  tabIndex: -1
});

const ProductionChooserAccordionSectionToggleEventName = "production-chooser-accordion-section-toggle";
class ProductionChooserAccordionSectionToggleEvent extends CustomEvent {
  constructor(detail) {
    super(ProductionChooserAccordionSectionToggleEventName, { detail, bubbles: true });
  }
}
class ProductionChooserAccordionSection {
  constructor(id, title, isOpen) {
    this.id = id;
    this.title = title;
    this.root = document.createElement("div");
    this.root.id = id;
    this.root.classList.add("production-category", "mb-2", "ml-4");
    this.header = document.createElement("fxs-activatable");
    this.header.classList.value = "relative flex items-center group h-10 mb-2 hud_sidepanel_list-bg cursor-pointer";
    this.header.setAttribute("tabindex", "-1");
    this.sectionHeaderFocus = document.createElement("div");
    this.sectionHeaderFocus.classList.value = "absolute inset-0 img-list-focus-frame opacity-0 group-hover\\:opacity-100 group-focus\\:opacity-100 group-pressed\\:opacity-100 transition-opacity";
    this.header.appendChild(this.sectionHeaderFocus);
    const sectionTitleWrapper = document.createElement("div");
    sectionTitleWrapper.classList.value = "relative flex-auto flex items-center justify-center";
    const sectionTitle = document.createElement("div");
    sectionTitle.classList.value = "font-title uppercase text-xs text-accent-2 tracking-100";
    sectionTitle.setAttribute("data-l10n-id", title);
    sectionTitleWrapper.appendChild(sectionTitle);
    this.header.appendChild(sectionTitleWrapper);
    this.arrowIcon = document.createElement("div");
    this.arrowIcon.classList.value = "w-12 h-8 img-arrow bg-center bg-no-repeat bg-contain transition-transform";
    this.header.appendChild(this.arrowIcon);
    this.root.appendChild(this.header);
    this.slot = document.createElement("div");
    this.slot.classList.add("flex", "flex-col", "shrink-0");
    this.slotWrapper = document.createElement("div");
    this.slotWrapper.classList.add("flex", "flex-col", "overflow-hidden", "transition-height", "ease-out");
    this.slotWrapper.append(this.slot);
    this.root.appendChild(this.slotWrapper);
    this.resizeObserver = new ResizeObserver((_entries) => {
      this.updateHeight(this.slot.scrollHeight);
    });
    this.mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== "childList") continue;
        for (const node of mutation.addedNodes) {
          this.applyTabIndexPolicyForNode(node);
        }
      }
    });
    this.mutationObserver.observe(this.slot, {
      childList: true,
      subtree: false
    });
    this.header.addEventListener("action-activate", () => {
      this.toggle();
      this.root.dispatchEvent(new ProductionChooserAccordionSectionToggleEvent({ isOpen: this.isOpen }));
    });
    this.isOpen = isOpen;
    this.toggle(isOpen);
  }
  root;
  slot;
  slotWrapper;
  header;
  arrowIcon;
  sectionHeaderFocus;
  resizeObserver;
  mutationObserver;
  #isOpen;
  get isOpen() {
    return this.#isOpen;
  }
  set isOpen(_) {
    this.#isOpen = _;
  }
  /** Track changes to the size while open */
  observe() {
    this.resizeObserver.observe(this.slot, { box: "border-box" });
  }
  /**
   * Stop tracking size changes
   *
   * We do this because Gameface needs to check all elements that changed size to see if a particular resize observer matches,
   * so even if the element is not changing size, there is a performance cost
   *
   * NOTE: The mutation observer is not here because we need to always watch for new items to apply focus policy
   */
  unobserve() {
    this.resizeObserver.unobserve(this.slot);
  }
  /**
   * Completely stop observing changes for cleanup
   */
  disconnect() {
    this.resizeObserver.disconnect();
    this.mutationObserver.disconnect();
  }
  updateHeight(height) {
    const currentHeight = this.slotWrapper.clientHeight;
    const heightDiffAbs = Math.abs(height - currentHeight);
    const shouldAnimate = this.slotWrapper.attributeStyleMap.has("height");
    if (shouldAnimate) {
      const transitionDurationSeconds = Math.max(0.15, Math.min(1, heightDiffAbs / (2 * screen.height)));
      this.slotWrapper.style.transitionDuration = `${transitionDurationSeconds}s`;
    } else {
      this.slotWrapper.style.transitionDuration = "";
    }
    this.slotWrapper.attributeStyleMap.set("height", CSS.px(height));
  }
  // Ensure any newly added elements respect the current open/closed focus policy
  applyTabIndexPolicyForNode(node) {
    if (!(node instanceof Element)) return;
    const affected = [];
    if (node instanceof HTMLElement && node.matches(".production-chooser-item")) {
      affected.push(node);
    } else {
      node.querySelectorAll(".production-chooser-item").forEach((el) => affected.push(el));
    }
    if (affected.length === 0) return;
    if (!this.isOpen) {
      for (const el of affected) {
        el.removeAttribute("tabindex");
        el.setAttribute("data-disable-focus", "true");
      }
    } else {
      for (const el of affected) {
        el.setAttribute("tabindex", "-1");
        el.setAttribute("data-disable-focus", "false");
      }
    }
  }
  toggle(force = void 0) {
    const shouldOpen = force ?? !this.isOpen;
    if (shouldOpen) {
      this.open();
      this.header.setAttribute("data-audio-activate-ref", "data-audio-dropdown-close");
    } else {
      this.close();
      this.header.setAttribute("data-audio-activate-ref", "data-audio-dropdown-open");
    }
  }
  open() {
    this.arrowIcon.classList.add("-rotate-90");
    this.isOpen = true;
    this.slot.classList.remove("disabled");
    const selectableChildren = this.slot.querySelectorAll(".production-chooser-item");
    for (const child of selectableChildren) {
      child.setAttribute("tabindex", "-1");
      child.setAttribute("data-disable-focus", "false");
    }
    this.observe();
  }
  close() {
    this.arrowIcon.classList.remove("-rotate-90");
    this.isOpen = false;
    this.slot.classList.add("disabled");
    const selectableChildren = this.slot.querySelectorAll(".production-chooser-item");
    for (const child of selectableChildren) {
      child.removeAttribute("tabindex");
      child.setAttribute("data-disable-focus", "true");
    }
    this.updateHeight(0);
    this.unobserve();
  }
}

class TownFocusChooserItem extends FxsChooserItem {
  // #region Element References
  nameElement = document.createElement("div");
  descriptionElement = document.createElement("div");
  projectIconElement = document.createElement("div");
  // #endregion
  onInitialize() {
    super.onInitialize();
    this.render();
    this.selectOnActivate = true;
  }
  updateIcon() {
    const projectTypeAttr = this.Root.getAttribute("data-project-type");
    const growthTypeAttr = this.Root.getAttribute("data-growth-type");
    const projectType = projectTypeAttr ? parseInt(projectTypeAttr) : null;
    const growthType = growthTypeAttr ? parseInt(growthTypeAttr) : null;
    const iconBlp = GetTownFocusBlp(growthType, projectType);
    this.projectIconElement.style.backgroundImage = `url(${iconBlp})`;
  }
  onAttributeChanged(name, oldValue, newValue) {
    switch (name) {
      case "data-project-type":
      case "data-growth-type":
        this.updateIcon();
        break;
      case "data-name":
        if (newValue) {
          this.nameElement.setAttribute("data-l10n-id", newValue);
        }
        break;
      case "data-description":
        if (newValue) {
          this.descriptionElement.setAttribute("data-l10n-id", newValue);
        }
        this.container.classList.toggle("p-3", !!newValue);
        break;
      default:
        super.onAttributeChanged(name, oldValue, newValue);
        break;
    }
  }
  render() {
    this.Root.dataset.tooltipStyle = "production-project-tooltip";
    this.container.classList.add("flex", "flex-row", "flex-auto");
    this.projectIconElement.classList.add("size-16", "bg-contain", "bg-center", "bg-no-repeat", "mr-2");
    this.container.appendChild(this.projectIconElement);
    const infoContainer = document.createElement("div");
    infoContainer.classList.add("flex", "flex-col", "flex-initial", "justify-center");
    this.nameElement.classList.add("mb-1", "font-title", "uppercase", "text-xs", "tracking-100");
    this.descriptionElement.classList.add("font-body", "text-sm");
    infoContainer.append(this.nameElement, this.descriptionElement);
    this.container.appendChild(infoContainer);
  }
}
Controls.define("town-focus-chooser-item", {
  createInstance: TownFocusChooserItem,
  attributes: [
    { name: "disabled" },
    { name: "selected", description: "Is this chooser item selected? (Default: false)" },
    { name: "show-frame-on-hover", description: "Shows the selection frame on hover" },
    {
      name: "data-project-type"
    },
    {
      name: "data-growth-type"
    },
    {
      name: "data-name"
    },
    {
      name: "data-description"
    },
    {
      name: "selected"
    }
  ]
});
class TownFocusSection extends FxsVSlot {
  // #region Element References
  townFocusItem = document.createElement("town-focus-chooser-item");
  defaultLabelElement = document.createElement("div");
  // #endregion
  // #region Lifecycle
  onInitialize() {
    super.onInitialize();
    this.render();
  }
  onAttributeChanged(name, oldValue, newValue) {
    switch (name) {
      case "data-disabled":
        if (newValue !== null) {
          this.townFocusItem.setAttribute("disabled", newValue);
        } else {
          this.townFocusItem.removeAttribute("disabled");
        }
        break;
      case "data-growth-type":
      case "data-project-type":
      case "data-name":
      case "data-description":
      case "data-tooltip-name":
      case "data-tooltip-description":
        if (newValue) {
          this.townFocusItem.setAttribute(name, newValue);
        } else {
          this.townFocusItem.removeAttribute(name);
        }
        break;
      default:
        super.onAttributeChanged(name, oldValue, newValue);
        break;
    }
  }
  // #endregion
  render() {
    this.Root.classList.add(
      "flex",
      "flex-col",
      "items-center",
      "justify-center",
      "px-14",
      "py-2",
      "production-chooser__town-focus-gradient"
    );
    this.Root.insertAdjacentHTML(
      "beforeend",
      '<div class="font-title uppercase text-xs text-secondary-2 text-gradient-secondary" data-l10n-id="LOC_UI_TOWN_FOCUS"></div>'
    );
    this.townFocusItem.classList.add("flex-auto", "mx-5", "my-2");
    this.Root.appendChild(this.townFocusItem);
    this.defaultLabelElement.classList.value = "production-chooser__town-focus__default-label font-body text-xs text-accent-2";
    this.defaultLabelElement.setAttribute("data-l10n-id", "LOC_UI_TOWN_FOCUS_DEFAULT_LABEL");
    this.Root.appendChild(this.defaultLabelElement);
  }
}
Controls.define("town-focus-section", {
  createInstance: TownFocusSection,
  attributes: [
    {
      name: "data-type"
    },
    {
      name: "data-growth-type"
    },
    {
      name: "data-project-type"
    },
    {
      name: "data-disabled"
    },
    {
      name: "data-name"
    },
    {
      name: "data-description"
    },
    {
      name: "data-tooltip-name"
    },
    {
      name: "data-tooltip-description"
    },
    {
      name: "data-show-default-label"
    }
  ],
  tabIndex: -1
});

class TownUnrestDisplay extends Component {
  // #region Component State
  get highestActiveUnrestDuration() {
    const attr = this.Root.getAttribute("data-highest-active-unrest-duration");
    return attr ? parseInt(attr) : 0;
  }
  get turnsOfUnrest() {
    const attr = this.Root.getAttribute("data-turns-of-unrest");
    return attr ? parseInt(attr) : 0;
  }
  // #endregion
  // #region Element References
  sliderFillElement = document.createElement("div");
  remainingTurnsElement = document.createElement("div");
  // #endregion
  onInitialize() {
    super.onInitialize();
    this.render();
  }
  onAttributeChanged(name, _oldValue, _newValue) {
    switch (name) {
      case "data-turns-of-unrest":
      case "data-highest-active-unrest-duration":
        this.updateUnrestDisplay(this.turnsOfUnrest, this.highestActiveUnrestDuration);
        break;
      default:
        break;
    }
  }
  updateUnrestDisplay(turnsOfUnrest, highestActiveUnrestDuration) {
    if (highestActiveUnrestDuration != 0) {
      const pct = Math.max(0, Math.min(1, turnsOfUnrest / highestActiveUnrestDuration));
      this.sliderFillElement.style.transform = `scaleX(${pct})`;
    } else {
      this.sliderFillElement.style.transform = `none`;
    }
    const turnsRemaining = Math.max(0, turnsOfUnrest);
    this.remainingTurnsElement.textContent = Locale.compose(
      "LOC_UI_PRODUCTION_UNREST_TURNS_REMAINING",
      turnsRemaining
    );
  }
  render() {
    this.Root.classList.add("flex", "flex-col", "items-center", "justify-center", "px-2");
    this.Root.innerHTML = `
			<div class="font-title font-bold text-lg mt-2 uppercase pulse-warn" data-l10n-id="LOC_UI_PRODUCTION_UNREST"></div>
		`;
    const slider = document.createElement("div");
    slider.classList.add("w-full", "h-1\\.5", "mb-2", "mt-2", "town-unrest-bg");
    this.sliderFillElement.classList.add("size-full", "origin-left", "town-unrest-fill", "transition-transform");
    slider.appendChild(this.sliderFillElement);
    this.Root.append(slider, this.remainingTurnsElement);
  }
}
Controls.define("town-unrest-display", {
  createInstance: TownUnrestDisplay,
  attributes: [{ name: "data-turns-of-unrest" }, { name: "data-highest-active-unrest-duration" }]
});

class LastProductionSection extends Component {
  cityID = null;
  updateCityDetailsListener = this.onUpdateCityDetails.bind(this);
  nameElement = document.createElement("div");
  iconElement = document.createElement("fxs-icon");
  yieldDiv = document.createElement("div");
  onInitialize() {
    super.onInitialize();
    this.render();
  }
  onAttach() {
    super.onAttach();
    window.addEventListener(UpdateCityDetailsEventName, this.updateCityDetailsListener);
  }
  onDetach() {
    this.cityID = null;
    window.removeEventListener(UpdateCityDetailsEventName, this.updateCityDetailsListener);
    super.onDetach();
  }
  render() {
    this.Root.classList.add(
      "flex",
      "flex-col",
      "items-center",
      "justify-center",
      "px-14",
      "py-2",
      "pointer-events-auto"
    );
    this.Root.insertAdjacentHTML(
      "beforeend",
      '<div class="font-title uppercase text-sm text-secondary-2 text-gradient-secondary mb-1" data-l10n-id="LOC_UI_JUST_COMPLETED"></div>'
    );
    const frame = document.createElement("fxs-inner-frame");
    frame.classList.add("min-w-96", "items-start", "last-production-frame");
    const container = document.createElement("div");
    container.classList.add("flex", "items-center", "my-4", "ml-8");
    this.iconElement.classList.add("size-16");
    container.appendChild(this.iconElement);
    const details = document.createElement("div");
    details.classList.add("flex-col", "ml-4");
    this.nameElement.classList.add("font-title", "text-xs", "text-accent-2", "uppercase");
    details.appendChild(this.nameElement);
    this.yieldDiv.classList.add("flex");
    details.appendChild(this.yieldDiv);
    container.appendChild(details);
    const checkmarkBG = document.createElement("div");
    checkmarkBG.style.backgroundImage = 'url("fs://game/techtree-icon-empty")';
    checkmarkBG.classList.value = "check-icon flex absolute size-6 bg-no-repeat bg-center bg-contain -right-2 -top-2 justify-center items-center";
    frame.appendChild(checkmarkBG);
    const checkmark = document.createElement("div");
    checkmark.classList.value = "size-4 bg-center bg-contain bg-no-repeat";
    checkmark.style.backgroundImage = 'url("fs://game/techtree_icon-checkmark")';
    checkmarkBG.appendChild(checkmark);
    frame.appendChild(container);
    this.Root.appendChild(frame);
  }
  updateGate = new UpdateGate(() => {
    if (!this.cityID || ComponentID.isInvalid(this.cityID)) {
      return;
    }
    const lastProductionData = GetLastProductionData(this.cityID);
    if (!lastProductionData) {
      this.Root.classList.add("hidden");
      return;
    }
    this.nameElement.setAttribute("data-l10n-id", lastProductionData.name);
    this.iconElement.setAttribute("data-icon-id", lastProductionData.type);
    this.yieldDiv.innerHTML = "";
    for (const detailData of lastProductionData.details) {
      const yieldEntry = document.createElement("div");
      yieldEntry.classList.add("flex", "items-center", "pr-4");
      const yieldIcon = document.createElement("fxs-icon");
      yieldIcon.classList.add("size-8");
      if (lastProductionData.isUnit) {
        yieldIcon.style.backgroundImage = `url('blp:${detailData.icon}')`;
      } else {
        yieldIcon.setAttribute("data-icon-id", detailData.icon);
      }
      yieldEntry.appendChild(yieldIcon);
      const yieldValue = document.createElement("div");
      yieldValue.textContent = detailData.value;
      yieldEntry.appendChild(yieldValue);
      this.yieldDiv.appendChild(yieldEntry);
    }
    this.Root.setAttribute("data-type", lastProductionData.type);
    if (lastProductionData.isUnit) {
      this.Root.setAttribute("data-tooltip-style", "production-unit-tooltip");
    } else {
      this.Root.setAttribute("data-tooltip-style", "production-constructible-tooltip");
    }
    this.Root.classList.remove("hidden");
  });
  onAttributeChanged(name, oldValue, newValue) {
    switch (name) {
      case "data-cityid":
        this.cityID = JSON.parse(newValue);
        this.updateGate.call("onAttributeChanged");
        break;
      default:
        super.onAttributeChanged(name, oldValue, newValue);
        break;
    }
  }
  onUpdateCityDetails() {
    this.updateGate.call("onUpdateCityDetails");
  }
}
Controls.define("last-production-section", {
  createInstance: LastProductionSection,
  tabIndex: -1,
  attributes: [
    {
      name: "data-cityid"
    }
  ]
});

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
  element.setAttribute("data-is-ageless", data.ageless ? "true" : "false");
  element.setAttribute("data-disabled", (!!data.disabled).toString());
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
    this.uqInfo = GetUniqueQuarterForPlayer(city.owner);
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
      this.uqInfo
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
  uqInfo = null;
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
  upgradeToCityButtonCostElement;
  cityDetailsSlot;
  panelProductionSlot;
  uniqueQuarter = null;
  // #endregion
  // #region Component Lifecycle
  constructor(root) {
    super(root);
    this.animateInType = this.animateOutType = AnchorType.RelativeToLeft;
    const [upgradeToCityButton, costElement] = this.renderUpgradeToCityButton();
    this.upgradeToCityButton = upgradeToCityButton;
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
        Focus.setContextAwareFocus(cityDetailsPanel, this.Root);
        Audio.playSound("data-audio-city-details-enter", "city-actions");
      } else {
        Audio.playSound("data-audio-city-details-exit", "city-actions");
      }
    } else {
      const newCityDetailsPanel = document.createElement("panel-city-details");
      this.cityDetailsSlot.appendChild(newCityDetailsPanel);
      Focus.setContextAwareFocus(newCityDetailsPanel, this.Root);
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
      if (!this.uniqueQuarter?.containsBuilding(element)) {
        slot.appendChild(element);
      }
    }
  }
  updateCategories(items) {
    const initialFocus = FocusManager.getFocus();
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
    const uq = GetUniqueQuarterForPlayer(city.owner);
    const buildingSlot = this.productionCategorySlots[ProductionPanelCategory.BUILDINGS].slot;
    if (uq) {
      const buildingOneChooserItem = this.itemElementMap.get(uq.uniqueQuarterDef.BuildingType1);
      const buildingTwoChooserItem = this.itemElementMap.get(uq.uniqueQuarterDef.BuildingType2);
      if (buildingOneChooserItem && buildingTwoChooserItem) {
        this.uniqueQuarter ??= new UniqueQuarter();
        this.uniqueQuarter.definition = uq.uniqueQuarterDef;
        this.uniqueQuarter.numCompleted = GetNumUniqueQuarterBuildingsCompleted(city, uq.uniqueQuarterDef);
        this.uniqueQuarter.setBuildings(buildingOneChooserItem, buildingTwoChooserItem);
        buildingSlot.insertAdjacentElement("afterbegin", this.uniqueQuarter.root);
      } else {
        this.uniqueQuarter?.root.remove();
        this.uniqueQuarter = null;
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
      this.uqInfo
    );
    const newItems = Object.values(ProductionPanelCategory).flatMap(
      (category) => items[category].map((item) => item.type)
    );
    const newItemsSet = new Set(newItems);
    let resetFocus = false;
    const currentFocus = FocusManager.getFocus();
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
  updateUpgradeToCityButton(upgradeCost, isTown, cityID) {
    const result = CanConvertToCity(cityID);
    this.upgradeToCityButton.setAttribute("disabled", result.Success ? "false" : "true");
    this.upgradeToCityButton.classList.toggle("hidden", !isTown);
    this.upgradeToCityButtonCostElement.textContent = upgradeCost.toString();
    if (result.FailureReasons) {
      const failureTooltip = result.FailureReasons.join("\n");
      this.upgradeToCityButton.setAttribute("data-tooltip-content", failureTooltip);
    } else {
      this.upgradeToCityButton.removeAttribute("data-tooltip-content");
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
    let live = false;
    switch (name) {
      case "cancel":
        if (this.Root.dataset.showTownFocus === "true") {
          this.Root.dataset.showTownFocus = "false";
          Focus.setContextAwareFocus(this.townFocusSection, this.Root);
        } else {
          live = true;
        }
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
  updateNavTray() {
    NavTray.clear();
    NavTray.addOrUpdateGenericBack();
    const currentFocus = FocusManager.getFocus();
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
          Audio.playSound("data-audio-showing", "town-specialization-panel");
        } else if (oldValue === "true" && newValue === "false") {
          Audio.playSound("data-audio-hiding", "town-specialization-panel");
        }
        this.updateNavTray();
        break;
    }
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
    this.frame.dataset.headerClass = "flex flex-col flex-initial px-3 mx-0\\.5";
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
