import { fshipService } from './fship.service.js';
import { getOrder, updateOrderStatus } from '../repositories/order.query.js';
import { AddInDBWarehouse, PriceApiUse, WareHouseApiUse } from './api.service.js';
import { logFailedOrder, redisClient } from './redis.service.js';
import { ApiResponseHandler } from '../handlers/Response.Handlers.js';
import { processPickupCreation } from './PickUp.service.js';

export const processOrderCreation = async (orderId: string, warehouseId: string) => {
    try {
        const row = await getOrder(orderId, warehouseId);
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
        let warehouse_id = row[0].warehouse_id;
        warehouseId = row[0].warehouseTable_id;
        // console.log("rowdata",row[0]);
        if (!warehouseId) {
            return ApiResponseHandler({ message: "Warehouse not found" })
        }
        let price = await PriceApiUse(PackageSize, shippingAddress, billingAddress, row, orderAmount, orderId);

        if (!warehouse_id) {
            let WareHouse = await WareHouseApiUse(shippingAddress, row[0]);
            if (WareHouse.error || !WareHouse.status) {
                await logFailedOrder(orderId, warehouseId);
                return ApiResponseHandler(WareHouse, "Warehouse not found")
            }

            console.log("WareHouse", WareHouse.apiData);

            warehouse_id = WareHouse.apiData?.warehouseId;
            await AddInDBWarehouse(Number(warehouseId), Number(warehouse_id));


        }

        if (price.error || !price.status || !price.data) {
            await logFailedOrder(orderId, warehouseId);
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

        let data: any = await redisClient.get(`priceData:${orderId}`);
        data=JSON.parse(data)
       
        let result: any;
        if (data) {
            for (let i = 0; i < data.length; i++) {
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
                    "pick_Address_ID": warehouse_id,
                    "return_Address_ID": warehouse_id,
                    "products": Product,
                    "courierId": data[i],
                    ...extraFields
                };
                result = await fshipService.createOrder(body);
                if (result.error || !result.status) {
                    continue;
                } else {
                    data = []
                }
            }
        }
        console.log("datapfPriceId", data)

        if (data.length > 0) {
            await logFailedOrder(orderId, warehouseId);
            return ApiResponseHandler(result, "API Order creation failed")
        }



        if (result.apiData?.waybill) {
            await processPickupCreation(result.apiData.waybill, false, orderId);
        }
        await updateOrderStatus(orderId, "1", result.apiData.waybill,result.apiData.labelurl);

        return { status: true, error: false, message: "Order created successfully", data: { order: result.apiData } };

    } catch (error: any) {
        console.error("Error While processing order creation", error?.response?.data?.errors || error);
        await logFailedOrder(orderId, warehouseId);
        return { status: false, error: true, message: error?.response?.data?.errors || error.message };
    }
};
