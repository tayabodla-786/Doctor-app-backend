import mongoose from "mongoose";

export const dbConnect = async () => {

    mongoose.connection.on("connected", () => {
        console.log("MongoDB is connected");
    })

    mongoose.connection.on("error", (error) => {
        console.log("Failed to connect: ", error);
    });
    
    await mongoose.connect(process.env.MONGODB_URL);

}