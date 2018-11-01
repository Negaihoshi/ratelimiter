import Koa from "koa";
import RateLimit from "./../lib/ratelimit";
const logger = require("pino")({
  prettyPrint: true
});

const app = new Koa();

app.use(async (ctx, next) => {
  let ratelimiter = new RateLimit(ctx.request.ip);
  await ratelimiter.create(1);
  let time = await ratelimiter.acquire(1);
  if (Math.floor(time) === 0) {
    // ctx.status = 429;
    logger.info("Error");
    ctx.body = "Error";
  } else {
    logger.info(time);
    ctx.body = time;
    // await next();
  }
});

// app.use(ctx => {
//   ctx.body = "Hello Koa";
// });

app.listen(3000);
