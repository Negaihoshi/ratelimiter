# RateLimiter

### Require

- node v8+
- redis v4+

### How to Testing

- npm install
- npm start
- npm test

The service will run with 3000 port.
The Redis use default setting(127.0.0.1:6379)
Testing will delete ip 127.0.0.1 redis bucket.

### Why use in-memory database with Redis

Ratelimiter 使用情境簡單，僅僅需要微量資料即可運作，而且回應速度越快越好，以免時間差導致用量計算異常，所以選擇採用 in-memory 的結構，而選擇 Redis 是因為其輕量化、速度快為主要採用的考量，且 node 也有相當成熟的套件來搭配使用，如果未來部署上線也有良好的機制可擴充，有龐大的社群且也可以做持久化規劃，所以選擇 Redis。
