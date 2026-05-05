import { PaymentRecord } from '../types/payment';
import { Order } from '../types/order';

interface SerializationStrategy {
  serialize(data: any): any;
}

interface SerializerConfig {
  strategies?: Record<string, SerializationStrategy>;
}

export class PaymentSerializer {
  private strategies: Record<string, SerializationStrategy>;

  constructor(config?: SerializerConfig) {
    this.strategies = config?.strategies ?? {};
  }

  /**
   * Register a named serialization strategy.
   */
  registerStrategy(name: string, strategy: SerializationStrategy): void {
    this.strategies[name] = strategy;
  }

  /**
   * Determine which strategy key to use based on the order.
   */
  private getStrategyKey(order: Order): string {
    if (order.totalAmount >= 10000) {
      return 'high-value';
    }
    return 'default';
  }

  /**
   * Serialize a payment record for a given order.
   */
  serialize(order: Order, payment: PaymentRecord): any {
    const strategyKey = this.getStrategyKey(order);
    const strategy = this.strategies[strategyKey] ?? this.strategies['default'];

    // Defensive check: ensure strategy and its serialize method exist
    if (!strategy || typeof strategy.serialize !== 'function') {
      throw new Error(
        `PaymentSerializer: No valid serialization strategy found for key "${strategyKey}". ` +
        `Ensure a strategy is registered for this order type. orderId=${order.id} userId=${order.userId}`
      );
    }

    return strategy.serialize({
      orderId: order.id,
      userId: order.userId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      timestamp: payment.timestamp,
    });
  }
}
