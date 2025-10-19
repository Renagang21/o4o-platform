"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmailConnection = exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = require("../config/config");
// Create reusable transporter
const transporter = nodemailer_1.default.createTransport({
    host: config_1.config.smtp.host,
    port: config_1.config.smtp.port,
    secure: config_1.config.smtp.secure,
    auth: {
        user: config_1.config.smtp.user,
        pass: config_1.config.smtp.pass
    }
});
async function sendEmail(options) {
    var _a, _b;
    const mailOptions = {
        from: options.from || `${config_1.config.smtp.fromName} <${config_1.config.smtp.fromEmail}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        replyTo: options.replyTo,
        cc: (_a = options.cc) === null || _a === void 0 ? void 0 : _a.join(', '),
        bcc: (_b = options.bcc) === null || _b === void 0 ? void 0 : _b.join(', '),
        attachments: options.attachments
    };
    await transporter.sendMail(mailOptions);
}
exports.sendEmail = sendEmail;
// Verify SMTP connection
async function verifyEmailConnection() {
    try {
        await transporter.verify();
        return true;
    }
    catch (error) {
        // Error log removed
        return false;
    }
}
exports.verifyEmailConnection = verifyEmailConnection;
//# sourceMappingURL=email.js.map