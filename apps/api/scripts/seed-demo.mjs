import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
const email = 'test@gmail.com';
const url = new URL(process.env.DATABASE_URL ?? '');
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
  throw new Error('Demo seed only supports the local database.');
}
const sql = postgres(url.toString(), { max: 1, connect_timeout: 5 });
const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(new Date());
const [year, month, day] = today.split('-').map(Number);
const money = (cents) => (cents / 100).toFixed(2);
// Stable, namespaced UUIDs make reruns additive without changing existing rows.
const id = (key) => {
  const hex = createHash('sha256').update(`finex-demo-v1:${email}:${key}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};
const accountId = (key) => id(`account:${key}`);
const categoryId = (key) => key ? id(`category:${key}`) : null;

try {
  const result = await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext('finex-demo-v1:test@gmail.com'))`;
    const [user] = await tx`select id from users where email = ${email} for update`;
    if (!user) throw new Error('Register test@gmail.com first; the seed preserves existing credentials.');
    const userId = user.id;
    const seed = async (table, key, values) => {
      const rowId = id(`${table}:${key}`);
      const [existing] = await tx`select user_id from ${tx(table)} where id = ${rowId}`;
      if (existing && existing.user_id !== userId) throw new Error(`Unexpected owner in ${table}`);
      await tx`insert into ${tx(table)} ${tx({ id: rowId, user_id: userId, ...values })} on conflict (id) do nothing`;
      return rowId;
    };
    for (const [key, name, emoji, color, rate] of [
      ['daily', 'Mock · Cuenta principal', '🏦', '#2563eb', null],
      ['savings', 'Mock · Cuenta remunerada', '🌱', '#16a34a', '2.50'],
      ['cash', 'Mock · Efectivo', '💵', '#f59e0b', null],
      ['card', 'Mock · Tarjeta de crédito', '💳', '#ef4444', null],
      ['empty', 'Mock · Cuenta sin movimientos', '🆕', '#8b5cf6', null],
    ]) {
      // Account keys deliberately match accountId().
      const [existing] = await tx`select user_id from accounts where id = ${accountId(key)}`;
      if (existing && existing.user_id !== userId) throw new Error('Unexpected account owner');
      await tx`insert into accounts ${tx({id: accountId(key), user_id: userId, name, emoji, color,
        annual_interest_rate: rate, interest_payment_rate: rate})} on conflict (id) do nothing`;
    }
    for (const [key, name, kind, emoji, color] of [
      ['salary', 'Nómina', 'income', '💼', '#16a34a'],
      ['freelance', 'Proyectos freelance', 'income', '💻', '#059669'],
      ['interest', 'Intereses', 'income', '🌱', '#65a30d'],
      ['home', 'Vivienda', 'expense', '🏠', '#6366f1'],
      ['groceries', 'Supermercado', 'expense', '🛒', '#f59e0b'],
      ['dining', 'Restaurantes', 'expense', '🍽️', '#f97316'],
      ['transport', 'Transporte', 'expense', '🚇', '#0ea5e9'],
      ['utilities', 'Suministros', 'expense', '💡', '#eab308'],
      ['leisure', 'Ocio', 'expense', '🎬', '#ec4899'],
      ['health', 'Salud', 'expense', '🩺', '#14b8a6'],
      ['travel', 'Viajes', 'expense', '✈️', '#8b5cf6'],
    ]) {
      const [existing] = await tx`select user_id from categories where id = ${categoryId(key)}`;
      if (existing && existing.user_id !== userId) throw new Error('Unexpected category owner');
      await tx`insert into categories ${tx({id:categoryId(key), user_id:userId,
        name:`Mock · ${name}`, kind, emoji, color})} on conflict (id) do nothing`;
    }
    const transactionIds = [];
    const movement = async (key, date, type, description, cents, legs, category = null, from = null, active = null) => {
      if (legs.reduce((total, leg) => total + leg[1], 0) !== cents) throw new Error(`Unbalanced split: ${key}`);
      const transactionId = await seed('transactions', key, {
        type, description:`Mock · ${description}`, amount:money(cents), category_id:categoryId(category),
        from:from ? accountId(from) : null, cycle:type.startsWith('Fixed_') ? date : null,
        is_active:active, created_at:date, updated_at:date,
      });
      transactionIds.push(transactionId);
      for (const [index, [account, amount, state = 'Completed']] of legs.entries()) {
        await tx`insert into transactions_splits ${tx({id:id(`split:${key}:${index}`), transaction_id:transactionId,
          account_id:accountId(account), amount:money(amount), state})} on conflict (id) do nothing`;
      }
    };
    for (let offset = -11; offset <= 0; offset++) {
      const period = new Date(Date.UTC(year, month - 1 + offset, 1));
      const prefix = period.toISOString().slice(0, 7);
      const date = (d) => `${prefix}-${String(d).padStart(2, '0')}T08:00:00.000Z`;
      const add = (key, d, type, description, amount, account, category, state = 'Completed', active = null) => {
        if (offset === 0 && d > day && state === 'Completed') return;
        return movement(`${prefix}:${key}`, date(d), type, description, amount,
          [[account, amount, state]], category, null, active);
      };
      if (offset === -11) {
        await add('opening-daily', 1, 'Variable_income', 'Saldo inicial principal', 240000, 'daily', null);
        await add('opening-savings', 1, 'Variable_income', 'Ahorros iniciales', 750000, 'savings', null);
        await add('opening-cash', 1, 'Variable_income', 'Efectivo inicial', 15000, 'cash', null);
      }
      await add('salary', 1, 'Fixed_income', 'Nómina mensual', 285000, 'daily', 'salary', 'Completed', true);
      await add('rent', 2, 'Fixed_expense', 'Alquiler', 85000, 'daily', 'home', 'Completed', true);
      await add('internet', 3, 'Fixed_expense', 'Internet y móvil', 4990, 'daily', 'utilities', 'Completed', true);
      await add('transport', 4, 'Fixed_expense', 'Abono transporte', 5460, 'daily', 'transport', 'Completed', true);
      for (const d of [5, 10, 15, 20, 25]) {
        await add(`groceries-${d}`, d, 'Variable_expense', `Compra supermercado ${d}`, 5500 + d * 97 + (offset + 11) * 31, 'daily', 'groceries');
      }
      await add('restaurant', 7, 'Variable_expense', 'Cena con amigos', 6850, 'card', 'dining');
      await add('electricity', 8, 'Fixed_expense', 'Factura de electricidad', 7245 + (offset + 11) * 90, 'daily', 'utilities', 'Completed', true);
      await add('cinema', 9, 'Variable_expense', 'Cine y palomitas', 2400, 'card', 'leisure');
      await add('freelance', 12, 'Variable_income', 'Proyecto de diseño', 45000 + (offset + 11) * 2500, 'daily', 'freelance');
      await add('pharmacy', 13, 'Variable_expense', 'Farmacia', 1875, 'cash', 'health');
      await add('subscription', 14, 'Fixed_expense', 'Suscripción streaming', 1599, 'card', 'leisure', 'Completed', true);
      await add('restaurant-2', 16, 'Variable_expense', 'Comida de fin de semana', 9450, 'card', 'dining');
      await add('interest', 18, 'Variable_income', 'Intereses cuenta remunerada', 1250 + (offset + 11) * 60, 'savings', 'interest');
      await add('uncategorized', 19, 'Variable_expense', 'Compra por categorizar', 3299, 'daily', null);
      await add('inactive', 21, 'Fixed_expense', 'Antiguo gimnasio (inactivo)', 2990, 'daily', 'health', 'Completed', false);
      await movement(`${prefix}:transfer-savings`, date(6), 'Transfer', 'Aportación mensual a ahorros', 35000,
        [['savings', 35000]], null, 'daily');
      await movement(`${prefix}:cash-withdrawal`, date(11), 'Transfer', 'Retirada de efectivo', 10000,
        [['cash', 10000]], null, 'daily');
      if (offset === 0) {
        await movement(`${prefix}:split-expense`, date(Math.min(day, 20)), 'Variable_expense', 'Compra compartida entre cuentas', 12000,
          [['daily', 8000], ['cash', 4000]], 'groceries');
        await movement(`${prefix}:mixed`, date(Math.min(day, 21)), 'Variable_income', 'Factura freelance cobrada parcialmente', 90000,
          [['daily', 60000], ['daily', 30000, 'Pending']], 'freelance');
        await add('pending-dinner', Math.min(day, 22), 'Variable_expense', 'Restaurante pendiente de cargo', 5800, 'card', 'dining', 'Pending');
        await add('pending-bill', 27, 'Fixed_expense', 'Agua pendiente', 3850, 'daily', 'utilities', 'Pending', true);
        await add('pending-income', 28, 'Variable_income', 'Proyecto pendiente de cobro', 32000, 'daily', 'freelance', 'Pending');
        await movement(`${prefix}:pending-transfer`, date(Math.min(day, 22)), 'Transfer', 'Traspaso pendiente', 15000,
          [['savings', 15000, 'Pending']], null, 'daily');
      }
    }
    for (const [key, name, limit, category, type] of [
      ['groceries', 'Supermercado', 35000, 'groceries', null],
      ['dining', 'Restaurantes (superado)', 12000, 'dining', null],
      ['leisure', 'Ocio', 10000, 'leisure', null],
      ['home', 'Vivienda', 100000, 'home', 'Fixed_expense'],
      ['travel', 'Viajes (sin gasto)', 25000, 'travel', null],
      ['all', 'Gasto mensual total', 180000, null, null],
    ]) await seed('budgets', key, {name:`Mock · ${name}`, monthly_limit:money(limit), category_id:categoryId(category), about_type:type});
    for (const [key, name, current, target, account] of [
      ['emergency', 'Fondo de emergencia', 600000, 1000000, 'savings'],
      ['holiday', 'Vacaciones', 180000, 250000, 'savings'],
      ['laptop', 'Portátil (completado)', 150000, 150000, 'savings'],
      ['new', 'Nuevo objetivo', 0, 500000, 'daily'],
      ['extra', 'Objetivo superado', 120000, 100000, 'savings'],
    ]) await seed('savings', key, {name:`Mock · ${name}`, current_amount:money(current), target_amount:money(target), account_id:accountId(account)});
    for (const [key, name, capital, interests, quota] of [
      ['loan', 'Préstamo personal', '3200.00', '160.00', '140.00'],
      ['installment', 'Compra a plazos', null, null, '45.00'],
    ]) await seed('debts', key, {name:`Mock · ${name}`, account_id:accountId('daily'), capital, interests, quota,
      time_limit:`${year + 2}-06-30T10:00:00.000Z`});
    const invalid = await tx`
      select t.id from transactions t left join transactions_splits s on s.transaction_id=t.id
      left join accounts a on a.id=s.account_id left join categories c on c.id=t.category_id
      where t.id in ${tx(transactionIds)} group by t.id
      having sum(abs(s.amount)) <> abs(t.amount) or count(s.id)=0
        or bool_or(a.user_id <> t.user_id)
        or bool_or(c.user_id <> t.user_id)
        or bool_or((c.kind='income') <> (t.type in ('Fixed_income','Variable_income')))
    `;
    if (invalid.length) throw new Error('Seed validation failed; rolling back.');
    const counts = {};
    for (const table of ['accounts', 'categories', 'transactions', 'budgets', 'savings', 'debts']) {
      const [row] = await tx`select count(*)::integer as count from ${tx(table)} where user_id=${userId}`;
      counts[table] = row.count;
    }
    return {email, date:today, counts, validatedMockTransactions:transactionIds.length};
  });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await sql.end();
}
