import express, { Application, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { initializeDatabase } from './config/db';
import authRoutes from './Routes/authRoutes';
import userRoutes from './Routes/userRoutes';
import roleRoutes from './Routes/roleRoutes';
import departementRoutes from './Routes/departementRoutes';
import eventRoutes from './Routes/eventRoutes';
import inscriptionRoutes from './Routes/inscriptionRoutes';
import formFieldTypeRoutes from './Routes/formFieldTypeRoutes';
import formFieldRoutes from './Routes/formFieldRoutes';
import fieldResponseRoutes from './Routes/fieldResponseRoutes';
import dashboardRoutes from './Routes/dashboardRoutes';
import cron from 'node-cron';
import { updateEventStatusesScheduled } from './Controllers/EventController';
import notificationRoutes from './Routes/notificationRoutes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
];

const corsOptions: cors.CorsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Content-Type,Authorization,X-Requested-With,Cache-Control,Pragma,Expires", 
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const publicDirectoryPath = path.join(__dirname, '../public');
console.log(`Serving static files from: ${publicDirectoryPath}`);
app.use(express.static(publicDirectoryPath));

const generalUploadsDirectoryPath = path.join(__dirname, '..', 'uploads'); 
console.log(`Serving static files from /uploads from: ${generalUploadsDirectoryPath}`);
app.use('/uploads', express.static(generalUploadsDirectoryPath));


// Basic Route
app.get('/', (req: Request, res: Response) => {
    res.send('Welcome to the Event Management API!');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/departements', departementRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/inscriptions', inscriptionRoutes);
app.use('/api/form-field-types', formFieldTypeRoutes);
app.use('/api/form-fields', formFieldRoutes);
app.use('/api/responses', fieldResponseRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error("Error caught by error handler:", err.stack);
    if (err.message === 'Not allowed by CORS') {
        res.status(403).send({ error: 'CORS policy does not allow access from this origin.' });
    } else {
        res.status(500).send({ error: 'Something went wrong!', message: err.message });
    }
});

const startServer = async () => {
    await initializeDatabase();

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};

cron.schedule('0 1 * * *', async () => {
    console.log('Scheduler triggered: Starting updateEventStatusesScheduled task...');
    try {
        await updateEventStatusesScheduled();
        console.log('Scheduler: updateEventStatusesScheduled task completed successfully.');
    } catch (err) {
        console.error('Scheduler: Error during updateEventStatusesScheduled task:', err);
    }
}, {
    timezone: "Africa/Algiers"
});

console.log('Event status update job scheduled to run daily at 1:00 AM.');

startServer().catch(error => {
    console.error("Failed to start the server:", error);
});
