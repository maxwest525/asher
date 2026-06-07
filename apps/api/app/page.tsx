export default function ApiHome() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: '3rem' }}>
      <h1>POD API</h1>
      <ul>
        <li>
          <code>POST /api/trigger</code> — dashboard action → Inngest event
        </li>
        <li>
          <code>/api/inngest</code> — Inngest function registration/invocation
        </li>
        <li>
          <code>POST /api/webhooks/shopify</code> — Shopify webhooks (HMAC verified)
        </li>
        <li>
          <code>POST /api/webhooks/printify</code> — Printify webhooks
        </li>
      </ul>
    </main>
  );
}
