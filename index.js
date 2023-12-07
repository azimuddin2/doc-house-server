const express = require('express');
const cors = require('cors');
require('dotenv').config();
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
        const ourServicesCollection = client.db('docHouse').collection('ourService');
        const expertDoctorsCollection = client.db('docHouse').collection('expertDoctor')
        const servicesCollection = client.db('docHouse').collection('services');
        const bookingCollection = client.db('docHouse').collection('booking');
        const reviewsCollection = client.db('docHouse').collection('reviews');

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


        // service api related
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


        // booking api related
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


        // reviews api related
        app.get('/reviews', async (req, res) => {
            const query = {};
            const reviews = await reviewsCollection.find(query).toArray();
            res.send(reviews);
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