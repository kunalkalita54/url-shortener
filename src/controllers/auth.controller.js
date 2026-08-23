import config from "../config/config.js";
import { toBase62 } from "../utils/base62.util.js";
import counterModel from "../models/counter.model.js";
import urlModel from "../models/url.model.js";
import userModel from "../models/user.model.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function register(req,res) {
    const {username, email, password}= req.body;

    const isAlreadyRegistered= await userModel.findOne({
        $or: [
            {username},
            {email}
        ]
    })
    
    if(isAlreadyRegistered) {
        return res.status(409).json({message: 'user already exists, Please log in'});
    }

    const hashedPassword= await bcrypt.hash(password, 10);

    const user= await userModel.create({
        username,
        email,
        password: hashedPassword
    })

    res.status(200).json({
        message: 'Registered successfully',
        user: {
            username: user.username,
            email: user.email
        }
    });

}

export async function login(req,res) {
    try {
        const {password, email}= req.body;

        const user = await userModel.findOne({email});

        if(!user) {
            return res.status(401).json({message: 'User does not exist, Please register'});
        }

        const isPasswordValid= await bcrypt.compare(password, user.password);

        if(!isPasswordValid) {
            return res.status(401).json({message: 'Invalid Password'});
        }

        const token= jwt.sign({
            id: user._id
        }, process.env.JWT_SECRET, {
            expiresIn: '7d'
        });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", 
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });

        res.status(200).json({
            message: 'Logged in successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
            }
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: 'Something went wrong'});
    }

    
}

export async function shorten_url(req,res) {
    try {
        const {long_url}= req.body;

        if(!long_url) {
            return res.status(400).json({message: 'URL is missing'});
        }

        const counter= await counterModel.findOneAndUpdate(
            {_id: 'url_count'},
            {$inc: { seq: 1 }},
            {new: true, upsert: true}
        )

        const shortened=toBase62(counter.seq);

        const url= await urlModel.create({
            shortCode: shortened,
            longURL: long_url,
            user: req.user.id
        })

        res.status(200).json({
            message: 'URL shortened successfully',
            URL: {
                shortURL: `${process.env.BASE_URL}/${shortened}`,
                longURL: url.longURL,

            }
        })
    } 
    catch (error) {
        console.log(error);
        return res.status(500).json({message: 'Something went wrong'});
    }
}

export async function redirect_url(req,res) {
    try {
        let {shortCode}= req.params;
        
        const url=await urlModel.findOne({shortCode});

        if(!url) {
            return res.status(404).json({message: 'URL not found'});
        }

        return res.redirect(302, url.longURL);

    } catch (error) {
        console.log(error);
        return res.status(500).json({message: 'Something went wrong'});
    }
}