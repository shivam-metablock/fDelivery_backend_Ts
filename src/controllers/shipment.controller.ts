import { Request, Response } from 'express';
import { fshipService } from '../services/fship.service.js';
import { processOrderCreation } from '../services/order.service.js';
import { processPickupCreation } from '../services/PickUp.service.js';


export const checkPincode = async (req: Request, res: Response) => {
    try {
        const result = await fshipService.checkPincode(req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ status: false, error: true, message: error.message });
    }
};

export const getPrice = async (req: Request, res: Response) => {
    try {
        const result = await fshipService.getPrice(req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ status: false, error: true, message: error.message });
    }
}
export const addWareHouse = async (req: Request, res: Response) => {
    try {
        const result = await fshipService.addWarehouse(req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ status: false, error: true, message: error.message });
    }
}
export const createOrder = async (req: Request, res: Response) => {
    try {
        
        const orderId = req.body.order_id;
        const warehouse_id=req.body.warehouse_id;
        if(!orderId||!warehouse_id){
            return res.status(200).json({ status: false, error: true, message: "Order ID and Warehouse ID are required" ,data:{order:req.body.order_id,warehouse_id:req.body.warehouse_id}});
        }
        const result = await processOrderCreation(orderId,warehouse_id);

        if (result.error) {
            return res.status(result.status === false ? 200 : 500).json(result);
        }

        return res.json(result);

    } catch (error: any) {
        console.error("Error in createOrder controller", error);
        res.status(500).json({ status: false, error: true, message: error.message });
    }
};

export const registerPickup = async (req: Request, res: Response) => {
    try {
        const result = await processPickupCreation(req.body.waybill,true);
        res.json(result);
    } catch (error: any) {

        res.status(500).json({ status: false, error: true, message: error.message });
    }
}

export const cancelShipment = async (req: Request, res: Response) => {
    try {
        const result = await fshipService.cancelShipment(req.body);
        res.json(result.apiData);
    } catch (error: any) {
        res.status(500).json({ status: false, error: true, message: error.message });
    }
}
export const getCouriers = async (req: Request, res: Response) => {
    try {
        const result = await fshipService.getCouriers();
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ status: false, error: true, message: error.message });
    }
};

export const getShippingLabel = async (req: Request, res: Response) => {
    try {
        const result = await fshipService.getShippingLabel(req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ status: false, error: true, message: error.message });
    }
};

export const getPickupDetails = async (req: Request, res: Response) => {
    try {
        const result = await fshipService.getPickupDetails(req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ status: false, error: true, message: error.message });
    }
}

