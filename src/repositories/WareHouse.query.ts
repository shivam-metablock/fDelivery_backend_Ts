import pool from "../config/db.config.js";

export const AddHouseInDB = async (warehouseTable_id: number, warehouseId: number) => {
     try {
        await pool.query("UPDATE warehouses SET warehouse_id = ?, WHERE id = ?", [warehouseId, warehouseTable_id]);
        // console.log("AddInDBWarehouse", row);

    } catch (error) {
        console.error("error in the AddInDBWarehouse", error);

    }

}
