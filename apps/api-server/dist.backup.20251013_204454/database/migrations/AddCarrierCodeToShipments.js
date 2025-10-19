"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddCarrierCodeToShipments1738741200000 = void 0;
const typeorm_1 = require("typeorm");
class AddCarrierCodeToShipments1738741200000 {
    constructor() {
        this.name = 'AddCarrierCodeToShipments1738741200000';
    }
    async up(queryRunner) {
        // Check if column already exists
        const table = await queryRunner.getTable("shipments");
        const carrierCodeColumn = table === null || table === void 0 ? void 0 : table.findColumnByName("carrier_code");
        if (!carrierCodeColumn) {
            await queryRunner.addColumn("shipments", new typeorm_1.TableColumn({
                name: "carrier_code",
                type: "varchar",
                length: "50",
                isNullable: true,
                comment: "Carrier company code for shipment tracking"
            }));
        }
    }
    async down(queryRunner) {
        await queryRunner.dropColumn("shipments", "carrier_code");
    }
}
exports.AddCarrierCodeToShipments1738741200000 = AddCarrierCodeToShipments1738741200000;
//# sourceMappingURL=AddCarrierCodeToShipments.js.map