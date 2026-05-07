import { Order, PaymentDetails } from '../types';

interface SerializerMap {
  [key: string]: { serialize: (details: PaymentDetails) => any };
}

export class PaymentSerializer {
  private serializers: SerializerMap;
  private allowedPaymentTypes: Set<string> | null;

  constructor(serializers: SerializerMap = {}, allowedPaymentTypes?: string[]) {
    this.serializers = serializers;
    this.allowedPaymentTypes = allowedPaymentTypes ? new Set(allowedPaymentTypes) : null;
  }

  serialize(order: Order): any {
    if (!order || !order.payment) {
      throw new Error(`Invalid order or missing payment details for order ${order?.id}`);
    }

    const paymentType = order.payment.type;

    if (!paymentType) {
      throw new Error(`Missing payment type for order ${order.id}`);
    }

    // If an allow-list is configured, reject unknown payment types
    if (this.allowedPaymentTypes && !this.allowedPaymentTypes.has(paymentType)) {
      throw new Error(
        `Unrecognized payment type "${paymentType}" for order ${order.id} (userId=${order.userId})`
      );
    }

    const result: any = {
      orderId: order.id,
      userId: order.userId,
      amount: order.payment.amount,
      currency: order.payment.currency || 'USD',
      type: paymentType,
    };

    // Safely look up the nested serializer for this payment type
    const nestedSerializer = this.serializers[paymentType];

    if (nestedSerializer && typeof nestedSerializer.serialize === 'function') {
      result.details = nestedSerializer.serialize(order.payment);
    } else {
      // For missing serializer types, log a warning and include
      // a safe fallback instead of crashing.
      console.warn(
        `No serializer registered for payment type "${paymentType}" on order ${order.id} (userId=${order.userId}). Falling back to empty details.`
      );
      result.details = {};
    }

    return result;
  }
}
