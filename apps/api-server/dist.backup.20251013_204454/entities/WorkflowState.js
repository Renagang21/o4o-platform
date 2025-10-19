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
exports.WorkflowState = exports.WorkflowStateType = void 0;
const typeorm_1 = require("typeorm");
var WorkflowStateType;
(function (WorkflowStateType) {
    WorkflowStateType["START"] = "start";
    WorkflowStateType["INTERMEDIATE"] = "intermediate";
    WorkflowStateType["END"] = "end";
    WorkflowStateType["DECISION"] = "decision";
})(WorkflowStateType || (exports.WorkflowStateType = WorkflowStateType = {}));
let WorkflowState = class WorkflowState {
};
exports.WorkflowState = WorkflowState;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], WorkflowState.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], WorkflowState.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], WorkflowState.prototype, "displayName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], WorkflowState.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: WorkflowStateType,
        default: WorkflowStateType.INTERMEDIATE
    }),
    __metadata("design:type", String)
], WorkflowState.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], WorkflowState.prototype, "workflowName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], WorkflowState.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], WorkflowState.prototype, "conditions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], WorkflowState.prototype, "actions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], WorkflowState.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], WorkflowState.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.OneToMany)('WorkflowTransition', 'fromState'),
    __metadata("design:type", Array)
], WorkflowState.prototype, "outgoingTransitions", void 0);
__decorate([
    (0, typeorm_1.OneToMany)('WorkflowTransition', 'toState'),
    __metadata("design:type", Array)
], WorkflowState.prototype, "incomingTransitions", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], WorkflowState.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], WorkflowState.prototype, "updatedAt", void 0);
exports.WorkflowState = WorkflowState = __decorate([
    (0, typeorm_1.Entity)('workflow_states')
], WorkflowState);
//# sourceMappingURL=WorkflowState.js.map