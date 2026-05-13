import { createHash } from "node:crypto";

/**
 * @fileOverview Core configuration and utility functions for Red Dot Payment (RDP).
 */

export const RDP_PAYMENT_URL = "https://secure-dev.reddotpayment.com/service/payment-api";
export const RDP_ENQUIRY_URL = "https://test.reddotpayment.com/instanpanel/api/enquiry";

export const MID = process.env.RDP_MID ?? "";
export const SECRET_KEY = process.env.RDP_SECRET_KEY ?? "";

/**
 * Calculates RDP signature based on the specific field order provided by RDP.
 * 
 * Order 1: mid
 * Order 2: order_id
 * Order 3: payment_type
 * Order 4: amount
 * Order 5: ccy
 * Order 6: payer_id (Token only)
 * Order 11: secret_key
 */
export function calculateRDPSignature(
  data: Record<string, any>, 
  secretKey: string, 
  mode: 'CIT' | 'MIT' | 'NOTIFY'
): { signature: string; debugString: string } {
  let signString = "";
  
  if (mode === 'CIT') {
    // HOP mode sequence: Order 1, 2, 3, 4, 5
    // mid + order_id + payment_type + amount + ccy
    signString = `${data.mid}${data.order_id}${data.payment_type}${data.amount}${data.ccy}`;
  } else if (mode === 'MIT') {
    // Payment with token sequence: Order 1, 2, 3, 4, 5, 6
    // mid + order_id + payment_type + amount + ccy + payer_id
    // Note: Order 10 (CVV) is ignored as per user instruction.
    signString = `${data.mid}${data.order_id}${data.payment_type}${data.amount}${data.ccy}${data.payer_id}`;
  } else {
    // Notifications (S2S) typically use alphabetical sort or a predefined set of fields
    const sortedKeys = Object.keys(data)
      .filter(key => key !== "signature" && data[key] !== undefined && data[key] !== null && String(data[key]) !== "")
      .sort();

    for (const key of sortedKeys) {
      signString += String(data[key]);
    }
    
    const stringToHash = signString + secretKey;
    const signature = createHash("sha512").update(stringToHash).digest("hex").toLowerCase();
    return { signature, debugString: stringToHash };
  }

  // Common for CIT and MIT: append secret key at the end (Order 11)
  const stringToHash = signString + secretKey;
  
  const signature = createHash("sha512")
    .update(stringToHash)
    .digest("hex")
    .toLowerCase();

  return { signature, debugString: stringToHash };
}
