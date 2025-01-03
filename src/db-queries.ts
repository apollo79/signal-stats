import { sql, type NotNull } from "kysely";
import { db, kyselyDb, SELF_ID, setDbHash } from "./db";
import { cached } from "./lib/db-cache";
import { hashString } from "./lib/hash";

export const loadDb = (
  statements: string[],
  progressCallback?: (percentage: number) => void,
) => {
  const length = statements.length;
  let percentage = 0;

  for (let i = 0; i < length; i++) {
    const statement = statements[i];
    const newPercentage = Math.round((i / length) * 100);

    try {
      db.exec(statement);

      if (newPercentage !== percentage) {
        progressCallback?.(newPercentage);
        percentage = newPercentage;
      }
    } catch (e) {
      throw new Error(`statement failed: ${statement}`, {
        cause: e,
      });
    }
  }

  setDbHash(hashString(statements.join()));
};

const allThreadsOverviewQueryRaw = () =>
  kyselyDb
    .selectFrom("thread")
    .innerJoin(
      (eb) =>
        eb
          .selectFrom("message")
          .select((eb) => [
            "message.thread_id",
            eb.fn.countAll().as("message_count"),
          ])
          .where((eb) => {
            return eb.and([
              eb("message.body", "is not", null),
              eb("message.body", "is not", ""),
            ]);
          })
          .groupBy("message.thread_id")
          .as("message"),
      (join) => join.onRef("message.thread_id", "=", "thread._id"),
    )
    .innerJoin("recipient", "thread.recipient_id", "recipient._id")
    .leftJoin("groups", "recipient._id", "groups.recipient_id")
    .select([
      "thread._id as thread_id",
      "thread.recipient_id",
      "thread.archived",
      "recipient.profile_joined_name",
      "recipient.system_joined_name",
      "groups.title",
      "message_count",
      "thread.date as last_message_date",
      "recipient.nickname_joined_name",
    ])
    .where("message_count", ">", 0)
    .$narrowType<{
      thread_id: NotNull;
      archived: NotNull;
      message_count: number;
    }>()
    .execute();

export const allThreadsOverviewQuery = cached(allThreadsOverviewQueryRaw);

const overallSentMessagesQueryRaw = (recipientId: number) =>
  kyselyDb
    .selectFrom("message")
    .select((eb) => eb.fn.countAll().as("messageCount"))
    .where((eb) =>
      eb.and([
        eb("message.from_recipient_id", "=", recipientId),
        eb("message.body", "is not", null),
        eb("message.body", "!=", ""),
      ]),
    )
    .executeTakeFirst();

export const overallSentMessagesQuery = cached(overallSentMessagesQueryRaw);

const dmPartnerRecipientQueryRaw = (dmId: number) =>
  kyselyDb
    .selectFrom("recipient")
    .select([
      "recipient._id",
      "recipient.system_joined_name",
      "recipient.profile_joined_name",
      "recipient.nickname_joined_name",
    ])
    .innerJoin("thread", "recipient._id", "thread.recipient_id")
    .where((eb) =>
      eb.and([eb("thread._id", "=", dmId), eb("recipient._id", "!=", SELF_ID)]),
    )
    .$narrowType<{
      _id: number;
    }>()
    .executeTakeFirst();

export const dmPartnerRecipientQuery = cached(dmPartnerRecipientQueryRaw);

const threadSentMessagesOverviewQueryRaw = (threadId: number) =>
  kyselyDb
    .selectFrom("message")
    .select([
      "from_recipient_id",
      sql<string>`datetime(date_sent / 1000, 'unixepoch')`.as(
        "message_datetime",
      ),
    ])
    .orderBy(["message_datetime"])
    .where((eb) =>
      eb.and([
        eb("body", "is not", null),
        eb("body", "!=", ""),
        eb("thread_id", "=", threadId),
      ]),
    )
    .execute();

export const threadSentMessagesOverviewQuery = cached(
  threadSentMessagesOverviewQueryRaw,
);

const threadMostUsedWordsQueryRaw = (threadId: number, limit = 10) =>
  kyselyDb
    .withRecursive("words", (eb) => {
      return eb
        .selectFrom("message")
        .select([
          sql`LOWER(substr(body, 1, instr(body || " ", " ") - 1))`.as("word"),
          sql`(substr(body, instr(body || " ", " ") + 1))`.as("rest"),
        ])
        .where((eb) =>
          eb.and([eb("body", "is not", null), eb("thread_id", "=", threadId)]),
        )
        .unionAll((ebInner) => {
          return ebInner
            .selectFrom("words")
            .select([
              sql`LOWER(substr(rest, 1, instr(rest || " ", " ") - 1))`.as(
                "word",
              ),
              sql`(substr(rest, instr(rest || " ", " ") + 1))`.as("rest"),
            ])
            .where("rest", "<>", "");
        });
    })
    .selectFrom("words")
    .select((eb) => ["word", eb.fn.countAll().as("count")])
    .where("word", "<>", "")
    .groupBy("word")
    .orderBy("count desc")
    .limit(limit)
    .$narrowType<{
      count: number;
    }>()
    .execute();

export const threadMostUsedWordsQuery = cached(threadMostUsedWordsQueryRaw);
