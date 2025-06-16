import { DataSource } from "typeorm"
import dotenv from "dotenv"

dotenv.config()

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: false,
    logging: ["query", "error"], 
    entities: ["src/Models/**/*.ts"],
    migrations: ["src/migrations/**/*.ts"],
    subscribers: []
})

export const initializeDatabase = async () => {
    try {
        await AppDataSource.initialize()
        console.log("Database connection established")
    } catch (error) {
        console.error("Error connecting to database:", error)
        throw error
    }
}
