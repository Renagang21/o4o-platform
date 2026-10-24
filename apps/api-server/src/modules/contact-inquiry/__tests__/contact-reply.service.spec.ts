import { ContactReplyService } from "../contact-reply.service.js";
jest.mock("../../../database/connection.js", () => ({
  AppDataSource: { isInitialized: false },
}));
jest.mock("../../../services/email.service.js", () => ({
  emailService: { sendEmail: jest.fn() },
}));
const contactId = "00000000-0000-0000-0000-000000000001";
const requestId = "00000000-0000-0000-0000-000000000002";
function fixture(delivered = true) {
  const events: any[] = [];
  let answered = false;
  const query = jest.fn(async (sql: string, p: any[] = []) => {
    if (sql.includes("SELECT id,email,subject,status"))
      return p[1] === "supplier"
        ? [
            {
              id: contactId,
              email: "sample@example.invalid",
              subject: "문의",
              status: "received",
            },
          ]
        : [];
    if (sql.includes("SELECT meta->>'delivery'"))
      return events
        .filter((x) => x.replyId === p[2])
        .slice(-1)
        .map((x) => ({ status: x.delivery }));
    if (sql.includes("INSERT INTO action_logs")) {
      events.push(JSON.parse(p[3].toPostgres()));
      return [];
    }
    if (sql.includes("UPDATE contact_inquiries")) answered = true;
    return [];
  });
  const send = jest.fn(async () => ({ success: delivered }));
  const db = { query, transaction: async (fn: any) => fn({ query }) };
  return {
    service: new ContactReplyService(db as any, send),
    send,
    events,
    answered: () => answered,
  };
}
it("sends a plain escaped reply, records history and does not resend an identical request", async () => {
  const f = fixture();
  const input = { requestId, message: "<script>sample</script>" };
  expect(
    (await f.service.reply("supplier", contactId, "operator", input)).status,
  ).toBe("sent");
  expect(
    (await f.service.reply("supplier", contactId, "operator", input)).status,
  ).toBe("sent");
  expect(f.send).toHaveBeenCalledTimes(1);
  expect(f.send.mock.calls[0][0].html).toContain("&lt;script&gt;");
  expect(f.events.map((x) => x.delivery)).toEqual(["sending", "sent"]);
  expect(f.answered()).toBe(true);
});
it("failed delivery is recorded and never marks the inquiry answered", async () => {
  const f = fixture(false);
  expect(
    (
      await f.service.reply("supplier", contactId, "operator", {
        requestId,
        message: "답변 내용",
      })
    ).status,
  ).toBe("failed");
  expect(f.answered()).toBe(false);
  expect(f.events.at(-1).delivery).toBe("failed");
});
it("another service cannot select the recipient or send a reply", async () => {
  const f = fixture();
  await expect(
    f.service.reply("funding", contactId, "operator", {
      requestId,
      message: "답변 내용",
    }),
  ).rejects.toMatchObject({ status: 404 });
  expect(f.send).not.toHaveBeenCalled();
});
it("rejects invalid content and idempotency identifiers before any mutation", async () => {
  const f = fixture();
  await expect(
    f.service.reply("supplier", contactId, "operator", {
      requestId: "invalid",
      message: "내용",
    }),
  ).rejects.toMatchObject({ status: 400 });
  expect(f.events).toHaveLength(0);
});

it("keeps an uncertain provider send claimed and never automatically resends", async () => {
 const f=fixture();f.send.mockRejectedValueOnce(Error('uncertain transport'));
 const input={requestId,message:'Uncertain reply'};
 expect((await f.service.reply('supplier',contactId,'operator',input)).status).toBe('sending');
 expect((await f.service.reply('supplier',contactId,'operator',input)).status).toBe('sending');
 expect(f.send).toHaveBeenCalledTimes(1);expect(f.events.map(x=>x.delivery)).toEqual(['sending']);expect(f.answered()).toBe(false);
});
