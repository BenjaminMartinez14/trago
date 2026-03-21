export class CartValidationError extends Error {
  constructor(
    message: string,
    public readonly details: {
      unavailableItems?: { productId: string; name: string }[];
      priceChanges?: { productId: string; name: string; oldPrice: number; newPrice: number }[];
    }
  ) {
    super(message);
    this.name = "CartValidationError";
  }
}

export class PaymentError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = "PaymentError";
  }
}

export class OrderNotFoundError extends Error {
  constructor(orderId: string) {
    super(`Order not found: ${orderId}`);
    this.name = "OrderNotFoundError";
  }
}
