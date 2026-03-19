import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

serve(async (req) => {
  try {
    const { record } = await req.json();
    const requestId: string = record.request_id;
    const price: number = record.price;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Obtener el push_token del cliente del pedido
    const { data: serviceRequest } = await supabase
      .from('service_requests')
      .select('client_id, proposals_count, max_proposals, users!inner(push_token, name)')
      .eq('id', requestId)
      .single();

    if (!serviceRequest) {
      return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404 });
    }

    const pushToken = (serviceRequest as any).users?.push_token;
    if (!pushToken) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const count = serviceRequest.proposals_count;
    const body = count === 1
      ? `Recibiste tu primera propuesta: $${price.toLocaleString('es-AR')}`
      : `Nueva propuesta recibida: $${price.toLocaleString('es-AR')} (${count} en total)`;

    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: pushToken,
        sound: 'default',
        title: '📬 Nueva propuesta',
        body,
        data: { requestId, type: 'new_proposal' },
        priority: 'high',
      }),
    });

    return new Response(JSON.stringify({ sent: 1 }), { status: 200 });
  } catch (err) {
    console.error('on-new-proposal error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
