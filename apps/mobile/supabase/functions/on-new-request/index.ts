import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

serve(async (req) => {
  try {
    const { record } = await req.json();
    const requestId: string = record.id;
    const categoryId: string = record.category_id;
    const location = record.location; // GEOGRAPHY point

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Buscar profesionales elegibles:
    // - Verificados
    // - Sin deuda
    // - Con la categoría del pedido
    // - Cuya zona contenga la ubicación del pedido
    const { data: professionals } = await supabase
      .from('professionals')
      .select(`
        id,
        user_id,
        users!inner(push_token, name),
        professional_categories!inner(category_id),
        professional_zones!inner(
          zone_id,
          service_zones!inner(id, boundary)
        )
      `)
      .eq('verified', true)
      .eq('balance_due', 0)
      .eq('professional_categories.category_id', categoryId);

    if (!professionals || professionals.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    // Filtrar por zona geoespacial si hay ubicación
    let eligibleTokens: string[] = [];

    if (location) {
      const { data: zoneFiltered } = await supabase.rpc('get_professionals_in_zone', {
        p_location: location,
        p_category_id: categoryId,
      });
      eligibleTokens = (zoneFiltered ?? [])
        .map((p: any) => p.push_token)
        .filter(Boolean);
    } else {
      eligibleTokens = professionals
        .map((p: any) => p.users?.push_token)
        .filter(Boolean);
    }

    if (eligibleTokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    // Enviar notificaciones push vía Expo
    const messages = eligibleTokens.map((token: string) => ({
      to: token,
      sound: 'default',
      title: '🔧 Nuevo pedido en tu zona',
      body: `Hay un nuevo pedido de servicio disponible. ¡Enviá tu propuesta!`,
      data: { requestId, type: 'new_request' },
      priority: 'high',
    }));

    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    return new Response(JSON.stringify({ sent: eligibleTokens.length }), { status: 200 });
  } catch (err) {
    console.error('on-new-request error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
