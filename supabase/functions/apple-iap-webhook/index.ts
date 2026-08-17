// supabase/functions/apple-iap-webhook/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore - Supabase Edge Function environment
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  // @ts-ignore - Deno global is available in Edge Functions
  Deno.env.get("SUPABASE_URL")!,
  // @ts-ignore - Deno global is available in Edge Functions
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// @ts-ignore - Deno global is available in Edge Functions
Deno.serve(async (req) => {
  try {
    const body = await req.json();

    // Debug log (remove later)
    console.log("📩 Apple IAP Notification:", body);

    // Apple sends multiple notification types
    const notificationType = body?.notificationType;
    const transactionId = body?.data?.signedTransactionInfo;

    // Example: mark subscription as active or expired
    if (notificationType === "DID_RENEW" || notificationType === "INITIAL_BUY") {
      // Activate subscription for user
      await supabase
        .from("user_profiles")
        .update({ ad_free: true })
        .eq("apple_transaction_id", transactionId);
    } else if (notificationType === "DID_FAIL_TO_RENEW" || notificationType === "EXPIRED") {
      // Deactivate subscription
      await supabase
        .from("user_profiles")
        .update({ ad_free: false })
        .eq("apple_transaction_id", transactionId);
    }

    return new Response(JSON.stringify({ ok: true }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error("❌ Error handling Apple webhook:", err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});