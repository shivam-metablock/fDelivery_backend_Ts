
import pool from '../config/db.config.js';
import { RowDataPacket } from 'mysql2';

export const getOrder = async (orderId: string, warehouseId: string) => {
  console.log("warehouseId", warehouseId);

  const [row] = await pool.query<RowDataPacket[]>(`
    SELECT
    o.shipping_address_data,
    o.seller_id,
    o.billing_address_data,
    o.order_amount,
    o.height,
    o.width,
    o.length,
    o.weight,
    o.total_tax_amount,
    o.tax_model,
    o.payment_method,
    o.delivery_type,
    o.shipping_cost,
    ANY_VALUE(w.name) AS warehouse_name,
    ANY_VALUE(w.pincode) AS pincode,
    ANY_VALUE(w.city) AS city,
    ANY_VALUE(w.address_1) AS address_1,
    ANY_VALUE(w.warehouse_id) AS warehouse_id,
    ANY_VALUE(w.id) AS warehouseTable_id,
    JSON_ARRAYAGG(
     JSON_OBJECT(
      'product_id', JSON_UNQUOTE(JSON_EXTRACT(od.product_details, '$.id')),
      'name', JSON_UNQUOTE(JSON_EXTRACT(od.product_details, '$.name')),
      'unit_price', JSON_EXTRACT(od.product_details, '$.unit_price'),
      'discount', JSON_EXTRACT(od.product_details, '$.discount'),
      'categories',
        IFNULL(
          (
            SELECT JSON_ARRAYAGG(c.name)
              FROM JSON_TABLE(
                JSON_EXTRACT(od.product_details, '$.category_ids'),
                '$[*]' COLUMNS (category_id INT PATH '$')
              ) jt
                JOIN categories c ON c.id = jt.category_id
             ),
              JSON_ARRAY()
            ),
            'qty', 
            od.qty
        )
    ) AS products
    FROM orders o
      JOIN order_details od 
      ON o.id = od.order_id
      LEFT JOIN warehouses w  
      ON w.id = ?
    WHERE o.id = ?
    GROUP BY o.id;
 `, [warehouseId, orderId]);

  return row
}

export const getOrderStatus = async () => {
  const row = await pool.query<RowDataPacket[]>(`
    SELECT fship_waybill AS waybill
    FROM orders
    WHERE is_fship_order_ready_pickup = 1
    AND order_status <> 'Delivered'
    AND fship_waybill IS NOT NULL
    AND is_fship_order_placed = 1;`)
  return row
}
export const updateOrderStatus = async (orderId: string, status: string, waybill: string, label: string) => {
  const row = await pool.query<RowDataPacket[]>(`
        Update orders
        SET is_fship_order_ready_pickup= ?,
        fship_waybill = ?,
        fship_label_url = ?
        WHERE id = ?;
        `, [status, waybill, label, orderId])

  return row
}

export const updatePickupStatus = async (
  waybill: string | string[],
  status: string,
  isPickuped: boolean
) => {

  if (isPickuped) {
    const waybills = Array.isArray(waybill) ? waybill : [waybill];

    const [result] = await pool.query(
      `
  UPDATE orders
  SET is_fship_order_placed = ?
  WHERE fship_waybill IN (?);
  `,
      [status, waybills]
    );
    return result

  } else {
    const [result] = await pool.query(
      `
      UPDATE orders
      SET is_fship_order_placed = ?
      WHERE id = ?;
      `,
      [status, waybill]
    );
    console.log("result update with orderid");

    return result;
  }
};

export const AddDataINorder = async (trackingData: any, waybill: string, expectedDeliveryDate: string) => {
  const [result] = await pool.query(
    `
        UPDATE orders
        SET fship_tracking_data = ?,
        expected_delivery_date = ?
        WHERE fship_waybill = ?;
        `,
    [JSON.stringify(trackingData), expectedDeliveryDate, waybill]
  );

  return result;
}

export const BulkInsertDataInorderTable = async (fulfilledData: any[]) => {
  if (!fulfilledData.length) return;

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1️⃣ Create TEMP table (session-only)
  await conn.query(`
  CREATE TEMPORARY TABLE IF NOT EXISTS tmp_order_tracking (
    fship_waybill VARCHAR(50)
      CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci
      PRIMARY KEY,

    order_id VARCHAR(50)
      CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci,

    fship_tracking_data JSON,
    expected_delivery_date DATETIME,

    delivery_service_name VARCHAR(50)
      CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci,

    order_status VARCHAR(50)
      CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci
  )
`);

    // 2️⃣ Clean previous temp data (safe)
    await conn.query(`TRUNCATE TABLE tmp_order_tracking`);

    const normalizeStatus = (status: string | null): string | null => {
  if (!status) return null;

  const s = status.toLowerCase();

  if (/cancel/i.test(s)) return 'cancelled';       
  if (/deliver/i.test(s)) return 'delivered';      
  if (/reject/i.test(s)) return 'rejected';      

  return status;                                   
};
  const rows = fulfilledData
  .filter(d => d && d[0]) 
  .map(d => [
    d[0],                          
    d[5],                          
    d[1] ?? null,                  
    d[2]
      ? new Date(d[2]).toISOString().slice(0, 19).replace('T', ' ')
      : null,                      
    d[3] ?? null,                  
    normalizeStatus(d[4]) ?? null                   
  ]);

    await conn.query(
      `
      INSERT INTO tmp_order_tracking
      (fship_waybill, order_id, fship_tracking_data, expected_delivery_date, delivery_service_name, order_status)
      VALUES ?
      `,
      [rows]
    );

    await conn.query(`
  UPDATE orders o
  JOIN tmp_order_tracking t
    ON o.fship_waybill = t.fship_waybill
  SET
    o.fship_tracking_data = t.fship_tracking_data,
    o.expected_delivery_date = t.expected_delivery_date,
    o.delivery_service_name = t.delivery_service_name,
    o.order_status = CASE
      WHEN LOWER(t.order_status) IN ('cancelled', 'delivered')
        THEN t.order_status
      ELSE o.order_status
    END
`);

    // await conn.query(`
    //   UPDATE orders o
    //   JOIN tmp_order_tracking t
    //     ON o.fship_waybill = t.fship_waybill
    //   SET
    //     o.fship_tracking_data = t.fship_tracking_data,
    //     o.expected_delivery_date = t.expected_delivery_date,
    //     o.delivery_service_name = t.delivery_service_name
    //     ${['cancelled', 'delivered'].includes(t.order_status) &&', o.order_status = t.order_status'}
    // `);

    // await conn.query(`
    //   UPDATE order_status_histories h
    //   JOIN tmp_order_tracking t
    //     ON h.order_id = t.order_id
    //   SET h.status = t.order_status
    // `);

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release(); 
  }
};
