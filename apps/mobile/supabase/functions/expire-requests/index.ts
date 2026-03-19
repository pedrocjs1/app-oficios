import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CRON: ejecutar cada hora para cerrar pedidos vencidos
serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data, error } = await supabase
      .from('service_requests')
      .update({ status: 'cancelled' })
      .in('status', ['open', 'in_proposals'])
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) throw error;

    const expired = data?.length ?? 0;
    console.log(`expire-requests: cerrados ${expired} pedidos vencidos`);

    return new Response(JSON.stringify({ expired }), { status: 200 });
  } catch (err) {
    console.error('expire-requests error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
