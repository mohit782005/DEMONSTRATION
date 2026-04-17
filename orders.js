// ─── orders.js ───────────────────────────────────────────────
// Order processing: pricing, discounts, loyalty, and checkout.

const { generateId, formatCurrency } = require("./helpers");
const { getUserById } = require("./auth");

// In-memory orders store
const orders = [];

// Product catalog
const products = {
  p1: { id: "p1", name: "Wireless Mouse",    price: 599,  stock: 50 },
  p2: { id: "p2", name: "Mechanical Keyboard", price: 2499, stock: 30 },
  p3: { id: "p3", name: "USB-C Hub",         price: 1299, stock: 20 },
  p4: { id: "p4", name: "Monitor Stand",     price: 899,  stock: 15 },
  p5: { id: "p5", name: "Webcam HD",         price: 1799, stock: 25 },
};

/**
 * 8. checkStock — verifies product availability
 *    Called by: createOrder
 */
function checkStock(productId, qty) {
  const product = products[productId];
  if (!product) throw new Error(`Product ${productId} not found`);
  if (product.stock < qty) {
    throw new Error(`Insufficient stock for ${product.name}: need ${qty}, have ${product.stock}`);
  }
  return product;
}

/**
 * 9. calculateTotal — computes order subtotal from line items
 *    Calls: formatCurrency (for logging)
 *    Called by: createOrder
 */
function calculateTotal(items) {
  let total = 0;
  for (const item of items) {
    total += item.price * item.qty;
  }
  console.log(`[Orders] Subtotal: ${formatCurrency(total)}`);
  return total;
}

/**
 * 10. applyDiscount — applies percentage discount with a cap
 *     Calls: formatCurrency (for logging)
 *     Called by: createOrder
 */
function applyDiscount(subtotal, discountPercent, maxDiscount = 500) {
  if (discountPercent <= 0) return 0;
  const raw = subtotal * (discountPercent / 100);
  const discount = Math.min(raw, maxDiscount);
  console.log(`[Orders] Discount applied: ${formatCurrency(discount)}`);
  return discount;
}

/**
 * 11. calculateTax — computes 18% GST on the discounted total
 *     Called by: createOrder
 */
function calculateTax(amountAfterDiscount) {
  const tax = amountAfterDiscount * 0.18;
  console.log(`[Orders] Tax (18% GST): ${formatCurrency(tax)}`);
  return Math.round(tax * 100) / 100;
}

/**
 * 12. addLoyaltyPoints — awards points to the customer
 *     Calls: getUserById
 *     Called by: createOrder
 */
function addLoyaltyPoints(userId, orderTotal) {
  const user = getUserById(userId);
  const points = Math.floor(orderTotal / 100); // 1 point per ₹100
  user.loyaltyPoints += points;
  console.log(`[Orders] Added ${points} loyalty points to ${user.name} (total: ${user.loyaltyPoints})`);
  return points;
}

/**
 * 13. createOrder — full checkout pipeline
 *     Calls: checkStock, calculateTotal, applyDiscount, calculateTax, addLoyaltyPoints, generateId
 *     Called by: app.js → POST /orders
 */
function createOrder(userId, cart, discountPercent = 0) {
  // Validate user
  const user = getUserById(userId);

  // Validate & resolve items
  const resolvedItems = cart.map((item) => {
    const product = checkStock(item.productId, item.qty);
    product.stock -= item.qty; // reserve stock
    return { ...product, qty: item.qty };
  });

  // Price calculation pipeline
  const subtotal  = calculateTotal(resolvedItems);
  const discount  = applyDiscount(subtotal, discountPercent);
  const taxable   = subtotal - discount;
  const tax       = calculateTax(taxable);
  const total     = Math.round((taxable + tax) * 100) / 100;

  // Loyalty
  const pointsEarned = addLoyaltyPoints(userId, total);

  const order = {
    id: generateId("ord"),
    userId,
    items: resolvedItems.map((i) => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
    subtotal,
    discount,
    tax,
    total,
    pointsEarned,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  return order;
}

/**
 * 14. getOrdersByUser — retrieves all orders for a user
 *     Called by: app.js → GET /orders/:userId
 */
function getOrdersByUser(userId) {
  return orders.filter((o) => o.userId === userId);
}

/**
 * 15. getOrderSummary — generates a summary report of all orders
 *     Calls: formatCurrency
 *     Called by: app.js → GET /summary
 */
function getOrderSummary() {
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.length;
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  return {
    totalOrders,
    totalRevenue: formatCurrency(totalRevenue),
    averageOrderValue: formatCurrency(avgOrder),
    topProducts: _getTopProducts(),
  };
}

function _getTopProducts() {
  const counts = {};
  for (const order of orders) {
    for (const item of order.items) {
      counts[item.name] = (counts[item.name] || 0) + item.qty;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, qty]) => ({ name, unitsSold: qty }));
}

module.exports = {
  checkStock, calculateTotal, applyDiscount, calculateTax,
  addLoyaltyPoints, createOrder, getOrdersByUser, getOrderSummary,
  _products: products,
};
