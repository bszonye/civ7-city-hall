import { template, insert, setAttribute } from '../../../core/vendor/solid-js/web/dist/web.js';
import { defineLegacyComponent } from '../../../core/ui-next/components/fxs-solid-component.js';
import { Icon } from '../../../core/ui-next/components/icon.js';
import { L10n } from '../../../core/ui-next/components/l10n.js';
import { Tooltip, TooltipHorizontalPosition, TooltipVerticalPosition } from '../../../core/ui-next/components/tooltip.js';
import { ComponentRegistry } from '../../../core/ui-next/services/component-registry.js';
import { createComponent, createRenderEffect } from '../../../core/vendor/solid-js/dist/solid.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="production-chooser-item flex items-stretch mb-2 ml-2 hover\\\\:text-accent-1 focus\\\\:text-accent-1"><div class="flex-auto flex flex-col"><div class="font-title text-base tracking-100 uppercase transition-color"></div><div class="font-body text-sm transition-color"data-l10n-id=LOC_UI_PRODUCTION_UNIQUE_QUARTER></div></div><div class="font-body text-sm self-end transition-color"></div></div>`);
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
      var _el$ = _tmpl$(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$2.nextSibling;
      insert(_el$, createComponent(Icon, {
        "class": "size-10 mr-2",
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

export { ProductionChooserUniqueQuarterItem };
//# sourceMappingURL=production-chooser-unique-quarter-item.js.map
