import jwt from "jsonwebtoken";
import {UnauthenticatedError} from "../errors/index.js";

const authenticateUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer')) {
        throw new UnauthenticatedError('Authentication Invalid');
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET
        );
        const testUser = payload.id === '6491749fc6d71efdeb8e28e7';
        req.user = {userId: payload.id, testUser};
        next();
    } catch (err) {
        throw new UnauthenticatedError('Authentication Invalid');
    }
    console.log(authHeader);
};

export default authenticateUser;