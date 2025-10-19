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
exports.WorkflowTransition = exports.TransitionTrigger = void 0;
const typeorm_1 = require("typeorm");
const WorkflowState_1 = require("./WorkflowState");
var TransitionTrigger;
(function (TransitionTrigger) {
    TransitionTrigger["MANUAL"] = "manual";
    TransitionTrigger["AUTOMATIC"] = "automatic";
    TransitionTrigger["CONDITIONAL"] = "conditional";
    TransitionTrigger["TIMER"] = "timer";
    TransitionTrigger["EVENT"] = "event";
})(TransitionTrigger || (exports.TransitionTrigger = TransitionTrigger = {}));
let WorkflowTransition = class WorkflowTransition {
};
exports.WorkflowTransition = WorkflowTransition;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], WorkflowTransition.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], WorkflowTransition.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], WorkflowTransition.prototype, "displayName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], WorkflowTransition.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], WorkflowTransition.prototype, "workflowName", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => WorkflowState_1.WorkflowState, state => state.outgoingTransitions, {
        onDelete: 'CASCADE'
    }),
    (0, typeorm_1.JoinColumn)({ name: 'from_state_id' }),
    __metadata("design:type", WorkflowState_1.WorkflowState)
], WorkflowTransition.prototype, "fromState", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'from_state_id' }),
    __metadata("design:type", String)
], WorkflowTransition.prototype, "fromStateId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => WorkflowState_1.WorkflowState, state => state.incomingTransitions, {
        onDelete: 'CASCADE'
    }),
    (0, typeorm_1.JoinColumn)({ name: 'to_state_id' }),
    __metadata("design:type", WorkflowState_1.WorkflowState)
], WorkflowTransition.prototype, "toState", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'to_state_id' }),
    __metadata("design:type", String)
], WorkflowTransition.prototype, "toStateId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: TransitionTrigger,
        default: TransitionTrigger.MANUAL
    }),
    __metadata("design:type", String)
], WorkflowTransition.prototype, "trigger", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], WorkflowTransition.prototype, "conditions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], WorkflowTransition.prototype, "actions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], WorkflowTransition.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], WorkflowTransition.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], WorkflowTransition.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], WorkflowTransition.prototype, "requiredRole", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], WorkflowTransition.prototype, "requiredPermission", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], WorkflowTransition.prototype, "entityType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], WorkflowTransition.prototype, "entityId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], WorkflowTransition.prototype, "transitionedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], WorkflowTransition.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], WorkflowTransition.prototype, "updatedAt", void 0);
exports.WorkflowTransition = WorkflowTransition = __decorate([
    (0, typeorm_1.Entity)('workflow_transitions')
], WorkflowTransition);
//# sourceMappingURL=WorkflowTransition.js.map