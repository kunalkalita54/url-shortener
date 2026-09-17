import config from "../config/config.js";
import Click from '../models/click.model.js';
import { UAParser } from 'ua-parser-js';
import { toBase62 } from "../utils/base62.util.js";
import counterModel from "../models/counter.model.js";
import urlModel from "../models/url.model.js";
import userModel from "../models/user.model.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import { redisConnection } from "../config/redis.js";

async function recordClick(req, shortCode) {
  try {
    const parser = new UAParser(req.headers['user-agent'] || '');

    const device = parser.getDevice().type || 'desktop';
    const browser = parser.getBrowser().name || 'Unknown';

    await Click.create({
      shortCode,
      timestamp: new Date(),
      ip: req.ip,
      userAgent: req.headers['user-agent'] || '',
      device,
      browser,
      referrer: req.headers['referer'] || null,
    });

    console.log(`Saved click for ${shortCode}`);
  } catch (error) {
    console.error(`Failed to record click for ${shortCode}:`, error);
  }
}

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
            secure: true,
            sameSite: 'none',
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
   
        const trimmed_url = long_url?.trim();

        if (!trimmed_url) {
          return res.status(400).json({ message: 'URL is missing' });
        }

        if (trimmed_url.length > 2048) {
          return res.status(400).json({ message: 'URL exceeds maximum allowed length (2048 characters)' });
        }

        const strictUrlOptions = {
            protocols: ['http', 'https'], 
            require_protocol: true,       
            require_valid_protocol: true, 
            validate_length: true         
        };  
        
        const isValid = validator.isURL(trimmed_url, strictUrlOptions);

        if (!isValid) {
            return res.status(400).json({ message: "Invalid URL format" });
        }

        const counter= await counterModel.findOneAndUpdate(
            {_id: 'url_count'},
            {$inc: { seq: 1 }},
            {new: true, upsert: true}
        )

        const shortened=toBase62(counter.seq);

        const url= await urlModel.create({
            shortCode: shortened,
            longURL: trimmed_url,
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

export async function redirect_url(req, res) {
  try {
    const { shortCode } = req.params;


    const cachedURL = await redisConnection.get(shortCode);

    if (cachedURL) {
      console.log("CACHE HIT for", shortCode);
      res.redirect(302, cachedURL);
      await recordClick(req, shortCode);
      return;
    }

    console.log("CACHE MISS for", shortCode);

    
    const lockKey = `lock:${shortCode}`;
    const gotLock = await redisConnection.set(lockKey, '1', 'NX', 'PX', 5000);

    if (!gotLock) {
      
      for (let i = 0; i < 20; i++) {           
        await new Promise((resolve) => setTimeout(resolve, 100));

        const retryURL = await redisConnection.get(shortCode);
        if (retryURL) {
          res.redirect(302, retryURL);
          await recordClick(req, shortCode);
          return;
        }
      }
     
    }

    
    try {
      const dbURL = await urlModel.findOne({ shortCode });

      if (!dbURL) {
        return res.status(404).json({ message: 'Short URL not found' });
      }

      await redisConnection.set(shortCode, dbURL.longURL, 'EX', 120);
      res.redirect(302, dbURL.longURL);
      await recordClick(req, shortCode);
    } finally {
      
      if (gotLock) {
        await redisConnection.del(lockKey);
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
}