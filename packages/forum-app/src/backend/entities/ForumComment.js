var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
export var CommentStatus;
(function (CommentStatus) {
    CommentStatus["PUBLISHED"] = "publish";
    CommentStatus["PENDING"] = "pending";
    CommentStatus["DELETED"] = "deleted";
})(CommentStatus || (CommentStatus = {}));
let ForumComment = class ForumComment {
    // Note: OneToMany relationship with replies removed to prevent circular dependency
    // Use ForumCommentRepository.find({ where: { parentId: comment.id } }) to get replies
    // Methods
    canUserView(userRole, userId) {
        if (this.status === CommentStatus.DELETED) {
            return ['admin', 'manager'].includes(userRole) || userId === this.authorId;
        }
        return this.status === CommentStatus.PUBLISHED;
    }
    canUserEdit(userId, userRole) {
        if (['admin', 'manager'].includes(userRole))
            return true;
        if (this.authorId === userId && this.status !== CommentStatus.DELETED) {
            const hoursSinceCreation = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
            return hoursSinceCreation < 24;
        }
        return false;
    }
    incrementLike() {
        this.likeCount++;
    }
    decrementLike() {
        this.likeCount = Math.max(0, this.likeCount - 1);
    }
    incrementReplyCount() {
        this.replyCount++;
    }
    decrementReplyCount() {
        this.replyCount = Math.max(0, this.replyCount - 1);
    }
    softDelete() {
        this.status = CommentStatus.DELETED;
        this.content = '[댓글이 삭제되었습니다]';
    }
    extractMentions() {
        // 멘션 추출 로직 (간단한 구현)
        const mentionRegex = /@([a-zA-Z0-9_]+)/g;
        const matches = this.content.match(mentionRegex);
        // 실제 구현에서는 별도 필드에 저장
    }
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], ForumComment.prototype, "id", void 0);
__decorate([
    Column({ type: 'text' }),
    __metadata("design:type", String)
], ForumComment.prototype, "content", void 0);
__decorate([
    Column({ type: 'uuid' }),
    __metadata("design:type", String)
], ForumComment.prototype, "postId", void 0);
__decorate([
    Column({ type: 'uuid' }),
    __metadata("design:type", String)
], ForumComment.prototype, "authorId", void 0);
__decorate([
    Column({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], ForumComment.prototype, "parentId", void 0);
__decorate([
    Column({ type: 'enum', enum: CommentStatus, default: CommentStatus.PUBLISHED }),
    __metadata("design:type", String)
], ForumComment.prototype, "status", void 0);
__decorate([
    Column({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], ForumComment.prototype, "likeCount", void 0);
__decorate([
    Column({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], ForumComment.prototype, "replyCount", void 0);
__decorate([
    Column({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], ForumComment.prototype, "isEdited", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], ForumComment.prototype, "createdAt", void 0);
__decorate([
    UpdateDateColumn(),
    __metadata("design:type", Date)
], ForumComment.prototype, "updatedAt", void 0);
__decorate([
    ManyToOne('ForumPost', { lazy: true }),
    JoinColumn({ name: 'postId' }),
    __metadata("design:type", Promise)
], ForumComment.prototype, "post", void 0);
__decorate([
    ManyToOne('User'),
    JoinColumn({ name: 'authorId' }),
    __metadata("design:type", Function)
], ForumComment.prototype, "author", void 0);
__decorate([
    ManyToOne('ForumComment', { nullable: true, lazy: true }),
    JoinColumn({ name: 'parentId' }),
    __metadata("design:type", Promise)
], ForumComment.prototype, "parent", void 0);
ForumComment = __decorate([
    Entity('forum_comment'),
    Index(['postId', 'status', 'createdAt'])
], ForumComment);
export { ForumComment };
//# sourceMappingURL=ForumComment.js.map