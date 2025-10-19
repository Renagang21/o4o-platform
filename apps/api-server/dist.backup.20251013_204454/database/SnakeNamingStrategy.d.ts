import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';
export declare class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
    tableName(targetName: string, userSpecifiedName: string | undefined): string;
    columnName(propertyName: string, customName: string | undefined, embeddedPrefixes: string[]): string;
    columnNameCustomized(customName: string): string;
    relationName(propertyName: string): string;
    joinColumnName(relationName: string, referencedColumnName: string): string;
    joinTableName(firstTableName: string, secondTableName: string): string;
    joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string;
    classTableInheritanceParentColumnName(parentTableName: any, parentTableIdPropertyName: any): string;
    eagerJoinRelationAlias(alias: string, propertyPath: string): string;
}
//# sourceMappingURL=SnakeNamingStrategy.d.ts.map