import { template, insert, setAttribute } from '../../../core/vendor/solid-js/web/dist/web.js';
import { createEffect, createMemo, createComponent, Show, createRenderEffect, For } from '../../../core/vendor/solid-js/dist/solid.js';
import { AudioContextProvider } from '../../../core/ui-next/components/audio-context-provider.js';
import { ChooserItem } from '../../../core/ui-next/components/chooser-item.js';
import { defineLegacyComponent } from '../../../core/ui-next/components/fxs-solid-component.js';
import { Icon } from '../../../core/ui-next/components/icon.js';
import { L10n } from '../../../core/ui-next/components/l10n.js';
import { TooltipVerticalPosition, TooltipHorizontalPosition } from '../../../core/ui-next/components/tooltip.js';
import { ProductionPanelCategory } from '../../ui/production-chooser/production-chooser-helpers.js';
import { AdvisorRecommendationsList } from './advisor-recommendation.js';
import { PillText } from './pills.js';
import { ProductionTooltip } from '../tooltips/production-tooltip.js';

var _tmpl$ = /* @__PURE__ */ template(`<span class="font-body text-negative-light z-1 pointer-events-none"></span>`), _tmpl$2 = /* @__PURE__ */ template(`<div class="flex text-sm"></div>`), _tmpl$3 = /* @__PURE__ */ template(`<div class="flex items-center"></div>`), _tmpl$4 = /* @__PURE__ */ template(`<div class="flex items-center"><div class=mx-2>|</div><div class=mx-1></div></div>`), _tmpl$5 = /* @__PURE__ */ template(`<div class="flex items-center text-sm production-chooser__font-icon-positioning"></div>`), _tmpl$6 = /* @__PURE__ */ template(`<div class="flex flex-row items-center self-end"><span></span><span class="size-8 bg-contain bg-center bg-no-repeat mr-1"></span></div>`), _tmpl$7 = /* @__PURE__ */ template(`<div class="flex flex-row flex-auto items-stretch"><div class="relative flex flex-col flex-auto justify-between pt-2 pb-1.5"><span class="font-title text-accent-2 uppercase"></span></div><div class="flex flex-col justify-end"><div class=self-end></div><div class="flex flex-auto self-end"></div></div></div>`);
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
  const showSecondaryDetails = createMemo(() => {
    const details = attrs()["data-secondary-details"];
    const displayType = infoDisplayType();
    return !!details && displayType !== "base-yield";
  });
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
    get initialHPosition() {
      return TooltipHorizontalPosition.RIGHT;
    },
    get initialVPosition() {
      return TooltipVerticalPosition.CENTER;
    },
    offset: 30,
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
      return createComponent(AudioContextProvider, {
        get vars() {
          return {
            isPurchase: isPurchase().toString()
          };
        },
        get children() {
          return createComponent(ChooserItem, {
            "class": "text-base production-chooser-item",
            contentClass: "p-2 tracking-100 flex flex-row",
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
              var _el$ = _tmpl$7(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$14 = _el$2.nextSibling, _el$15 = _el$14.firstChild, _el$16 = _el$15.nextSibling;
              insert(_el$, createComponent(Icon, {
                "class": "size-16 bg-contain bg-center bg-no-repeat mr-2 flex-shrink-0 pointer-events-none",
                get name() {
                  return itemType();
                }
              }), _el$2);
              insert(_el$3, createComponent(L10n.Compose, {
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
                        "class": "size-8",
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
                        "class": "size-8",
                        name: "YIELD_ADJACENCY"
                      }), null);
                      return _el$11;
                    }
                  }), null);
                  return _el$6;
                }
              }), null);
              insert(_el$15, createComponent(Show, {
                get when() {
                  return isAgeless();
                },
                get children() {
                  return createComponent(PillText, {
                    text: "LOC_UI_PRODUCTION_AGELESS"
                  });
                }
              }));
              insert(_el$16, createComponent(Show, {
                get when() {
                  return !hideCost();
                },
                get children() {
                  var _el$17 = _tmpl$6(), _el$18 = _el$17.firstChild, _el$19 = _el$18.nextSibling;
                  insert(_el$17, createComponent(Show, {
                    get when() {
                      return showRecommendations();
                    },
                    get children() {
                      return createComponent(AdvisorRecommendationsList, {
                        "class": "mr-2",
                        get recommendations() {
                          return recommendations();
                        },
                        direction: "horizontal",
                        iconOnly: true,
                        noWrap: true
                      });
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
                  return _el$17;
                }
              }));
              return _el$;
            }
          });
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
//# sourceMappingURL=production-chooser-item.js.map
