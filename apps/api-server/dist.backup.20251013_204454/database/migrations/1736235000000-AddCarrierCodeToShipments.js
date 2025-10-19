"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddCarrierCodeToShipments1736235000000 = void 0;
const typeorm_1 = require("typeorm");
class AddCarrierCodeToShipments1736235000000 {
    async up(queryRunner) {
        // Check if column already exists
        const table = await queryRunner.getTable('shipments');
        if (table) {
            const carrierCodeColumn = table.columns.find(c => c.name === 'carrier_code');
            if (!carrierCodeColumn) {
                await queryRunner.addColumn('shipments', new typeorm_1.TableColumn({
                    name: 'carrier_code',
                    type: 'varchar',
                    length: '50',
                    isNullable: true,
                    comment: 'Carrier service code'
                }));
            }
        }
    }
    async down(queryRunner) {
        const table = await queryRunner.getTable('shipments');
        if (table) {
            const carrierCodeColumn = table.columns.find(c => c.name === 'carrier_code');
            if (carrierCodeColumn) {
                await queryRunner.dropColumn('shipments', 'carrier_code');
            }
        }
    }
}
exports.AddCarrierCodeToShipments1736235000000 = AddCarrierCodeToShipments1736235000000;
//# sourceMappingURL=1736235000000-AddCarrierCodeToShipments.js.map