import {StatusCodes} from "http-status-codes";
import Job from "../models/Job.js";
import {BadRequestError, NotFoundError, UnauthenticatedError} from "../errors/index.js";
import checkPermissions from "../utils/checkPermissions.js";
import mongoose from "mongoose";
import moment from "moment";

const getAllJobs = async (req, res) => {
    const {status, jobType, sort, search} = req.query;

    const queryObject = {
        createdBy: req.user.userId,
    };

    if (status !== 'all') {
        queryObject.status = status;
    }

    if (jobType !== 'all') {
        queryObject.jobType = jobType;
    }

    if (search) {
        queryObject.position = {$regex: search, $options: 'i'};
    }

    let result = Job.find(queryObject);

    if (sort === 'latest') {
        result = result.sort('-createdAt')
    } else if (sort === 'oldest') {
        result = result.sort('createdAt');
    } else if (sort === 'a-z') {
        result = result.sort('position');
    } else if (sort === 'z-a') {
        result = result.sort('-position');
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    result = result.skip(skip).limit(limit);

    const jobs = await result;

    const totalJobs = await Job.countDocuments(queryObject);
    const numOfPages = Math.ceil(totalJobs / limit);
    res.status(StatusCodes.OK).json({
        jobs: jobs,
        totalJobs,
        numOfPages
    });
};

const creatJob = async (req, res) => {
    const {position, company} = req.body;
    if (!position || !company) {
        throw new BadRequestError('Please provide all values');
    }

    req.body.createdBy = req.user.userId;

    const job = await Job.create(req.body);
    res.status(StatusCodes.CREATED).json({job, msg: 'Job Created Successfully'});
};

const updateJob = async (req, res) => {
    const {id: jobId} = req.params;

    const { company, position } = req.body;
    if (!company || !position) {
        throw new BadRequestError('Please provide the "Company and Position"');
    }

    const job = await Job.findOne({_id: jobId});
    if (!job) {
        throw new NotFoundError(`Found No Job With This id : ${jobId}`)
    }

    checkPermissions(req.user, job.createdBy);

    const updatedJob = await Job.findOneAndUpdate({_id: jobId}, req.body, {
        new: true,
        runValidators: true
    });
    // console.log(updatedJob);

    res.status(StatusCodes.OK).json({
        job: updatedJob,
        msg: 'Job Updated Successfully'
    });
};

const deleteJob = async (req, res) => {
    const {id: jobId} = req.params;

    const job = await Job.findOne({_id: jobId});
    if (!job) {
        throw new NotFoundError(`Found No Job With This id : ${jobId}`)
    }

    checkPermissions(req.user, job.createdBy);

    // console.log(job);
    await Job.deleteOne({_id: jobId});

    res.status(StatusCodes.OK).json({msg: 'Job Deleted Successfully'});
};

const showStats = async (req, res) => {
    let stats = await Job.aggregate([
        {$match: {createdBy: new mongoose.Types.ObjectId(req.user.userId)}},
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    stats = stats.reduce((acc, curr) => {
        const {_id: title, count} = curr;
        acc[title] = count;

        return acc;
    }, {});

    const defaultState = {
        pending: stats.pending || 0,
        declined: stats.declined || 0,
        interview: stats.interview || 0
    };

    let monthlyApplications = await Job.aggregate([
        {$match: {createdBy: new mongoose.Types.ObjectId(req.user.userId)}},
        {$group:
            {
                _id: {
                    year: {$year: '$createdAt'},
                    month: {$month: '$createdAt'}
                },
                count: {$sum: 1}
            }
        },
        {$sort: {'_id.year': -1, '_id.month': -1}},
        {$limit: 6}
    ]);

    monthlyApplications = monthlyApplications.map(item => {
        const {_id: {year, month}, count} = item;
        const date = moment().month(month - 1).year(year)
            .format('MMM Y');

        return {date, count}
    }).reverse();

    res.status(StatusCodes.OK)
        .json({stats: defaultState, monthlyApplications});
};

export {getAllJobs, showStats, updateJob, creatJob, deleteJob}