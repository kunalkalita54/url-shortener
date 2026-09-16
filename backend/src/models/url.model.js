import mongoose from "mongoose";

const urlSchema= new mongoose.Schema({
    shortCode: {
        type: String,
        required: true,
        unique: true
    },
    longURL: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {timestamps: true})

const urlModel= mongoose.model('url', urlSchema);

export default urlModel;

