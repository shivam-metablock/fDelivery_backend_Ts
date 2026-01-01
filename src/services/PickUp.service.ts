import { updatePickupStatus } from "../repositories/order.query.js";
import { fshipService } from "./fship.service.js";
import { logFailedPickup } from "./redis.service.js";

export const processPickupCreation = async (waybill: string) => {
    try {
        const result = await fshipService.registerPickup({
            waybills: [String(waybill)]
        });
        await updatePickupStatus(waybill,"1");
        return { status: true, error: false, message: "PickUPcreate SuccessFully created successfully", data: { result } };

    } catch (error: any) {
        console.error("Error While processing PickUPcreate creation", error?.response?.data?.errors || error);
        await logFailedPickup(waybill);
        return { status: false, error: true, message: error?.response?.data?.errors || error.message };
    }
};
