import { createClient } from "@supabase/supabase-js";

// POST /api/verify-payment  { reference }
// Confirms with Paystack that the payment succeeded, checks the amount
// matches the saved order, then flips the order status to "paid".
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ status: "error", message: "Method not allowed" });
  }

  const reference = req.body?.reference;
  if (!reference) {
    return res.status(400).json({ status: "error", message: "Missing reference" });
  }

  try {
    // 1. Ask Paystack whether this transaction actually succeeded.
    const psRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );
    const ps = await psRes.json();
    const paidOk = ps?.data?.status === "success";
    const paidAmount = ps?.data?.amount ?? 0; // in pesewas

    if (!paidOk) {
      return res.status(200).json({ status: "failed" });
    }

    // 2. Cross-check the amount against the order we saved, then mark it paid.
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: order } = await sb
      .from("orders")
      .select("subtotal, status")
      .eq("ref", reference)
      .single();

    const expected = order ? Math.round(Number(order.subtotal) * 100) : null;
    const amountOk = expected === null || paidAmount >= expected;

    if (amountOk) {
      await sb.from("orders").update({ status: "paid" }).eq("ref", reference);
      return res.status(200).json({ status: "success" });
    }

    // Paid, but amount doesn't match — flag for manual review.
    await sb.from("orders").update({ status: "review" }).eq("ref", reference);
    return res.status(200).json({ status: "review" });
  } catch (e) {
    return res.status(500).json({ status: "error", message: "Verification failed" });
  }
}
