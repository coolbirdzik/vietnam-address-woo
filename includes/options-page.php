<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div class="wrap vncheckout-settings-wrap vncheckout-modern-wrap">
    <div class="vncheckout-header">
        <h1><?php esc_html_e('Vietnam Address Woo', 'vietnam-address-woo'); ?></h1>
        <p class="vncheckout-header-desc">
            <?php esc_html_e('Fine-tune how Vietnamese addresses, currency conversion and advanced checkout helpers behave in your store.', 'vietnam-address-woo'); ?>
        </p>
    </div>

    <?php
    settings_fields($this->_optionGroup);
    $flra_options = wp_parse_args(get_option($this->_optionName), $this->_defaultOptions);
    global $tinh_thanhpho;
    ?>

    <!-- Tab Navigation -->
    <div class="vncheckout-tabs">
        <nav class="vncheckout-tabs-nav">
            <a href="#tab-address" class="vncheckout-tab active" data-tab="address">
                <span class="vncheckout-tab-icon">📍</span>
                <?php esc_html_e('Address', 'vietnam-address-woo'); ?>
            </a>
            <a href="#tab-currency" class="vncheckout-tab" data-tab="currency">
                <span class="vncheckout-tab-icon">💰</span>
                <?php esc_html_e('Currency & Shipping', 'vietnam-address-woo'); ?>
            </a>
            <a href="#tab-checkout" class="vncheckout-tab" data-tab="checkout">
                <span class="vncheckout-tab-icon">🛒</span>
                <?php esc_html_e('Checkout Fields', 'vietnam-address-woo'); ?>
            </a>
            <a href="#tab-orders" class="vncheckout-tab" data-tab="orders">
                <span class="vncheckout-tab-icon">📦</span>
                <?php esc_html_e('Order Management', 'vietnam-address-woo'); ?>
            </a>
        </nav>

        <?php
        // Handle form submission manually to avoid redirect issues
        if (isset($_POST['save_vncheckout_settings']) && check_admin_referer('vncheckout_settings_nonce')) {
            $option_name = $this->_optionName;
            $current_options = wp_parse_args(get_option($option_name, array()), $this->_defaultOptions);
            $posted_options = isset($_POST[$option_name]) && is_array($_POST[$option_name])
                ? wp_unslash($_POST[$option_name])
                : array();

            $checkbox_fields = array(
                'active_village',
                'required_village',
                'to_vnd',
                'active_vnd2usd',
                'remove_methob_title',
                'freeship_remove_other_methob',
                'enable_firstname',
                'enable_country',
                'enable_postcode',
                'active_filter_order',
            );

            $managed_fields = array(
                'address_schema',
                'active_village',
                'required_village',
                'to_vnd',
                'khoiluong_quydoi',
                'active_vnd2usd',
                'vnd2usd_currency',
                'vnd_usd_rate',
                'remove_methob_title',
                'freeship_remove_other_methob',
                'enable_firstname',
                'enable_country',
                'enable_postcode',
                'active_filter_order',
            );

            foreach ($managed_fields as $field_key) {
                if (in_array($field_key, $checkbox_fields, true)) {
                    $current_options[$field_key] = isset($posted_options[$field_key]) ? '1' : '';
                    continue;
                }

                if (isset($posted_options[$field_key])) {
                    $current_options[$field_key] = $posted_options[$field_key];
                }
            }

            $current_options = $this->sanitize_options($current_options);
            update_option($option_name, $current_options);
            $flra_options = wp_parse_args($current_options, $this->_defaultOptions);
            echo '<div class="notice notice-success is-dismissible"><p>' . __('Settings saved!', 'vietnam-address-woo') . '</p></div>';
        }
        ?>
        <form method="post" action="" novalidate="novalidate" class="vncheckout-settings-form">
            <?php wp_nonce_field('vncheckout_settings_nonce'); ?>
            <input type="hidden" name="save_vncheckout_settings" value="1" />

            <!-- Tab: Address (MOVE TO TOP) -->
            <div id="tab-address" class="vncheckout-tab-content active">
                <div class="vncheckout-card">
                    <div class="vncheckout-card-header">
                        <h2><?php esc_html_e('Vietnam Address Layout', 'vietnam-address-woo'); ?></h2>
                        <p><?php esc_html_e('Choose how provinces, districts and wards are shown on checkout and account pages.', 'vietnam-address-woo'); ?></p>
                    </div>
                    <div class="vncheckout-card-body">
                        <div class="vncheckout-field">
                            <label for="address_schema"><?php _e('Address Format', 'vietnam-address-woo'); ?></label>
                            <div class="vncheckout-radio-group">
                                <label class="vncheckout-radio">
                                    <input type="radio" name="<?php echo $this->_optionName ?>[address_schema]" value="old" <?php checked('old', $flra_options['address_schema']); ?> />
                                    <span class="vncheckout-radio-content">
                                        <strong><?php _e('Old Format', 'vietnam-address-woo'); ?></strong>
                                        <small><?php _e('Province/City → District → Ward/Commune', 'vietnam-address-woo'); ?></small>
                                    </span>
                                </label>
                                <label class="vncheckout-radio">
                                    <input type="radio" name="<?php echo $this->_optionName ?>[address_schema]" value="new" <?php checked('new', $flra_options['address_schema']); ?> />
                                    <span class="vncheckout-radio-content">
                                        <strong><?php _e('New Format', 'vietnam-address-woo'); ?></strong>
                                        <small><?php _e('Province/City → Ward/Commune (District hidden)', 'vietnam-address-woo'); ?></small>
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div class="vncheckout-field">
                            <label class="vncheckout-toggle">
                                <input type="checkbox" name="<?php echo $this->_optionName ?>[active_village]" <?php checked('1', $flra_options['active_village']); ?> value="1" id="active_village" />
                                <span class="vncheckout-toggle-slider"></span>
                                <span class="vncheckout-toggle-label">
                                    <strong><?php _e('Hide Ward/Commune Field', 'vietnam-address-woo'); ?></strong>
                                    <small><?php _e('Hide Ward/Commune/Town field in checkout form. Default is shown.', 'vietnam-address-woo'); ?></small>
                                </span>
                            </label>
                        </div>

                        <div class="vncheckout-field">
                            <label class="vncheckout-toggle">
                                <input type="checkbox" name="<?php echo $this->_optionName ?>[required_village]" <?php checked('1', $flra_options['required_village']); ?> value="1" id="required_village" />
                                <span class="vncheckout-toggle-slider"></span>
                                <span class="vncheckout-toggle-label">
                                    <strong><?php _e('Ward/Commune is NOT Required', 'vietnam-address-woo'); ?></strong>
                                    <small><?php _e('When Ward/Commune field is shown, it is optional.', 'vietnam-address-woo'); ?></small>
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab: Currency & Shipping -->
            <div id="tab-currency" class="vncheckout-tab-content">
                <div class="vncheckout-card">
                    <div class="vncheckout-card-header">
                        <h2><?php esc_html_e('Currency & Conversion', 'vietnam-address-woo'); ?></h2>
                        <p><?php esc_html_e('Control currency formatting, volumetric weight and VNĐ ↔ foreign currency conversion.', 'vietnam-address-woo'); ?></p>
                    </div>
                    <div class="vncheckout-card-body">
                        <div class="vncheckout-field">
                            <label class="vncheckout-toggle">
                                <input type="checkbox" name="<?php echo $this->_optionName ?>[to_vnd]" <?php checked('1', $flra_options['to_vnd']); ?> value="1" id="to_vnd" />
                                <span class="vncheckout-toggle-slider"></span>
                                <span class="vncheckout-toggle-label">
                                    <strong><?php _e('Convert ₫ to VNĐ', 'vietnam-address-woo'); ?></strong>
                                    <small><?php _e('Allow conversion to VNĐ', 'vietnam-address-woo'); ?></small>
                                </span>
                            </label>
                        </div>

                        <div class="vncheckout-field">
                            <label for="khoiluong_quydoi"><?php _e('Conversion Quotient', 'vietnam-address-woo'); ?></label>
                            <input type="number" min="0" name="<?php echo $this->_optionName ?>[khoiluong_quydoi]" value="<?php echo esc_attr($flra_options['khoiluong_quydoi']); ?>" id="khoiluong_quydoi" class="regular-text" />
                            <small><?php _e('Default by Viettel Post is 6000', 'vietnam-address-woo'); ?></small>
                        </div>
                    </div>
                </div>

                <div class="vncheckout-card">
                    <div class="vncheckout-card-header">
                        <h2><?php esc_html_e('PayPal Conversion', 'vietnam-address-woo'); ?></h2>
                        <p><?php esc_html_e('Enable VNĐ to foreign currency conversion to use PayPal.', 'vietnam-address-woo'); ?></p>
                    </div>
                    <div class="vncheckout-card-body">
                        <div class="vncheckout-field">
                            <label class="vncheckout-toggle">
                                <input type="checkbox" name="<?php echo $this->_optionName ?>[active_vnd2usd]" <?php checked('1', $flra_options['active_vnd2usd']); ?> value="1" />
                                <span class="vncheckout-toggle-slider"></span>
                                <span class="vncheckout-toggle-label">
                                    <strong><?php _e('Enable VNĐ to USD Conversion', 'vietnam-address-woo'); ?></strong>
                                    <small><?php _e('Enable VNĐ to USD conversion to use PayPal', 'vietnam-address-woo'); ?></small>
                                </span>
                            </label>
                        </div>

                        <div class="vncheckout-field-row">
                            <div class="vncheckout-field">
                                <label for="vnd2usd_currency"><?php _e('Target Currency', 'vietnam-address-woo'); ?></label>
                                <select name="<?php echo $this->_optionName ?>[vnd2usd_currency]" id="vnd2usd_currency" class="regular-text">
                                    <?php
                                    $paypal_supported_currencies = array('AUD','BRL','CAD','MXL','NZD','HKD','SGD','USD','EUR','JPY','TRY','NOK','CZK','DKK','HUF','ILS','MYR','PHP','PLN','SEK','CHF','TWD','THB','GBP','RMB','RUB');
                                    foreach ($paypal_supported_currencies as $currency) {
                                        echo '<option value="' . esc_attr($currency) . '" ' . selected(strtoupper($currency), $flra_options['vnd2usd_currency'], false) . '>' . esc_html($currency) . '</option>';
                                    }
                                    ?>
                                </select>
                            </div>
                            <div class="vncheckout-field">
                                <label for="vnd_usd_rate"><?php _e('Exchange Rate', 'vietnam-address-woo'); ?></label>
                                <input type="number" min="0" name="<?php echo $this->_optionName ?>[vnd_usd_rate]" value="<?php echo esc_attr($flra_options['vnd_usd_rate']); ?>" id="vnd_usd_rate" class="regular-text" />
                                <small><?php _e('Exchange rate from VNĐ', 'vietnam-address-woo'); ?></small>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="vncheckout-card">
                    <div class="vncheckout-card-header">
                        <h2><?php esc_html_e('Shipping Options', 'vietnam-address-woo'); ?></h2>
                        <p><?php esc_html_e('Configure shipping method display options.', 'vietnam-address-woo'); ?></p>
                    </div>
                    <div class="vncheckout-card-body">
                        <div class="vncheckout-field">
                            <label class="vncheckout-toggle">
                                <input type="checkbox" name="<?php echo $this->_optionName ?>[remove_methob_title]" <?php checked('1', $flra_options['remove_methob_title']); ?> value="1" id="remove_methob_title" />
                                <span class="vncheckout-toggle-slider"></span>
                                <span class="vncheckout-toggle-label">
                                    <strong><?php _e('Remove Shipping Title', 'vietnam-address-woo'); ?></strong>
                                    <small><?php _e('Completely remove shipping method title', 'vietnam-address-woo'); ?></small>
                                </span>
                            </label>
                        </div>

                        <div class="vncheckout-field">
                            <label class="vncheckout-toggle">
                                <input type="checkbox" name="<?php echo $this->_optionName ?>[freeship_remove_other_methob]" <?php checked('1', $flra_options['freeship_remove_other_methob']); ?> value="1" id="freeship_remove_other_methob" />
                                <span class="vncheckout-toggle-slider"></span>
                                <span class="vncheckout-toggle-label">
                                    <strong><?php _e('Hide Methods When Free Shipping Available', 'vietnam-address-woo'); ?></strong>
                                    <small><?php _e('Hide all other shipping methods when free shipping is available', 'vietnam-address-woo'); ?></small>
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab: Checkout Fields -->
            <div id="tab-checkout" class="vncheckout-tab-content">
                <div class="vncheckout-card">
                    <div class="vncheckout-card-header">
                        <h2><?php esc_html_e('Alepay & Billing Fields', 'vietnam-address-woo'); ?></h2>
                        <p><?php esc_html_e('Configure additional billing fields required by Alepay and other gateways.', 'vietnam-address-woo'); ?></p>
                    </div>
                    <div class="vncheckout-card-body">
                        <div class="vncheckout-field">
                            <label class="vncheckout-toggle">
                                <input type="checkbox" name="<?php echo $this->_optionName ?>[enable_firstname]" <?php checked('1', $flra_options['enable_firstname']); ?> value="1" />
                                <span class="vncheckout-toggle-slider"></span>
                                <span class="vncheckout-toggle-label">
                                    <strong><?php _e('Show First Name Field', 'vietnam-address-woo'); ?></strong>
                                    <small><?php _e('Required for Alepay payment.', 'vietnam-address-woo'); ?></small>
                                </span>
                            </label>
                        </div>

                        <div class="vncheckout-field">
                            <label class="vncheckout-toggle">
                                <input type="checkbox" name="<?php echo $this->_optionName ?>[enable_country]" <?php checked('1', $flra_options['enable_country']); ?> value="1" />
                                <span class="vncheckout-toggle-slider"></span>
                                <span class="vncheckout-toggle-label">
                                    <strong><?php _e('Show Country Field', 'vietnam-address-woo'); ?></strong>
                                    <small><?php _e('Required for Alepay payment.', 'vietnam-address-woo'); ?></small>
                                </span>
                            </label>
                        </div>

                        <div class="vncheckout-field">
                            <label class="vncheckout-toggle">
                                <input type="checkbox" name="<?php echo $this->_optionName ?>[enable_postcode]" <?php checked('1', $flra_options['enable_postcode']); ?> value="1" />
                                <span class="vncheckout-toggle-slider"></span>
                                <span class="vncheckout-toggle-label">
                                    <strong><?php _e('Show Postcode Field', 'vietnam-address-woo'); ?></strong>
                                    <small><?php _e('Required for Alepay Tokenization payment.', 'vietnam-address-woo'); ?></small>
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab: Order Management -->
            <div id="tab-orders" class="vncheckout-tab-content">
                <div class="vncheckout-card">
                    <div class="vncheckout-card-header">
                        <h2><?php esc_html_e('Order Management', 'vietnam-address-woo'); ?></h2>
                        <p><?php esc_html_e('Extra filters for quickly finding orders by province and date.', 'vietnam-address-woo'); ?></p>
                    </div>
                    <div class="vncheckout-card-body">
                        <div class="vncheckout-field">
                            <label class="vncheckout-toggle">
                                <input type="checkbox" name="<?php echo $this->_optionName ?>[active_filter_order]" <?php checked('1', $flra_options['active_filter_order']); ?> value="1" />
                                <span class="vncheckout-toggle-slider"></span>
                                <span class="vncheckout-toggle-label">
                                    <strong><?php _e('Enable Order Filter', 'vietnam-address-woo'); ?></strong>
                                    <small><?php _e('Enable filter by province and date in order list page', 'vietnam-address-woo'); ?></small>
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <?php do_settings_fields($this->_optionGroup, 'default'); ?>
            <?php do_settings_sections($this->_optionGroup, 'default'); ?>

            <div class="vncheckout-submit">
                <?php submit_button(__('Save Changes', 'vietnam-address-woo'), 'primary vncheckout-btn-primary', 'save_vncheckout_settings', false); ?>
            </div>
        </form>
    </div>
</div>

<style>
.vncheckout-modern-wrap {
    --vn-primary: #0284c7;
    --vn-primary-hover: #0369a1;
    --vn-bg: #f8fafc;
    --vn-card-bg: #ffffff;
    --vn-text: #1e293b;
    --vn-text-muted: #64748b;
    --vn-border: #e2e8f0;
    --vn-radius: 12px;
    --vn-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 900px;
    margin: 20px 20px 20px 0;
}

.vncheckout-header {
    margin-bottom: 24px;
}

.vncheckout-header h1 {
    font-size: 28px;
    font-weight: 700;
    color: var(--vn-text);
    margin: 0 0 8px 0;
}

.vncheckout-header-desc {
    color: var(--vn-text-muted);
    font-size: 14px;
    margin: 0;
}

/* Tabs Navigation */
.vncheckout-tabs-nav {
    display: flex;
    gap: 4px;
    background: var(--vn-card-bg);
    padding: 6px;
    border-radius: var(--vn-radius);
    border: 1px solid var(--vn-border);
    margin-bottom: 24px;
    overflow-x: auto;
}

.vncheckout-tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 8px;
    text-decoration: none;
    color: var(--vn-text-muted);
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
    white-space: nowrap;
    border: none;
    background: transparent;
    cursor: pointer;
}

.vncheckout-tab:hover {
    background: var(--vn-bg);
    color: var(--vn-text);
}

.vncheckout-tab.active {
    background: var(--vn-primary);
    color: white;
}

.vncheckout-tab-icon {
    font-size: 16px;
}

/* Tab Content */
.vncheckout-tab-content {
    display: none;
}

.vncheckout-tab-content.active {
    display: block;
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Cards */
.vncheckout-card {
    background: var(--vn-card-bg);
    border-radius: var(--vn-radius);
    border: 1px solid var(--vn-border);
    box-shadow: var(--vn-shadow);
    margin-bottom: 20px;
    overflow: hidden;
}

.vncheckout-card-header {
    padding: 20px 24px;
    border-bottom: 1px solid var(--vn-border);
    background: linear-gradient(to right, #f8fafc, #ffffff);
}

.vncheckout-card-header h2 {
    font-size: 18px;
    font-weight: 600;
    color: var(--vn-text);
    margin: 0 0 4px 0;
}

.vncheckout-card-header p {
    font-size: 13px;
    color: var(--vn-text-muted);
    margin: 0;
}

.vncheckout-card-body {
    padding: 24px;
}

/* Fields */
.vncheckout-field {
    margin-bottom: 20px;
}

.vncheckout-field:last-child {
    margin-bottom: 0;
}

.vncheckout-field > label:not(.vncheckout-toggle):not(.vncheckout-radio) {
    display: block;
    font-weight: 500;
    color: var(--vn-text);
    margin-bottom: 8px;
    font-size: 14px;
}

.vncheckout-field input[type="number"],
.vncheckout-field input[type="text"],
.vncheckout-field select {
    width: 100%;
    max-width: 300px;
    padding: 10px 14px;
    border: 1px solid var(--vn-border);
    border-radius: 8px;
    font-size: 14px;
    transition: border-color 0.2s, box-shadow 0.2s;
    background: white;
}

.vncheckout-field input:focus,
.vncheckout-field select:focus {
    outline: none;
    border-color: var(--vn-primary);
    box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.1);
}

.vncheckout-field small {
    display: block;
    color: var(--vn-text-muted);
    font-size: 12px;
    margin-top: 6px;
}

/* Field Row */
.vncheckout-field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
}

@media (max-width: 600px) {
    .vncheckout-field-row {
        grid-template-columns: 1fr;
    }
}

/* Toggle Switch */
.vncheckout-toggle {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    cursor: pointer;
    padding: 12px 16px;
    background: var(--vn-bg);
    border-radius: 8px;
    transition: background 0.2s;
}

.vncheckout-toggle:hover {
    background: #f1f5f9;
}

.vncheckout-toggle input {
    display: none;
}

.vncheckout-toggle-slider {
    width: 44px;
    height: 24px;
    background: #cbd5e1;
    border-radius: 12px;
    position: relative;
    flex-shrink: 0;
    transition: background 0.2s;
}

.vncheckout-toggle-slider::before {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    background: white;
    border-radius: 50%;
    top: 3px;
    left: 3px;
    transition: transform 0.2s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.vncheckout-toggle input:checked + .vncheckout-toggle-slider {
    background: var(--vn-primary);
}

.vncheckout-toggle input:checked + .vncheckout-toggle-slider::before {
    transform: translateX(20px);
}

.vncheckout-toggle-label {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.vncheckout-toggle-label strong {
    font-size: 14px;
    font-weight: 500;
    color: var(--vn-text);
}

.vncheckout-toggle-label small {
    font-size: 12px;
    color: var(--vn-text-muted);
    margin: 0;
}

/* Radio Group */
.vncheckout-radio-group {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

@media (max-width: 500px) {
    .vncheckout-radio-group {
        grid-template-columns: 1fr;
    }
}

.vncheckout-radio {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    cursor: pointer;
    padding: 16px;
    background: var(--vn-bg);
    border-radius: 10px;
    border: 2px solid var(--vn-border);
    transition: all 0.2s ease;
    position: relative;
}

.vncheckout-radio:hover {
    border-color: #94a3b8;
    background: #f1f5f9;
}

.vncheckout-radio:has(input:checked) {
    border-color: var(--vn-primary);
    background: rgba(2, 132, 199, 0.05);
}

.vncheckout-radio input {
    display: none;
}

.vncheckout-radio::before {
    content: '';
    position: absolute;
    top: 16px;
    right: 16px;
    width: 20px;
    height: 20px;
    border: 2px solid var(--vn-border);
    border-radius: 50%;
    transition: all 0.2s;
}

.vncheckout-radio:has(input:checked)::before {
    border-color: var(--vn-primary);
    background: var(--vn-primary);
    box-shadow: inset 0 0 0 3px white;
}

.vncheckout-radio-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
}

.vncheckout-radio-content strong {
    font-size: 14px;
    font-weight: 600;
    color: var(--vn-text);
}

.vncheckout-radio-content small {
    font-size: 12px;
    color: var(--vn-text-muted);
    line-height: 1.4;
}

.vncheckout-radio-content small::before {
    content: '→ ';
    color: var(--vn-primary);
}

/* Submit */
.vncheckout-submit {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid var(--vn-border);
}

.vncheckout-btn-primary {
    background: var(--vn-primary) !important;
    border-color: var(--vn-primary) !important;
    color: white !important;
    font-weight: 500 !important;
    padding: 10px 24px !important;
    border-radius: 8px !important;
    transition: all 0.2s !important;
    box-shadow: 0 2px 4px rgba(2, 132, 199, 0.3) !important;
}

.vncheckout-btn-primary:hover {
    background: var(--vn-primary-hover) !important;
    border-color: var(--vn-primary-hover) !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(2, 132, 199, 0.4) !important;
}

/* Responsive */
@media (max-width: 782px) {
    .vncheckout-tabs-nav {
        flex-wrap: nowrap;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
    }

    .vncheckout-tab {
        padding: 8px 12px;
        font-size: 13px;
    }

    .vncheckout-card-body {
        padding: 16px;
    }
}
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.vncheckout-tab');
    const tabContents = document.querySelectorAll('.vncheckout-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();

            const targetId = this.getAttribute('href').substring(1);

            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            this.classList.add('active');
            document.getElementById(targetId).classList.add('active');

            // Store active tab in localStorage
            localStorage.setItem('vncheckout_active_tab', targetId);
        });
    });

    // Restore active tab from localStorage
    const savedTab = localStorage.getItem('vncheckout_active_tab');
    if (savedTab) {
        const savedTabEl = document.querySelector(`.vncheckout-tab[href="#${savedTab}"]`);
        if (savedTabEl) {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            savedTabEl.classList.add('active');
            document.getElementById(savedTab).classList.add('active');
        }
    }
});
</script>
