import React, { useEffect, useRef, useState } from 'react';
import { useDistricts, useWards } from '@/hooks/useAddressData';
import type { District, Ward } from '@/types/address.types';

interface AddressSelectorProps {
  type: 'billing' | 'shipping' | 'calc_shipping';
  showWard?: boolean;
}

type AddressField = 'state' | 'city' | 'address_2';

const BLOCKS_SELECT_CLASSES = {
  wrapper: 'wc-blocks-components-select',
  container: 'wc-blocks-components-select__container',
  label: 'wc-blocks-components-select__label',
  select: 'wc-blocks-components-select__select',
  expand: 'wc-blocks-components-select__expand',
};

const CHECKOUT_LAYOUT_STYLE_ID = 'vncheckout-blocks-layout';
const BLOCKS_PROXY_SELECT_SUFFIX = '__vncheckout_select';
const BLOCKS_PROXY_SOURCE_ATTR = 'data-vncheckout-source-id';

// Store found element IDs for Select2 jQuery selectors
const foundIds: Record<string, string> = {};
// Track which converted elements still rely on Select2 after replacement.
const convertedFromInput: Set<string> = new Set();

const getFieldKey = (prefix: string, field: AddressField) => `${prefix}:${field}`;

const ensureCheckoutLayoutStyles = () => {
  if (document.getElementById(CHECKOUT_LAYOUT_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = CHECKOUT_LAYOUT_STYLE_ID;
  style.textContent = `
    @media (min-width: 768px) {
      #billing.wc-block-components-address-form .wc-block-components-address-form__state,
      #billing.wc-block-components-address-form .wc-block-components-address-form__city,
      #shipping.wc-block-components-address-form .wc-block-components-address-form__state,
      #shipping.wc-block-components-address-form .wc-block-components-address-form__city {
        grid-column: auto / span 1 !important;
        width: 100% !important;
        max-width: none !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
        flex: 1 1 calc(50% - 8px) !important;
        margin-top: 16px !important;
      }

      #billing.wc-block-components-address-form .wc-block-components-address-form__state .wc-blocks-components-select,
      #billing.wc-block-components-address-form .wc-block-components-address-form__state .wc-blocks-components-select__container,
      #billing.wc-block-components-address-form .wc-block-components-address-form__state .wc-blocks-components-select__select,
      #billing.wc-block-components-address-form .wc-block-components-address-form__city .wc-blocks-components-select__container,
      #billing.wc-block-components-address-form .wc-block-components-address-form__city .wc-blocks-components-select__select,
      #shipping.wc-block-components-address-form .wc-block-components-address-form__state .wc-blocks-components-select__container,
      #shipping.wc-block-components-address-form .wc-block-components-address-form__state .wc-blocks-components-select__select,
      #shipping.wc-block-components-address-form .wc-block-components-address-form__city .wc-blocks-components-select__container,
      #shipping.wc-block-components-address-form .wc-block-components-address-form__city .wc-blocks-components-select__select {
        width: 100% !important;
        max-width: none !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
      }

      #billing.wc-block-components-address-form .wc-block-components-address-form__address_2,
      #billing.wc-block-components-address-form .wc-block-components-address-form__address_1,
      #shipping.wc-block-components-address-form .wc-block-components-address-form__address_2,
      #shipping.wc-block-components-address-form .wc-block-components-address-form__address_1 {
        grid-column: 1 / -1 !important;
      }
    }
  `;

  document.head.appendChild(style);
};

const getPossibleFieldIds = (prefix: string, field: AddressField) => {
  return [
    `${prefix}-${field}`,
    `${prefix}_${field}`,
  ];
};

const getPossibleFieldWrapperIds = (prefix: string, field: AddressField) => {
  if (field === 'address_2') {
    return [
      `${prefix}-address_2-field`,
      `${prefix}_address_2_field`,
      `${prefix}-address-2-field`,
    ];
  }

  return [
    `${prefix}-${field}-field`,
    `${prefix}_${field}_field`,
  ];
};

const findFieldWrapper = (prefix: string, field: AddressField): HTMLElement | null => {
  if (field === 'address_2') {
    const address2El = findAddress2Element(prefix);
    if (address2El) {
      return address2El.closest('.wc-block-components-address-form__address_2') as HTMLElement | null;
    }
  }

  for (const id of getPossibleFieldWrapperIds(prefix, field)) {
    const el = document.getElementById(id);
    if (el) {
      return el;
    }
  }
  return null;
};

const findCountryElement = (prefix: string): HTMLSelectElement | null => {
  const possibleIds = [
    `${prefix}-country`,
    `${prefix}_country`,
  ];

  for (const id of possibleIds) {
    const el = document.getElementById(id);
    if (el instanceof HTMLSelectElement) {
      return el;
    }
  }

  return null;
};

const cloneInputAttributesToSelect = (input: HTMLInputElement, select: HTMLSelectElement) => {
  Array.from(input.attributes).forEach((attr) => {
    if (['type', 'class', 'value', 'id', 'name'].includes(attr.name)) {
      return;
    }
    select.setAttribute(attr.name, attr.value);
  });
};

const getBlocksProxySelectId = (sourceId: string) => `${sourceId}${BLOCKS_PROXY_SELECT_SUFFIX}`;

const findBlocksProxySelect = (sourceId: string): HTMLSelectElement | null => {
  const proxy = document.getElementById(getBlocksProxySelectId(sourceId));
  return proxy instanceof HTMLSelectElement ? proxy : null;
};

const syncBlocksSourceInput = (
  select: HTMLSelectElement,
  value: string,
  dispatchEvents = false
) => {
  const sourceId = select.getAttribute(BLOCKS_PROXY_SOURCE_ATTR);
  if (!sourceId) {
    return;
  }

  const source = document.getElementById(sourceId);
  if (!(source instanceof HTMLInputElement)) {
    return;
  }

  const nativeSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  )?.set;

  if (nativeSetter) {
    nativeSetter.call(source, value);
  } else if (source.value !== value) {
    source.value = value;
  }

  if (!dispatchEvents) {
    return;
  }

  source.dispatchEvent(new Event('input', { bubbles: true }));
  source.dispatchEvent(new Event('change', { bubbles: true }));
};

const createBlocksExpandIcon = () => {
  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('xmlns', svgNs);
  svg.setAttribute('width', '24');
  svg.setAttribute('height', '24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', BLOCKS_SELECT_CLASSES.expand);

  const path = document.createElementNS(svgNs, 'path');
  path.setAttribute('d', 'M17.5 11.6L12 16l-5.5-4.4.9-1.2L12 14l4.5-3.6 1 1.2z');
  svg.appendChild(path);

  return svg;
};

const findAddress2Element = (prefix: string): HTMLElement | null => {
  const form = document.getElementById(prefix);

  if (form) {
    const proxySelect = form.querySelector(`.wc-block-components-address-form__address_2 select[${BLOCKS_PROXY_SOURCE_ATTR}]`);
    if (proxySelect instanceof HTMLElement) {
      return proxySelect;
    }

    const input = form.querySelector('.wc-block-components-address-form__address_2 input:not(.wc-block-components-address-form__address_2-hidden-input)');
    if (input instanceof HTMLElement) {
      return input;
    }

    const select = form.querySelector('.wc-block-components-address-form__address_2 select');
    if (select instanceof HTMLElement) {
      return select;
    }
  }

  return null;
};

const hideLegacyAddress2Artifacts = (prefix: string) => {
  const form = document.getElementById(prefix);
  if (!form) {
    return;
  }

  const toggle = form.querySelector('.wc-block-components-address-form__address_2-toggle');
  if (toggle instanceof HTMLElement) {
    toggle.style.display = 'none';
  }

  const hiddenInput = form.querySelector('.wc-block-components-address-form__address_2-hidden-input');
  if (hiddenInput instanceof HTMLElement) {
    hiddenInput.style.display = 'none';
    hiddenInput.setAttribute('aria-hidden', 'true');
  }

  const staleWrappers = form.querySelectorAll<HTMLElement>(`.wc-block-components-address-form__address_2[id$="-address_2-field"]:not(.wc-block-components-text-input)`);
  staleWrappers.forEach((wrapper) => wrapper.remove());
};

const arrangeVietnamAddressFields = (prefix: string) => {
  const form = document.getElementById(prefix);
  const stateWrapper = findFieldWrapper(prefix, 'state');
  const cityWrapper = findFieldWrapper(prefix, 'city');
  const wardWrapper = findFieldWrapper(prefix, 'address_2');
  const addressWrapper = form?.querySelector('.wc-block-components-address-form__address_1') as HTMLElement | null;

  if (!form || !stateWrapper || !cityWrapper || !addressWrapper || !isVietnamSelected(prefix)) {
    return;
  }

  addressWrapper.insertAdjacentElement('beforebegin', cityWrapper);
  cityWrapper.insertAdjacentElement('beforebegin', stateWrapper);

  if (wardWrapper) {
    addressWrapper.insertAdjacentElement('beforebegin', wardWrapper);
  }
};

const isVietnamSelected = (prefix: string) => {
  const countryEl = findCountryElement(prefix);
  return !countryEl || countryEl.value === 'VN';
};

const convertBlocksInputToSelect = (input: HTMLInputElement): HTMLSelectElement => {
  const wrapper = input.parentElement;
  const labelText = wrapper?.querySelector(`label[for="${input.id}"]`)?.textContent?.trim() || input.getAttribute('aria-label') || '';
  const initialValue = input.value;
  const existingProxy = findBlocksProxySelect(input.id);

  if (existingProxy) {
    if (initialValue && !existingProxy.value) {
      existingProxy.dataset.vncheckoutInitialValue = initialValue;
      syncBlocksSourceInput(existingProxy, initialValue);
    }
    return existingProxy;
  }

  const select = document.createElement('select');

  cloneInputAttributesToSelect(input, select);
  select.id = getBlocksProxySelectId(input.id);
  select.setAttribute(BLOCKS_PROXY_SOURCE_ATTR, input.id);
  select.className = BLOCKS_SELECT_CLASSES.select;
  select.size = 1;

  if (initialValue) {
    select.dataset.vncheckoutInitialValue = initialValue;
  }

  if (!wrapper) {
    return select;
  }

  wrapper.classList.remove('wc-block-components-text-input');
  Array.from(wrapper.children).forEach((child) => {
    if (child instanceof HTMLElement) {
      child.style.display = 'none';
      child.setAttribute('aria-hidden', 'true');
    }
  });

  input.style.display = 'none';
  input.setAttribute('aria-hidden', 'true');
  input.tabIndex = -1;

  const selectWrapper = document.createElement('div');
  selectWrapper.className = BLOCKS_SELECT_CLASSES.wrapper;

  const selectContainer = document.createElement('div');
  selectContainer.className = BLOCKS_SELECT_CLASSES.container;

  const label = document.createElement('label');
  label.htmlFor = select.id;
  label.className = BLOCKS_SELECT_CLASSES.label;
  label.textContent = labelText;

  selectContainer.appendChild(label);
  selectContainer.appendChild(select);
  selectContainer.appendChild(createBlocksExpandIcon());
  selectWrapper.appendChild(selectContainer);
  wrapper.appendChild(selectWrapper);

  select.addEventListener('change', () => {
    syncBlocksSourceInput(select, select.value, true);
  });

  return select;
};

// Helper to find element by multiple possible IDs (kebab-case and snake_case for WooCommerce Blocks)
// Returns HTMLSelectElement - for city field it will convert INPUT to SELECT
const findEl = (prefix: string, field: AddressField): HTMLSelectElement | null => {
  const possibleIds = field === 'address_2'
    ? [getFieldKey(prefix, field)]
    : getPossibleFieldIds(prefix, field);

  for (const id of possibleIds) {
    const el = field === 'address_2'
      ? findAddress2Element(prefix)
      : findBlocksProxySelect(id) || document.getElementById(id);

    if (el) {
      // If it's an input (WooCommerce Blocks), convert to select
      if (el.tagName === 'INPUT') {
        const useBlocksSelectMarkup = field === 'city' || field === 'address_2';
        const select = useBlocksSelectMarkup
          ? convertBlocksInputToSelect(el as HTMLInputElement)
          : getEl(id);

        if (select) {
          if (!useBlocksSelectMarkup) {
            convertedFromInput.add(id);
          }
          foundIds[getFieldKey(prefix, field)] = select.id;
          console.log(`[AddressSelector] Converted ${id} from INPUT to SELECT`);
          return select;
        }
      }
      foundIds[getFieldKey(prefix, field)] = el.id;
      // Already a SELECT - don't add Select2, let WooCommerce handle it
      console.log(`[AddressSelector] ${id} is already a SELECT, skipping Select2`);
      return el as HTMLSelectElement;
    }
  }
  return null;
};

// Get correct selector for Select2 based on found element ID.
// Blocks city selects intentionally stay native so WooCommerce Blocks CSS can style them.
const getSelect2Selector = (prefix: string, field: AddressField): string | null => {
  const foundId = foundIds[getFieldKey(prefix, field)];
  // Only use Select2 if this element was converted from INPUT
  if (foundId && convertedFromInput.has(foundId)) {
    return `#${foundId}`;
  }
  // Not a converted element - let WooCommerce handle it
  return null;
};

const getEl = (id: string): HTMLSelectElement | null => {
  const el = findBlocksProxySelect(id) || document.getElementById(id);
  // If it's an input (WooCommerce Blocks), convert to select
  if (el && el.tagName === 'INPUT') {
    const select = document.createElement('select');
    select.id = id;
    cloneInputAttributesToSelect(el as HTMLInputElement, select);
    select.className = (el.className || '').trim();
    if ((el as HTMLInputElement).value) {
      select.dataset.vncheckoutInitialValue = (el as HTMLInputElement).value;
    }
    el.parentNode?.replaceChild(select, el);
    return select;
  }
  return el as HTMLSelectElement | null;
};

const trySelect2 = (selector: string, method: 'init' | 'refresh' | 'destroy') => {
  console.log(`[trySelect2] ${selector} - ${method}, jQuery:`, typeof jQuery !== 'undefined', 'select2:', !!(jQuery as any)?.fn?.select2);
  if (typeof jQuery === 'undefined' || !(jQuery as any).fn?.select2) {
    console.log(`[trySelect2] ${selector} - No jQuery/Select2`);
    return;
  }
  try {
    const $el = (jQuery as any)(selector);
    // Check if Select2 is already initialized
    const isInitialized = $el.hasClass('select2-hidden-accessible');

    if (method === 'init') {
      if (isInitialized) {
        console.log(`[trySelect2] ${selector} - Already initialized, skipping`);
        // Just refresh instead
        $el.trigger('change.select2');
      } else {
        $el.select2();
        console.log(`[trySelect2] ${selector} - Initialized`);
      }
    }
    else if (method === 'refresh') $el.trigger('change.select2');
    else if (method === 'destroy') $el.select2('destroy');
    console.log(`[trySelect2] ${selector} - Success`);
  } catch (e) {
    console.error(`[trySelect2] ${selector} - Error:`, e);
  }
};

const buildOptions = (
  el: HTMLSelectElement,
  items: { value: string; label: string }[],
  placeholder: string,
  currentValue?: string
) => {
  el.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = placeholder;
  el.appendChild(empty);
  items.forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    el.appendChild(opt);
  });
  const resolvedValue = currentValue || el.dataset.vncheckoutInitialValue || '';
  el.value = resolvedValue;
  syncBlocksSourceInput(el, resolvedValue);
  delete el.dataset.vncheckoutInitialValue;
};

// Get address schema from wp_localize_script
const getAddressSchema = (): 'old' | 'new' => {
  return (window.vncheckout_array?.address_schema as 'old' | 'new') || 'new';
};

/**
 * Headless component — no rendered UI.
 * Attaches to existing WooCommerce-rendered form selects and drives province → district → ward cascading.
 *
 * Schema 'old': Province → District (city) → Ward (address_2)
 * Schema 'new': Province → Ward (city) - no district, no address_2
 */
export const AddressSelector: React.FC<AddressSelectorProps> = ({ type, showWard = false }) => {
  const prefix = type === 'calc_shipping' ? 'calc_shipping' : type;
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');

  console.log(`[AddressSelector ${prefix}] Rendering, province:`, province, 'district:', district);

  const provinceRef = useRef('');
  const districtRef = useRef('');

  // Determine which schema we're using
  const schema = getAddressSchema();
  const isNewSchema = schema === 'new';
  console.log(`[AddressSelector ${prefix}] Schema:`, schema, 'isNewSchema:', isNewSchema, 'showWard:', showWard);

  // In 'new' schema: city field contains wards/communes directly from province
  // (districts.php in new schema contains villages, not districts!)
  // In 'old' schema: city field contains districts, then wards from district
  const { data: districtsOrWards = [], isLoading: loadingDistricts } = useDistricts(province ? province : null);
  console.log(`[AddressSelector ${prefix}] useDistricts called with:`, province, 'data length:', districtsOrWards.length, 'loading:', loadingDistricts);

  // For old schema only - wards come from district (when showWard is enabled)
  const { data: wards = [], isLoading: loadingWards } = useWards(!isNewSchema && showWard && district ? district : null);
  console.log(`[AddressSelector ${prefix}] useWards enabled:`, !isNewSchema && showWard && district, 'district:', district);

  // Keep refs in sync so event handlers always have fresh values
  useEffect(() => { provinceRef.current = province; }, [province]);
  useEffect(() => { districtRef.current = district; }, [district]);

  // Refs to latest data — needed inside event handlers that don't re-run on render
  const districtsOrWardsRef = useRef<(District | Ward)[]>([]);
  const wardsRef = useRef<Ward[]>([]);
  useEffect(() => { districtsOrWardsRef.current = districtsOrWards; }, [districtsOrWards]);
  useEffect(() => { wardsRef.current = wards; }, [wards]);

  // Seed React state from the current checkout form so dependent selects populate on first load.
  useEffect(() => {
    ensureCheckoutLayoutStyles();

    const stateEl = findEl(prefix, 'state');
    const cityEl = findEl(prefix, 'city');
    const initialProvince = stateEl?.value || '';
    const initialDistrict = cityEl?.value || cityEl?.dataset.vncheckoutInitialValue || '';

    if (initialProvince) {
      setProvince(initialProvince);
    }
    if (initialDistrict) {
      setDistrict(initialDistrict);
    }
  }, [prefix, isNewSchema]);

  // ─── Ward field visibility ────────────────────────────────────────────────
  useEffect(() => {
    if (!showWard || prefix === 'calc_shipping') return;

    const show = () => {
      if (!isVietnamSelected(prefix)) {
        return;
      }

      hideLegacyAddress2Artifacts(prefix);
      const wrapper = findFieldWrapper(prefix, 'address_2');
      if (wrapper) {
        wrapper.style.display = 'block';
      }
      arrangeVietnamAddressFields(prefix);
    };
    show();

    if (typeof jQuery !== 'undefined') {
      (jQuery as any)(document.body).on(`updated_checkout.ward_vis_${prefix}`, show);
    }
    return () => {
      if (typeof jQuery !== 'undefined') {
        (jQuery as any)(document.body).off(`updated_checkout.ward_vis_${prefix}`);
      }
    };
  }, [prefix, showWard]);

  // ─── Province listener ────────────────────────────────────────────────────
  useEffect(() => {
    // Use findEl to support both kebab-case (billing-state) and snake_case (billing_state)
    const stateEl = findEl(prefix, 'state') as HTMLSelectElement | null;
    console.log(`[AddressSelector ${prefix}] State element found:`, !!stateEl, 'tag:', stateEl?.tagName, 'id:', stateEl?.id);
    if (!stateEl) {
      console.log(`[AddressSelector ${prefix}] State element not found - skipping province listener`);
      return;
    }

    const select2StateSelector = getSelect2Selector(prefix, 'state');
    if (select2StateSelector) trySelect2(select2StateSelector, 'init');

    const onChange = () => {
      const val = stateEl.value;
      console.log(`[AddressSelector ${prefix}] Province changed to:`, val);
      setProvince(val);
      setDistrict('');
      // Immediately clear district / ward selects
      const cityEl = findEl(prefix, 'city');
      const placeholder = isNewSchema ? 'Select ward/commune/town' : 'Select district';
      if (cityEl) {
        buildOptions(cityEl, [], placeholder);
        const select2CitySelector = getSelect2Selector(prefix, 'city');
        if (select2CitySelector) trySelect2(select2CitySelector, 'refresh');
      }
      if (showWard) {
        const wardEl = findEl(prefix, 'address_2');
        const select2WardSelector = getSelect2Selector(prefix, 'address_2');
        if (wardEl) {
          buildOptions(wardEl, [], 'Select ward/commune/town');
          if (select2WardSelector) trySelect2(select2WardSelector, 'refresh');
        }
      }
      arrangeVietnamAddressFields(prefix);
      // NOTE: Do NOT trigger update_checkout here - it will wipe our data before it's loaded
      // Shipping recalc will happen when user selects city/ward
    };

    stateEl.addEventListener('change', onChange);
    if (typeof jQuery !== 'undefined' && (jQuery as any).fn?.select2 && select2StateSelector) {
      (jQuery as any)(select2StateSelector).on(`select2:select.cb_${prefix}`, onChange);
    }
    return () => {
      stateEl.removeEventListener('change', onChange);
      if (typeof jQuery !== 'undefined' && (jQuery as any).fn?.select2 && select2StateSelector) {
        (jQuery as any)(select2StateSelector).off(`select2:select.cb_${prefix}`);
      }
    };
  }, [prefix, showWard, isNewSchema]);

  // ─── District/City listener ─────────────────────────────────────────────────
  useEffect(() => {
    // In new schema, city is actually ward - no district step
    if (isNewSchema) return;

    const cityEl = findEl(prefix, 'city');
    if (!cityEl) return;

    const select2CitySelector = getSelect2Selector(prefix, 'city');
    if (select2CitySelector) trySelect2(select2CitySelector, 'init');

    const onChange = () => {
      const val = cityEl.value;
      setDistrict(val);
      // Immediately clear ward select
      if (showWard) {
        const wardEl = findEl(prefix, 'address_2');
        const select2WardSelector = getSelect2Selector(prefix, 'address_2');
        if (wardEl) {
          buildOptions(wardEl, [], 'Select ward/commune/town');
          if (select2WardSelector) trySelect2(select2WardSelector, 'refresh');
        }
      }
      arrangeVietnamAddressFields(prefix);
      // Trigger shipping recalc when district is chosen
      if (val && typeof jQuery !== 'undefined') (jQuery as any)('body').trigger('update_checkout');
    };

    cityEl.addEventListener('change', onChange);
    if (typeof jQuery !== 'undefined' && (jQuery as any).fn?.select2 && select2CitySelector) {
      (jQuery as any)(select2CitySelector).on(`select2:select.cb_${prefix}`, onChange);
    }
    return () => {
      cityEl.removeEventListener('change', onChange);
      if (typeof jQuery !== 'undefined' && (jQuery as any).fn?.select2 && select2CitySelector) {
        (jQuery as any)(select2CitySelector).off(`select2:select.cb_${prefix}`);
      }
    };
  }, [prefix, showWard, isNewSchema]);

  // ─── Ward listener ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showWard || prefix === 'calc_shipping') return;

    const wardEl = findEl(prefix, 'address_2');
    if (!wardEl) return;

    const select2WardSelector = getSelect2Selector(prefix, 'address_2');
    if (select2WardSelector) trySelect2(select2WardSelector, 'init');
    arrangeVietnamAddressFields(prefix);

    const onChange = () => {
      // Trigger shipping recalc when ward is chosen
      if (wardEl.value && typeof jQuery !== 'undefined') {
        (jQuery as any)('body').trigger('update_checkout');
      }
    };

    wardEl.addEventListener('change', onChange);
    if (typeof jQuery !== 'undefined' && (jQuery as any).fn?.select2 && select2WardSelector) {
      (jQuery as any)(select2WardSelector).on(`select2:select.cb_${prefix}`, onChange);
    }
    return () => {
      wardEl.removeEventListener('change', onChange);
      if (typeof jQuery !== 'undefined' && (jQuery as any).fn?.select2 && select2WardSelector) {
        (jQuery as any)(select2WardSelector).off(`select2:select.cb_${prefix}`);
      }
    };
  }, [prefix, showWard]);

  // ─── City/Ward listener for new schema ────────────────────────────────────────
  useEffect(() => {
    // In new schema, city is actually ward - listen for changes
    if (!isNewSchema) return;

    const cityEl = findEl(prefix, 'city');
    if (!cityEl) return;

    const select2CitySelector = getSelect2Selector(prefix, 'city');
    if (select2CitySelector) trySelect2(select2CitySelector, 'init');

    const onChange = () => {
      const val = cityEl.value;
      setDistrict(val);
      console.log(`[AddressSelector ${prefix}] City/Ward changed to:`, val);
      // Trigger shipping recalc when ward is chosen
      if (val && typeof jQuery !== 'undefined') {
        console.log(`[AddressSelector ${prefix}] Triggering update_checkout`);
        (jQuery as any)('body').trigger('update_checkout');
      }
    };

    cityEl.addEventListener('change', onChange);
    if (typeof jQuery !== 'undefined' && (jQuery as any).fn?.select2 && select2CitySelector) {
      (jQuery as any)(select2CitySelector).on(`select2:select.cb_${prefix}`, onChange);
    }
    return () => {
      cityEl.removeEventListener('change', onChange);
      if (typeof jQuery !== 'undefined' && (jQuery as any).fn?.select2 && select2CitySelector) {
        (jQuery as any)(select2CitySelector).off(`select2:select.cb_${prefix}`);
      }
    };
  }, [prefix, isNewSchema]);

  // ─── Populate city field (districts in old schema, wards in new schema) ──────
  useEffect(() => {
    const cityEl = findEl(prefix, 'city');
    const select2CitySelector = getSelect2Selector(prefix, 'city');
    console.log(`[AddressSelector ${prefix}] Populate city field - province:`, province, 'cityEl:', !!cityEl, 'isNewSchema:', isNewSchema, 'select2Selector:', select2CitySelector);
    if (!cityEl || !province) return;

    if (loadingDistricts) {
      buildOptions(cityEl, [], 'Loading...');
      if (select2CitySelector) trySelect2(select2CitySelector, 'refresh');
      return;
    }

    if (isNewSchema) {
      // New schema: city field = wards/communes directly from province
      // In new schema, districts.php actually contains villages!
      const items = districtsOrWards.map((item) => {
        // Ward has xaid, District has maqh
        const code = 'xaid' in item ? (item as Ward).xaid : (item as District).maqh;
        return { value: code, label: item.name };
      });
      buildOptions(cityEl, items, 'Select ward/commune/town');
    } else {
      // Old schema: city field = districts
      const items = districtsOrWards.map((item) => {
        const code = 'xaid' in item ? (item as Ward).xaid : (item as District).maqh;
        return { value: code, label: item.name };
      });
      buildOptions(cityEl, items, 'Select district');
    }
    // NOTE: Do NOT call triggerWooCommerceUpdate here — it would wipe the select we just built
  }, [districtsOrWards, loadingDistricts, prefix, province, isNewSchema]);

  // ─── Populate wards when data arrives (old schema only) ────────────────────
  useEffect(() => {
    // Only in old schema with showWard enabled
    if (!showWard || prefix === 'calc_shipping' || isNewSchema) return;
    const wardEl = findEl(prefix, 'address_2');
    if (!wardEl || !district) return;

    const select2WardSelector = getSelect2Selector(prefix, 'address_2');
    if (loadingWards) {
      buildOptions(wardEl, [], 'Loading...');
      if (select2WardSelector) trySelect2(select2WardSelector, 'refresh');
      arrangeVietnamAddressFields(prefix);
      return;
    }

    buildOptions(
      wardEl,
      wards.map((w: Ward) => ({ value: w.xaid, label: w.name })),
      'Select ward/commune/town'
    );
    if (select2WardSelector) trySelect2(select2WardSelector, 'refresh');
    arrangeVietnamAddressFields(prefix);
    // NOTE: Do NOT call triggerWooCommerceUpdate here
  }, [wards, loadingWards, prefix, district, showWard, isNewSchema]);

  // ─── After WooCommerce's checkout AJAX rerenders, restore our selects ──────
  useEffect(() => {
    if (typeof jQuery === 'undefined') return;

    const onUpdated = () => {
      if (isVietnamSelected(prefix)) {
        hideLegacyAddress2Artifacts(prefix);
      }

      // Re-init Select2 only on converted elements
      const select2StateSelector = getSelect2Selector(prefix, 'state');
      const select2CitySelector = getSelect2Selector(prefix, 'city');
      const select2WardSelector = getSelect2Selector(prefix, 'address_2');
      if (select2StateSelector) trySelect2(select2StateSelector, 'init');
      if (select2CitySelector) trySelect2(select2CitySelector, 'init');
      if (select2WardSelector) trySelect2(select2WardSelector, 'init');

      // Restore province value if WooCommerce wiped it
      const stateEl = getEl(`${prefix}-state`);
      if (stateEl && provinceRef.current && stateEl.value !== provinceRef.current) {
        stateEl.value = provinceRef.current;
        if (select2StateSelector) trySelect2(select2StateSelector, 'refresh');
      }

      // Re-populate city field (districts in old schema, wards in new schema)
      const cityEl = findEl(prefix, 'city');
      if (cityEl && provinceRef.current && districtsOrWardsRef.current.length > 0) {
        const items = districtsOrWardsRef.current.map((item) => {
          const code = 'xaid' in item ? (item as Ward).xaid : (item as District).maqh;
          return { value: code, label: item.name };
        });
        const placeholder = isNewSchema ? 'Select ward/commune/town' : 'Select district';
        buildOptions(cityEl, items, placeholder, districtRef.current || undefined);
        if (select2CitySelector) trySelect2(select2CitySelector, 'refresh');
      }

      // Re-populate ward options (old schema only)
      if (showWard && !isNewSchema) {
        const wardEl = findEl(prefix, 'address_2');
        if (wardEl && districtRef.current && wardsRef.current.length > 0) {
          buildOptions(
            wardEl,
            wardsRef.current.map((w) => ({ value: w.xaid, label: w.name })),
            'Select ward/commune/town'
          );
          if (select2WardSelector) trySelect2(select2WardSelector, 'refresh');
        }
        const wrapper = findFieldWrapper(prefix, 'address_2');
        if (wrapper) {
          wrapper.style.display = 'block';
        }
        arrangeVietnamAddressFields(prefix);
      }
    };

    (jQuery as any)(document.body).on(`updated_checkout.selects_${prefix}`, onUpdated);
    return () => {
      (jQuery as any)(document.body).off(`updated_checkout.selects_${prefix}`);
    };
  }, [prefix, showWard, isNewSchema]);

  // Woo Blocks can re-render the address form after validation or Store API updates.
  // Keep the Vietnam-specific field order stable after those DOM mutations.
  useEffect(() => {
    if (!showWard || prefix === 'calc_shipping') return;

    const form = document.getElementById(prefix);
    if (!form || typeof MutationObserver === 'undefined') return;

    let scheduled = false;
    const syncLayout = () => {
      scheduled = false;
      if (!isVietnamSelected(prefix)) {
        return;
      }
      hideLegacyAddress2Artifacts(prefix);
      const wardWrapper = findFieldWrapper(prefix, 'address_2');
      if (wardWrapper) {
        wardWrapper.style.display = 'block';
      }
      arrangeVietnamAddressFields(prefix);
    };

    const observer = new MutationObserver(() => {
      if (scheduled) {
        return;
      }
      scheduled = true;
      requestAnimationFrame(syncLayout);
    });

    observer.observe(form, { childList: true, subtree: true });
    syncLayout();

    return () => {
      observer.disconnect();
    };
  }, [prefix, showWard]);

  return null;
};
