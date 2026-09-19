import crypto from "crypto";
import { OrderRepository } from "../repositories/order.repository.js";
import { OrderWithItems, PaginatedOrders, ListOrderFilter } from "../types/order.types.js";
import { CreateOrderInput } from "../schemas/order.schema.js";
import { withTransaction } from "../../../db.js";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from "../../../shared/errors/app.error.js";
import { logger } from "../../../shared/logger/logger.js";

export class OrderService {
  constructor(private readonly orderRepository: OrderRepository) {}

  /**
   * Place an order atomically:
   * 1. Calculates total amount
   * 2. Inserts order and line items
   */
  async createOrder(
    customerId: string,
    input: CreateOrderInput,
    providedCorrelationId?: string,
  ): Promise<OrderWithItems> {
    const correlationId = input.correlationId || providedCorrelationId || crypto.randomUUID();

    const totalAmountCents = input.items.reduce((sum, item) => {
      return sum + item.quantity * item.unitPriceCents;
    }, 0);

    return withTransaction(async (client) => {
      const order = await this.orderRepository.create(
        {
          customerId,
          totalAmountCents,
          currency: input.currency || "USD",
          correlationId,
          items: input.items,
        },
        client,
      );

      logger.info(`Order placed: ${order.id} for customer ${customerId}`, {
        orderId: order.id,
        customerId,
        totalAmountCents,
        correlationId,
      });

      return order;
    });
  }

  /**
   * Fetch an order by ID, enforcing customer ownership unless admin
   */
  async getOrder(id: string, customerId: string, isAdmin = false): Promise<OrderWithItems> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new NotFoundError("Order", id);
    }

    if (!isAdmin && order.customerId !== customerId) {
      throw new ForbiddenError("You do not have access to this order.");
    }

    return order;
  }

  /**
   * List orders with optional filters and pagination
   */
  async listOrders(
    filter: ListOrderFilter,
    customerId: string,
    isAdmin = false,
  ): Promise<PaginatedOrders> {
    const effectiveFilter: ListOrderFilter = { ...filter };
    if (!isAdmin) {
      effectiveFilter.customerId = customerId;
    }

    return this.orderRepository.list(effectiveFilter);
  }

  /**
   * Cancel an order
   */
  async cancelOrder(
    id: string,
    customerId: string,
    reason?: string,
    isAdmin = false,
  ): Promise<OrderWithItems> {
    return withTransaction(async (client) => {
      const order = await this.orderRepository.findById(id, true, client);
      if (!order) {
        throw new NotFoundError("Order", id);
      }

      if (!isAdmin && order.customerId !== customerId) {
        throw new ForbiddenError("You do not have permission to cancel this order.");
      }

      if (order.status === "CANCELLED") {
        return order;
      }

      if (order.status === "COMPLETED") {
        throw new BadRequestError("Cannot cancel an order that has already been completed.");
      }

      const cancellationReason = reason || "Order cancelled by user";

      await this.orderRepository.updateStatus(id, "CANCELLED", cancellationReason, client);

      logger.info(`Order cancelled: ${order.id}`, {
        orderId: order.id,
        reason: cancellationReason,
      });

      return {
        ...order,
        status: "CANCELLED",
        cancellationReason,
        updatedAt: new Date(),
      };
    });
  }
}
