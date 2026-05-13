# Cloudflare Worker para Verificación VIES (UE)

La API oficial de VIES (`ec.europa.eu/taxation_customs/vies`) tiene CORS bloqueado
para clientes JS. Solución: un proxy en Cloudflare Workers (gratis).

## Pasos

### 1. Crea una cuenta en Cloudflare Workers

https://dash.cloudflare.com/sign-up → Workers & Pages → Crear Worker.

### 2. Pega este código en el worker

```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const country = url.searchParams.get('country');
    const vat = url.searchParams.get('vat');

    if (!country || !vat) {
      return new Response(JSON.stringify({ valid: false, error: 'Missing country or vat' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Llamada SOAP a VIES
    const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:ns1="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
  <soap:Body>
    <ns1:checkVat>
      <ns1:countryCode>${country}</ns1:countryCode>
      <ns1:vatNumber>${vat}</ns1:vatNumber>
    </ns1:checkVat>
  </soap:Body>
</soap:Envelope>`;

    try {
      const resp = await fetch('https://ec.europa.eu/taxation_customs/vies/services/checkVatService', {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml; charset=utf-8' },
        body: soapBody
      });
      const xml = await resp.text();

      // Parse rápido del XML
      const valid    = /<valid>true<\/valid>/.test(xml);
      const name     = (xml.match(/<name>([^<]*)<\/name>/) || [])[1] || '';
      const address  = (xml.match(/<address>([^<]*)<\/address>/) || [])[1] || '';

      return new Response(JSON.stringify({ valid, name, address }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    } catch (e) {
      return new Response(JSON.stringify({ valid: false, error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};
```

### 3. Despliega el worker

Pulsa "Deploy" en Cloudflare. Te dará una URL tipo:
`https://vies-proxy.TUUSUARIO.workers.dev`

### 4. Configura en BeUnifyT

En `js/vies.js`, edita la línea 19:

```javascript
const VIES_PROXY_URL = 'https://vies-proxy.TUUSUARIO.workers.dev';
```

Recarga la app. Listo.

## Sin worker (fallback)

Si no configuras el worker, BeUnifyT usa **vatcomply.com** automáticamente.
Funciona pero con rate limit de ~30 req/min.

## Coste

- **Cloudflare Workers Free**: 100.000 req/día gratis. Más que suficiente.
- **vatcomply.com**: gratis pero limitado. Sin necesidad de cuenta.
