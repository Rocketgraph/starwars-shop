import { Order, PaymentDetails } from '../types';

interface SerializerOptions {
  currencySerializer?: { serialize: (amount: number, currency: string) => any };
  fraudSerializer?: { serialize: (details: any) => any };
}

export class PaymentSerializer {
  private currencySerializer: { serialize: (amount: number, currency: string) => any } | null;
  private fraudSerializer: { serialize: (details: any) => any } | null;

  constructor(options?: SerializerOptions) {
    this.currencySerializer = options?.currencySerializer ?? null;
    this.fraudSerializer = options?.fraudSerializer ?? null;
  }

  serialize(order: Order): Record<string, any> {
    if (!order || !order.payment) {
      throw new Error(`Invalid order or missing payment details for order ${order?.id}`);
    }

    const payment: PaymentDetails = order.payment;

    const result: Record<string, any> = {
      orderId: order.id,
      userId: order.userId,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      createdAt: payment.createdAt,
    };

    // High-value order additional serialization
    if (payment.amount > 10000) {
      // Guard against missing sub-serializers for high-value orders
      if (this.currencySerializer) {
        result.currencyDetails = this.currencySerializer.serialize(payment.amount, payment.currency);
      } else {
        result.currencyDetails = {
          amount: payment.amount,
          currency: payment.currency,
        };
      }

      if (this.fraudSerializer) {
        result.fraudCheck = this.fraudSerializer.serialize({
          userId: order.userId,
          amount: payment.amount,
          method: payment.method,
        });
      } else {
        // Log warning: fraud serializer not available for high-value order
        console.warn(`[PaymentSerializer] fraudSerializer not configured for high-value order ${order.id}, userId=${order.userId}, amount=${payment.amount}`);
        result.fraudCheck = {
          status: 'unchecked',
          reason: 'fraud_serializer_unavailable',
          userId: order.userId,
          amount: payment.amount,
        };
      }
    }

    return result;
  }
}
