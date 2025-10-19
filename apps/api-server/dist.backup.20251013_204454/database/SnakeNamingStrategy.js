"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnakeNamingStrategy = void 0;
const typeorm_1 = require("typeorm");
const StringUtils_1 = require("typeorm/util/StringUtils");
class SnakeNamingStrategy extends typeorm_1.DefaultNamingStrategy {
    tableName(targetName, userSpecifiedName) {
        return userSpecifiedName ? userSpecifiedName : (0, StringUtils_1.snakeCase)(targetName);
    }
    columnName(propertyName, customName, embeddedPrefixes) {
        return (0, StringUtils_1.snakeCase)(embeddedPrefixes.concat(customName ? customName : propertyName).join('_'));
    }
    columnNameCustomized(customName) {
        return customName;
    }
    relationName(propertyName) {
        return (0, StringUtils_1.snakeCase)(propertyName);
    }
    joinColumnName(relationName, referencedColumnName) {
        return (0, StringUtils_1.snakeCase)(relationName + '_' + referencedColumnName);
    }
    joinTableName(firstTableName, secondTableName) {
        return (0, StringUtils_1.snakeCase)(firstTableName + '_' + secondTableName);
    }
    joinTableColumnName(tableName, propertyName, columnName) {
        return (0, StringUtils_1.snakeCase)(tableName + '_' + (columnName ? columnName : propertyName));
    }
    classTableInheritanceParentColumnName(parentTableName, parentTableIdPropertyName) {
        return (0, StringUtils_1.snakeCase)(parentTableName + '_' + parentTableIdPropertyName);
    }
    eagerJoinRelationAlias(alias, propertyPath) {
        return alias + '__' + propertyPath.replace('.', '_');
    }
}
exports.SnakeNamingStrategy = SnakeNamingStrategy;
//# sourceMappingURL=SnakeNamingStrategy.js.map