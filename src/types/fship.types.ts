export interface FshipProduct {
    product_Name: string;
    product_Quantity: string;
    product_Price: string;
    product_Sku: string;
}

export interface CreateForwardOrderRequest {
    order_id: string;
    customer_Name: string;
    customer_Address: string;
    customer_City: string;
    customer_State: string;
    customer_Pincode: number | string;
    customer_Contact: string;
    order_Date: string;
    order_Type: 'PREPAID' | 'COD';
    order_Amount: number | string;
    shipment_Weight: number | string;
    products: FshipProduct[];
}

export interface FshipResponse<T = any> {
    status: boolean;
    error: boolean;
    trackingdata?: any;
    apiData: T;
    message?: string;
}

export interface TrackingRequest {
    waybill: string;
}

export interface CancelOrderRequest {
    waybill: string;
}

export interface AddWarehouseRequest {
    warehouseId: number,
    warehouseName: string,
    contactName: string,
    addressLine1: string,
    addressLine2?: string,
    pincode: number,
    city: string,
    stateId?: number,
    countryId?: number,
    phoneNumber: number,
    email: string
}

export interface QCParameter {
    questionId: string;
    question: string;
    value: 'Yes' | 'No';
}

export interface ExchangeProduct {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    sku: string;
    returnType: number;
    returnReason: string;
    isQcRequired: boolean;
    qcParameters: QCParameter[];
}

export interface CreateExchangeOrderRequest {
    customer_Name: string;
    customer_Mobile: string;
    customer_Email: string;
    customer_Address: string;
    customer_PinCode: string;
    customer_City: string;
    customer_State: string;
    orderId: string;
    invoice_Number: string;
    order_Amount: number;
    payment_Mode: 'Prepaid' | 'COD';
    pick_Address_ID: number;
    return_Address_ID: number;
    shipment_Weight: number;
    shipment_Length: number;
    shipment_Width: number;
    shipment_Height: number;
    products: ExchangeProduct[];
}

export interface RegisterPickupRequest {
    waybills: string[];
}

