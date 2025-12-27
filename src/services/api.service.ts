import pool from "../config/db.config.js";
import { fshipService } from "./fship.service.js";

export const PriceApiUse = async (PackageSize: {
    height: number;
    width: number;
    length: number;
    weight: number;
}, shippingAddress: {
    zip: string;
}, billingAddress: {
    zip: string;
}, row: any, orderAmount: number) => {


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

        //@ts-ignore
        const LowPrice = CalculatePrice(price.shipment_rates);

        return { status: true, error: false, message: "Price calculated successfully", data: LowPrice };
    } else {
        return { status: false, error: true, message: price.message };
    }


}

const CalculatePrice = (Price: any) => {
    // console.log("Price",Price);

    let LowPrice = Price[0].shipping_charge;
    let id = 0;
    Price.find((item: any) => {
        if (item.shipping_charge < LowPrice) {
            LowPrice = item.shipping_charge;
            id = item.courier_id;
        }
    })
    return id;
}

export const WareHouseApiUse = async (data:any,row:any) => {
    
    const warehouse = await fshipService.addWarehouse({
        warehouseId: 0,
        warehouseName: row.warehouse_name,
        contactName: data.contact_person_name,
        addressLine1: row.address_1,
        pincode: row.pincode,
        city: row.city,
        phoneNumber: data.phone,
        email: data.email||"lol@gmail.com"
    });
    return warehouse;
}

export const AddInDBWarehouse=async( warehouseTable_id:number,warehouseId:number)=>{
    console.log("warehouseTable_id",typeof warehouseTable_id);
    console.log("warehouseId",typeof warehouseId);
    
   const row= await pool.query("UPDATE warehouses SET warehouse_id = ? WHERE id = ?",[warehouseId,warehouseTable_id]);
  
}