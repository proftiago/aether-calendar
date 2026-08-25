// supabase/functions/google-oauth-callback/index.ts
//
// Google redireciona pra cá depois que você autoriza o app na tela de
// consentimento. Esta função troca o "code" pelo access_token +
// refresh_token (usando o client_secret, que nunca aparece no navegador),
// guarda os tokens na tabela google_tokens, e redireciona de volta pro
// Aether já conectado.
//
// Variáveis de ambiente necessárias (supabase secrets set ...):
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
//   GOOGLE_REDIRECT_URI   — a URL desta própria função (ver README de deploy)
//   APP_URL               — URL do Aether publicado (ex: https://aether-calendar.netlify.app)
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já ficam disponíveis
// automaticamente pra toda Edge Function — não precisa configurar.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const appUrl = Deno.env.get('APP_URL') ?? '/';

  if (error) {
    return redirect(`${appUrl}/?google=error&reason=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return new Response('Parâmetro "code" ausente.', { status: 400 });
  }

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI');

  if (!clientId || !clientSecret || !redirectUri) {
    return new Response('Faltam variáveis de ambiente do Google no servidor.', { status: 500 });
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const detail = await tokenRes.text();
      console.error('Falha ao trocar o code pelo token:', detail);
      return redirect(`${appUrl}/?google=error&reason=token_exchange`);
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_in, scope } = tokenData;

    if (!refresh_token) {
      // Acontece se o usuário já tinha autorizado antes sem revogar o
      // acesso — Google só manda refresh_token no primeiro consentimento
      // (ou com prompt=consent, que já pedimos ao montar a URL de auth).
      return redirect(`${appUrl}/?google=error&reason=no_refresh_token`);
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const expiry = new Date(Date.now() + expires_in * 1000).toISOString();
    const { error: dbError } = await supabase.from('google_tokens').upsert({
      id: 'default',
      access_token,
      refresh_token,
      expiry,
      scope,
      updated_at: new Date().toISOString(),
    });

    if (dbError) {
      console.error('Falha ao salvar token:', dbError);
      return redirect(`${appUrl}/?google=error&reason=db`);
    }

    return redirect(`${appUrl}/?google=connected`);
  } catch (err) {
    console.error(err);
    return redirect(`${appUrl}/?google=error&reason=unexpected`);
  }
});

function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { Location: location } });
}
