
import pool from '../config/db.config.js';
import { RowDataPacket } from 'mysql2';

export const getOrder = async (orderId: string, warehouseId: string) => {
    console.log("warehouseId",warehouseId);
    
    const [row] = await pool.query<RowDataPacket[]>(`
    SELECT
    o.shipping_address_data,
    o.seller_id,
    o.billing_address_data,
    o.order_amount,
    o.total_tax_amount,
    o.tax_model,
    o.payment_method,
    o.delivery_type,
    o.shipping_cost,

    ANY_VALUE(w.name)        AS warehouse_name,
    ANY_VALUE(w.pincode)     AS pincode,
    ANY_VALUE(w.city)        AS city,
    ANY_VALUE(w.address_1)   AS address_1,
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
            'qty', od.qty
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

export const getOrderStatus=async()=>{
    const row=await pool.query<RowDataPacket[]>(`
        Select waybill
        FROM orders
        WHERE is_order_shipped = 0;
        `)
    return row
}