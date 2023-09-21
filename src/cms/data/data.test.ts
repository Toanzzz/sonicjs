import { insertD1Data, updateD1Data } from "./d1-data";
import { usersTable } from "../../db/schema";
import qs from "qs";
const env = getMiniflareBindings();
const { __D1_BETA__D1DATA, KVDATA } = getMiniflareBindings();
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { getRecord, getRecords, insertRecord } from "./data";
import { clearInMemoryCache } from "./cache";
import { clearKVCache } from "./kv-data";

it("Insert Data", async () => {
  const urlKey = "http://localhost:8888/some-cache-key-url";

  const db = createTestTable();
  const newRecord = await insertRecord(__D1_BETA__D1DATA, KVDATA, {
    firstName: "John",
    id: "1",
    table: "users",
  });
  console.log('newRecord', newRecord);

  const d1Result = await getRecords(
    env.__D1_BETA__D1DATA,
    env.KVDATA,
    "users",
    undefined,
    urlKey
  );

  //record should be in list
  expect(d1Result.data.length).toBe(1);
  expect(d1Result.source).toBe("d1");

  //should be able to lookup new record 
  // const singleResult = await getRecord(
  //   env.__D1_BETA__D1DATA,
  //   env.KVDATA,
  //   newRecord.data.id
  // );

  // expect(d1Result.data.length).toBe(1);
  // expect(d1Result.source).toBe("kv");
});

it("CRUD", async () => {
  //start with a clear cache
  await clearInMemoryCache();
  await clearKVCache(KVDATA);
  
  const urlKey = "http://localhost:8888/some-cache-key-url";

  const db = createTestTable();

  const rec1 = await insertD1Data(__D1_BETA__D1DATA, KVDATA, "users", {
    firstName: "John",
    id: "1",
  });
  console.log('rec1', rec1);

  const rec2 = await insertD1Data(__D1_BETA__D1DATA, KVDATA, "users", {
    firstName: "Jane",
    id: "2",
  });
  console.log('rec2', rec2);

  const d1Result = await getRecords(
    env.__D1_BETA__D1DATA,
    env.KVDATA,
    "users",
    undefined,
    urlKey
  );

  console.log('d1Result', d1Result);

  expect(d1Result.data.length).toBe(2);
  expect(d1Result.source).toBe("d1");

  //if we request it again, it should be cached in memory
  //TODO need to be able to pass in ctx so that we can setup d1 and kv
  const inMemoryCacheResult = await getRecords(
    env.__D1_BETA__D1DATA,
    env.KVDATA,
    "users",
    undefined,
    urlKey
  );

  expect(inMemoryCacheResult.data.length).toBe(2);
  expect(inMemoryCacheResult.source).toBe("cache");

  //kill cache to simulate end user requesting kv cache data from another server node
  clearInMemoryCache();

  // if we request it again, it should also be cached in kv storage
  const kvResult = await getRecords(
    env.__D1_BETA__D1DATA,
    env.KVDATA,
    "users",
    undefined,
    urlKey
  );
  expect(kvResult.data.length).toBe(2);
  expect(kvResult.source).toBe("kv");
});


it("update should return updated id", async () => {
  //start with a clear cache
  await clearInMemoryCache();
  await clearKVCache(KVDATA);
  
  const urlKey = "http://localhost:8888/some-cache-key-url";

  const db = createTestTable();

  const rec1 = await insertD1Data(__D1_BETA__D1DATA, KVDATA, "users", {
    firstName: "John",
    id: "1",
  });

  const updatedRecord = await updateD1Data(__D1_BETA__D1DATA, "users", {
    firstName: "Jack",
    id: "1",
  });


  expect(updatedRecord.id).toBe('1');
});

function createTestTable() {
  const db = drizzle(__D1_BETA__D1DATA);

  db.run(sql`
    CREATE TABLE ${usersTable} (
      id text PRIMARY KEY NOT NULL,
      firstName text,
      lastName text,
      email text,
      password text,
      role text,
      created_on integer,
      updated_on integer
    );
	`);

  return db;
}
