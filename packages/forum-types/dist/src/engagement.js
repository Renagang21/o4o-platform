export var ReportReason;
(function (ReportReason) {
    ReportReason["SPAM"] = "spam";
    ReportReason["OFFENSIVE"] = "offensive";
    ReportReason["MISLEADING"] = "misleading";
    ReportReason["OFF_TOPIC"] = "off_topic";
    ReportReason["COPYRIGHT"] = "copyright";
    ReportReason["OTHER"] = "other";
})(ReportReason || (ReportReason = {}));
export var ReportStatus;
(function (ReportStatus) {
    ReportStatus["PENDING"] = "pending";
    ReportStatus["REVIEWING"] = "reviewing";
    ReportStatus["RESOLVED"] = "resolved";
    ReportStatus["DISMISSED"] = "dismissed";
})(ReportStatus || (ReportStatus = {}));
