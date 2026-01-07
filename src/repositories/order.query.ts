
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
const escapeQuotes = (str: string) => str.replace(/'/g, "''");

export const BulkInsertDataInorderTable = async (fulfilledData: any) => {
  const waybills = fulfilledData.map((d: any) => `'${d[0]}'`).join(",");
  const orderIds = fulfilledData.map((d: any) => `'${d[5]}'`).join(",");
  const trackingDataCases = fulfilledData.map((d: any) => `WHEN fship_waybill = '${d[0]}' THEN '${d[1]}'`).join(" ");
  const deliveryDateCases = fulfilledData.map((d: any) => `WHEN fship_waybill = '${d[0]}' THEN '${d[2]}'`).join(" ");
  const deliveryServiceNameCases = fulfilledData.map((d: any) => `WHEN fship_waybill = '${d[0]}' THEN '${d[3]}'`).join(" ");
  const deliveryStatusCases = fulfilledData.map((d: any) => `WHEN fship_waybill = '${d[0]}' THEN '${escapeQuotes(d[4])}'`).join(" ");
  const orderStatusCases = fulfilledData.map((d: any) => `WHEN order_id = '${d[5]}' THEN '${escapeQuotes(d[4])}'`).join(" ");
 
  const sql = `
    UPDATE orders 
    SET 
        fship_tracking_data = CASE ${trackingDataCases} END,
        expected_delivery_date = CASE ${deliveryDateCases} END,
        delivery_service_name = CASE ${deliveryServiceNameCases} END,
        order_status = CASE ${deliveryStatusCases} END
    WHERE fship_waybill IN (${waybills});
`;
  const sql2 = `
UPDATE order_status_histories
SET status = CASE ${orderStatusCases} END
WHERE order_id IN (${orderIds});
`

  Promise.allSettled([
    pool.query(sql),
    pool.query(sql2)
  ])
};