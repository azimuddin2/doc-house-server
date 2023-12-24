const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }

    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' });
        }
        req.decoded = decoded;
        next();
    })
};

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
        const doctorsCollection = client.db('docHouse').collection('doctors');
        const ourServicesCollection = client.db('docHouse').collection('ourService');
        const expertDoctorsCollection = client.db('docHouse').collection('expertDoctor')
        const servicesCollection = client.db('docHouse').collection('services');
        const bookingCollection = client.db('docHouse').collection('booking');
        const paymentCollection = client.db('docHouse').collection('payments');
        const reviewsCollection = client.db('docHouse').collection('reviews');

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' });
            res.send({ token });
        });

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' })
            }
            next();
        };



        // users related api
        app.get('/usersCount', async (req, res) => {
            const result = await usersCollection.estimatedDocumentCount();
            res.send({ usersCount: result });
        })

        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const page = parseInt(req.query.page) || 0;
            const limit = parseInt(req.query.limit) || 6;
            const skip = page * limit;

            const search = req.query.search;
            let cursor;

            if (search) {
                cursor = usersCollection.find({ name: { $regex: search, $options: 'i' } });
            } else {
                cursor = usersCollection.find();
            }

            const result = await cursor.skip(skip).limit(limit).toArray();
            res.send(result);
        });

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

        app.put('/users', verifyJWT, async (req, res) => {
            const updateInfo = req.body;
            const { name, phone, email, image } = updateInfo;

            const filter = { email: email };
            const options = { upsert: true };

            const updateDoc = {
                $set: {
                    name,
                    image,
                    phone
                }
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        });

        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const decodedEmail = req.decoded.email;

            if (decodedEmail !== email) {
                res.send({ admin: false });
            }

            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' };
            res.send(result);
        })

        app.patch('/users/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {
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

        app.delete('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        });



        // doctors related api
        app.post('/doctors', verifyJWT, verifyAdmin, async (req, res) => {
            const doctorInfo = req.body;
            const query = { email: doctorInfo.email };

            const existingDoctor = await doctorsCollection.findOne(query);
            if (existingDoctor) {
                return res.send({ message: 'Doctor already exists' });
            }

            const result = await doctorsCollection.insertOne(doctorInfo);
            res.send(result);
        });

        app.get('/doctorsCount', async (req, res) => {
            const result = await doctorsCollection.estimatedDocumentCount();
            res.send({ doctorsCount: result });
        });

        app.get('/doctors', verifyJWT, verifyAdmin, async (req, res) => {
            const page = parseInt(req.query.page) || 0;
            const limit = parseInt(req.query.limit) || 6;
            const skip = page * limit;

            const search = req.query.search;
            let cursor;

            if (search) {
                cursor = doctorsCollection.find({ name: { $regex: search, $options: 'i' } });
            } else {
                cursor = doctorsCollection.find();
            }

            const result = await cursor.skip(skip).limit(limit).toArray();
            res.send(result);
        });

        app.delete('/doctors/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await doctorsCollection.deleteOne(query);
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
        app.get('/bookings', verifyJWT, verifyAdmin, async (req, res) => {
            const date = req.query.date;
            const query = { date: date };

            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        });

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

        app.get('/booking', verifyJWT, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([]);
            }

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'forbidden access' });
            }

            const query = { patientEmail: email };
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        });

        app.patch('/booking/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const paymentInfo = req.body;
            const filter = { _id: new ObjectId(id) };

            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: paymentInfo.transactionId
                },
            }
            const updatedBooking = await bookingCollection.updateOne(filter, updateDoc);
            const result = await paymentCollection.insertOne(paymentInfo);
            res.send(result);
        });

        app.delete('/booking/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingCollection.deleteOne(query);
            res.send(result);
        });


        // create payment intent 
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });


        // payments related api
        app.get('/payments', verifyJWT, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([]);
            }

            const query = { email: email };
            const result = await paymentCollection.find(query).toArray();
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


        // admin stats related api
        app.get('/admin-stats', verifyJWT, verifyAdmin, async (req, res) => {
            const doctors = await doctorsCollection.estimatedDocumentCount();
            const patients = await usersCollection.estimatedDocumentCount();
            const appointments = await bookingCollection.estimatedDocumentCount();

            res.send({
                doctors,
                patients,
                appointments
            });
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