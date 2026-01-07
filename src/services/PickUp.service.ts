import { updatePickupStatus } from "../repositories/order.query.js";
import { fshipService } from "./fship.service.js";
import { logFailedPickup } from "./redis.service.js";

export const processPickupCreation = async (waybill: string[]|string,bool:boolean,orderId?:string) => {
    try {        
        const result = await fshipService.registerPickup({
            waybills:Array.isArray(waybill)?waybill:[waybill]
        });
        // const result={
        //     apiData:{
        //         waybill:waybill,
        //         labelurl:""
        //     },
        //     error:true,
        //     status:false
        // }
        if(result.error || !result.status){
            await logFailedPickup(waybill);
            return { status: false, error: true, message: result };
        }
        
        if(bool){
            await updatePickupStatus((waybill),"1",bool)
        }else{
            await updatePickupStatus(String(orderId),"1",bool);
        }
        return { status: true, error: false, message: "PickUPcreate SuccessFully created successfully", data: result.apiData };

    } catch (error: any) {
        console.error("Error While processing PickUPcreate creation", error?.response?.data?.errors || error);
        await logFailedPickup(waybill);
        return { status: false, error: true, message: error?.response?.data?.errors || error.message };
    }
};
