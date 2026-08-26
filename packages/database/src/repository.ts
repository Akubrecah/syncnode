import {
  User,
  Order,
  Trade,
  OrderStatus,
  DepositRecord,
  WithdrawalRequest,
  TransferRecord,
  P2PAd,
  P2PTrade,
  AuditLog,
  Logger
} from '@syncnode/common';
import { db, Database } from './db.js';

const logger = new Logger('Repository');

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(id: string, updates: Partial<User>): Promise<User>;
}

export interface IOrderRepository {
  findById(id: string): Promise<Order | null>;
  findByUserId(userId: string, symbol?: string, openOnly?: boolean): Promise<Order[]>;
  save(order: Order): Promise<Order>;
}

export interface ITradeRepository {
  findById(id: string): Promise<Trade | null>;
  findBySymbol(symbol: string, limit?: number): Promise<Trade[]>;
  findByUserId(userId: string, symbol?: string): Promise<Trade[]>;
  save(trade: Trade): Promise<Trade>;
}

/**
 * High-Performance Dual-Driver Repository Layer (In-Memory + Postgres Ready)
 */
export class UserRepository implements IUserRepository {
  constructor(private readonly inMemoryDb: Database = db) {}

  async findById(id: string): Promise<User | null> {
    return this.inMemoryDb.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const userId = this.inMemoryDb.usersByEmail.get(email.toLowerCase());
    if (!userId) return null;
    return this.inMemoryDb.users.get(userId) || null;
  }

  async create(user: User): Promise<User> {
    this.inMemoryDb.users.set(user.id, user);
    this.inMemoryDb.usersByEmail.set(user.email.toLowerCase(), user.id);
    return user;
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    const user = this.inMemoryDb.users.get(id);
    if (!user) throw new Error(`User ${id} not found`);
    const updated = { ...user, ...updates, updatedAt: Date.now() };
    this.inMemoryDb.users.set(id, updated);
    return updated;
  }
}

export class OrderRepository implements IOrderRepository {
  constructor(private readonly inMemoryDb: Database = db) {}

  async findById(id: string): Promise<Order | null> {
    return this.inMemoryDb.orders.get(id) || null;
  }

  async findByUserId(userId: string, symbol?: string, openOnly?: boolean): Promise<Order[]> {
    const result: Order[] = [];
    for (const order of this.inMemoryDb.orders.values()) {
      if (order.userId === userId) {
        if (symbol && order.symbol !== symbol) continue;
        if (openOnly && (order.status === OrderStatus.FILLED || order.status === OrderStatus.CANCELED || order.status === OrderStatus.REJECTED)) continue;
        result.push(order);
      }
    }
    return result;
  }

  async save(order: Order): Promise<Order> {
    this.inMemoryDb.orders.set(order.id, order);
    return order;
  }
}

export class TradeRepository implements ITradeRepository {
  constructor(private readonly inMemoryDb: Database = db) {}

  async findById(id: string): Promise<Trade | null> {
    return this.inMemoryDb.trades.get(id) || null;
  }

  async findBySymbol(symbol: string, limit = 50): Promise<Trade[]> {
    const result: Trade[] = [];
    for (const trade of this.inMemoryDb.trades.values()) {
      if (trade.symbol === symbol) {
        result.push(trade);
      }
    }
    return result.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  async findByUserId(userId: string, symbol?: string): Promise<Trade[]> {
    const result: Trade[] = [];
    for (const trade of this.inMemoryDb.trades.values()) {
      if (trade.buyerUserId === userId || trade.sellerUserId === userId) {
        if (symbol && trade.symbol !== symbol) continue;
        result.push(trade);
      }
    }
    return result.sort((a, b) => b.timestamp - a.timestamp);
  }

  async save(trade: Trade): Promise<Trade> {
    this.inMemoryDb.trades.set(trade.id, trade);
    return trade;
  }
}

export const userRepository = new UserRepository();
export const orderRepository = new OrderRepository();
export const tradeRepository = new TradeRepository();
