import jwt from "jsonwebtoken";
import {UnauthenticatedError} from "../errors/index.js";

const authenticateUser = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        throw new UnauthenticatedError('Authentication Invalid');
    }

    try {
        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET
        );
        const testUser = payload.id === '6491749fc6d71efdeb8e28e7';
        req.user = {userId: payload.id, testUser};
        // console.log(`user form auth: ${req.user}`);
        next();

    } catch (err) {
        throw new UnauthenticatedError('Authentication Invalid');
    }
    // console.log(authHeader);
};

export default authenticateUser;