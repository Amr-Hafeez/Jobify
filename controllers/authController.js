import {StatusCodes} from "http-status-codes";
import User from "../models/User.js";
import {BadRequestError, UnauthenticatedError} from "../errors/index.js";
import attachCookies from "../utils/attachCookies.js";

const register = async (req,res) => {
    const {name, email, password} = req.body;

    if (!name || !email || !password) {
        throw new BadRequestError('Please provide all values');
    }

    User.findOne({email})
        .then(user => {
            if (user) {
                // console.log(user);
                throw new BadRequestError('Email is already exists :(');
            }
        });

    const user = await User.create({
        name,
        email,
        password
    });

    const token = user.createJWT();
    attachCookies({res, token});
    res.status(StatusCodes.CREATED).json({
        msg: 'User created successfully :)',
        user: {
            name: user.name,
            email: user.email,
            lastName: user.lastName,
            location: user.location
        },
        location: user.location
    });
};

const login = async (req,res) => {
    const {email, password} = req.body;

    if (!email || !password) {
        throw new BadRequestError('Please provide all values');
    }

    const user = await User.findOne({email}).select('+password');
    if (!user) {
        throw new UnauthenticatedError('Invalid Credentials')
    }

    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
        throw new UnauthenticatedError('Invalid Credentials')
    }
    const token = user.createJWT();
    user.password = undefined;

    attachCookies({res, token});
    res.status(StatusCodes.OK).json({user, location: user.location});
}

const updateUser = async (req, res) => {
    const {email, name, lastName, location} = req.body;

    if (!email || !name || !lastName || !location) {
        throw new BadRequestError('Please provide all values');
    }

    const user = await User.findOne({_id: req.user.userId});

    user.email = email;
    user.name = name;
    user.lastName = lastName;
    user.location = location;

    await  user.save()
    const token = user.createJWT();
    attachCookies({res, token});

    res.status(StatusCodes.OK).json({user, location: user.location});
}

const getCurrentUser = async (req, res) => {
    const user = await User.findOne({ _id: req.user.userId });
    console.log(req.user);
    res.status(StatusCodes.OK).json({ user, location: user.location });
};

const logout = async (req, res) => {
    req.cookie('token', 'logout', {
        httpOnly: true,
        expires: new Date(Date.now())
    });

    res.status(StatusCodes.OK).json({msg: 'User Logged Out!'});
}

export {register, login, updateUser, getCurrentUser, logout};