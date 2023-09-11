const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// database connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.snyiliq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const ourServicesCollection = client.db('docHouse').collection('ourService');
        const expertDoctorsCollection = client.db('docHouse').collection('expertDoctor')
        const servicesCollection = client.db('docHouse').collection('services');

        app.get('/our-services', async (req, res) => {
            const query = {};
            const services = await ourServicesCollection.find(query).toArray();
            res.send(services);
        });

        app.get('/expert-doctors', async (req, res) => {
            const query = {};
            const expertDoctors = await expertDoctorsCollection.find(query).toArray();
            res.send(expertDoctors);
        });

        app.get('/services', async (req, res) => {
            const query = {};
            const services = await servicesCollection.find(query).toArray();
            res.send(services);
        });

    }
    finally { }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello doc house server running!!')
})

app.listen(port, () => {
    console.log(`Doc house app listening on port ${port}`)
})