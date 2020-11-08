const keys = require('./keys');

// Express app setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express(); // receive and respond to HTTP req to and from React server
app.use(cors()); // cross version resource sharing - allows us to make requests from one domain the react app runs on to another domain/port the express API is hosted on 
app.use(bodyParser.json()); // pass incoming req from React app and turn body into json format

// Postgres client setup
const { Pool } = require('pg');
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
});

// pgClient.on('error', () => console.log('Lost PG connection'));

// each time we connect to SQL DB, we need to create at least once a table to store the values
pgClient.on('connect', () => {
    pgClient
      .query('CREATE TABLE IF NOT EXISTS values (number INT)')
      .catch((err) => console.log(err));
  });

// Redis client setup
const redis = require('redis');
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});

// if have client listening or publishing info on Redis, need a duplicate connection
// if client is used for this purpose (subscribing, listening, etc.), cannot be used for other purposes
const redisPublisher = redisClient.duplicate();

// Express route handlers
app.get('/', (req, res) => {
    res.send('Hi');
});

app.get('/values/all', async (req, res) => {
    const values = await pgClient.query('SELECT * FROM values');
    res.send(values.rows); // only return the values, and not other metadata
});

// get all the values in this hash (called 'values')
app.get('/values/current', async (req, res) => {
    // redis library doesn't have out-of-the-box promise support, so need callbacks instead of async await
    redisClient.hgetall('values', (err, values) => {
        res.send(values);
    });
});

app.post('/values', async (req, res) => {
    const index = req.body.index;
    if (parseInt(index) > 40) {
        return res.status(422).send('Index too high');
    }

    redisClient.hset('values', index, 'Nothing yet!');
    redisPublisher.publish('insert', index); // wake up worker process to calculate
    pgClient.query('INSERT INTO values(number) VALUES ($1)', [index]); // add index into SQL DB

    res.send({working: true}); // flag to indicate we're calculating the value
});

app.listen(5000, err => {
    console.log('Listening');
});

