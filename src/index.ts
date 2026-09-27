import * as crypto from 'crypto';

// --- LEVEL 1 ---

// 2. Моделювання базових типів та інтерфейсів
export type EntityId = string | number;

export interface BaseProduct {
  readonly id: EntityId;
  title: string;
  price: number;
  description?: string;
  tags: string[];
  inStock: boolean;
}

// Variant 1: Електроніка та гаджети
export interface Product extends BaseProduct {
  warrantyMonths: number;
  powerWatts?: number;
  specs: [cpu: string, ramGb: number];
}

// 3. Базові функції обробки каталогу
export function createProduct(productData: Omit<Product, 'id'> & { id?: EntityId }): Product {
  if (productData.price < 0) {
    throw new Error('Price cannot be negative');
  }
  return {
    ...productData,
    id: productData.id ?? crypto.randomUUID(),
  };
}

export function calculateLineTotal(price: number, quantity: number, discountPercent: number = 0): number {
  if (price < 0 || quantity < 0) {
    throw new Error('Price and quantity cannot be negative');
  }
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error('Discount percent must be between 0 and 100');
  }
  const total = price * quantity;
  const discount = total * (discountPercent / 100);
  return total - discount;
}

// --- LEVEL 2 ---

// 1. Моделювання життєвого циклу замовлення
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type DeliveryMethod = 'courier' | 'post_locker' | 'store_pickup'; // Variant 1

export interface CartItem {
  product: Product;
  quantity: number;
}

export type TimestampMetadata = {
  readonly createdAt: Date;
  updatedAt: Date;
};

export type Order = {
  readonly orderId: string;
  customerEmail: string;
  items: CartItem[];
  status: OrderStatus;
  delivery: DeliveryMethod;
} & TimestampMetadata;

// 2. Операції зі зміною стану замовлення
export function updateOrderStatus(order: Order, newStatus: OrderStatus): Order {
  if (order.status === 'cancelled' || order.status === 'delivered') {
    throw new Error(`Cannot change status from ${order.status}`);
  }
  return {
    ...order,
    status: newStatus,
    updatedAt: new Date()
  };
}

// 3. Безпечна обробка невідомих зовнішніх даних (type narrowing)
export function validateCustomerInput(input: unknown): string {
  if (typeof input !== 'string') {
    throw new TypeError('Input must be a string');
  }
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Input cannot be empty');
  }
  if (!trimmed.includes('@')) {
    throw new Error('Invalid email format (missing @)');
  }
  return trimmed;
}

// --- LEVEL 3 ---

// 1. Моделювання способів оплати (Discriminated Unions)
export interface CreditCardPayment {
  type: 'card';
  cardNumber: string;
  cardHolder: string;
  cvv: string;
}

export interface CashOnDeliveryPayment {
  type: 'cash';
  cashAmountToPay: number;
}

export interface OnlineServicePayment {
  type: 'online_service';
  serviceName: 'ApplePay' | 'GooglePay';
  transactionRef: string;
}

export type PaymentDetails = CreditCardPayment | CashOnDeliveryPayment | OnlineServicePayment;

// 2. Реалізація Custom Type Guard
export function isCreditCardPayment(payment: PaymentDetails): payment is CreditCardPayment {
  return payment.type === 'card';
}

export function maskCardNumber(payment: PaymentDetails): string {
  if (isCreditCardPayment(payment)) {
    return `**** **** **** ${payment.cardNumber.slice(-4)}`;
  }
  return 'Не вимагає маскування';
}

// 3. Процесинг оплати з вичерпною перевіркою
export function processPayment(payment: PaymentDetails, amount: number): string {
  switch (payment.type) {
    case 'card':
      return `Успішно списано ${amount} грн з картки платника ${payment.cardHolder}.`;
    case 'cash':
      if (payment.cashAmountToPay > amount) {
        return `Підготувати решту: ${payment.cashAmountToPay - amount} грн.`;
      }
      return `До сплати кур'єру готівкою: ${amount} грн.`;
    case 'online_service':
      return `Успішна авторизація через ${payment.serviceName} (Ref: ${payment.transactionRef}).`;
    default: {
      const _exhaustiveCheck: never = payment;
      throw new Error(`Невідомий тип платежу: ${_exhaustiveCheck}`);
    }
  }
}

// --- 4. Демонстрація роботи системи ---
function main() {
  console.log('=== СИСТЕМА ОБРОБКИ ЗАМОВЛЕНЬ (E-COMMERCE CORE) ===\n');

  console.log('[Каталог товарів]');
  const laptop = createProduct({
    id: 1,
    title: 'Ноутбук Pro 16',
    price: 45000,
    tags: ['laptop', 'pro'],
    inStock: true,
    warrantyMonths: 24,
    specs: ['M3 Max', 36]
  });
  console.log(`- Створено товар #${laptop.id}: [${laptop.title}] - ${laptop.price} грн (В наявності: ${laptop.inStock ? 'так' : 'ні'})`);
  console.log(`  Специфікації: CPU: ${laptop.specs[0]}, RAM: ${laptop.specs[1]}GB, Гарантія: ${laptop.warrantyMonths} міс.`);

  const mouse = createProduct({
    id: 2,
    title: 'Бездротова миша',
    price: 1200,
    tags: ['accessories', 'wireless'],
    inStock: true,
    warrantyMonths: 12,
    specs: ['Optical', 0]
  });
  console.log(`- Створено товар #${mouse.id}: [${mouse.title}] - ${mouse.price} грн (В наявності: ${mouse.inStock ? 'так' : 'ні'})\n`);

  console.log('[Формування кошика]');
  const cart: CartItem[] = [
    { product: laptop, quantity: 1 },
    { product: mouse, quantity: 2 }
  ];
  
  let totalOrderAmount = 0;
  cart.forEach((item, index) => {
    const lineTotal = calculateLineTotal(item.product.price, item.quantity);
    totalOrderAmount += lineTotal;
    console.log(`${index + 1}. ${item.product.title} x ${item.quantity} = ${lineTotal} грн`);
  });
  console.log(`Загальна вартість замовлення: ${totalOrderAmount} грн\n`);

  console.log('[Створення замовлення]');
  let order: Order = {
    orderId: 'ord-98214-abc',
    customerEmail: validateCustomerInput('customer@example.com'),
    items: cart,
    status: 'pending',
    delivery: 'courier',
    createdAt: new Date('2026-09-09T18:30:00.000Z'),
    updatedAt: new Date('2026-09-09T18:30:00.000Z')
  };
  
  console.log(`Замовлення ID: ${order.orderId}`);
  console.log(`Клієнт: ${order.customerEmail}`);
  console.log(`Доставка: ${order.delivery}`);
  console.log(`Початковий статус: ${order.status}`);
  console.log(`Час створення: ${order.createdAt.toISOString()}\n`);

  console.log('[Зміна життєвого циклу]');
  order = updateOrderStatus(order, 'processing');
  console.log(`Оновлення статусу: pending -> processing (Оновлено: ${order.updatedAt.toISOString()})`);
  order = updateOrderStatus(order, 'shipped');
  console.log(`Оновлення статусу: processing -> shipped (Оновлено: ${order.updatedAt.toISOString()})\n`);

  console.log('[Процесинг платежу]');
  const payment: PaymentDetails = {
    type: 'card',
    cardNumber: '1111222233338821',
    cardHolder: 'John Doe',
    cvv: '123'
  };

  console.log(`Метод оплати: ${payment.type}`);
  console.log(`Маскування: ${maskCardNumber(payment)}`);
  console.log(`Результат: ${processPayment(payment, totalOrderAmount)}`);
}

// Виклик основної функції
main();
