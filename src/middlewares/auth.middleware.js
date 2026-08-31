import jwt from 'jsonwebtoken';


export async function verifyToken(req,res,next) {
    try {
        const token= req.cookies.token;

        if(!token) {
            return res.status(401).json({message: 'Token not found'});
        }

        const decoded= jwt.verify(token, process.env.JWT_SECRET);

        req.user=decoded;

        next();
        
    } catch (error) {
        console.log(error);
        return res.status(401).json({message: 'Invalid or expired token'});
    }
}