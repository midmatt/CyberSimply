/**
 * Apple App Store Server Notifications v2 Webhook Handler
 * 
 * This Edge Function handles real-time notifications from Apple about:
 * - New purchases
 * - Subscription renewals
 * - Subscription cancellations
 * - Refunds
 * - Grace periods
 * 
 * Documentation: https://developer.apple.com/documentation/appstoreservernotifications
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Notification types from Apple
const NOTIFICATION_TYPES = {
  // Subscriptions
  DID_RENEW: 'DID_RENEW',
  DID_FAIL_TO_RENEW: 'DID_FAIL_TO_RENEW',
  DID_CHANGE_RENEWAL_STATUS: 'DID_CHANGE_RENEWAL_STATUS',
  EXPIRED: 'EXPIRED',
  GRACE_PERIOD_EXPIRED: 'GRACE_PERIOD_EXPIRED',
  OFFER_REDEEMED: 'OFFER_REDEEMED',
  PRICE_INCREASE: 'PRICE_INCREASE',
  REFUND: 'REFUND',
  REFUND_DECLINED: 'REFUND_DECLINED',
  RENEWAL_EXTENDED: 'RENEWAL_EXTENDED',
  REVOKE: 'REVOKE',
  SUBSCRIBED: 'SUBSCRIBED',
  
  // One-time purchases
  CONSUMPTION_REQUEST: 'CONSUMPTION_REQUEST',
  EXTERNAL_PURCHASE_TOKEN: 'EXTERNAL_PURCHASE_TOKEN',
  ONE_TIME_CHARGE: 'ONE_TIME_CHARGE',
  REFUND_REVERSED: 'REFUND_REVERSED',
  TEST: 'TEST',
};

interface AppleNotificationPayload {
  notificationType: string;
  subtype?: string;
  data: {
    appAppleId?: number;
    bundleId?: string;
    bundleVersion?: string;
    environment: 'Sandbox' | 'Production';
    signedTransactionInfo?: string; // JWT
    signedRenewalInfo?: string; // JWT
  };
}

interface TransactionInfo {
  originalTransactionId: string;
  transactionId: string;
  productId: string;
  purchaseDate: number;
  originalPurchaseDate: number;
  expiresDate?: number;
  revocationDate?: number;
  revocationReason?: number;
}

serve(async (req) => {
  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse the notification payload
    const payload: AppleNotificationPayload = await req.json();
    
    console.log('📬 [Webhook] Received notification:', {
      type: payload.notificationType,
      subtype: payload.subtype,
      environment: payload.data.environment,
    });

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Decode the signed transaction info (in production, verify JWT signature)
    const transactionInfo = await decodeTransactionInfo(payload.data.signedTransactionInfo);
    
    if (!transactionInfo) {
      console.error('❌ [Webhook] Failed to decode transaction info');
      return new Response(JSON.stringify({ error: 'Invalid transaction info' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Process the notification based on type
    await processNotification(supabase, payload, transactionInfo);

    // Return success response to Apple
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ [Webhook] Error processing notification:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Decode transaction info JWT (simplified - in production, verify signature)
 */
async function decodeTransactionInfo(jwt: string | undefined): Promise<TransactionInfo | null> {
  if (!jwt) return null;

  try {
    // Split JWT and decode payload (base64url)
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const transactionInfo = JSON.parse(decoded);

    return transactionInfo;
  } catch (error) {
    console.error('❌ [Webhook] Error decoding JWT:', error);
    return null;
  }
}

/**
 * Process notification and update database
 */
async function processNotification(
  supabase: any,
  payload: AppleNotificationPayload,
  transactionInfo: TransactionInfo
): Promise<void> {
  const notificationType = payload.notificationType;
  
  console.log('🔄 [Webhook] Processing notification:', {
    type: notificationType,
    transactionId: transactionInfo.transactionId,
    productId: transactionInfo.productId,
  });

  // Find user by transaction ID
  const { data: existingRecord } = await supabase
    .from('user_iap')
    .select('user_id')
    .eq('transaction_id', transactionInfo.originalTransactionId)
    .single();

  const userId = existingRecord?.user_id;

  switch (notificationType) {
    case NOTIFICATION_TYPES.SUBSCRIBED:
    case NOTIFICATION_TYPES.DID_RENEW:
    case NOTIFICATION_TYPES.RENEWAL_EXTENDED:
      // Activate or renew subscription
      await activatePurchase(supabase, userId, transactionInfo, payload);
      break;

    case NOTIFICATION_TYPES.DID_FAIL_TO_RENEW:
    case NOTIFICATION_TYPES.EXPIRED:
    case NOTIFICATION_TYPES.GRACE_PERIOD_EXPIRED:
      // Deactivate subscription
      await deactivatePurchase(supabase, transactionInfo, 'EXPIRED');
      break;

    case NOTIFICATION_TYPES.REFUND:
    case NOTIFICATION_TYPES.REVOKE:
      // Handle refund or revocation
      await deactivatePurchase(supabase, transactionInfo, notificationType);
      break;

    case NOTIFICATION_TYPES.DID_CHANGE_RENEWAL_STATUS:
      // Update renewal status (user enabled/disabled auto-renew)
      await updateRenewalStatus(supabase, transactionInfo, payload);
      break;

    case NOTIFICATION_TYPES.TEST:
      // Test notification - log and ignore
      console.log('✅ [Webhook] Test notification received');
      break;

    default:
      console.log('⚠️ [Webhook] Unhandled notification type:', notificationType);
  }
}

/**
 * Activate or update a purchase
 */
async function activatePurchase(
  supabase: any,
  userId: string | undefined,
  transactionInfo: TransactionInfo,
  payload: AppleNotificationPayload
): Promise<void> {
  console.log('✅ [Webhook] Activating purchase...');

  const expiresDate = transactionInfo.expiresDate 
    ? new Date(transactionInfo.expiresDate * 1000).toISOString()
    : null;

  const purchaseData = {
    user_id: userId, // May be null if first notification
    transaction_id: transactionInfo.transactionId,
    original_transaction_id: transactionInfo.originalTransactionId,
    product_id: transactionInfo.productId,
    purchase_date: new Date(transactionInfo.purchaseDate * 1000).toISOString(),
    original_purchase_date: new Date(transactionInfo.originalPurchaseDate * 1000).toISOString(),
    expires_date: expiresDate,
    is_active: true,
    environment: payload.data.environment.toLowerCase(),
    last_notification_type: payload.notificationType,
    last_notification_date: new Date().toISOString(),
  };

  // Upsert to user_iap
  const { error } = await supabase
    .from('user_iap')
    .upsert(purchaseData, {
      onConflict: 'transaction_id',
    });

  if (error) {
    console.error('❌ [Webhook] Error upserting purchase:', error);
    throw error;
  }

  // If we have a user ID, update their profile
  if (userId) {
    await syncUserProfile(supabase, userId);
  }

  console.log('✅ [Webhook] Purchase activated successfully');
}

/**
 * Deactivate a purchase (expired, refunded, or revoked)
 */
async function deactivatePurchase(
  supabase: any,
  transactionInfo: TransactionInfo,
  reason: string
): Promise<void> {
  console.log('❌ [Webhook] Deactivating purchase:', reason);

  const { data: existingRecord, error: fetchError } = await supabase
    .from('user_iap')
    .select('user_id')
    .eq('transaction_id', transactionInfo.transactionId)
    .single();

  if (fetchError) {
    console.error('❌ [Webhook] Error fetching purchase:', fetchError);
    return;
  }

  // Update purchase to inactive
  const { error: updateError } = await supabase
    .from('user_iap')
    .update({
      is_active: false,
      last_notification_type: reason,
      last_notification_date: new Date().toISOString(),
    })
    .eq('transaction_id', transactionInfo.transactionId);

  if (updateError) {
    console.error('❌ [Webhook] Error deactivating purchase:', updateError);
    throw updateError;
  }

  // Update user profile
  if (existingRecord?.user_id) {
    await syncUserProfile(supabase, existingRecord.user_id);
  }

  console.log('✅ [Webhook] Purchase deactivated successfully');
}

/**
 * Update renewal status
 */
async function updateRenewalStatus(
  supabase: any,
  transactionInfo: TransactionInfo,
  payload: AppleNotificationPayload
): Promise<void> {
  console.log('🔄 [Webhook] Updating renewal status...');

  const { error } = await supabase
    .from('user_iap')
    .update({
      last_notification_type: payload.notificationType,
      last_notification_date: new Date().toISOString(),
    })
    .eq('transaction_id', transactionInfo.transactionId);

  if (error) {
    console.error('❌ [Webhook] Error updating renewal status:', error);
  }
}

/**
 * Sync user profile based on active purchases
 */
async function syncUserProfile(supabase: any, userId: string): Promise<void> {
  console.log('🔄 [Webhook] Syncing user profile...');

  // Check if user has any active purchases
  const { data: activePurchases, error: fetchError } = await supabase
    .from('user_iap')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .or('expires_date.is.null,expires_date.gt.' + new Date().toISOString());

  if (fetchError) {
    console.error('❌ [Webhook] Error fetching active purchases:', fetchError);
    return;
  }

  const hasActivePurchase = activePurchases && activePurchases.length > 0;
  const latestPurchase = hasActivePurchase ? activePurchases[0] : null;

  // Update user profile
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({
      ad_free: hasActivePurchase,
      is_premium: hasActivePurchase,
      product_type: latestPurchase?.expires_date ? 'subscription' : 'lifetime',
      premium_expires_at: latestPurchase?.expires_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (updateError) {
    console.error('❌ [Webhook] Error updating user profile:', updateError);
  } else {
    console.log('✅ [Webhook] User profile synced successfully');
  }
}

console.log('🚀 Apple IAP Webhook v2 handler started');
