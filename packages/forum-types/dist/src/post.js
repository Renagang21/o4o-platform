export var PostStatus;
(function (PostStatus) {
    PostStatus["DRAFT"] = "draft";
    PostStatus["PUBLISHED"] = "published";
    PostStatus["PENDING"] = "pending";
    PostStatus["REJECTED"] = "rejected";
    PostStatus["ARCHIVED"] = "archived";
})(PostStatus || (PostStatus = {}));
export var PostType;
(function (PostType) {
    PostType["DISCUSSION"] = "discussion";
    PostType["QUESTION"] = "question";
    PostType["ANNOUNCEMENT"] = "announcement";
    PostType["POLL"] = "poll";
    PostType["GUIDE"] = "guide";
})(PostType || (PostType = {}));
