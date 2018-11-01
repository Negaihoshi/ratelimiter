import test from "ava";
import axios from "axios";
import ioredis from "ioredis";

test("test ratelimiter 60 times per minute", async t => {
  let db = new ioredis();

  await db.del("::ffff:127.0.0.1");

  async function getRequest() {
    try {
      const result = await axios.get("http://localhost:3000");
      return result.data;
    } catch (err) {}
  }

  let count = 60;
  let startTime = new Date().getTime();
  while (count--) {
    let result = await getRequest();

    if (count != 0) t.true(result == count + 1);
  }

  t.true((await getRequest()) == "Error");

  let endTime = new Date().getTime();
  t.true(endTime - startTime < 60000);
});
