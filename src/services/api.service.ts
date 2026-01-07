import pool from "../config/db.config.js";
import { fshipService } from "./fship.service.js";
import { redisClient } from "./redis.service.js";

export const PriceApiUse = async (PackageSize: {
    height: number;
    width: number;
    length: number;
    weight: number;
}, shippingAddress: {
    zip: string;
}, billingAddress: {
    zip: string;
}, row: any, orderAmount: number, orderId: string) => {


    const price = await fshipService.getPrice({
        source_Pincode: shippingAddress.zip,
        destination_Pincode: billingAddress.zip,
        payment_Mode: row[0].payment_method == "cash_on_delivery" ? "COD" : "P",
        amount: orderAmount,
        express_Type: row[0].delivery_type ?? "surface",
        shipment_Weight: PackageSize.weight,
        shipment_Length: PackageSize.length,
        shipment_Width: PackageSize.width,
        shipment_Height: PackageSize.height
    });
    // return price;
    if (price.status) {

        // console.log("priceData", price);

        //@ts-ignore
        const LowPrice: number[] = CalculatePrice(price.shipment_rates);
        await redisClient.set(
            `priceData:${orderId}`,
            JSON.stringify(LowPrice),
            { EX: 100 }
        );

        return { status: true, error: false, message: "Price calculated successfully", data: LowPrice[0] };
    } else {
        return { status: false, error: true, message: price.message };
    }


}

const CalculatePrice = (Price: any) => {
    // console.log("Price",Price);

    if (!Price || Price.length === 0) return [];

    // Sort by shipping_charge ascending
    Price.sort((a: any, b: any) => a.shipping_charge - b.shipping_charge);


    return Price.slice(0, 5).map((item: any) => item.courier_id);
}

export const WareHouseApiUse = async (data: any, row: any) => {

    console.log("wareHouseApiUse", row.warehouse_name, row.address_1, row.pincode, row.city, data.contact_person_name, data.phone);

    const warehouse = await fshipService.addWarehouse({
        warehouseId: 0,
        warehouseName: row.warehouse_name,
        contactName: data.contact_person_name,
        addressLine1: row.address_1,
        pincode: row.pincode,
        city: row.city,
        phoneNumber: data.phone,
        email: data.email || "lol@gmail.com"
    });
    return warehouse;
}

export const AddInDBWarehouse = async (warehouseTable_id: number, warehouseId: number) => {
    console.log("warehouseTable_id", warehouseTable_id);
    console.log("warehouseId", warehouseId);

    try {
        const row = await pool.query("UPDATE warehouses SET warehouse_id = ? WHERE id = ?", [warehouseId, warehouseTable_id]);
        console.log("AddInDBWarehouse", row);

    } catch (error) {
        console.error("error in the AddInDBWarehouse", error);

    }

}