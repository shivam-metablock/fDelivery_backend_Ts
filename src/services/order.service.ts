import { fshipService } from './fship.service.js';
import { getOrder } from '../repositories/order.query.js';
import { AddInDBWarehouse, PriceApiUse, WareHouseApiUse } from './api.service.js';
import { logFailedOrder } from './redis.service.js';
import { ApiResponseHandler } from '../handlers/Response.Handlers.js';

export const processOrderCreation = async (orderId: string,warehouseId:string) => {
    try {
        const row = await getOrder(orderId,warehouseId);
        if (row.length < 1) {
            return { status: false, error: true, message: "Order not found" };
        }

        const productArr = row[0].products;
        let Tax = 10;

        const shippingAddress = JSON.parse(row[0].shipping_address_data);
        const billingAddress = JSON.parse(row[0].billing_address_data);
        const PackageSize = {
            height: 20,
            width: 20,
            length: 20,
            weight: 20
        };

        const orderAmount = row[0].order_amount;
        const warehouse_id = row[0].warehouse_id;
        warehouseId=row[0].warehouseTable_id;
        let price = await PriceApiUse(PackageSize, shippingAddress, billingAddress, row, orderAmount);

        if (!warehouse_id) {
            let WareHouse = await WareHouseApiUse(shippingAddress, row[0]);
            if (WareHouse.error || !WareHouse.status) {
                await logFailedOrder(orderId,warehouseId);
                return ApiResponseHandler(WareHouse, "Warehouse not found")
            }

            warehouseId = WareHouse.apiData?.warehouseId;
            await AddInDBWarehouse(Number(warehouseId), Number(warehouse_id));


        }

        if (price.error || !price.status || !price.data) {
            await logFailedOrder(orderId,warehouseId);
            return ApiResponseHandler(price, "Price calculation failed")
        }

        let totalTaxAmount = row[0].total_tax_amount;
        const taxModel = row[0].tax_model;
        const shippingCost = row[0].shipping_cost;
        let netAmount = 0;

        const Product = productArr.map((product: any) => ({
            "productId": product.product_id,
            "productName": product.name,
            "unitPrice": product.unit_price,
            "quantity": product.qty,
            "productCategory": product.categories[0],
            "productDiscount": product.discount
        }));

        if (taxModel == "include") {
            if (row[0].payment_method != "cash_on_delivery") {
                Tax = (orderAmount - shippingCost) / Tax;
                netAmount = orderAmount - Tax;
            } else {
                Tax = (orderAmount - shippingCost) / Tax;
                netAmount = (orderAmount - shippingCost) - Tax;
            }
        } else {
            let amount = orderAmount - shippingCost;
            netAmount = amount - totalTaxAmount;
        }

        const extraFields = row[0].payment_method != "cash_on_delivery" ? {} : {
            "cod_Amount": orderAmount,
        };

        const body = {
            "customer_Name": shippingAddress.contact_person_name,
            "customer_Mobile": shippingAddress.phone.replace("+91", ""),
            "customer_Emailid": shippingAddress.email || "lol@gmail.com",
            "customer_Address": shippingAddress.address,
            "customer_Address_Type": shippingAddress.address_type,
            "customer_PinCode": shippingAddress.zip,
            "customer_City": shippingAddress.city,
            "orderId": orderId,
            "payment_Mode": row[0].payment_method == "cash_on_delivery" ? 1 : 2,
            "express_Type": row[0].delivery_type ?? "surface",
            "is_Ndd": 0,
            "order_Amount": netAmount,
            "tax_Amount": taxModel == "include" ? Tax : totalTaxAmount,
            "extra_Charges": shippingCost,
            "total_Amount": orderAmount,
            "shipment_Weight": PackageSize.weight,
            "shipment_Length": PackageSize.length,
            "shipment_Width": PackageSize.width,
            "shipment_Height": PackageSize.height,
            "volumetric_Weight": 0,
            "pick_Address_ID": warehouseId,
            "return_Address_ID": warehouseId,
            "products": Product,
            "courierId": price.data,
            ...extraFields
        };

        const result = await fshipService.createOrder(body);
        if (result.error || !result.status) {
            await logFailedOrder(orderId,warehouseId);
            return ApiResponseHandler(result, "API Order creation failed")
        }

        let pickup = null;
        if (result.apiData?.waybill) {
            const data = await fshipService.registerPickup({
                waybills: [String(result.apiData.waybill)]
            });
            if (data.error || !data.status) {
                await logFailedOrder(orderId,warehouseId);
                return ApiResponseHandler(data, "Pickup registration failed")
            }
            pickup = data.apiData;
        }

        return { status: true, error: false, message: "Order created successfully", data: result.apiData, pickup };

    } catch (error: any) {
        console.error("Error While processing order creation", error?.response?.data?.errors || error);
        await logFailedOrder(orderId,warehouseId);
        return { status: false, error: true, message: error?.response?.data?.errors || error.message };
    }
};
