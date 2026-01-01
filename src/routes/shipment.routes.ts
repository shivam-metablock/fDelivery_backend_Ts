import { Router } from 'express';
import * as shipmentController from '../controllers/shipment.controller.js';
import multer from "multer";

const upload = multer();

const router = Router();

// Standard routes
//1 check this pincode in shiping aviable or not
/*
body:{
    "destination_Pincode": "110001",(Customer)
    "source_Pincode": "110001" (Seller)
}
*/
router.post('/checkPincode', shipmentController.checkPincode);

// 2 check the price of the shipment`
/*
body:{
   
 "source_Pincode": "110001",
 "destination_Pincode": "110001",
 "payment_Mode": " COD/P",
 "amount": 0,
 "express_Type": "air/surfac",
 "shipment_Weight": 0,
 "shipment_Length": 0,
 "shipment_Width": 0,
 "shipment_Height": 0,
 "
}
*/
router.post('/price',upload.none(), shipmentController.getPrice);

// 3 create order

router.post('/orders', upload.none(),shipmentController.createOrder);


// 4 add warehouse
/*
{
"warehouseId": 0,
"warehouseName": "EdealIndia Warehouse",
"contactName": "Harsh",
"addressLine1": "36/12, kiran path,mansarovar",
"addressLine2": "string",
"pincode": "302020",
"city": "Jaipur",
"stateId": 29,
"countryId": 101,
"phoneNumber": "8005518158",
"email": "guptah605@gmail.com"
} */
router.post('/addWareHouse', shipmentController.addWareHouse);

//5 REGISTER PICKUP
/*
{
"waybill": [
    "string"  (Get From CREATE FORWARD ORDER)
]
} */
router.post('/registerPickup',upload.none(), shipmentController.registerPickup);
//6 CANCEL SHIPMENT 
/*
{
"reason": "string",
 "waybill": "string"
}
 */
router.post('/cancelShipment', shipmentController.cancelShipment);
//TRACKING HISTORY
/**
 
"waybill": "143455210101006"
 */
router.post('/checkShipment', upload.none(),shipmentController.getPickupDetails);


router.post('/label', shipmentController.getShippingLabel);

router.get('/couriers', shipmentController.getCouriers);


export default router;
