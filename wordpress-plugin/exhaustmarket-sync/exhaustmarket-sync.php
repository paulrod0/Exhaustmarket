<?php
/**
 * Plugin Name: ExhaustMarket Sync
 * Plugin URI:  https://exhaustmarket.com
 * Description: Sincroniza automáticamente tu catálogo de WooCommerce con ExhaustMarket.
 * Version:     1.0.0
 * Author:      ExhaustMarket
 * License:     GPL2
 * WC requires at least: 6.0
 * WC tested up to: 9.0
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'EM_SYNC_VERSION', '1.0.0' );
define( 'EM_SYNC_API_ENDPOINT', 'https://afsmlmpijjapkzdlrhhd.supabase.co/functions/v1/supplier-sync' );

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS PAGE
// ─────────────────────────────────────────────────────────────────────────────

add_action( 'admin_menu', 'em_sync_admin_menu' );
function em_sync_admin_menu() {
    add_submenu_page(
        'woocommerce',
        'ExhaustMarket Sync',
        'ExhaustMarket Sync',
        'manage_woocommerce',
        'em-sync-settings',
        'em_sync_settings_page'
    );
}

add_action( 'admin_init', 'em_sync_register_settings' );
function em_sync_register_settings() {
    register_setting( 'em_sync_settings', 'em_sync_api_key', [ 'sanitize_callback' => 'sanitize_text_field' ] );
    register_setting( 'em_sync_settings', 'em_sync_enabled', [ 'sanitize_callback' => 'absint' ] );
}

function em_sync_settings_page() {
    $api_key  = get_option( 'em_sync_api_key', '' );
    $enabled  = get_option( 'em_sync_enabled', 1 );
    $last_sync = get_option( 'em_sync_last_full', '' );

    // Handle full sync trigger
    if ( isset( $_POST['em_full_sync'] ) && check_admin_referer( 'em_sync_full' ) ) {
        $result = em_sync_full_catalog();
        $message = $result['success']
            ? "✅ Sincronización completa: +{$result['products_created']} creados, ~{$result['products_updated']} actualizados, -{$result['products_deleted']} eliminados."
            : "❌ Error: " . ( $result['error'] ?? 'Unknown error' );
        echo '<div class="notice notice-' . ( $result['success'] ? 'success' : 'error' ) . ' is-dismissible"><p>' . esc_html( $message ) . '</p></div>';
    }

    ?>
    <div class="wrap">
        <h1>ExhaustMarket Sync</h1>
        <p>Sincroniza tu catálogo de WooCommerce con ExhaustMarket automáticamente.</p>

        <form method="post" action="options.php">
            <?php settings_fields( 'em_sync_settings' ); ?>
            <table class="form-table">
                <tr>
                    <th>API Key</th>
                    <td>
                        <input type="password" name="em_sync_api_key" value="<?php echo esc_attr( $api_key ); ?>"
                               class="regular-text" placeholder="em_live_..." />
                        <p class="description">Obtén tu API Key en ExhaustMarket → Panel → Sincronización API</p>
                    </td>
                </tr>
                <tr>
                    <th>Auto-sincronización</th>
                    <td>
                        <label>
                            <input type="checkbox" name="em_sync_enabled" value="1" <?php checked( $enabled ); ?> />
                            Sincronizar automáticamente cuando se guarda un producto
                        </label>
                    </td>
                </tr>
            </table>
            <?php submit_button( 'Guardar configuración' ); ?>
        </form>

        <hr>
        <h2>Sincronización manual</h2>
        <?php if ( $last_sync ) : ?>
            <p>Última sincronización completa: <strong><?php echo esc_html( $last_sync ); ?></strong></p>
        <?php endif; ?>

        <?php if ( $api_key ) : ?>
            <form method="post">
                <?php wp_nonce_field( 'em_sync_full' ); ?>
                <input type="hidden" name="em_full_sync" value="1" />
                <?php submit_button( '🔄 Sincronizar todo el catálogo ahora', 'secondary' ); ?>
            </form>
        <?php else : ?>
            <p class="description">Añade tu API Key para activar la sincronización.</p>
        <?php endif; ?>
    </div>
    <?php
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-SYNC ON PRODUCT SAVE
// ─────────────────────────────────────────────────────────────────────────────

add_action( 'woocommerce_update_product', 'em_sync_on_product_save', 10, 1 );
add_action( 'woocommerce_new_product',    'em_sync_on_product_save', 10, 1 );
function em_sync_on_product_save( $product_id ) {
    if ( ! get_option( 'em_sync_enabled', 1 ) ) return;
    if ( ! get_option( 'em_sync_api_key', '' ) ) return;

    $product = wc_get_product( $product_id );
    if ( ! $product ) return;

    $result = em_sync_send( 'upsert', [ em_product_to_payload( $product ) ] );

    // Store per-product sync result
    $status = ( isset( $result['success'] ) && $result['success'] ) ? 'success' : 'error';
    update_post_meta( $product_id, '_em_sync_at', current_time( 'mysql' ) );
    update_post_meta( $product_id, '_em_sync_status', $status );
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-DELETE ON PRODUCT DELETE
// ─────────────────────────────────────────────────────────────────────────────

add_action( 'woocommerce_delete_product', 'em_sync_on_product_delete', 10, 1 );
function em_sync_on_product_delete( $product_id ) {
    if ( ! get_option( 'em_sync_api_key', '' ) ) return;

    em_sync_send_raw([
        'action'         => 'delete',
        'ref'            => 'WC-' . $product_id,
        'source_platform'=> 'woocommerce',
    ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL CATALOG SYNC
// ─────────────────────────────────────────────────────────────────────────────

function em_sync_full_catalog() {
    $products_raw = wc_get_products([
        'status' => 'publish',
        'limit'  => -1,
    ]);

    $products = array_map( 'em_product_to_payload', $products_raw );

    $result = em_sync_send( 'full_sync', $products );

    if ( isset( $result['success'] ) && $result['success'] ) {
        update_option( 'em_sync_last_full', current_time( 'mysql' ) );
    }

    return $result;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT LIST COLUMN — PER-PRODUCT SYNC STATUS
// ─────────────────────────────────────────────────────────────────────────────

// Add column header
add_filter( 'manage_edit-product_columns', 'em_sync_add_product_column' );
function em_sync_add_product_column( $columns ) {
    $columns['em_sync'] = 'EM Sync';
    return $columns;
}

// Populate column data
add_action( 'manage_product_posts_custom_column', 'em_sync_product_column_content', 10, 2 );
function em_sync_product_column_content( $column, $post_id ) {
    if ( $column !== 'em_sync' ) return;
    $at     = get_post_meta( $post_id, '_em_sync_at', true );
    $status = get_post_meta( $post_id, '_em_sync_status', true );
    if ( ! $at ) {
        echo '—';
    } elseif ( $status === 'success' ) {
        echo '✅ ' . esc_html( $at );
    } else {
        echo '❌ ' . esc_html( $at );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function em_product_to_payload( WC_Product $product ): array {
    $images = [];
    $image_id = $product->get_image_id();
    if ( $image_id ) {
        $images[] = wp_get_attachment_url( $image_id );
    }
    foreach ( $product->get_gallery_image_ids() as $gid ) {
        $images[] = wp_get_attachment_url( $gid );
    }

    return [
        'ref'             => 'WC-' . $product->get_id(),
        'name'            => $product->get_name(),
        'description'     => wp_strip_all_tags( $product->get_short_description() ?: $product->get_description() ),
        'price'           => (float) $product->get_price(),
        'stock'           => $product->get_stock_quantity() ?? 0,
        'category'        => implode( ' > ', wp_get_post_terms( $product->get_id(), 'product_cat', [ 'fields' => 'names' ] ) ),
        'images'          => array_filter( $images ),
        'active'          => $product->is_visible(),
        'source_platform' => 'woocommerce',
    ];
}

function em_sync_send( string $action, array $products ): array {
    return em_sync_send_raw([
        'action'          => $action,
        'products'        => $products,
        'source_platform' => 'woocommerce',
    ]);
}

function em_sync_send_raw( array $body ): array {
    $api_key = get_option( 'em_sync_api_key', '' );
    if ( ! $api_key ) return [ 'success' => false, 'error' => 'No API key configured' ];

    $response = wp_remote_post( EM_SYNC_API_ENDPOINT, [
        'timeout' => 30,
        'headers' => [
            'Authorization' => 'Bearer ' . $api_key,
            'Content-Type'  => 'application/json',
        ],
        'body' => wp_json_encode( $body ),
    ]);

    if ( is_wp_error( $response ) ) {
        return [ 'success' => false, 'error' => $response->get_error_message() ];
    }

    $decoded = json_decode( wp_remote_retrieve_body( $response ), true );
    return $decoded ?: [ 'success' => false, 'error' => 'Empty response' ];
}
