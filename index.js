const express = require('express');
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const jwt = require('jsonwebtoken');
const stripe = require("stripe")('sk_test_51M9ivWKSFjSDGG4pXcCDIB5gRMms8ibipuHAWAQ1moeTQIIweWfEY96euGKuPOvmJJ6uqWjUtwgdhiudZLiIAo2M003Y7OfHJm');


const port = process.env.PORT || 5000;

// Middleware
app.use(cors())
app.use(express.json())


app.get('/', (req, res) => {
    res.send('Pc Parts Server is running')
})

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('Unauthorized Access');
    }
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden' })
        }
        req.decoded = decoded;
        next();
    })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.e4yec41.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const categoriesCollection = client.db("pcParts").collection('category');
        const usersCollection = client.db("pcParts").collection('user');
        const productsCollection = client.db("pcParts").collection('product');
        const bookingCollection = client.db("pcParts").collection('booking');

        app.get('/categories', async (req, res) => {
            const query = {};
            const categories = await categoriesCollection.find(query).toArray();
            res.send(categories)
        })

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        })

        app.get('/users', async (req, res) => {
            // Find email wise user only
            const email = req.query.email;
            if (email) {
                const query = { email: email };
                const singleUser = await usersCollection.findOne(query);
                return res.send(singleUser);
            }
            // Find all user
            const allUserQuery = {};
            const allUser = await usersCollection.find(allUserQuery).toArray();
            res.send(allUser);
        })

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.category === 'admin' })
        })

        app.patch('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const options = { upsert: true };
            const verifyUser = {
                $set: { userVerified: true }
            }
            const updateUser = await usersCollection.updateOne(query, verifyUser, options);
            res.send(updateUser);
        })

        // Delete user by id
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const deluser = await usersCollection.deleteOne(query);
            res.send(deluser)
        })

        app.post('/users', async (req, res) => {
            // Data for create new user
            const userInfo = req.body;
            // Checking if this email already in database or not
            const email = req.body.email;
            const query = { email: email };
            const existUser = await usersCollection.findOne(query);
            // If this email is not in database then add this user to database
            console.log(existUser?.email);
            if (!existUser) {
                const addedUser = await usersCollection.insertOne(userInfo);
                return res.send(addedUser);
            }
            // If this email already available in the data base then show this status
            res.status(403).send({ message: 'User already Exist in database' })

        })

        app.post('/products', async (req, res) => {
            const product = req.body;
            const addProduct = await productsCollection.insertOne(product);
            res.send(addProduct);
        })
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { productCategory: id };
            const categoryProducts = await productsCollection.find(query).toArray();
            res.send(categoryProducts);
        })
        app.get('/products', async (req, res) => {
            // find products by user email
            const email = req.query.email;
            if (email) {
                const query = { sellerEmail: email };
                const userProduct = await productsCollection.find(query).toArray();
                return res.send(userProduct);
            }
            // Find products by the property named advertise
            const advertise = req.query.advertise;
            if (advertise) {
                const advertiseQuery = { advertise: advertise };
                const advertiseProducts = await productsCollection.find(advertiseQuery).toArray();
                return res.send(advertiseProducts);
            }
            // find all products
            const allQuery = {};
            const allProducts = await productsCollection.find(allQuery).sort({ _id: -1 }).toArray();
            res.send(allProducts);
        })
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const delProduct = await productsCollection.deleteOne(query);
            res.send(delProduct)
        })
        app.patch('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const options = { upsert: true };
            const addValue = {
                $set: { advertise: 'true' }
            }
            const updateProduct = await productsCollection.updateOne(query, addValue, options);
            res.send(updateProduct);
        })

        app.get('/productdetails/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const findProduct = await productsCollection.findOne(query);
            res.send(findProduct)
        })

        // Set Booking
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const addBooking = await bookingCollection.insertOne(booking);
            res.send(addBooking);
        })
        // Load user Booked item
        app.get('/bookings', async (req, res) => {
            const id = req.query.id;
            if (id) {
                const idQuery = { _id: ObjectId(id) };
                const bookedItem = await bookingCollection.findOne(idQuery);
                return res.send(bookedItem)
            }
            // Search Booking By Email
            const email = req.query.email;
            const query = { buyerEmail: email };
            const userBookings = await bookingCollection.find(query).toArray();
            res.send(userBookings);
        })


    }
    finally { }
}
run().catch();
app.listen(port, () => {
    console.log('Server is running');
})