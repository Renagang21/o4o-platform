"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuItem = exports.MenuItemDisplayMode = exports.MenuItemTarget = exports.MenuItemType = void 0;
const typeorm_1 = require("typeorm");
const Menu_1 = require("./Menu");
var MenuItemType;
(function (MenuItemType) {
    MenuItemType["PAGE"] = "page";
    MenuItemType["CUSTOM"] = "custom";
    MenuItemType["CATEGORY"] = "category";
    MenuItemType["ARCHIVE"] = "archive";
    MenuItemType["POST"] = "post";
})(MenuItemType || (exports.MenuItemType = MenuItemType = {}));
var MenuItemTarget;
(function (MenuItemTarget) {
    MenuItemTarget["SELF"] = "_self";
    MenuItemTarget["BLANK"] = "_blank";
    MenuItemTarget["PARENT"] = "_parent";
    MenuItemTarget["TOP"] = "_top";
})(MenuItemTarget || (exports.MenuItemTarget = MenuItemTarget = {}));
var MenuItemDisplayMode;
(function (MenuItemDisplayMode) {
    MenuItemDisplayMode["SHOW"] = "show";
    MenuItemDisplayMode["HIDE"] = "hide";
})(MenuItemDisplayMode || (exports.MenuItemDisplayMode = MenuItemDisplayMode = {}));
let MenuItem = class MenuItem {
};
exports.MenuItem = MenuItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MenuItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], MenuItem.prototype, "menu_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Menu_1.Menu, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'menu_id' }),
    __metadata("design:type", Menu_1.Menu)
], MenuItem.prototype, "menu", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], MenuItem.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], MenuItem.prototype, "url", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: MenuItemType,
        default: MenuItemType.CUSTOM
    }),
    __metadata("design:type", String)
], MenuItem.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: MenuItemTarget,
        default: MenuItemTarget.SELF
    }),
    __metadata("design:type", String)
], MenuItem.prototype, "target", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], MenuItem.prototype, "icon", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], MenuItem.prototype, "css_class", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], MenuItem.prototype, "order_num", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], MenuItem.prototype, "reference_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], MenuItem.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: MenuItemDisplayMode,
        default: MenuItemDisplayMode.SHOW
    }),
    __metadata("design:type", String)
], MenuItem.prototype, "display_mode", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        default: () => "'{\"roles\": [\"everyone\"]}'"
    }),
    __metadata("design:type", Object)
], MenuItem.prototype, "target_audience", void 0);
__decorate([
    (0, typeorm_1.TreeChildren)(),
    __metadata("design:type", Array)
], MenuItem.prototype, "children", void 0);
__decorate([
    (0, typeorm_1.TreeParent)(),
    __metadata("design:type", MenuItem)
], MenuItem.prototype, "parent", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], MenuItem.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], MenuItem.prototype, "updated_at", void 0);
exports.MenuItem = MenuItem = __decorate([
    (0, typeorm_1.Entity)('menu_items'),
    (0, typeorm_1.Tree)('closure-table')
], MenuItem);
//# sourceMappingURL=MenuItem.js.map