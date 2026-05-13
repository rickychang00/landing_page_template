"use server";

import { headers } from "next/headers";
import { RDP_PAYMENT_URL, RDP_ENQUIRY_URL, MID, SECRET_KEY, calculateRDPSignature } from "@/lib/rdp-utils";

/**
 * @fileOverview Server Actions for Red Dot Payment (RDP) Integration.
 */

export async function requestRDPPaymentURL(formData: {
  payerName: string;
  payerEmail: string;
  orderId: string;
  amount: number;
  recurringMod?: string;
}) {
  try {
    const headersList = await headers();
    const host = headersList.get("x-forwarded-host") || headersList.get("host") || "";
    // const fixedHost = host.replace(/:\d+$/, ":9002").replace("6000-", "9002-").replace("9000-", "9002-");
    const protocol = headersList.get("x-forwarded-proto") || "http";
    // const baseUrl = process.env.NGROK_URL || `${protocol}://${fixedHost}/`;
    const baseUrl = `${protocol}://${host}`.replace(/\/$/, '');

    // Standardized Payload for HOP (Redirection)
    const payload: Record<string, any> = {
      mid: MID,
      api_mode: "redirection_hosted",
      payment_type: "S",
      back_url: `${baseUrl}/`,
      redirect_url: `${baseUrl}/`,
      notify_url: `${baseUrl}/api/payment/notify`,
      merchant_reference: "Initial_CIT_Registration",
      order_id: formData.orderId,
      ccy: "SGD",
      amount: formData.amount,
      payer_name: formData.payerName,
      payer_email: formData.payerEmail,
    };

    if (formData.recurringMod) {
      payload.recurring_mod = formData.recurringMod;
    }

    // Calculate signature using the HOP sequence: mid + order_id + payment_type + amount + ccy
    const { signature, debugString } = calculateRDPSignature(payload, SECRET_KEY, 'CIT');
    payload.signature = signature;

    const response = await fetch(RDP_PAYMENT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`Gateway HTTP ${response.status}`);

    const result = await response.json();

    return {
      success: String(result.response_code) === "0",
      paymentUrl: result.payment_url,
      error: result.response_msg,
      debug: {
        payload,
        debugString,
        response: result
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Connection failed" };
  }
}

export async function requestRDPMITPayment(formData: {
  payerName: string;
  payerEmail: string;
  orderId: string;
  amount: number;
  parentTransactionId: string;
  payerId: string;
}) {
  try {
    const headersList = await headers();
    const host = headersList.get("x-forwarded-host") || headersList.get("host") || "";
    const fixedHost = host.replace(/:\d+$/, ":9002").replace("6000-", "9002-").replace("9000-", "9002-");
    const protocol = headersList.get("x-forwarded-proto") || "http";
    const baseUrl =
      (process.env.NGROK_URL ?? `${protocol}://${fixedHost}`).replace(/\/$/, '') + '/';

    // Standardized Payload for MIT (Direct with Token)
    const payload: Record<string, any> = {
      mid: MID,
      api_mode: "direct_n3d",
      payment_type: "S",
      back_url: baseUrl,
      redirect_url: baseUrl,
      notify_url: `${baseUrl}api/payment/notify`,
      merchant_reference: "Merchant_Initiated_Payment",
      order_id: formData.orderId || `MIT_${Date.now()}`,
      ccy: "SGD",
      amount: formData.amount,
      recurring_mod: "3",
      parent_transaction_id: formData.parentTransactionId,
      payer_id: formData.payerId,
      payer_name: formData.payerName,
      payer_email: formData.payerEmail,
    };

    // Calculate signature using the Token sequence: mid + order_id + payment_type + amount + ccy + payer_id
    const { signature, debugString } = calculateRDPSignature(payload, SECRET_KEY, 'MIT');
    payload.signature = signature;

    const response = await fetch(RDP_PAYMENT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`Gateway HTTP ${response.status}`);

    const result = await response.json();

    return {
      success: String(result.response_code) === "0",
      data: result,
      error: String(result.response_code) !== "0" ? (result.response_msg || "MIT processing failed.") : null,
      debug: {
        payload,
        debugString,
        response: result
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message || "MIT connection failed." };
  }
}

export async function enquireRDPTransaction(transactionId: string) {
  try {
    const payload: Record<string, any> = {
      request_mid: MID,
      transaction_id: transactionId
    };

    // Enquiry/Notify usually uses alphabetical sort
    const { signature } = calculateRDPSignature(payload, SECRET_KEY, 'NOTIFY');
    payload.signature = signature;

    const response = await fetch(RDP_ENQUIRY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Enquiry Gateway Error ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Enquiry failed" };
  }
}
