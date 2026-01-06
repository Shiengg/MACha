import sepayClient from '../config/sepay.js';

export const initPayment = async (params) => {
    if (!sepayClient) {
        throw new Error('SePay is not configured. Please set SEPAY_MERCHANT_ID and SEPAY_SECRET_KEY in .env file');
    }

    const {
        orderInvoiceNumber,
        orderAmount,
        currency = 'VND',
        paymentMethod = 'BANK_TRANSFER',
        customerId,
        orderDescription,
        successUrl,
        errorUrl,
        cancelUrl,
        callbackUrl,
        customData,
    } = params;

    const checkoutUrl = sepayClient.checkout.initCheckoutUrl();

    const formFieldsData = {
        operation: 'PURCHASE',
        payment_method: paymentMethod,
        order_invoice_number: orderInvoiceNumber,
        order_amount: orderAmount.toString(),
        currency: currency,
        customer_id: customerId,
        order_description: orderDescription,
        success_url: successUrl,
        error_url: errorUrl,
        cancel_url: cancelUrl,
        custom_data: customData,
    };

    if (callbackUrl) {
        formFieldsData.return_url = callbackUrl;
    }

    const formFields = sepayClient.checkout.initOneTimePaymentFields(formFieldsData);

    return {
        checkoutUrl,
        formFields,
    }
}

