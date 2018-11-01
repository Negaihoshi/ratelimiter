import ioredis from "ioredis";
const logger = require("pino")({
  prettyPrint: true
});

class RateLimit {
  constructor(ip) {
    this.ip = ip;
    this.db = new ioredis();
    this.maxBurstSeconds = 1;
    this.maxPermits = 60;
    this.storedPermits = 60;
    this.permitsPerSecond = 1;
    this.stableIntervalMicros = 1000;
    this.nextFreeTicketMicros = new Date().getTime();
  }

  async create(permitsPerSecond) {
    let saveData = await this.getBucket(this.ip);
    if (saveData) {
      saveData = JSON.parse(saveData);
      this.storedPermits = saveData.storedPermits;
      this.nextFreeTicketMicros = saveData.nextFreeTicketMicros;
    }
    this.setRate(permitsPerSecond);
  }

  setRate(permitsPerSecond) {
    this.permitsPerSecond = permitsPerSecond;
    this.doSetRate(permitsPerSecond);
  }

  doSetRate(permitsPerSecond, nowMicros) {
    nowMicros = new Date().getTime();
    this.resync(nowMicros, permitsPerSecond);
    let stableIntervalMicros = 1 / permitsPerSecond;
    this.stableIntervalMicros = stableIntervalMicros;
  }

  async resync(nowMicros, permitsPerSecond) {
    if (nowMicros > this.nextFreeTicketMicros) {
      let newPermits =
        (nowMicros - this.nextFreeTicketMicros) /
        ((1 / permitsPerSecond) * 1000);

      this.storedPermits = Math.min(
        this.maxPermits,
        this.storedPermits + Math.floor(newPermits)
      );

      this.nextFreeTicketMicros = nowMicros;
      await this.setBucket(
        this.ip,
        JSON.stringify({
          storedPermits: this.storedPermits,
          nextFreeTicketMicros: this.nextFreeTicketMicros
        })
      );
    }
  }

  async getBucket(key) {
    return await this.db.get(key);
  }

  async setBucket(key, value, expire) {
    await this.db
      .multi()
      .set(key, value)
      .exec();
    if (expire) {
      await this.db.pexpire(key, expire * 1000);
    }
  }

  acquire(permits) {
    return this.reserve(permits);
  }

  reserve(permits) {
    this.checkPermits(permits);
    return this.reserveAndGetWaitLength(permits, new Date().getTime());
  }

  reserveAndGetWaitLength(permits, nowMicros) {
    return this.reserveEarliestAvailable(permits, nowMicros);
  }

  reserveEarliestAvailable(requiredPermits, nowMicros) {
    this.resync(nowMicros, this.permitsPerSecond);

    if (Math.floor(this.storedPermits) == 0) return this.storedPermits;

    let originStoredPermits = this.storedPermits;

    let storedPermitsToSpend = Math.min(requiredPermits, this.storedPermits);

    let freshPermits = requiredPermits - storedPermitsToSpend;

    let waitMicros = freshPermits * this.stableIntervalMicros;

    setTimeout(() => {
      this.storedPermits -= storedPermitsToSpend;

      this.setBucket(
        this.ip,
        JSON.stringify({
          storedPermits: this.storedPermits,
          nextFreeTicketMicros: this.nextFreeTicketMicros
        })
      );
    }, waitMicros * 1000);

    return Math.floor(originStoredPermits);
  }

  checkPermits(permits) {
    if (permits < 0)
      console.log(`Requested permits ${permits} must be positive`);
  }
}

export default RateLimit;
