const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const usersCollection = client.db('docHouse').collection('users');
        const ourServicesCollection = client.db('docHouse').collection('ourService');
        const expertDoctorsCollection = client.db('docHouse').collection('expertDoctor')
        const servicesCollection = client.db('docHouse').collection('services');
        const bookingCollection = client.db('docHouse').collection('booking');
        const reviewsCollection = client.db('docHouse').collection('reviews');

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        });

        // users related api
        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };

            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists' });
            }

            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };

            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        });


        // home page api
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

        app.get('/doctor-profile/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await expertDoctorsCollection.findOne(query);
            res.send(result);
        })


        // services related api
        app.get('/services', async (req, res) => {
            const query = {};
            const services = await servicesCollection.find(query).toArray();
            res.send(services);
        });

        app.get('/available', async (req, res) => {
            const date = req.query.date;

            // step 1: get all services
            const services = await servicesCollection.find().toArray();

            // step 2: get the booking of that day. output: [{}, {}, {}, {}, {}, {}]
            const query = { date: date };
            const bookings = await bookingCollection.find(query).toArray();

            // step 3: for each service
            services.forEach(service => {
                // step 4: find bookings for that service. output: [{}, {}, {}]
                const serviceBookings = bookings.filter(book => book.treatment === service.name);
                // step 5: select slots for the service bookings: ['', '', '']
                const bookedSlots = serviceBookings.map(book => book.slot);
                // step 6: select those slots that are not in bookedSlots
                const available = service.slots.filter(slot => !bookedSlots.includes(slot));
                // step 7: set available to  slots to make it easier
                service.slots = available;
            })
            res.send(services);
        });


        // booking related api
        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const query = {
                treatment: booking.treatment,
                date: booking.date,
                patientEmail: booking.patientEmail
            };
            const exists = await bookingCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, booking: exists })
            }
            else {
                const result = await bookingCollection.insertOne(booking);
                return res.send({ success: true, result });
            }
        });

        app.get('/booking', async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([]);
            }

            const query = { patientEmail: email };
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        });


        // reviews related api
        app.get('/reviews', async (req, res) => {
            const query = {};
            const reviews = await reviewsCollection.find(query).toArray();
            res.send(reviews);
        });

        app.post('/reviews', async (req, res) => {
            const reviewInfo = req.body;
            const result = await reviewsCollection.insertOne(reviewInfo);
            res.send(result);
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