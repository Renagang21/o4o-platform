"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddCarrierCodeToShipments1735635000000 = void 0;
const typeorm_1 = require("typeorm");
class AddCarrierCodeToShipments1735635000000 {
    constructor() {
        this.name = 'AddCarrierCodeToShipments1735635000000';
    }
    async up(queryRunner) {
        await queryRunner.addColumn('shipments', new typeorm_1.TableColumn({
            name: 'carrier_code',
            type: 'varchar',
            length: '50',
            isNullable: true,
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropColumn('shipments', 'carrier_code');
    }
}
exports.AddCarrierCodeToShipments1735635000000 = AddCarrierCodeToShipments1735635000000;
//# sourceMappingURL=1735635000000-AddCarrierCodeToShipments.js.map