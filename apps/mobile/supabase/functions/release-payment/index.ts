import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const COMMISSION_DIGITAL = 0.10;
const COMMISSION_CASH = 0.12;

serve(async (req) => {
  try {
    const { job_id, payment_method } = await req.json();

    if (!job_id || !payment_method) {
      return new Response(JSON.stringify({ error: 'job_id y payment_method requeridos' }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Obtener el job
    const { data: job } = await supabase
      .from('jobs')
      .select('*, professionals(id, mp_account_id, balance_due)')
      .eq('id', job_id)
      .single();

    if (!job) {
      return new Response(JSON.stringify({ error: 'Job no encontrado' }), { status: 404 });
    }

    const amount = job.agreed_price;
    const rate = payment_method === 'cash' ? COMMISSION_CASH : COMMISSION_DIGITAL;
    const commissionAmount = parseFloat((amount * rate).toFixed(2));
    const netToProfessional = parseFloat((amount - commissionAmount).toFixed(2));

    if (payment_method === 'cash') {
      // Crear registro de pago en efectivo y sumar deuda al profesional
      await supabase.from('payments').insert({
        job_id,
        amount,
        commission_rate: rate,
        commission_amount: commissionAmount,
        net_to_professional: netToProfessional,
        method: 'cash',
        status: 'pending',
      });

      await supabase
        .from('professionals')
        .update({
          balance_due: (job.professionals?.balance_due ?? 0) + commissionAmount,
        })
        .eq('id', job.professional_id);

      return new Response(JSON.stringify({
        success: true,
        method: 'cash',
        balance_added: commissionAmount,
      }), { status: 200 });
    }

    // Pago digital: actualizar estado del pago existente (fue procesado por MP webhook)
    await supabase
      .from('payments')
      .update({ status: 'released', released_at: new Date().toISOString() })
      .eq('job_id', job_id);

    return new Response(JSON.stringify({
      success: true,
      method: 'digital',
      released_to_professional: netToProfessional,
    }), { status: 200 });

  } catch (err) {
    console.error('release-payment error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
