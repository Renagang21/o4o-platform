var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
let LoginAttempt = class LoginAttempt {
    // Static method to check if account should be locked
    static shouldLockAccount(attempts) {
        const recentAttempts = attempts.filter(attempt => !attempt.successful &&
            new Date().getTime() - attempt.attemptedAt.getTime() < 15 * 60 * 1000 // 15 minutes
        );
        return recentAttempts.length >= 5; // Lock after 5 failed attempts in 15 minutes
    }
    // Static method to get lock duration based on failed attempts
    static getLockDuration(failedAttempts) {
        if (failedAttempts < 5)
            return 0;
        if (failedAttempts < 10)
            return 15 * 60 * 1000; // 15 minutes
        if (failedAttempts < 15)
            return 30 * 60 * 1000; // 30 minutes
        return 60 * 60 * 1000; // 1 hour for 15+ attempts
    }
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], LoginAttempt.prototype, "id", void 0);
__decorate([
    Column({ type: 'varchar' }),
    __metadata("design:type", String)
], LoginAttempt.prototype, "email", void 0);
__decorate([
    Column({ type: 'varchar' }),
    __metadata("design:type", String)
], LoginAttempt.prototype, "ipAddress", void 0);
__decorate([
    Column({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], LoginAttempt.prototype, "userAgent", void 0);
__decorate([
    Column({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], LoginAttempt.prototype, "successful", void 0);
__decorate([
    Column({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], LoginAttempt.prototype, "failureReason", void 0);
__decorate([
    Column({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], LoginAttempt.prototype, "deviceId", void 0);
__decorate([
    Column({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], LoginAttempt.prototype, "location", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], LoginAttempt.prototype, "attemptedAt", void 0);
LoginAttempt = __decorate([
    Entity('login_attempts'),
    Index(['email', 'ipAddress'])
], LoginAttempt);
export { LoginAttempt };
//# sourceMappingURL=LoginAttempt.js.map