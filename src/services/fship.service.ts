import axios from 'axios';
import dotenv from 'dotenv';
import {
    FshipResponse,
    TrackingRequest,
    CancelOrderRequest,
    AddWarehouseRequest,
    CreateExchangeOrderRequest,
    RegisterPickupRequest
} from '../types/fship.types.js';
import { ResponseHandler } from '../handlers/Response.Handlers.js';

dotenv.config();

class FshipService {
    private api: any;

    constructor() {
        const baseURL = process.env.FSHIP_BASE_URL || 'https://capi-qc.fship.in/api/';
        const clientKey = process.env.FSHIP_CLIENT_KEY;

        this.api = axios.create({
            baseURL,
            headers: {
                'Content-Type': 'application/json',
                'signature': clientKey,
            },
        });
    }
    async checkPincode(data: { destination_Pincode: string, source_Pincode: string }): Promise<FshipResponse> {

        const response = await this.api.post('/PincodeServiceability', data);
        return ResponseHandler(response);
    }
    async getPrice(data: { source_Pincode: string, destination_Pincode: string, payment_Mode: string, amount: number, express_Type: string, shipment_Weight: number, shipment_Length: number, shipment_Width: number, shipment_Height: number }): Promise<FshipResponse<any>> {

        const response = await this.api.post('/RateCalculator', data);




        return ResponseHandler(response);
    }
    async addWarehouse(data: AddWarehouseRequest): Promise<FshipResponse> {
        const response = await this.api.post('/addwarehouse', data);
        return ResponseHandler(response);
    }
    async createOrder(data: any): Promise<FshipResponse> {
        const response = await this.api.post('/createforwardorder', data);


        return ResponseHandler(response);
    }

    async registerPickup(data: RegisterPickupRequest): Promise<FshipResponse> {


        const response = await this.api.post('/registerpickup', data);

        return ResponseHandler(response);
    }


    async getCouriers(): Promise<FshipResponse> {
        const response = await this.api.get('/getallcourier');
        return ResponseHandler(response);
    }





    async cancelShipment(data: CancelOrderRequest): Promise<FshipResponse> {
        const response = await this.api.post('/CancelOrder', data);
        return ResponseHandler(response);
    }

    async getShippingLabel(data: { waybill: string }): Promise<FshipResponse> {
        const response = await this.api.post('/shippinglabel', data);
        return ResponseHandler(response);
    }

    async createExchangeOrder(data: CreateExchangeOrderRequest): Promise<FshipResponse> {
        const response = await this.api.post('/order/exchange', data);
        return ResponseHandler(response);
    }
    async getPickupDetails(data: { waybill: string }): Promise<FshipResponse> {
        const response = await this.api.post('/ShipmentSummary', data);
        return ResponseHandler(response);
    }


}

export const fshipService = new FshipService();
