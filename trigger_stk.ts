
fetch("https://techtrust-escrow-api-production.up.railway.app/mpesa-stkpush", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ phone: "0728262710", amountKsh: 1, order_id: "00000000-0000-0000-0000-000000000000" })
}).then(res => res.json()).then(console.log).catch(console.error);
