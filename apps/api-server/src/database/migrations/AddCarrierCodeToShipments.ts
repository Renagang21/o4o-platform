import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddCarrierCodeToShipments1738741200000 implements MigrationInterface {
    name = 'AddCarrierCodeToShipments1738741200000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if column already exists
        const table = await queryRunner.getTable("shipments");
        const carrierCodeColumn = table?.findColumnByName("carrier_code");
        
        if (!carrierCodeColumn) {
            await queryRunner.addColumn(
                "shipments",
                new TableColumn({
                    name: "carrier_code",
                    type: "varchar",
                    length: "50",
                    isNullable: true,
                    comment: "Carrier company code for shipment tracking"
                })
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("shipments", "carrier_code");
    }
}